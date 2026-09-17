"use client";

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