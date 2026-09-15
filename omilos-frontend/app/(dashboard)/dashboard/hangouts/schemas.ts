import { z } from "zod";

export const eventDetailsSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().max(600).optional(),
  date: z.coerce.date({ error: "Date is required" }),
});

export type EventDetails = z.infer<typeof eventDetailsSchema>;
