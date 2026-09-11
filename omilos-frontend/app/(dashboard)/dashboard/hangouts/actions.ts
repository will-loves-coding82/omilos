"use server";

import { Hangout } from "@/app/types";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { hangoutDetailsSchema } from "./schemas";

export type ActionResponse<T> = {
  success: boolean,
  data: T,
  message?: string | undefined,
  error?: Record<string, string[]>,
}

export type SortOption = "newest" | "oldest"
export type FilterOption = "all" | "host" | "participant"

export async function createNewHangout(prevState: ActionResponse<Hangout>,formData: FormData) : Promise<ActionResponse<Hangout>> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, data: prevState.data, message: "Not authenticated" };
  }

  const parsed = hangoutDetailsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
  });

  if (!parsed.success) {
    return {
      success: false,
      data: prevState.data,
      message: "Invalid hangout details",
      error: z.flattenError(parsed.error).fieldErrors,
    };
  }

  return {
    success: true,
    data: {
      id: 0,
      title: parsed.data.title,
      description: parsed.data.description,
    },
  };
}

export async function getHangoutsForUser(userId: string | null) : Promise<ActionResponse<Hangout[]>> {
  return {success: true, data: [{title: "example 1", id: 1}, {title: "example 2", id: 2}, {title: "example 3", id: 3}, {title: "example 4", id: 4}]}
}