// Shared between the server (publishers in app/actions) and the client (useEventChannel).
import type { MemberRole } from "./api-types";

// Must match the channel namespace configured on the AppSync Events API.
export const EVENTS_NAMESPACE = "events";
export const eventChannelName = (eventId: number) => `/${EVENTS_NAMESPACE}/${eventId}`;

// A member's role changed. The affected user needs to refresh, because their role is
// loaded on the server and baked into the page's permissions (EventAbilityWrapper).
export type RoleChangedMessage = { type: "role"; userId: number; newRole: MemberRole };

// Contract for messages the server publishes after a successful write.
// Messages describe what changed; the client decides which caches that affects
// and refetches them rather than trusting payload data from the channel.
//   "event"        event details or active stop changed
//   "stops"        stop list, order, or member statuses changed
//   "stop_deleted" a stop was removed (may also clear the event's active stop)
//   "members"      member list changed
export type EventChannelMessage =
  | { type: "event" | "stops" | "stop_deleted" | "members" }
  | RoleChangedMessage;
