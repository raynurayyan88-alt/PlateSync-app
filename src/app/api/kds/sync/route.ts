import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kdsOrdersBuffer } from "@/server/socketHandlers";
import {
  sessionStore,
  buildSessionKey,
  getCompletedBills,
  type CartItem,
} from "@/server/sessionStore";
import type { KdsTicket } from "@/types/kds";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") || searchParams.get("restaurantSlug") || searchParams.get("restaurant");
    
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Restaurant slug is required (e.g. ?slug=grand-empire)" },
        { status: 400 }
      );
    }

    const slugKey = slug.trim().toLowerCase();
    let dbTickets: KdsTicket[] = [];

    if (process.env.DATABASE_URL) {
      try {
        const dbFetch = async () => {
          const restaurant = await prisma.restaurant.findUnique({
          where: { slug: slugKey },
        });

        if (restaurant) {
          const dbOrders = await prisma.order.findMany({
            where: {
              restaurantId: restaurant.id,
              status: { not: "ACTIVE_TABLE_SESSION" },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          });

          return dbOrders.map((o) => {
            const payloadData = (o.payloadJson as Record<string, unknown>) || {};
            return {
              orderId: o.id,
              diningSessionId: payloadData.diningSessionId as string | undefined,
              restaurantSlug: slugKey,
              tableNumber: o.tableNumber,
              roundNumber: o.roundNumber,
              status: o.status,
              totalInCents: (payloadData.totalInCents as number) || 0,
              items: (payloadData.items as CartItem[]) || [],
              placedAt: (payloadData.placedAt as string) || o.createdAt.toISOString(),
              completedAt: payloadData.completedAt as string | undefined,
              approvedBy: (payloadData.approvedBy as string[]) || [],
            };
          });
        }
        return [];
      };

      dbTickets = await Promise.race([
        dbFetch(),
        new Promise<KdsTicket[]>((_, reject) =>
          setTimeout(() => reject(new Error("KDS DB timeout")), 100)
        ),
      ]);
      } catch {
        // DB offline or slow fallback: rely instantly on fast-sync memory buffer
        dbTickets = [];
      }
    }

    // Merge with fast-sync in-memory buffer
    const bufferTickets = kdsOrdersBuffer.get(slugKey) || [];
    const combinedTickets = [...dbTickets];
    for (const bt of bufferTickets) {
      const idx = combinedTickets.findIndex((m) => m.orderId === bt.orderId);
      if (idx >= 0) {
        combinedTickets[idx] = bt;
      } else {
        combinedTickets.unshift(bt);
      }
    }

    // Fetch active table sessions, cashier bills, and settled history
    const activeTableSessions = await sessionStore.getAllSessionsForRestaurant(slugKey);
    const cashierBills = await sessionStore.getAllCashierBills(slugKey);
    const completedBills = getCompletedBills(slugKey);

    return NextResponse.json({
      success: true,
      restaurantSlug: slugKey,
      pollingIntervalMs: 2000,
      tickets: combinedTickets,
      activeTableSessions,
      cashierBills,
      completedBills,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error syncing KDS orders";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const slug = body.slug || body.restaurantSlug || searchParams.get("slug") || searchParams.get("restaurantSlug");

    if (!slug) {
      return NextResponse.json({ success: false, error: "Restaurant slug is required" }, { status: 400 });
    }

    const slugKey = String(slug).trim().toLowerCase();
    const { action } = body;

    if (action === "UPDATE_TICKET_STATUS") {
      const { orderId, status } = body;
      if (!orderId || !status) {
        return NextResponse.json({ success: false, error: "orderId and status required" }, { status: 400 });
      }

      const completedAt =
        status === "ENTERED_INTO_POS" || status === "SERVED" || status === "COMPLETED" || status === "ARCHIVED"
          ? new Date().toISOString()
          : undefined;

      const buf = kdsOrdersBuffer.get(slugKey) || [];
      const target = buf.find((t) => t.orderId === orderId);
      if (target) {
        target.status = status;
        if (completedAt) target.completedAt = completedAt;
        else if (status === "CONFIRMED" || status === "SENT_TO_KITCHEN") delete target.completedAt;
      }

      try {
        await Promise.race([
          prisma.order.update({
            where: { id: orderId },
            data: { status },
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100)),
        ]);
      } catch {
        // Fallback
      }

      return NextResponse.json({ success: true, orderId, status, completedAt });
    }

    if (action === "MARK_BILL_PAID") {
      const billId = body.billId as string;
      if (!billId) {
        return NextResponse.json({ success: false, error: "billId is required" }, { status: 400 });
      }

      const result = await sessionStore.markBillPaid(slugKey, billId);

      if (result.paidBill) {
        // Mark matching buffer tickets
        const buf = kdsOrdersBuffer.get(slugKey) || [];
        for (const t of buf) {
          if (t.diningSessionId === result.paidBill.diningSessionId) {
            t.status = "COMPLETED";
            t.completedAt = new Date().toISOString();
          }
        }

        // Mark DB orders
        try {
          await Promise.race([
            prisma.order.updateMany({
              where: {
                restaurant: { slug: slugKey },
                tableNumber: result.paidBill.tableNumber,
                status: { notIn: ["COMPLETED", "ARCHIVED"] },
              },
              data: { status: "COMPLETED" },
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100)),
          ]);
        } catch {
          // Fallback
        }
      }

      return NextResponse.json({ success: true, ...result });
    }

    if (action === "REQUEST_FINAL_BILL") {
      const tableNumber = Number(body.tableNumber);
      if (!tableNumber) {
        return NextResponse.json({ success: false, error: "Valid tableNumber required" }, { status: 400 });
      }

      const sessionKey = buildSessionKey(slugKey, tableNumber);
      const result = await sessionStore.requestFinalBill(sessionKey);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "START_NEW_CUSTOMER_GROUP") {
      const tableNumber = Number(body.tableNumber);
      if (!tableNumber) {
        return NextResponse.json({ success: false, error: "Valid tableNumber required" }, { status: 400 });
      }

      const sessionKey = buildSessionKey(slugKey, tableNumber);
      const result = await sessionStore.startNewCustomerGroup(sessionKey);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "CLOSE_AND_RESET_TABLE") {
      const billId = body.billId as string | undefined;

      if (billId) {
        const result = await sessionStore.markBillPaid(slugKey, billId);
        return NextResponse.json({ success: true, ...result });
      }

      const tableNumber = Number(body.tableNumber);
      if (!tableNumber) {
        return NextResponse.json({ success: false, error: "Valid tableNumber required" }, { status: 400 });
      }

      const sessionKey = buildSessionKey(slugKey, tableNumber);
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

      // Mark DB orders as COMPLETED
      try {
        await Promise.race([
          prisma.order.updateMany({
            where: {
              restaurant: { slug: slugKey },
              tableNumber,
              status: { notIn: ["COMPLETED", "ARCHIVED"] },
            },
            data: { status: "COMPLETED" },
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100)),
        ]);
      } catch {
        // Fallback
      }

      return NextResponse.json({
        success: true,
        bill: result.previousBill,
        newSession: result.newSession,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error in KDS sync POST route";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
