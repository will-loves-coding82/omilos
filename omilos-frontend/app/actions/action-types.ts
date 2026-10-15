
export type ActionResponse<T, Extra extends object = object> = {
  success: boolean,
  data: T,
  message?: string | undefined,
  error?: Record<string, string[]>,
} & Extra;