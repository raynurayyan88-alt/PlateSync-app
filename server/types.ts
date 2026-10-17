import {
  CartUpdateInput,
  CreateOrderInput,
  JoinTableInput,
  OrderStatusUpdateInput,
} from "../src/lib/validations";

export interface ServerToClientEvents {
  "table:user_joined": (data: { userId: string; userName: string; participantCount: number }) => void;
  "table:user_left": (data: { userId: string; userName: string; participantCount: number }) => void;
  "cart:updated": (data: CartUpdateInput) => void;
  "order:new": (data: CreateOrderInput & { orderId: string; placedAt: string }) => void;
  "order:status_changed": (data: OrderStatusUpdateInput & { updatedAt: string }) => void;
  "table:notification": (data: { message: string; type: "info" | "success" | "warning" }) => void;
}

export interface ClientToServerEvents {
  "table:join": (data: JoinTableInput, callback?: (response: { success: boolean; message: string; participants: number }) => void) => void;
  "table:leave": (data: { tableId: string; userId: string; userName: string }) => void;
  "cart:update": (data: CartUpdateInput, callback?: (response: { success: boolean }) => void) => void;
  "order:place": (data: CreateOrderInput, callback?: (response: { success: boolean; orderId: string }) => void) => void;
  "order:update_status": (data: OrderStatusUpdateInput, callback?: (response: { success: boolean }) => void) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId?: string;
  userName?: string;
  tableId?: string;
}
