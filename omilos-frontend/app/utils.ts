"use client";

// events.date is a Postgres DATE — a calendar day with no time or zone, which
// the API serializes as UTC midnight. Parsing that with `new Date()` and
// rendering it locally shifts the day backwards west of UTC, so calendar dates
// are read and written through the UTC fields rather than the local ones.

export function parseEventDate(dateStr: string): Date | undefined {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Anchors the picked calendar day at UTC midnight so the DATE column stores
// the day the user actually selected, rather than the previous one.
export function toEventDateString(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

export function formatEventDate(dateStr: string): string {
  return parseEventDate(dateStr)?.toDateString() ?? "";
}

export function formatElapsedTime(timestamptzStr: string): string {
  const pastTime = new Date(timestamptzStr).getTime();
  const currentTime = Date.now();
  const elapsedMs = currentTime - pastTime;

  // Handle future dates if necessary
  if (elapsedMs < 60000) return "now";

  // Calculate total total hours and remaining minutes
  const totalMinutes = Math.floor(elapsedMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Pad numbers with leading zeros (e.g., 4 -> "04")
  const paddedHours = String(hours).padStart(1, '0');
  const paddedMinutes = String(minutes).padStart(1, '0');

  return "  " + `${hours > 0 ? paddedHours+"h" : ""} ${minutes > 0 ? paddedMinutes+"m" : ""} ago`;
}