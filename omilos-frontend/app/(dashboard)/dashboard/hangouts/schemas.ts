import { z } from "zod";

export const hangoutDetailsSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().max(600).optional(),
  date: z.coerce.date({ error: "Date is required" }),
});

export type HangoutDetails = z.infer<typeof hangoutDetailsSchema>;
