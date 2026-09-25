import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ProjectCreator } from "./projects"
import { type IFileIconProps as FileIconProps, FileWordmarkCorpus } from "@exegia/corpora-ui"
import type { ComponentType } from "react"
import type { CorpusDocument } from "@/lib/corpus"

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs))
}

export function formatCount(value: number | null | undefined): string | undefined {
    return value == null ? undefined : value.toLocaleString("en-US")
}

export function initials(creator: ProjectCreator): string {
    const source = creator.name?.trim() || creator.username
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "").toUpperCase()
    return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}

/** 312004 → "312K", used on the analytics column chart. */
export function formatCompact(value: number): string {
    if (value >= 1_000_000) {
        const millions = value / 1_000_000
        return `${millions >= 10 || millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`
    }
    if (value >= 1_000) return `${Math.round(value / 1_000)}K`
    return value.toLocaleString("en-US")
}

export function formatDateTime(iso: string | null): string | undefined {
    const date = iso ? new Date(iso) : null
    if (date == null || Number.isNaN(date.getTime())) return undefined
    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    })
}

export function formatSize(bytes: number | null): string {
    if (bytes === null) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function isCorpusObject(document: CorpusDocument): boolean {
    return document.source !== "huggingface" || Boolean(document.filename && /\.corpus$/i.test(document.filename))
}

/** The file type shown on the library row and detail header. */
export function formatOf(document: CorpusDocument): string {
    return isCorpusObject(document) ? ".corpus" : "Hugging Face"
}

/**
 * The corpora-ui wordmark for the library object. Converted and uploaded
 * rows are always `.corpus` (source format lives on the details card).
 */
export function fileIconFor(document: CorpusDocument): ComponentType<FileIconProps> | null {
    return isCorpusObject(document) ? FileWordmarkCorpus : null
}

export function subtitleOf(document: CorpusDocument): string {
    return `${formatOf(document)} · ${document.licence ?? "No licence"}`
}
