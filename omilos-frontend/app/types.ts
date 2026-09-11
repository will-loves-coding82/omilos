

export type OmilosUser = {
  id: number,
  clerk_id: string,
  first_name: string,
  last_name: string,
  email: string,
  image_url: string,
}

export type OmilosEvent = {
  id: number,
  title: string,
  description?: string,
  slug: string,
  image_url?: string,
  date: string,
  members?: OmilosUser[],
}