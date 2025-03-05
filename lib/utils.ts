import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with Tailwind's utility classes
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
  }