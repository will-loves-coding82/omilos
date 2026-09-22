"use server";

import { auth } from "@clerk/nextjs/server";
import z from "zod";
import { eventDetailsSchema } from "../(dashboard)/dashboard/events/schemas";
import { API_ROUTES } from "../constants";
import { ClientEventStop } from "../types/client-types";
import { apiFetch } from "./utils";
import { ActionResponse } from "./action-types";
import { Event } from "../types/api-types";

export async function getEventsForUser(clerkId: string | null): Promise<ActionResponse<{events: Event[]}>> {
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

export async function createNewEvent(prevState: ActionResponse<Partial<Event>>, formData: FormData): Promise<ActionResponse<Partial<Event>>> {
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

export async function getEventDetails(slug: string): Promise<ActionResponse<{event: Event | null}>> {
  try {
    const res = await apiFetch(API_ROUTES.events.details(slug), { method: "GET" })

    if (res.status === 404) {
      return { success: false, data: { event: null }, message: "not_found" }
    }

    if (!res.ok) {
      const body = await res.text()
      console.error("Get event detailed failed:", res.status, body)
      return { success: false, data: { event: null }, message: "Failed to fetch event details" }
    }

    const { data } = await res.json()
    return { success: true, data: { event: data.event } }
  } catch (err) {
    const isAbort = err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))
    if (!isAbort) console.error("Error fetching event details:", err)
    return {
      success: false,
      data: { event: null },
      message: err instanceof Error ? err.message : "An unknown error occurred",
    }
  }
}

export async function addEventStop(eventId: number, stop: ClientEventStop) : Promise<ActionResponse<{ id: number } | null>> {
  try {
    const res = await apiFetch(API_ROUTES.events.stops.create(eventId), {
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

export async function reorderEventStops(eventId: number, stops: ClientEventStop[]) : Promise<ActionResponse<null>> {
  try {
    const res = await apiFetch(API_ROUTES.events.stops.update(eventId), {
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

export async function setActiveEventStop(eventId: number, stopId: number | null) : Promise<ActionResponse<null>> {
  try {
    const res = await apiFetch(API_ROUTES.events.stops.active(eventId), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ stop_id: stopId }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Set active event stop failed:", res.status, body)
      return {
        success: false,
        data: null,
        message: "Failed to set active stop",
      }
    }

    return {
      success: true,
      data: null,
    }
  } catch (err) {
    console.error("Error setting active event stop:", err)
    return {
      success: false,
      data: null,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    }
  }
}

export async function deleteEventStop(eventId: number, stopId: number) : Promise<ActionResponse<null>> {
  try {
    const res = await apiFetch(API_ROUTES.events.stops.delete(eventId, stopId), {
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
