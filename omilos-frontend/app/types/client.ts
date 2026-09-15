// Shapes that only exist on the client, before something has been persisted
// or when a component needs a looser shape than the API returns.

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

export type ClientStopStatus = "not_started" | "on_the_way" | "arrived" | "no_show";

export type ClientStopMemberStatus = {
  user: ClientUser,
  stop_id:  number,
  stop_status: ClientStopStatus,
  status_updated_at: string
}