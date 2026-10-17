import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sessionStore,
  buildSessionKey,
  type SessionUser,
  type CartItem,
  type SubmittedRound,
} from "@/server/sessionStore";
import {
  flushOrderToDatabase,
  kdsOrdersBuffer,
  type KdsTicket,
} from "@/server/socketHandlers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantSlug = searchParams.get("restaurantSlug");
    const tableNumberParam = searchParams.get("tableNumber");

    if (!restaurantSlug || !tableNumberParam) {
      return NextResponse.json(
        { success: false, error: "restaurantSlug and tableNumber are required" },
        { status: 400 }
      );
    }

    const tableNumber = parseInt(tableNumberParam, 10);
    if (isNaN(tableNumber) || tableNumber <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid tableNumber" },
        { status: 400 }
      );
    }

    const session = await sessionStore.getOrCreateSession(restaurantSlug, tableNumber);
    const existingDiners = (session.users || []).map((u) => u.name);
    const activeRoundsCount = session.submittedRounds?.length || 0;

    return NextResponse.json({
      success: true,
      session,
      existingDiners,
      activeRoundsCount,
      hasActiveSession: existingDiners.length > 0 || activeRoundsCount > 0 || session.cart.length > 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error reading table session";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, restaurantSlug, tableNumber: rawTableNumber } = body;

    if (!restaurantSlug || rawTableNumber === undefined) {
      return NextResponse.json(
        { success: false, error: "restaurantSlug and tableNumber are required" },
        { status: 400 }
      );
    }

    const tableNumber = Number(rawTableNumber);
    const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
    const slugKey = restaurantSlug.trim().toLowerCase();

    switch (action) {
      case "join": {
        const user = body.user as SessionUser;
        if (!user || !user.id || !user.name) {
          return NextResponse.json(
            { success: false, error: "User object with id and name is required" },
            { status: 400 }
          );
        }
        await sessionStore.getOrCreateSession(restaurantSlug, tableNumber);
        const session = await sessionStore.addUser(sessionKey, user);
        return NextResponse.json({ success: true, session });
      }

      case "addItem": {
        const item = body.item as CartItem;
        if (!item || !item.name) {
          return NextResponse.json(
            { success: false, error: "Valid cart item is required" },
            { status: 400 }
          );
        }
        await sessionStore.getOrCreateSession(restaurantSlug, tableNumber);
        const session = await sessionStore.addItem(sessionKey, item);
        return NextResponse.json({ success: true, session });
      }

      case "removeItem": {
        const cartItemId = body.cartItemId as string;
        const userId = body.userId as string;
        if (!cartItemId || !userId) {
          return NextResponse.json(
            { success: false, error: "cartItemId and userId are required" },
            { status: 400 }
          );
        }
        const session = await sessionStore.removeItem(sessionKey, cartItemId, userId);
        return NextResponse.json({ success: true, session });
      }

      case "triggerReview": {
        await sessionStore.getOrCreateSession(restaurantSlug, tableNumber);
        const session = await sessionStore.setSessionStatus(sessionKey, "REVIEWING");
        return NextResponse.json({ success: true, session });
      }

      case "submitApproval": {
        const userId = body.userId as string;
        const hasApproved = body.hasApproved !== undefined ? Boolean(body.hasApproved) : true;

        if (!userId) {
          return NextResponse.json(
            { success: false, error: "userId is required to submit approval" },
            { status: 400 }
          );
        }

        await sessionStore.getOrCreateSession(restaurantSlug, tableNumber);
        const updatedSession = await sessionStore.updateConsensusVote(
          sessionKey,
          userId,
          hasApproved
        );

        // Check for 100% consensus
        const totalSeatedUsers = updatedSession.users.length;
        const hasCartItems = updatedSession.cart.length > 0;
        const allApproved =
          totalSeatedUsers > 0 &&
          hasCartItems &&
          updatedSession.users.every((u) => updatedSession.consensusVotes[u.id] === true);

        if (allApproved) {
          await sessionStore.setSessionStatus(sessionKey, "LOCKED");

          const cartSnapshot = [...updatedSession.cart];
          const completedRound = updatedSession.roundNumber;
          const votesSnapshot = { ...updatedSession.consensusVotes };

          const roundTotalInCents = cartSnapshot.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
          const roundTotalInRupees = cartSnapshot.reduce(
            (sum, item) =>
              sum + (item.priceInRupees ?? Math.round(item.priceInCents / 100)) * item.quantity,
            0
          );

          // Flush order to database
          const dbOrder = await flushOrderToDatabase(
            restaurantSlug,
            tableNumber,
            completedRound,
            cartSnapshot,
            votesSnapshot,
            updatedSession.diningSessionId
          );

          // Prepare KDS ticket
          const ticketPayload: KdsTicket = {
            orderId: dbOrder.orderId,
            diningSessionId: updatedSession.diningSessionId,
            restaurantSlug: slugKey,
            tableNumber,
            roundNumber: completedRound,
            status: dbOrder.status,
            totalInCents: dbOrder.totalInCents,
            items: cartSnapshot,
            placedAt: new Date().toISOString(),
            approvedBy: Object.keys(votesSnapshot),
          };

          const submittedRound: SubmittedRound = {
            roundNumber: completedRound,
            orderId: dbOrder.orderId,
            items: cartSnapshot,
            roundTotalInRupees,
            roundTotalInCents,
            placedAt: new Date().toISOString(),
            approvedBy: Object.keys(votesSnapshot),
          };

          // Cache in fast-sync in-memory KDS buffer
          const existingTickets = kdsOrdersBuffer.get(slugKey) || [];
          kdsOrdersBuffer.set(slugKey, [
            ticketPayload,
            ...existingTickets.filter((t) => t.orderId !== ticketPayload.orderId),
          ]);

          // Advance table session to next round and record round summary
          const nextSession = await sessionStore.resetForNextRound(sessionKey, submittedRound);

          return NextResponse.json({
            success: true,
            status: "ORDER_SUBMITTED",
            orderId: dbOrder.orderId,
            roundNumber: completedRound,
            nextRoundNumber: nextSession.roundNumber,
            ticket: ticketPayload,
            session: nextSession,
          });
        }

        return NextResponse.json({
          success: true,
          status: "VOTE_RECORDED",
          session: updatedSession,
        });
      }

      case "requestFinalBill": {
        const result = await sessionStore.requestFinalBill(sessionKey);
        return NextResponse.json({
          success: true,
          status: "BILL_REQUESTED",
          bill: result.bill,
          session: result.session,
        });
      }

      case "startNewCustomerGroup": {
        const result = await sessionStore.startNewCustomerGroup(sessionKey);
        return NextResponse.json({
          success: true,
          status: "NEW_CUSTOMER_GROUP_STARTED",
          previousBill: result.previousBill,
          session: result.newSession,
        });
      }

      case "markBillPaid": {
        const billId = body.billId as string;
        if (!billId) {
          return NextResponse.json({ success: false, error: "billId is required" }, { status: 400 });
        }
        const result = await sessionStore.markBillPaid(restaurantSlug, billId);

        if (result.paidBill) {
          // Mark buffer tickets
          const buf = kdsOrdersBuffer.get(slugKey) || [];
          for (const t of buf) {
            if (t.diningSessionId === result.paidBill.diningSessionId) {
              t.status = "COMPLETED";
              t.completedAt = new Date().toISOString();
            }
          }

          // Mark DB orders
          try {
            await prisma.order.updateMany({
              where: {
                restaurant: { slug: slugKey },
                tableNumber: result.paidBill.tableNumber,
                status: { notIn: ["COMPLETED", "ARCHIVED"] },
              },
              data: { status: "COMPLETED" },
            });
          } catch {
            // DB fallback
          }
        }

        return NextResponse.json({
          success: true,
          status: "BILL_PAID",
          ...result,
        });
      }

      case "CLOSE_AND_RESET_TABLE":
      case "closeAndResetTable": {
        const billId = body.billId as string | undefined;

        if (billId) {
          const result = await sessionStore.markBillPaid(restaurantSlug, billId);
          return NextResponse.json({
            success: true,
            status: "BILL_PAID",
            ...result,
          });
        }

        const existingSession = await sessionStore.getSession(sessionKey);
        const closedDiningSessionId = existingSession?.diningSessionId;

        const result = await sessionStore.closeAndResetTable(sessionKey);

        // Mark buffer tickets as COMPLETED
        const buf = kdsOrdersBuffer.get(slugKey) || [];
        for (const t of buf) {
          if (
            t.tableNumber === tableNumber &&
            (t.diningSessionId === closedDiningSessionId || t.status !== "COMPLETED")
          ) {
            t.status = "COMPLETED";
            t.completedAt = new Date().toISOString();
          }
        }

        // Mark database orders as COMPLETED
        try {
          await prisma.order.updateMany({
            where: {
              restaurant: { slug: slugKey },
              tableNumber,
              status: { notIn: ["COMPLETED", "ARCHIVED"] },
            },
            data: { status: "COMPLETED" },
          });
        } catch {
          // DB offline fallback
        }

        return NextResponse.json({
          success: true,
          status: "TABLE_SESSION_CLOSED",
          bill: result.previousBill,
          session: result.newSession,
        });
      }

      case "getState":
      default: {
        const session = await sessionStore.getOrCreateSession(restaurantSlug, tableNumber);
        return NextResponse.json({ success: true, session });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error syncing table state";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
