import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilitário para mesclar classes do Tailwind com clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 