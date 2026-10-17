import { Server, Socket } from "socket.io";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import {
  buildSessionKey,
  sessionStore,
  SessionUser,
  CartItem,
  SubmittedRound,
} from "./sessionStore";

// ============================================================================
// 1. Room Partitioning Helpers
// ============================================================================

/**
 * Returns room key for a table: room:table:{restaurantSlug}:{tableNumber}
 */
export function getTableRoom(
  restaurantSlug: string,
  tableNumber: number | string
): string {
  return `room:table:${restaurantSlug.trim().toLowerCase()}:${tableNumber}`;
}

/**
 * Returns room key for kitchen displays: room:kds:{restaurantSlug}
 */
export function getKdsRoom(restaurantSlug: string): string {
  return `room:kds:${restaurantSlug.trim().toLowerCase()}`;
}

// ============================================================================
// 2. Inbound Event Zod Validation Schemas
// ============================================================================

export const JoinTableSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
  tableNumber: z.union([
    z.number().int().positive("Table number must be positive"),
    z.string().regex(/^\d+$/).transform(Number),
  ]),
  userId: z.string().trim().min(1, "User ID is required"),
  userName: z.string().trim().min(1, "User name is required"),
  avatar: z.string().optional(),
  color: z.string().optional(),
});

export const AddCartItemSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
  tableNumber: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]),
  menuItemId: z.string().trim().min(1, "Menu item ID is required"),
  name: z.string().trim().min(1, "Item name is required"),
  priceInRupees: z.number().int().nonnegative().optional(),
  priceInCents: z.number().int().nonnegative().optional(),
  quantity: z.number().int().positive().default(1),
  selectedModifiers: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).optional(),
  notes: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  cartItemId: z.string().optional(),
  id: z.string().optional(),
});

export const RemoveCartItemSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
  tableNumber: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]),
  cartItemId: z.string().trim().min(1, "Cart item ID is required"),
  userId: z.string().optional(),
});

export const TriggerReviewSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
  tableNumber: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]),
  userId: z.string().optional(),
});

export const SubmitApprovalSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
  tableNumber: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]),
  userId: z.string().optional(),
  hasApproved: z.boolean().default(true),
});

export const JoinKdsSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
});

export const KdsUpdateOrderStatusSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
  orderId: z.string().trim().min(1, "Order ID is required"),
  status: z.enum(["CONFIRMED", "ENTERED_INTO_POS", "SERVED", "COMPLETED", "ARCHIVED"]),
});

export const CloseAndResetTableSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
  tableNumber: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]),
  billId: z.string().optional(),
});

export const RequestFinalBillSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
  tableNumber: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]),
});

export const StartNewCustomerGroupSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
  tableNumber: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform(Number),
  ]),
});

export const MarkBillPaidSchema = z.object({
  restaurantSlug: z.string().trim().min(1, "Restaurant slug is required"),
  billId: z.string().trim().min(1, "Bill ID is required"),
});

export interface KdsTicket {
  orderId: string;
  diningSessionId?: string;
  restaurantSlug: string;
  tableNumber: number;
  roundNumber: number;
  status: string;
  totalInCents: number;
  items: CartItem[];
  placedAt: string;
  completedAt?: string;
  approvedBy: string[];
}

/**
 * In-memory fallback and fast-sync buffer for KDS tickets per restaurant
 */
export const kdsOrdersBuffer: Map<string, KdsTicket[]> = new Map();
// 3. Socket Metadata & Types
// ============================================================================

export interface SocketMetadata {
  restaurantSlug?: string;
  tableNumber?: number;
  userId?: string;
  userName?: string;
  isKds?: boolean;
}

export type PlateSyncSocket = Socket & {
  data: SocketMetadata;
};

export type TableSyncSocket = PlateSyncSocket;

// ============================================================================
// 4. PostgreSQL Order Flusher Helper
// ============================================================================

export async function flushOrderToDatabase(
  restaurantSlug: string,
  tableNumber: number,
  roundNumber: number,
  cart: CartItem[],
  consensusVotes: Record<string, boolean>,
  diningSessionId?: string,
  orderStatus: string = "SENT_TO_KITCHEN"
): Promise<{ orderId: string; status: string; totalInCents: number }> {
  const totalInCents = cart.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
  const payloadSnapshot = {
    restaurantSlug,
    tableNumber,
    roundNumber,
    diningSessionId,
    items: cart,
    totalInCents,
    placedAt: new Date().toISOString(),
    approvedBy: Object.keys(consensusVotes).filter((id) => consensusVotes[id]),
  };

  try {
    const dbOp = async () => {
      // Attempt to link to the existing restaurant in PostgreSQL
      let restaurant = await prisma.restaurant.findUnique({
        where: { slug: restaurantSlug.trim().toLowerCase() },
      });

      if (!restaurant) {
        // Upsert minimal restaurant placeholder if not present
        restaurant = await prisma.restaurant.create({
          data: {
            name: restaurantSlug.replace(/-/g, " ").toUpperCase(),
            slug: restaurantSlug.trim().toLowerCase(),
          },
        });
      }

      return prisma.order.create({
        data: {
          restaurantId: restaurant.id,
          tableNumber,
          roundNumber,
          status: orderStatus,
          payloadJson: payloadSnapshot as unknown as Prisma.InputJsonValue,
        },
      });
    };

    const createdOrder = await Promise.race([
      dbOp(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database operation timed out")), 200)
      ),
    ]);

    console.log(`[DB] Flushed Order #${createdOrder.id} to PostgreSQL (Table ${tableNumber}, Round ${roundNumber}, status: ${orderStatus}, ₹${(totalInCents / 100).toFixed(2)})`);
    return {
      orderId: createdOrder.id,
      status: createdOrder.status,
      totalInCents,
    };
  } catch (dbErr: unknown) {
    const errorMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.warn(`[DB] Database offline, slow, or unreachable (${errorMsg}). Generating fallback order ID.`);
    const fallbackOrderId = `ord_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      orderId: fallbackOrderId,
      status: orderStatus,
      totalInCents,
    };
  }
}

// ============================================================================
// 5. Main Socket.IO Event Handler Registration
// ============================================================================

export function registerSocketHandlers(io: Server) {
  io.on("connection", (rawSocket: Socket) => {
    const socket = rawSocket as TableSyncSocket;
    console.log(`[Socket.IO] New connection established: ${socket.id}`);

    // ------------------------------------------------------------------------
    // EVENT: JOIN_TABLE
    // ------------------------------------------------------------------------
    socket.on("JOIN_TABLE", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = JoinTableSchema.safeParse(payload);
        if (!parsed.success) {
          const errMessage = parsed.error.issues[0]?.message || "Invalid JOIN_TABLE payload";
          console.warn(`[Socket.IO] JOIN_TABLE validation failed: ${errMessage}`);
          callback?.({ success: false, error: "VALIDATION_ERROR", message: errMessage });
          return;
        }

        const { restaurantSlug, tableNumber, userId, userName, avatar, color } = parsed.data;
        const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
        const tableRoom = getTableRoom(restaurantSlug, tableNumber);

        // Ensure session exists and add the user
        await sessionStore.getOrCreateSession(restaurantSlug, tableNumber);

        const userObj: SessionUser = {
          id: userId,
          name: userName,
          avatar,
          color,
          joinedAt: Date.now(),
        };

        const updatedSession = await sessionStore.addUser(sessionKey, userObj);

        // Join socket room
        await socket.join(tableRoom);

        // Bind metadata to socket
        socket.data.restaurantSlug = restaurantSlug;
        socket.data.tableNumber = tableNumber;
        socket.data.userId = userId;
        socket.data.userName = userName;

        console.log(`[Socket.IO] User "${userName}" (${userId}) joined ${tableRoom}`);

        // Broadcast USER_JOINED to table room
        socket.to(tableRoom).emit("USER_JOINED", {
          user: userObj,
          session: updatedSession,
        });

        // Send initial table state to the caller
        callback?.({
          success: true,
          tableRoom,
          session: updatedSession,
        });

        // Also emit TABLE_STATE_SYNC directly to caller socket
        socket.emit("TABLE_STATE_SYNC", {
          session: updatedSession,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error joining table";
        console.error(`[Socket.IO] Error in JOIN_TABLE:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR", message });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: ADD_CART_ITEM
    // ------------------------------------------------------------------------
    socket.on("ADD_CART_ITEM", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = AddCartItemSchema.safeParse(payload);
        if (!parsed.success) {
          const errMessage = parsed.error.issues[0]?.message || "Invalid ADD_CART_ITEM payload";
          console.warn(`[Socket.IO] ADD_CART_ITEM validation failed: ${errMessage}`);
          callback?.({ success: false, error: "VALIDATION_ERROR", message: errMessage });
          return;
        }

        const {
          restaurantSlug,
          tableNumber,
          menuItemId,
          name,
          priceInRupees,
          priceInCents,
          quantity,
          selectedModifiers,
          notes,
        } = parsed.data;

        const effectivePrice = priceInRupees ?? priceInCents ?? 0;

        const effectiveUserId = socket.data.userId || parsed.data.userId;
        const effectiveUserName = socket.data.userName || parsed.data.userName || "Guest";

        if (!effectiveUserId) {
          callback?.({ success: false, error: "UNAUTHORIZED", message: "User ID is required" });
          return;
        }

        const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
        const tableRoom = getTableRoom(restaurantSlug, tableNumber);

        const currentSession = await sessionStore.getSession(sessionKey);
        if (currentSession?.status === "LOCKED") {
          callback?.({
            success: false,
            error: "TABLE_LOCKED",
            message: "Table is locked while order is processing",
          });
          return;
        }

        // Attach cartItemId, addedByUserId, addedByName, and timestamp
        const cartItemId =
          parsed.data.cartItemId ||
          parsed.data.id ||
          `citem_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const cartItem: CartItem = {
          id: cartItemId,
          menuItemId,
          name,
          priceInRupees: effectivePrice,
          priceInCents: effectivePrice,
          quantity,
          selectedModifiers: selectedModifiers as CartItem["selectedModifiers"],
          notes,
          addedByUserId: effectiveUserId,
          addedByUserName: effectiveUserName,
          createdAt: Date.now(),
        };

        const updatedSession = await sessionStore.addItem(sessionKey, cartItem);

        console.log(`[Socket.IO] Item "${name}" added by "${effectiveUserName}" at ${tableRoom}`);

        // Broadcast CART_UPDATED to table room
        io.to(tableRoom).emit("CART_UPDATED", {
          cart: updatedSession.cart,
          updatedBy: effectiveUserName,
          addedItem: cartItem,
          session: updatedSession,
        });

        callback?.({
          success: true,
          cartItemId,
          session: updatedSession,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error adding item";
        console.error(`[Socket.IO] Error in ADD_CART_ITEM:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR", message });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: REMOVE_CART_ITEM
    // ------------------------------------------------------------------------
    socket.on("REMOVE_CART_ITEM", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = RemoveCartItemSchema.safeParse(payload);
        if (!parsed.success) {
          const errMessage = parsed.error.issues[0]?.message || "Invalid REMOVE_CART_ITEM payload";
          callback?.({ success: false, error: "VALIDATION_ERROR", message: errMessage });
          return;
        }

        const { restaurantSlug, tableNumber, cartItemId } = parsed.data;
        const requestingUserId = socket.data.userId || parsed.data.userId;

        if (!requestingUserId) {
          callback?.({ success: false, error: "UNAUTHORIZED", message: "User ID is required" });
          return;
        }

        const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
        const tableRoom = getTableRoom(restaurantSlug, tableNumber);

        const session = await sessionStore.getSession(sessionKey);
        if (!session) {
          callback?.({ success: false, error: "NOT_FOUND", message: "Session not found" });
          return;
        }

        const targetItem = session.cart.find((i) => i.id === cartItemId);
        if (!targetItem) {
          callback?.({ success: false, error: "NOT_FOUND", message: "Cart item not found" });
          return;
        }

        // STRICT OWNERSHIP CHECK: Must match addedByUserId!
        if (targetItem.addedByUserId !== requestingUserId) {
          const errMsg = `Cannot remove item "${targetItem.name}". Only the user who added it (${targetItem.addedByUserId}) can remove it.`;
          console.warn(`[Socket.IO] ERROR_UNAUTHORIZED: ${errMsg} (requested by ${requestingUserId})`);

          // Emit ERROR_UNAUTHORIZED to requesting socket
          socket.emit("ERROR_UNAUTHORIZED", {
            error: "ERROR_UNAUTHORIZED",
            message: errMsg,
            cartItemId,
          });

          callback?.({
            success: false,
            error: "ERROR_UNAUTHORIZED",
            message: errMsg,
          });
          return;
        }

        // Remove item from Redis session
        const updatedSession = await sessionStore.removeItem(sessionKey, cartItemId, requestingUserId);

        console.log(`[Socket.IO] Item "${targetItem.name}" (${cartItemId}) removed by owner ${requestingUserId}`);

        // Broadcast CART_UPDATED to table room
        io.to(tableRoom).emit("CART_UPDATED", {
          cart: updatedSession.cart,
          updatedBy: socket.data.userName || requestingUserId,
          removedItemId: cartItemId,
          session: updatedSession,
        });

        callback?.({
          success: true,
          session: updatedSession,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error removing item";
        console.error(`[Socket.IO] Error in REMOVE_CART_ITEM:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR", message });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: TRIGGER_REVIEW
    // ------------------------------------------------------------------------
    socket.on("TRIGGER_REVIEW", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = TriggerReviewSchema.safeParse(payload);
        if (!parsed.success) {
          const errMessage = parsed.error.issues[0]?.message || "Invalid TRIGGER_REVIEW payload";
          callback?.({ success: false, error: "VALIDATION_ERROR", message: errMessage });
          return;
        }

        const { restaurantSlug, tableNumber } = parsed.data;
        const requestingUserId = socket.data.userId || parsed.data.userId || "anonymous";
        const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
        const tableRoom = getTableRoom(restaurantSlug, tableNumber);

        // Sets table status to REVIEWING in Redis
        const updatedSession = await sessionStore.setSessionStatus(sessionKey, "REVIEWING");

        console.log(`[Socket.IO] Table review triggered at ${tableRoom} by user ${requestingUserId}`);

        // Broadcast REVIEW_MODAL_OPEN to table room
        io.to(tableRoom).emit("REVIEW_MODAL_OPEN", {
          triggeredByUserId: requestingUserId,
          triggeredByName: socket.data.userName || requestingUserId,
          session: updatedSession,
        });

        callback?.({
          success: true,
          session: updatedSession,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error triggering review";
        console.error(`[Socket.IO] Error in TRIGGER_REVIEW:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR", message });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: SUBMIT_APPROVAL
    // ------------------------------------------------------------------------
    socket.on("SUBMIT_APPROVAL", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = SubmitApprovalSchema.safeParse(payload);
        if (!parsed.success) {
          const errMessage = parsed.error.issues[0]?.message || "Invalid SUBMIT_APPROVAL payload";
          callback?.({ success: false, error: "VALIDATION_ERROR", message: errMessage });
          return;
        }

        const { restaurantSlug, tableNumber, hasApproved } = parsed.data;
        const requestingUserId = socket.data.userId || parsed.data.userId;

        if (!requestingUserId) {
          callback?.({ success: false, error: "UNAUTHORIZED", message: "User ID is required" });
          return;
        }

        const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
        const tableRoom = getTableRoom(restaurantSlug, tableNumber);
        const kdsRoom = getKdsRoom(restaurantSlug);

        // Sets user's ready status in Redis
        const updatedSession = await sessionStore.updateConsensusVote(
          sessionKey,
          requestingUserId,
          hasApproved
        );

        console.log(`[Socket.IO] Consensus vote by ${requestingUserId} at ${tableRoom}: ${hasApproved}`);

        // Check if ALL seated users have approved (unanimous consensus via approvals array)
        const totalSeatedUsers = updatedSession.users.length;
        const hasCartItems = updatedSession.cart.length > 0;
        const approvalsCount = updatedSession.approvals?.length || 0;
        const allApproved =
          totalSeatedUsers > 0 &&
          hasCartItems &&
          approvalsCount >= totalSeatedUsers;

        if (allApproved) {
          console.log(`[Socket.IO] 🎯 100% CONSENSUS REACHED at ${tableRoom}! Finalizing order...`);

          // a. Sets status to LOCKED
          await sessionStore.setSessionStatus(sessionKey, "LOCKED");

          // Snapshot of cart and round number before resetting
          const cartSnapshot = [...updatedSession.cart];
          const completedRound = updatedSession.roundNumber;
          const votesSnapshot = { ...updatedSession.consensusVotes };
          const approvalsSnapshot = [...(updatedSession.approvals || [])];

          const roundTotalInCents = cartSnapshot.reduce((sum, item) => sum + item.priceInCents * item.quantity, 0);
          const roundTotalInRupees = cartSnapshot.reduce(
            (sum, item) =>
              sum + (item.priceInRupees ?? Math.round(item.priceInCents / 100)) * item.quantity,
            0
          );

          // b. Flushes cart snapshot to PostgreSQL Order table with status SENT_TO_KITCHEN
          const dbOrder = await flushOrderToDatabase(
            restaurantSlug,
            tableNumber,
            completedRound,
            cartSnapshot,
            votesSnapshot,
            updatedSession.diningSessionId,
            "SENT_TO_KITCHEN"
          );

          // c. Emits NEW_ORDER_TICKET to room:kds:{restaurantSlug}
          const ticketPayload: KdsTicket = {
            orderId: dbOrder.orderId,
            diningSessionId: updatedSession.diningSessionId,
            restaurantSlug,
            tableNumber,
            roundNumber: completedRound,
            status: dbOrder.status,
            totalInCents: dbOrder.totalInCents,
            items: cartSnapshot,
            placedAt: new Date().toISOString(),
            approvedBy: approvalsSnapshot,
          };

          const submittedRound: SubmittedRound = {
            roundNumber: completedRound,
            orderId: dbOrder.orderId,
            items: cartSnapshot,
            roundTotalInRupees,
            roundTotalInCents,
            placedAt: new Date().toISOString(),
            approvedBy: approvalsSnapshot,
          };

          // Save to KDS fast-sync memory buffer
          const slugKey = restaurantSlug.trim().toLowerCase();
          const existingTickets = kdsOrdersBuffer.get(slugKey) || [];
          kdsOrdersBuffer.set(slugKey, [
            ticketPayload,
            ...existingTickets.filter((t) => t.orderId !== ticketPayload.orderId),
          ]);

          io.to(kdsRoom).emit("NEW_ORDER_TICKET", ticketPayload);
          console.log(`[Socket.IO] 🛎️ Emitted NEW_ORDER_TICKET to ${kdsRoom} (Order #${dbOrder.orderId})`);

          // d. Records submittedRound, increments roundNumber by 1, clears cart, resets approvals in Redis
          const nextSession = await sessionStore.resetForNextRound(sessionKey, submittedRound);

          // Emits ORDER_SUBMITTED_SUCCESS to table
          io.to(tableRoom).emit("ORDER_SUBMITTED_SUCCESS", {
            orderId: dbOrder.orderId,
            roundNumber: completedRound,
            nextRoundNumber: nextSession.roundNumber,
            ticket: ticketPayload,
            session: nextSession,
          });

          console.log(`[Socket.IO] ✅ Emitted ORDER_SUBMITTED_SUCCESS to ${tableRoom} (Next Round: #${nextSession.roundNumber})`);

          callback?.({
            success: true,
            status: "ORDER_SUBMITTED",
            orderId: dbOrder.orderId,
            session: nextSession,
          });
        } else {
          // Consensus not 100% yet: broadcast vote update to table room
          io.to(tableRoom).emit("APPROVAL_UPDATED", {
            userId: requestingUserId,
            hasApproved,
            consensusVotes: updatedSession.consensusVotes,
            totalUsers: totalSeatedUsers,
            approvedCount: Object.values(updatedSession.consensusVotes).filter(Boolean).length,
            session: updatedSession,
          });

          callback?.({
            success: true,
            status: "VOTE_RECORDED",
            session: updatedSession,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error submitting approval";
        console.error(`[Socket.IO] Error in SUBMIT_APPROVAL:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR", message });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: JOIN_KDS (Kitchen Display System)
    // ------------------------------------------------------------------------
    socket.on("JOIN_KDS", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = JoinKdsSchema.safeParse(payload);
        if (!parsed.success) {
          callback?.({ success: false, error: "VALIDATION_ERROR" });
          return;
        }

        const { restaurantSlug } = parsed.data;
        const slugKey = restaurantSlug.trim().toLowerCase();
        const kdsRoom = getKdsRoom(restaurantSlug);

        await socket.join(kdsRoom);
        socket.data.isKds = true;
        socket.data.restaurantSlug = restaurantSlug;

        console.log(`[Socket.IO] 🍳 Kitchen Display connected to ${kdsRoom} (${socket.id})`);

        // Fetch recent tickets from PostgreSQL (if available) merged with memory buffer
        let dbTickets: KdsTicket[] = [];
        try {
          const restaurant = await prisma.restaurant.findUnique({
            where: { slug: slugKey },
          });

          if (restaurant) {
            const dbOrders = await prisma.order.findMany({
              where: { restaurantId: restaurant.id },
              orderBy: { createdAt: "desc" },
              take: 50,
            });

            dbTickets = dbOrders.map((o) => {
              const payloadData = (o.payloadJson as Record<string, unknown>) || {};
              return {
                orderId: o.id,
                restaurantSlug,
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
        } catch {
          // DB offline or unreachable
          dbTickets = [];
        }

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

        callback?.({ success: true, kdsRoom, tickets: combinedTickets });
        socket.emit("KDS_CONNECTED", { kdsRoom, tickets: combinedTickets });
      } catch (err: unknown) {
        console.error(`[Socket.IO] Error in JOIN_KDS:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR" });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: KDS_UPDATE_ORDER_STATUS
    // ------------------------------------------------------------------------
    socket.on("KDS_UPDATE_ORDER_STATUS", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = KdsUpdateOrderStatusSchema.safeParse(payload);
        if (!parsed.success) {
          const errMessage = parsed.error.issues[0]?.message || "Invalid KDS_UPDATE_ORDER_STATUS payload";
          callback?.({ success: false, error: "VALIDATION_ERROR", message: errMessage });
          return;
        }

        const { restaurantSlug, orderId, status } = parsed.data;
        const slugKey = restaurantSlug.trim().toLowerCase();
        const kdsRoom = getKdsRoom(restaurantSlug);
        const completedAt =
          status === "ENTERED_INTO_POS" || status === "COMPLETED" || status === "ARCHIVED"
            ? new Date().toISOString()
            : undefined;

        // Update in-memory buffer
        const buf = kdsOrdersBuffer.get(slugKey) || [];
        const target = buf.find((t) => t.orderId === orderId);
        if (target) {
          target.status = status;
          if (completedAt) {
            target.completedAt = completedAt;
          } else if (status === "CONFIRMED") {
            delete target.completedAt;
          }
        }

        // Update in PostgreSQL if reachable
        try {
          await prisma.order.update({
            where: { id: orderId },
            data: { status },
          });
        } catch {
          // Fallback if DB offline or fallback orderId
        }

        console.log(`[Socket.IO] 🍳 KDS Ticket #${orderId} status updated to "${status}" at ${kdsRoom}`);

        // Broadcast to all KDS screens in this restaurant's room
        io.to(kdsRoom).emit("KDS_ORDER_STATUS_CHANGED", {
          orderId,
          status,
          completedAt,
        });

        callback?.({ success: true, orderId, status, completedAt });
      } catch (err: unknown) {
        console.error(`[Socket.IO] Error in KDS_UPDATE_ORDER_STATUS:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR" });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: REQUEST_FINAL_BILL (Guest requests bill & moves to AWAITING_PAYMENT)
    // ------------------------------------------------------------------------
    socket.on("REQUEST_FINAL_BILL", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = RequestFinalBillSchema.safeParse(payload);
        if (!parsed.success) {
          const errMessage = parsed.error.issues[0]?.message || "Invalid REQUEST_FINAL_BILL payload";
          callback?.({ success: false, error: "VALIDATION_ERROR", message: errMessage });
          return;
        }

        const { restaurantSlug, tableNumber } = parsed.data;
        const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
        const tableRoom = getTableRoom(restaurantSlug, tableNumber);
        const kdsRoom = getKdsRoom(restaurantSlug);

        const result = await sessionStore.requestFinalBill(sessionKey);
        console.log(`[Socket.IO] 📋 Final bill requested for Table ${tableNumber} (Bill ${result.bill.billId})`);

        // Notify guests on table
        io.to(tableRoom).emit("BILL_REQUESTED", {
          bill: result.bill,
          session: result.session,
        });

        // Notify cashier screens
        io.to(kdsRoom).emit("BILL_STATUS_UPDATED", {
          bill: result.bill,
          session: result.session,
        });

        callback?.({ success: true, bill: result.bill, session: result.session });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error requesting final bill";
        console.error(`[Socket.IO] Error in REQUEST_FINAL_BILL:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR", message });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: START_NEW_CUSTOMER_GROUP (Turnover table & preserve previous bill)
    // ------------------------------------------------------------------------
    socket.on("START_NEW_CUSTOMER_GROUP", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = StartNewCustomerGroupSchema.safeParse(payload);
        if (!parsed.success) {
          const errMessage = parsed.error.issues[0]?.message || "Invalid START_NEW_CUSTOMER_GROUP payload";
          callback?.({ success: false, error: "VALIDATION_ERROR", message: errMessage });
          return;
        }

        const { restaurantSlug, tableNumber } = parsed.data;
        const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
        const tableRoom = getTableRoom(restaurantSlug, tableNumber);
        const kdsRoom = getKdsRoom(restaurantSlug);

        const result = await sessionStore.startNewCustomerGroup(sessionKey);
        console.log(`[Socket.IO] 🔄 New customer group started at Table ${tableNumber}! Previous bill preserved for cashier.`);

        // Notify previous phones still viewing old session
        if (result.previousBill) {
          io.to(tableRoom).emit("TABLE_SESSION_CLOSED", {
            diningSessionId: result.previousBill.diningSessionId,
            tableNumber,
            message: "Thank you for dining with us! Your table bill has been closed.",
            newSession: result.newSession,
          });
        }

        // Broadcast fresh table session to table room
        io.to(tableRoom).emit("TABLE_STATE_SYNC", { session: result.newSession });

        // Broadcast updated bill queue to KDS
        io.to(kdsRoom).emit("BILL_STATUS_UPDATED", {
          previousBill: result.previousBill,
          newSession: result.newSession,
        });

        callback?.({ success: true, previousBill: result.previousBill, newSession: result.newSession });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error starting new customer group";
        console.error(`[Socket.IO] Error in START_NEW_CUSTOMER_GROUP:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR", message });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: MARK_BILL_PAID (Cashier settles specific bill)
    // ------------------------------------------------------------------------
    socket.on("MARK_BILL_PAID", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = MarkBillPaidSchema.safeParse(payload);
        if (!parsed.success) {
          const errMessage = parsed.error.issues[0]?.message || "Invalid MARK_BILL_PAID payload";
          callback?.({ success: false, error: "VALIDATION_ERROR", message: errMessage });
          return;
        }

        const { restaurantSlug, billId } = parsed.data;
        const kdsRoom = getKdsRoom(restaurantSlug);
        const slugKey = restaurantSlug.trim().toLowerCase();

        const result = await sessionStore.markBillPaid(restaurantSlug, billId);

        if (result.paidBill) {
          const tableRoom = getTableRoom(restaurantSlug, result.paidBill.tableNumber);

          // Mark matching tickets in memory buffer as COMPLETED
          const buf = kdsOrdersBuffer.get(slugKey) || [];
          for (const t of buf) {
            if (t.diningSessionId === result.paidBill.diningSessionId) {
              t.status = "COMPLETED";
              t.completedAt = new Date().toISOString();
            }
          }

          // Mark orders in DB as COMPLETED
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

          // If this was the active session currently dining on that table, notify the table
          if (result.isCurrentSession && result.newSession) {
            io.to(tableRoom).emit("TABLE_SESSION_CLOSED", {
              diningSessionId: result.paidBill.diningSessionId,
              tableNumber: result.paidBill.tableNumber,
              message: "Thank you for dining with us! Your table bill has been closed.",
              newSession: result.newSession,
            });
          }

          // Broadcast settlement to all KDS screens
          io.to(kdsRoom).emit("TABLE_BILL_SETTLED", {
            billId: result.paidBill.billId,
            tableNumber: result.paidBill.tableNumber,
            diningSessionId: result.paidBill.diningSessionId,
            bill: result.paidBill,
            isCurrentSession: result.isCurrentSession,
            newSession: result.newSession,
          });
        }

        callback?.({ success: true, ...result });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error marking bill paid";
        console.error(`[Socket.IO] Error in MARK_BILL_PAID:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR", message });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: CLOSE_AND_RESET_TABLE (Cashier Settlement & Table Turnover)
    // ------------------------------------------------------------------------
    socket.on("CLOSE_AND_RESET_TABLE", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const parsed = CloseAndResetTableSchema.safeParse(payload);
        if (!parsed.success) {
          const errMessage = parsed.error.issues[0]?.message || "Invalid CLOSE_AND_RESET_TABLE payload";
          callback?.({ success: false, error: "VALIDATION_ERROR", message: errMessage });
          return;
        }

        const { restaurantSlug, tableNumber, billId } = parsed.data;

        // If specific billId was passed, route to markBillPaid
        if (billId) {
          const paidResult = await sessionStore.markBillPaid(restaurantSlug, billId);
          if (paidResult.paidBill) {
            const kdsRoom = getKdsRoom(restaurantSlug);
            io.to(kdsRoom).emit("TABLE_BILL_SETTLED", {
              billId: paidResult.paidBill.billId,
              tableNumber: paidResult.paidBill.tableNumber,
              diningSessionId: paidResult.paidBill.diningSessionId,
              bill: paidResult.paidBill,
              isCurrentSession: paidResult.isCurrentSession,
              newSession: paidResult.newSession,
            });
          }
          callback?.({ success: true, ...paidResult });
          return;
        }

        const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
        const tableRoom = getTableRoom(restaurantSlug, tableNumber);
        const kdsRoom = getKdsRoom(restaurantSlug);
        const slugKey = restaurantSlug.trim().toLowerCase();

        const existingSession = await sessionStore.getSession(sessionKey);
        const closedDiningSessionId = existingSession?.diningSessionId;

        // Perform session close and table turnover reset
        const result = await sessionStore.closeAndResetTable(sessionKey);

        // Mark all tickets for this dining session / table as COMPLETED in memory buffer
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

        // Mark orders in PostgreSQL as COMPLETED
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

        console.log(`[Socket.IO] 💳 Table ${tableNumber} bill closed & table reset for next guests!`);

        // Broadcast TABLE_SESSION_CLOSED to all connected guest phones
        io.to(tableRoom).emit("TABLE_SESSION_CLOSED", {
          diningSessionId: closedDiningSessionId,
          tableNumber,
          message: "Thank you for dining with us! Your table bill has been closed.",
          newSession: result.newSession,
        });

        // Broadcast TABLE_BILL_SETTLED to all KDS screens
        io.to(kdsRoom).emit("TABLE_BILL_SETTLED", {
          tableNumber,
          diningSessionId: closedDiningSessionId,
          bill: result.previousBill,
          newSession: result.newSession,
        });

        callback?.({
          success: true,
          bill: result.previousBill,
          newSession: result.newSession,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal error closing table session";
        console.error(`[Socket.IO] Error in CLOSE_AND_RESET_TABLE:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR", message });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: REQUEST_SYNC (Authoritative State Recovery after Reconnect)
    // ------------------------------------------------------------------------
    socket.on("REQUEST_SYNC", async (payload: unknown, callback?: (res: unknown) => void) => {
      try {
        const schema = z.object({
          restaurantSlug: z.string().trim().min(1),
          tableNumber: z.union([
            z.number().int().positive(),
            z.string().regex(/^\d+$/).transform(Number),
          ]),
        });
        const parsed = schema.safeParse(payload);
        if (!parsed.success) {
          callback?.({ success: false, error: "VALIDATION_ERROR" });
          return;
        }

        const { restaurantSlug, tableNumber } = parsed.data;
        const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
        const session = await sessionStore.getSession(sessionKey);

        if (!session) {
          callback?.({ success: false, error: "NOT_FOUND" });
          return;
        }

        callback?.({ success: true, session });
        socket.emit("TABLE_STATE_SYNC", { session });
      } catch (err: unknown) {
        console.error(`[Socket.IO] Error in REQUEST_SYNC:`, err);
        callback?.({ success: false, error: "INTERNAL_ERROR" });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: Disconnect & Cleanup
    // ------------------------------------------------------------------------
    socket.on("disconnect", async () => {
      const { restaurantSlug, tableNumber, userId, userName } = socket.data;

      if (restaurantSlug && tableNumber && userId) {
        try {
          const sessionKey = buildSessionKey(restaurantSlug, tableNumber);
          const tableRoom = getTableRoom(restaurantSlug, tableNumber);

          const updatedSession = await sessionStore.removeUser(sessionKey, userId);

          console.log(`[Socket.IO] Diner "${userName}" (${userId}) disconnected from ${tableRoom}`);

          socket.to(tableRoom).emit("USER_LEFT", {
            userId,
            userName,
            session: updatedSession,
          });
        } catch (cleanErr) {
          console.warn(`[Socket.IO] Error during disconnect cleanup:`, cleanErr);
        }
      } else {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      }
    });
  });
}

export default registerSocketHandlers;
