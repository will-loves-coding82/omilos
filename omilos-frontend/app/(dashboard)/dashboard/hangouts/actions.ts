"use server";

import { OmilosUser, OmilosEvent } from "@/app/types";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { BASE_URL, EVENTS_ENDPOINT, USERS_ENDPOINT } from "@/app/constants";
import { hangoutDetailsSchema } from "./schemas";

export type ActionResponse<T> = {
  success: boolean,
  data: T,
  message?: string | undefined,
  error?: Record<string, string[]>,
}

export type SortOption = "newest" | "oldest"
export type FilterOption = "all" | "host" | "participant"

export async function createNewHangout(prevState: ActionResponse<Partial<OmilosEvent>>,formData: FormData) : Promise<ActionResponse<Partial<OmilosEvent>>> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, data: prevState.data, message: "Not authenticated" };
  }

  const parsed = hangoutDetailsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
  });

  const memberIds = formData.getAll("inviteeIds").map(Number).filter(id => !Number.isNaN(id));

  if (!parsed.success) {
    return {
      success: false,
      data: prevState.data,
      message: "Invalid hangout details",
      error: z.flattenError(parsed.error).fieldErrors,
    };
  }

  try {
    const res = await fetch(BASE_URL + EVENTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: parsed.data.title,
        description: parsed.data.description,
        host_id: userId,
        date: parsed.data.date,
        member_ids: memberIds,
      })
    })

    if (!res.ok) {
      return {
        success: false,
        data: prevState.data,
        message: "Failed to create hangout",
      };
    }

    const { data } = await res.json()

    return {
      success: true,
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        slug: data.slug,
      },
    };
  }
  catch(err) {
    console.error("Error fetching hangouts:", err)
    return {
      success: false,
      data: prevState.data,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function getHangoutsForUser(userId: string | null) : Promise<ActionResponse<OmilosEvent[]>> {
  if (!userId) {
    return { success: false, data: [], message: "Not authenticated" };
  }

  try {
    const params = new URLSearchParams({ userId })
    const res = await fetch(BASE_URL + EVENTS_ENDPOINT + "?" + params.toString())

    if (!res.ok) {
      return {
        success: false,
        message: "Failed to fetch hangouts",
        data: []
      }
    }

    const { data } = await res.json()
    return {
      success: true,
      data: data.events ?? []
    }
  } catch (err) {
    console.error("Error fetching hangouts:", err)
    return {
      success: false,
      message: "Failed to fetch hangouts",
      data: []
    }
  }
}


export async function searchUsers(searchQuery: string) : Promise <ActionResponse<OmilosUser[]>> {
  if (searchQuery.length === 0) {
    return {
      success: false,
      message: "Search query cannot be empty",
      data: []
    }
  }

  try {
    const params = new URLSearchParams({ search: searchQuery })
    const res = await fetch(BASE_URL + USERS_ENDPOINT + "?" + params.toString())

    if (!res.ok) {
      return {
        success: false,
        message: "Failed to search users",
        data: []
      }
    }

    const { data } = await res.json()
    return {
      success: true,
      data: data.users ?? []
    }
  } catch (err) {
    console.error("Error searching users:", err)
    return {
      success: false,
      message: "Failed to search users",
      data: []
    }
  }
}