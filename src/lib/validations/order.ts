import { z } from "zod";

export const OrderItemSchema = z.object({
  menuItemId: z.string().min(1, { message: "Menu item ID is required" }),
  name: z.string().min(1, { message: "Item name is required" }),
  price: z.number().positive({ message: "Price must be positive" }),
  quantity: z.number().int().min(1, { message: "Quantity must be at least 1" }),
  notes: z.string().optional(),
  addedBy: z.string().optional(),
});

export const CartUpdateSchema = z.object({
  tableId: z.string().min(1, { message: "Table ID is required" }),
  userId: z.string().min(1, { message: "User ID is required" }),
  userName: z.string().min(1, { message: "User name is required" }),
  action: z.enum(["add", "remove", "update", "clear"]),
  items: z.array(OrderItemSchema),
});

export const CreateOrderSchema = z.object({
  tableId: z.string().min(1, { message: "Table ID is required" }),
  tableSessionId: z.string().optional(),
  customerName: z.string().min(1, { message: "Customer name is required" }),
  items: z.array(OrderItemSchema).min(1, { message: "At least one item is required in the order" }),
  totalAmount: z.number().nonnegative({ message: "Total amount must be non-negative" }),
});

export const OrderStatusUpdateSchema = z.object({
  orderId: z.string().min(1, { message: "Order ID is required" }),
  tableId: z.string().min(1, { message: "Table ID is required" }),
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "SERVED", "PAID", "CANCELLED"]),
});

export type OrderItemInput = z.infer<typeof OrderItemSchema>;
export type CartUpdateInput = z.infer<typeof CartUpdateSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type OrderStatusUpdateInput = z.infer<typeof OrderStatusUpdateSchema>;
