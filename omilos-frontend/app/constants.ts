export const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001"
export const USERS_ENDPOINT="/users"
export const EVENTS_ENDPOINT="/events"
export const EVENTS_STOPS_ENDPOINT=EVENTS_ENDPOINT+"/stops"
export const PRESIGN_ENDPOINT="/presign"

// 1. Define host/environment configurations
export const API_ENVIRONMENTS = {
  development: 'http://localhost:3001',
  staging: '',
  production: '',
} as const;

// 2. Create a configurable API route manager
export const createApiRoutes = (baseUrl: string) => {
  return {
    presign: {
      create: (file: string) => `${baseUrl}/presign?file=${file}`
    },
    events: {
      create: `${baseUrl}/events`,
      list: `${baseUrl}/events`,
      details: (slug: string) => `${baseUrl}/events/details/${slug}`,
      stops: {
        list: (eventId: number) => `${baseUrl}/events/${eventId}/stops`,
        create: (eventId: number) => `${baseUrl}/events/${eventId}/stops`,
        update: (eventId: number) => `${baseUrl}/events/${eventId}/stops`,
        delete: (eventId: number, stopId: number) => `${baseUrl}/events/${eventId}/stops/${stopId}`,
        active: (eventId: number) => `${baseUrl}/events/${eventId}/stops/active`,
      },
    },
    invites: {
      pending: {
        count: `${baseUrl}/invites/pending/count`
      },
      all: {
        list: `${baseUrl}/invites/all`
      },
      update: `${baseUrl}/invites`
    },
    users: {
      create: `${baseUrl}/users`,
      search: (searchQuery: string) => `${baseUrl}/users?search=${searchQuery}`
    }
  } as const; // Use 'as const' to make properties read-only and preserve exact literal types
};

// 3. Initialize the routes with your desired host configuration
const currentHost = process.env.NEXT_PUBLIC_API_URL || API_ENVIRONMENTS.development;

export const API_ROUTES = createApiRoutes(currentHost);

// 4. (Optional) Extract a type for your API routes structure
export type ApiRoutes = ReturnType<typeof createApiRoutes>;
