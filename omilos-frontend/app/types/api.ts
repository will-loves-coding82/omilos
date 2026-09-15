// Shapes that exactly mirror the backend API/DB response payloads.
// Anything server-assigned (ids, sort order, timestamps) is required here,
// not optional — if a value doesn't exist yet, it belongs in types/client.ts instead.

export type APIUser = {
  id: number,
  clerk_id: string,
  first_name: string,
  last_name: string,
  email: string,
  image_url: string,
}

export type APIEvent = {
  id: number,
  title: string,
  description?: string,
  slug: string,
  image_url?: string,
  date: string,
  members?: APIUser[],
}

export type APIEventStop = {
  id: number,
  event_id: number,
  address: string,
  name: string,
  sort_id: number,
  latitude: number,
  longitude: number,
  stop_member_status_arr: APIStopMemberStatus[],
}

export type APIEventMember = {
  member: APIUser,
  rsvp_status: string,
}

export type APIInvite = {
  event: APIEvent,
  host_user: APIUser,
  event_member: APIEventMember,
}


export type APIStopStatus = "not_started" | "on_the_way" | "arrived" | "no_show";
export type APIStopMemberStatus = {
  user: APIUser,
  stop_id:  number,
  stop_status: APIStopStatus,
  status_updated_at: string,
}
