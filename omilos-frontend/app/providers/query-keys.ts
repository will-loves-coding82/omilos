export const eventKey = (slug: string) => ["event-details", slug] as const;
export const stopsKey = (eventId: number) => ["event", eventId, "stops"] as const;
export const membersKey = (eventId: number) => ["event", eventId, "members"] as const;
export const activeStopMutationKey = (eventId: number) => ["event", eventId, "active-stop"] as const;
export const stopStatusesKey = (eventId: number) => ["event", eventId, "stop-statuses"] as const;
export const userStopStatusMutationKey = (eventId: number) => ["event", eventId, "stop-status"] as const;