import type { CartItem, SubmittedRound } from "@/server/sessionStore";

export type TicketStatus = "CONFIRMED" | "ENTERED_INTO_POS" | "SERVED" | "COMPLETED" | "ARCHIVED";

export interface KdsTicket {
  orderId: string;
  diningSessionId?: string;
  restaurantSlug: string;
  tableNumber: number;
  roundNumber: number;
  status: TicketStatus | string;
  totalInCents: number;
  items: CartItem[];
  placedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp when marked served/entered/completed
  approvedBy: string[];
}

export type BillStatus = "DINING" | "AWAITING_PAYMENT" | "PAID";

export interface CashierBill {
  billId: string;
  diningSessionId: string;
  restaurantSlug: string;
  tableNumber: number;
  guestNames: string[];
  rounds: SubmittedRound[];
  grandTotalInRupees: number;
  grandTotalInCents: number;
  billStatus: BillStatus;
  createdAt: string;
  closedAt?: string;
}

export interface CompletedTableBill {
  billId?: string;
  diningSessionId: string;
  restaurantSlug: string;
  tableNumber: number;
  guests: string[];
  guestNames?: string[];
  rounds: SubmittedRound[];
  grandTotalInRupees: number;
  grandTotalInCents: number;
  closedAt: string;
  billStatus?: BillStatus;
}

export interface KdsInitialStatePayload {
  restaurantSlug: string;
  tickets: KdsTicket[];
}

export interface KdsOrderStatusChangePayload {
  orderId: string;
  status: TicketStatus | string;
  completedAt?: string;
}
