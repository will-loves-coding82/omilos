"use server";

import { APIUser, APIEvent, APIEventStop } from "@/app/types/api";
import { ClientEventStop } from "@/app/types/client";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { API_ROUTES } from "@/app/constants";
import { eventDetailsSchema } from "./schemas";

export type ActionResponse<T> = {
  success: boolean,
  data: T,
  message?: string | undefined,
  error?: Record<string, string[]>,
}

export type SortOption = "newest" | "oldest"
export type FilterOption = "all" | "host" | "participant"


export async function searchUsers(searchQuery: string): Promise<ActionResponse<APIUser[]>> {
  if (searchQuery.length === 0) {
    return {
      success: false,
      message: "Search query cannot be empty",
      data: []
    }
  }

  try {
    const res = await fetch(API_ROUTES.users.search(searchQuery),{
      method: "GET"
    })

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

export async function getEventsForUser(userId: string | null): Promise<ActionResponse<APIEvent[]>> {
  if (!userId) {
    return { success: false, data: [], message: "Not authenticated" };
  }

  try {
    const res = await fetch(API_ROUTES.events.list(userId), {
      method: "GET"
    })

    if (!res.ok) {
      return {
        success: false,
        message: "Failed to fetch events",
        data: []
      }
    }

    const { data } = await res.json()
    return {
      success: true,
      data: data.events ?? []
    }
  } catch (err) {
    console.error("Error fetching events:", err)
    return {
      success: false,
      message: "Failed to fetch events",
      data: []
    }
  }
}


export async function createNewEvent(prevState: ActionResponse<Partial<APIEvent>>, formData: FormData): Promise<ActionResponse<Partial<APIEvent>>> {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, data: prevState.data, message: "Not authenticated" };
  }

  const parsed = eventDetailsSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    date: formData.get("date")
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

  const coverImage = formData.get("coverImage")

  try {
    let imageUrl: string | undefined

    if (coverImage instanceof File && coverImage.size > 0) {
      // Generate a presigned URL to upload to S3
      const presignRes = await fetch(API_ROUTES.presign.create(coverImage.name))
      if (!presignRes.ok) {
        return {
          success: false,
          data: prevState.data,
          message: "Failed to fetch presigned url",
        }
      }

      const { data: presignData } = await presignRes.json()
      const presigned_url = presignData.presigned_url
      
      // Upload the file to AWS S3
      const imageBytes = await coverImage.arrayBuffer()
      const uploadRes = await fetch(presigned_url, {
        method: "PUT",
        headers: { "Content-Type": coverImage.type },
        body: imageBytes,
      })

      if (!uploadRes.ok) {
        const body = await uploadRes.text()
        console.error("S3 upload failed:", uploadRes.status, body)
        return {
          success: false,
          data: prevState.data,
          message: "Failed to upload cover image",
        }
      }

      imageUrl = presigned_url.split("?")[0]
    }

    // Save the new event in the database
    const res = await fetch(API_ROUTES.events.create, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: parsed.data.title,
        description: parsed.data.description,
        image_url: imageUrl,
        host_id: userId,
        date: parsed.data.date,
        member_ids: memberIds,
      })
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Event creation failed:", res.status, body)
      return {
        success: false,
        data: prevState.data,
        message: "Failed to create event",
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
  catch (err) {
    console.error("Error creating event:", err)
    return {
      success: false,
      data: prevState.data,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    };
  }
}

export async function getEventStops(slug: string): Promise<ActionResponse<APIEventStop[]>> {
  try {
    const res = await fetch(API_ROUTES.events.stops.list(slug), {
      method: "GET"
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Get event stops failed:", res.status, body)
      return {
        success: false,
        data: [],
        message: "Failed to fetch stops",
      }
    }

    const { data } = await res.json()
    return {
      success: true,
      data: data.stops ?? []
    }
  } catch (err) {
    console.error("Error fetching event stops:", err)
    return {
      success: false,
      data: [],
      message: err instanceof Error ? err.message : "An unknown error occurred",
    }
  }
}

export async function addEventStop(slug: string, stop: ClientEventStop) : Promise<ActionResponse<{ id: number } | null>> {
  try {
    const res = await fetch(API_ROUTES.events.stops.create(slug), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(stop),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Add hangout stop failed:", res.status, body)
      return {
        success: false,
        data: null,
        message: "Failed to add stop",
      }
    }

    const { data } = await res.json()
    return {
      success: true,
      data,
    }
  } catch (err) {
    console.error("Error adding hangout stop:", err)
    return {
      success: false,
      data: null,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    }
  }
}

export async function reorderEventStops(slug: string, stops: ClientEventStop[]) : Promise<ActionResponse<null>> {
  try {
    const res = await fetch(API_ROUTES.events.stops.update(slug), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(stops),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Reorder event stops failed:", res.status, body)
      return {
        success: false,
        data: null,
        message: "Failed to reorder stops",
      }
    }

    return {
      success: true,
      data: null,
    }
  } catch (err) {
    console.error("Error reordering hangout stops:", err)
    return {
      success: false,
      data: null,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    }
  }
}

export async function deleteEventStop(slug: string, stopId: number) : Promise<ActionResponse<null>> {
  try {
    const res = await fetch(API_ROUTES.events.stops.delete(slug, stopId), {
      method: "DELETE"
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Delete event stop failed:", res.status, body)
      return {
        success: false,
        data: null,
        message: "Failed to delete stop"
      }
    }

    return {
      success: true,
      data: null
    }
  }
  catch (err) {
    return {
      success: false,
      data: null,
      message: err instanceof Error ? err.message : "An unknown error occurred"
    }
  }
}



