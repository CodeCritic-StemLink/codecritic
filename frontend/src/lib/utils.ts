import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "2h ago", "3 days ago". Kept simple on purpose, no date library needed. */
export function timeAgo(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60))

  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  return days === 1 ? "1 day ago" : `${days} days ago`
}
