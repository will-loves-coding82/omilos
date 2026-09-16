import { API_ROUTES } from "../constants";
import { APIInvite } from "../types/api";
import { ClientInvite } from "../types/client";
import { ActionResponse, apiFetch } from "./utils";

export async function getPendingInviteCountForUser(clerkId: string | null) : Promise<ActionResponse<{count: number}>> {
  if (!clerkId) {
    return { success: false, data: {count: 0}, message: "Not authenticated" };
  }

  try {
    const res = await apiFetch(API_ROUTES.invites.pending.count, {
      method: "GET"
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Get pending invite counts failed:", res.status, body)
      return {
        success: false,
        data: { count: 0 },
        message: "Failed to fetch pending invite counts",
      }
    }

    const { data } = await res.json();
    return {
      success: true,
      data: { count: data.count }
    }
  }
  catch (err) {
    return {
      success: false,
      data: { count: 0 },
      message: err instanceof Error ? err.message : "An unknown error occurred",
    }
  }

}

export async function getAllInvitesForUser(clerkId: string | null) : Promise<ActionResponse<{sent: APIInvite[], received: APIInvite[]} | null>> {
  if (!clerkId) {
    return { success: false, data: null, message: "Not authenticated" };
  }
  try {
    const res = await apiFetch(API_ROUTES.invites.all.list, {
      method: "GET"
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("Get all invites failed:", res.status, body)
      return {
        success: false,
        data: null,
        message: "Failed to fetch all invite",
      }
    }

    const { data } = await res.json();
    return {
      success: true,
      data: {
        sent: data.sent_invites,
        received: data.pending_invites
      }
    }
  }
  catch (err) {
    return {
      success: false,
      data: null,
      message: err instanceof Error ? err.message : "An unknown error occurred",
    }
  }
}

export async function acceptInvite(invite: ClientInvite) : Promise<ActionResponse<null>> {

}

export async function declineInvite(invite: ClientInvite) : Promise<ActionResponse<null>> {

}