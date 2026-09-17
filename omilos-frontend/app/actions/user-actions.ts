"use server";

import { API_ROUTES } from "../constants"
import { apiFetch } from "./utils"
import { ActionResponse } from "./action-types";
import { User } from "../types/api-types";


export async function searchUsers(searchQuery: string): Promise<ActionResponse<{users: User[]}>> {
  if (searchQuery.length === 0) {
    return {
      success: false,
      message: "Search query cannot be empty",
      data: {users: []}
    }
  }

  try {
    const res = await apiFetch(API_ROUTES.users.search(searchQuery),{
      method: "GET"
    })

    if (!res.ok) {
      return {
        success: false,
        message: "Failed to search users",
        data: {users: []}
      }
    }

    const { data } = await res.json()
    return {
      success: true,
      data: {users: data.users ?? []}
    }
  } catch (err) {
    console.error("Error searching users:", err)
    return {
      success: false,
      message: "Failed to search users",
      data: {users: []}
    }
  }
}
