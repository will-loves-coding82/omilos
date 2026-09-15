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
  longitude: number
}
