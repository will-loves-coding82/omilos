// Shared between the server (publishers in app/actions) and the client (useEventChannel).
import type { MemberRole } from "./api-types";

// Must match the channel namespace configured on the AppSync Events API.
export const EVENTS_NAMESPACE = "events";
export const eventChannelName = (eventId: number) => `/${EVENTS_NAMESPACE}/${eventId}`;

// A member's role changed. The affected user needs to refresh, because their role is
// loaded on the server and baked into the page's permissions (EventAbilityWrapper).
export type RoleChangedMessage = { type: "role"; userId: number; newRole: MemberRole };

// Contract for messages the server publishes after a successful write.
// Messages are lightweight "something changed" signals; clients refetch the
// affected query rather than trusting payload data from the channel.
export type EventChannelMessage =
  | { type: "event" | "stops" | "members" }
  | RoleChangedMessage;
