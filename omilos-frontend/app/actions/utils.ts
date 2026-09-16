import { auth } from "@clerk/nextjs/server";

export type ActionResponse<T> = {
  success: boolean,
  data: T,
  message?: string | undefined,
  error?: Record<string, string[]>,
}

export async function apiFetch(url: string, init: RequestInit = {}) : Promise<Response> {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    }
  })
}