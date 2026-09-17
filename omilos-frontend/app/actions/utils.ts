"use server";

import { auth } from "@clerk/nextjs/server";

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