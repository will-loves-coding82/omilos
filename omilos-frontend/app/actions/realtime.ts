// Deliberately NOT a "use server" file: every export of one becomes a public endpoint
// that clients can call. This helper must only be called from server actions after
// the backend has confirmed a write.
import "server-only";

import { auth } from "@clerk/nextjs/server";
import { eventChannelName, type EventChannelMessage } from "../types/realtime-types";

/**
 * Publishes a message to an event's real-time channel through the AppSync Events HTTP API,
 * authenticated with the acting user's Clerk token (the namespace's publish mode is OIDC).
 * Failures are logged, not thrown: the write already succeeded, so a missed real-time
 * update shouldn't fail the action. Clients still resync on their next refetch.
 */
export async function publishEventMessage(eventId: number, message: EventChannelMessage) {
  const endpoint = process.env.NEXT_PUBLIC_APPSYNC_EVENTS_ENDPOINT;
  if (!endpoint) return;

  try {
    const { getToken } = await auth();
    const token = await getToken();
    if (!token) return;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      // AppSync expects each event as a JSON-encoded string
      body: JSON.stringify({
        channel: eventChannelName(eventId),
        events: [JSON.stringify(message)],
      }),
    });

    if (!res.ok) {
      console.error("AppSync publish failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("AppSync publish error:", err);
  }
}
