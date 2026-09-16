// Shapes that only exist on the client, before something has been persisted
// or when a component needs a looser shape than the API returns.

import { APIEventStop, APIInvite } from "./api"
import type { SearchBoxRetrieveResponse } from '@mapbox/search-js-core';

export type Coordinates = {
  lon?: number,
  lat?: number
}

export type ClientUser = {
  id: number,
  clerk_id: string,
  first_name: string,
  last_name: string,
  email: string,
  image_url: string,
}

export type ClientEvent = {
    id: number,
    title: string,
    description?: string,
    slug: string,
    image_url?: string,
    date: string,
    members?: ClientUser[],
}

export type ClientEventStop = {
  id?: number,
  address: string,
  name: string,
  mapbox_id: string,
  latitude: number,
  longitude: number,
  stop_member_status_arr: ClientStopMemberStatus[]
}

export type RSVPStatus = "pending" | "accepted" | "declined";

export type ClientEventMember = {
  member: ClientUser,
  rsvp_status: RSVPStatus,
}

export type ClientInvite = {
  event: ClientEvent,
  host_user: ClientUser,
  event_member: ClientEventMember,
}

export type ClientStopStatus = "not_started" | "on_the_way" | "arrived" | "no_show";

export type ClientStopMemberStatus = {
  user: ClientUser,
  stop_id:  number,
  stop_status: ClientStopStatus,
  status_updated_at: string
}

// Helper methods to convert API responses to Client objects

export function toClientInvite(invite: APIInvite): ClientInvite {
  return {
    ...invite,
    event_member: {
      ...invite.event_member,
      rsvp_status: invite.event_member.rsvp_status as RSVPStatus,
    }
  }
}

export function toClientEventStop(stop: APIEventStop): ClientEventStop {
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

export function toEventStop(res: SearchBoxRetrieveResponse): ClientEventStop {
  return {
    address: res.features[0].properties.address ?? '',
    name: res.features[0].properties.name ?? '',
    mapbox_id: res.features[0].properties.name ?? '',
    latitude: res.features[0].properties.coordinates.latitude,
    longitude: res.features[0].properties.coordinates.longitude,
    stop_member_status_arr: [],
  }
}