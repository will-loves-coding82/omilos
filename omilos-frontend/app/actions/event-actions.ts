"use server";

import { auth } from "@clerk/nextjs/server";
import z from "zod";
import { eventDetailsSchema } from "../(dashboard)/dashboard/events/schemas";
import { API_ROUTES } from "../constants";
import { APIEvent, APIInvite, APIEventStop } from "../types/api";
import { ClientEventStop } from "../types/client";
import { ActionResponse, apiFetch } from "./utils";

export async function getEventsForUser(clerkId: string | null): Promise<ActionResponse<{events: APIEvent[]}>> {
  if (!clerkId) {
    return { success: false, data: {events: []}, message: "Not authenticated" };
  }

  try {
    const res = await apiFetch(API_ROUTES.events.list, {
      method: "GET"
    })

    if (!res.ok) {
      return {
        success: false,
        message: "Failed to fetch events",
        data: {events: []}
      }
    }

    const { data } = await res.json()
    return {
      success: true,
      data: {events: data.events ?? []}
    }
  } catch (err) {
    console.error("Error fetching events:", err)
    return {
      success: false,
      message: "Failed to fetch events",
      data: {events: []}
    }
  }
}

export async function createNewEvent(prevState: ActionResponse<Partial<APIEvent>>, formData: FormData): Promise<ActionResponse<Partial<APIEvent>>> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
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
      message: "Invalid event details",
      error: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const coverImage = formData.get("coverImage")

  try {
    let imageUrl: string | undefined

    if (coverImage instanceof File && coverImage.size > 0) {
      // Generate a presigned URL to upload to S3
      const presignRes = await apiFetch(API_ROUTES.presign.create(coverImage.name))
      if (!presignRes.ok) {
        return {
          success: false,
          data: prevState.data,
          message: "Failed to fetch presigned url",
        }
      }

      const { data: presignData } = await presignRes.json()
      const presigned_url = presignData.presigned_url
      
      // Upload directly to S3 using the presigned URL, which carries its own
      // auth via signed query params — apiFetch would attach our Clerk bearer
      // token, which S3 rejects since it wasn't part of the signed request.
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
    const res = await apiFetch(API_ROUTES.events.create, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      // No need to add host id since this is handled via the clerk token
      body: JSON.stringify({
        title: parsed.data.title,
        description: parsed.data.description,
        image_url: imageUrl,
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

export async function getEventStops(slug: string): Promise<ActionResponse<{stops: APIEventStop[]}>> {
  try {
    const res = await apiFetch(API_ROUTES.events.stops.list(slug), {
      method: "GET"
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Get event stops failed:", res.status, body)
      return {
        success: false,
        data: {stops: []},
        message: "Failed to fetch stops",
      }
    }

    const { data } = await res.json()
    return {
      success: true,
      data: {stops: data.stops ?? []}
    }
  } catch (err) {
    console.error("Error fetching event stops:", err)
    return {
      success: false,
      data: {stops: []},
      message: err instanceof Error ? err.message : "An unknown error occurred",
    }
  }
}

export async function addEventStop(slug: string, stop: ClientEventStop) : Promise<ActionResponse<{ id: number } | null>> {
  try {
    const res = await apiFetch(API_ROUTES.events.stops.create(slug), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(stop),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Add event stop failed:", res.status, body)
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
    console.error("Error adding event stop:", err)
    return {
      success: false,
      data: null,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    }
  }
}

export async function reorderEventStops(slug: string, stops: ClientEventStop[]) : Promise<ActionResponse<null>> {
  try {
    const res = await apiFetch(API_ROUTES.events.stops.update(slug), {
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
    console.error("Error reordering event stops:", err)
    return {
      success: false,
      data: null,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    }
  }
}

export async function deleteEventStop(slug: string, stopId: number) : Promise<ActionResponse<null>> {
  try {
    const res = await apiFetch(API_ROUTES.events.stops.delete(slug, stopId), {
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
