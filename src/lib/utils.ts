import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type EmptyObj = Record<PropertyKey, never>;

export const UNKNOWN_HOST_IP = "UNKOWN_HOST_IP" as const;
