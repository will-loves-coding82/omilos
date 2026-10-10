// Shapes that only exist on the client, before something has been persisted
// or when a component needs a looser shape than the API returns.
// Mixing of API and Client types is allowed on specific use cases,
// especially when using type literals

import { Event, EventMember, EventStop, Invite, MemberRole, RSVPStatus, StopStatus } from "./api-types"
import type { SearchBoxRetrieveResponse } from '@mapbox/search-js-core';

export type Coordinates = {
  lon?: number,
  lat?: number
}

export type ClientEvent = {
    id: number,
    host_id: number,
    active_stop_id?: number | null,
    title: string,
    description?: string,
    slug: string,
    image_url?: string,
    date: string,
    members: ClientEventMember[],
    member_role: MemberRole,
}

export type ClientEventStop = {
  id?: number,
  event_id?: number,
  sort_id?: number,
  mapbox_id: string,
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  stop_member_status_arr?: ClientStopMemberStatus[]
}


export type ClientEventMember = {
  user: ClientUser,
  rsvp_status: RSVPStatus,
  status_updated_at: string,
  member_role: MemberRole,
  created_at: string
}

export type ClientInvite = {
  event: ClientEvent,
  host_user: ClientUser,
  event_member: ClientEventMember,
}

export type ClientStopMemberStatus = {
  user_id?: number, // unknown client-side until the server confirms a new entry
  clerk_id: string,
  stop_id:  number,
  stop_status: StopStatus,
  status_updated_at: string
}

export type ClientUser = {
  id: number,
  clerk_id: string,
  username: string,
  first_name: string,
  last_name: string,
  email: string,
  image_url?: string,
}


// Helper methods to convert to Client objects

export function toClientEvent(event: Event): ClientEvent {
  return {
    ...event,
    members: event.members?.map(toClientEventMember) ?? [],
    member_role: event.member_role,
  }
}

export function toClientEventStop(stop: EventStop): ClientEventStop {
  return {
    id: stop.id,
    event_id: stop.event_id,
    address: stop.address,
    name: stop.name,
    sort_id: stop.sort_id,
    mapbox_id: String(stop.mapbox_id),
    latitude: stop.latitude,
    longitude: stop.longitude,
    stop_member_status_arr: stop.stop_member_status_arr
  }
}

export function searchResultToClientEventStop(res: SearchBoxRetrieveResponse): ClientEventStop {
  return {
    mapbox_id: res.features[0].properties.mapbox_id ?? '',
    address: res.features[0].properties.address ?? '',
    name: res.features[0].properties.name ?? '',
    latitude: res.features[0].properties.coordinates.latitude,
    longitude: res.features[0].properties.coordinates.longitude,

  }
}

export function toClientEventMember(member: EventMember): ClientEventMember {
  // Reading an event/invite always returns a fully-enriched member (user, rsvp_status,
  // timestamps all populated). The API type marks these optional because the same Go
  // struct is also used somewhere the fields aren't set yet — safe to assert here.
  return {
    user: member.user!,
    rsvp_status: member.rsvp_status! as RSVPStatus,
    member_role: member.member_role,
    status_updated_at: member.status_updated_at!,
    created_at: member.created_at!,
  }
}

export function toClientInvite(invite: Invite): ClientInvite {
  return {
    ...invite,
    event: toClientEvent(invite.event),
    event_member: toClientEventMember(invite.event_member),
  }
}