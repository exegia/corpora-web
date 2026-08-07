import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ProjectCreator } from "./projects";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function initials(creator: ProjectCreator): string {
    const source = creator.name?.trim() || creator.username
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "").toUpperCase()
    return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}