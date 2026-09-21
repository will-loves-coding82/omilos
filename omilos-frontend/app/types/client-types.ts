// Shapes that only exist on the client, before something has been persisted
// or when a component needs a looser shape than the API returns.

import { Event, EventMember, EventStop, Invite } from "./api-types"
import type { SearchBoxRetrieveResponse } from '@mapbox/search-js-core';

export type Coordinates = {
  lon?: number,
  lat?: number
}

export type ClientEvent = {
    id: number,
    host_id: number,
    active_stop_id?: number,
    title: string,
    description?: string,
    slug: string,
    image_url?: string,
    date: string,
    members: ClientEventMember[],
    stops: ClientEventStop[],
}

export type ClientEventStop = {
  id?: number,
  address: string,
  name: string,
  mapbox_id: string,
  latitude: number,
  longitude: number,
  stop_member_status_arr?: ClientStopMemberStatus[]
}

export type RSVPStatus = "pending" | "accepted" | "declined";

export type ClientEventMember = {
  user: ClientUser,
  rsvp_status: RSVPStatus,
  status_updated_at: string,
  created_at: string
}

export type ClientInvite = {
  event: ClientEvent,
  host_user: ClientUser,
  event_member: ClientEventMember,
}

export type ClientStopStatus = "not_started" | "on_the_way" | "arrived" | "no_show";

export type ClientStopMemberStatus = {
  user_id: number,
  stop_id:  number,
  stop_status: ClientStopStatus,
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
export function toClientEventStop(stop: EventStop): ClientEventStop {
  return {
    id: stop.id,
    address: stop.address,
    name: stop.name,
    mapbox_id: String(stop.id),
    latitude: stop.latitude,
    longitude: stop.longitude,
    stop_member_status_arr: stop.stop_member_status_arr
  }
}

export function searchResultToClientEventStop(res: SearchBoxRetrieveResponse): ClientEventStop {
  return {
    address: res.features[0].properties.address ?? '',
    name: res.features[0].properties.name ?? '',
    mapbox_id: res.features[0].properties.name ?? '',
    latitude: res.features[0].properties.coordinates.latitude,
    longitude: res.features[0].properties.coordinates.longitude,
    stop_member_status_arr: [],
  }
}

export function toClientEventMember(member: EventMember): ClientEventMember {
  // Reading an event/invite always returns a fully-enriched member (user, rsvp_status,
  // timestamps all populated). The API type marks these optional because the same Go
  // struct is also used somewhere the fields aren't set yet — safe to assert here.
  return {
    user: member.user!,
    rsvp_status: member.rsvp_status! as RSVPStatus,
    status_updated_at: member.status_updated_at!,
    created_at: member.created_at!,
  }
}

export function toClientEvent(event: Event): ClientEvent {
  return {
    ...event,
    members: event.members?.map(toClientEventMember) ?? [],
    stops: event.stops?.map(toClientEventStop) ?? [],
  }
}

export function toClientInvite(invite: Invite): ClientInvite {
  return {
    ...invite,
    event: toClientEvent(invite.event),
    event_member: toClientEventMember(invite.event_member),
  }
}