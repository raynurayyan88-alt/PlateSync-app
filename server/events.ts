import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types";
import {
  CartUpdateSchema,
  CreateOrderSchema,
  JoinTableSchema,
  OrderStatusUpdateSchema,
} from "../src/lib/validations";

type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Track active users per table: tableId -> Map<userId, userName>
const tableParticipants = new Map<string, Map<string, string>>();

export function registerSocketHandlers(io: TypedServer) {
  io.on("connection", (socket: TypedSocket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join a specific table session room
    socket.on("table:join", (data, callback) => {
      const parsed = JoinTableSchema.safeParse(data);
      if (!parsed.success) {
        callback?.({
          success: false,
          message: parsed.error.issues[0]?.message || "Invalid payload",
          participants: 0,
        });
        return;
      }

      const { tableId, userId, userName } = parsed.data;
      const roomName = `table:${tableId}`;

      socket.join(roomName);
      socket.data.userId = userId;
      socket.data.userName = userName;
      socket.data.tableId = tableId;

      if (!tableParticipants.has(tableId)) {
        tableParticipants.set(tableId, new Map());
      }
      tableParticipants.get(tableId)!.set(userId, userName);

      const count = tableParticipants.get(tableId)?.size ?? 1;

      console.log(`[Socket] ${userName} (${userId}) joined room ${roomName}. Total participants: ${count}`);

      // Broadcast to everyone else in this table room
      socket.to(roomName).emit("table:user_joined", {
        userId,
        userName,
        participantCount: count,
      });

      callback?.({
        success: true,
        message: `Joined table ${tableId}`,
        participants: count,
      });
    });

    // Leave table session room
    socket.on("table:leave", (data) => {
      const { tableId, userId, userName } = data;
      const roomName = `table:${tableId}`;

      socket.leave(roomName);
      if (tableParticipants.has(tableId)) {
        tableParticipants.get(tableId)?.delete(userId);
        if (tableParticipants.get(tableId)?.size === 0) {
          tableParticipants.delete(tableId);
        }
      }

      const remaining = tableParticipants.get(tableId)?.size ?? 0;
      console.log(`[Socket] ${userName} left room ${roomName}. Remaining: ${remaining}`);

      socket.to(roomName).emit("table:user_left", {
        userId,
        userName,
        participantCount: remaining,
      });
    });

    // Real-time collaborative cart update
    socket.on("cart:update", (data, callback) => {
      const parsed = CartUpdateSchema.safeParse(data);
      if (!parsed.success) {
        callback?.({ success: false });
        return;
      }

      const roomName = `table:${parsed.data.tableId}`;
      console.log(`[Socket] Cart updated at ${roomName} by ${parsed.data.userName} (${parsed.data.action})`);

      // Broadcast cart state to other diners at the table
      socket.to(roomName).emit("cart:updated", parsed.data);
      callback?.({ success: true });
    });

    // Real-time order placement
    socket.on("order:place", (data, callback) => {
      const parsed = CreateOrderSchema.safeParse(data);
      if (!parsed.success) {
        callback?.({ success: false, orderId: "" });
        return;
      }

      const orderId = `ord_${Date.now()}`;
      const roomName = `table:${parsed.data.tableId}`;
      const payload = {
        ...parsed.data,
        orderId,
        placedAt: new Date().toISOString(),
      };

      console.log(`[Socket] Order placed for ${roomName}: Order #${orderId}`);

      // Broadcast order to diners at the table and kitchen
      io.to(roomName).emit("order:new", payload);
      io.to("kitchen").emit("order:new", payload);

      callback?.({ success: true, orderId });
    });

    // Real-time order status update (e.g., kitchen prepares / serves)
    socket.on("order:update_status", (data, callback) => {
      const parsed = OrderStatusUpdateSchema.safeParse(data);
      if (!parsed.success) {
        callback?.({ success: false });
        return;
      }

      const roomName = `table:${parsed.data.tableId}`;
      const payload = {
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      };

      console.log(`[Socket] Order #${parsed.data.orderId} status changed to ${parsed.data.status}`);

      io.to(roomName).emit("order:status_changed", payload);
      callback?.({ success: true });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const { tableId, userId, userName } = socket.data;
      if (tableId && userId && userName) {
        if (tableParticipants.has(tableId)) {
          tableParticipants.get(tableId)?.delete(userId);
          if (tableParticipants.get(tableId)?.size === 0) {
            tableParticipants.delete(tableId);
          }
        }
        const remaining = tableParticipants.get(tableId)?.size ?? 0;
        console.log(`[Socket] Disconnected: ${userName} left table ${tableId}. Remaining: ${remaining}`);

        socket.to(`table:${tableId}`).emit("table:user_left", {
          userId,
          userName,
          participantCount: remaining,
        });
      } else {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      }
    });
  });
}

export function getStats() {
  return {
    activeTables: tableParticipants.size,
    tables: Array.from(tableParticipants.entries()).map(([tableId, users]) => ({
      tableId,
      participantCount: users.size,
      participants: Array.from(users.values()),
    })),
  };
}
