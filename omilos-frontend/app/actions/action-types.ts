export type ActionResponse<T> = {
  success: boolean,
  data: T,
  message?: string | undefined,
  error?: Record<string, string[]>,
}