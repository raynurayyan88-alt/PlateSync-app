import { z } from "zod";

export const TableSessionSchema = z.object({
  tableNumber: z.number().int().positive({ message: "Table number must be positive" }),
  restaurantId: z.string().min(1, { message: "Restaurant ID is required" }),
  customerName: z.string().min(1, { message: "Customer name is required" }).max(50),
});

export const JoinTableSchema = z.object({
  tableId: z.string().min(1, { message: "Table ID is required" }),
  userId: z.string().min(1, { message: "User ID is required" }),
  userName: z.string().min(1, { message: "User name is required" }),
});

export type TableSessionInput = z.infer<typeof TableSessionSchema>;
export type JoinTableInput = z.infer<typeof JoinTableSchema>;
