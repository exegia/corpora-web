// Version history extraction (003): a .corpus file is a zip archive that may
// carry its repository's nested .git directory. This module unzips the
// archive in the browser, mounts the .git tree on a minimal in-memory fs, and
// reads the commit log with isomorphic-git. No network, no persistence — the
// caller stores the resulting commits via lib/corpus.

import { Buffer } from "buffer"
import { unzipSync } from "fflate"
import git from "isomorphic-git"
import type { CorpusCommitInput } from "@/lib/corpus"
import { DataError } from "@/lib/projects"

// isomorphic-git assumes the Node Buffer global; browsers don't have one and
// Vite does not polyfill it, so its object reads fail silently without this.
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer
}

const MAX_COMMITS = 500

type Stats = {
  type: "file" | "dir"
  mode: number
  size: number
  ino: number
  mtimeMs: number
  ctimeMs: number
  uid: number
  gid: number
  dev: number
  isFile: () => boolean
  isDirectory: () => boolean
  isSymbolicLink: () => boolean
}

function enoent(path: string): NodeJS.ErrnoException {
  const error = new Error(`ENOENT: ${path}`) as NodeJS.ErrnoException
  error.code = "ENOENT"
  return error
}

function stats(type: "file" | "dir", size: number): Stats {
  return {
    type,
    mode: type === "dir" ? 0o40000 : 0o100644,
    size,
    ino: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    uid: 1,
    gid: 1,
    dev: 1,
    isFile: () => type === "file",
    isDirectory: () => type === "dir",
    isSymbolicLink: () => false,
  }
}

/**
 * Read-only in-memory fs exposing the promise API isomorphic-git consumes.
 * Paths are normalized absolute strings; directories are derived from the
 * file paths written into it.
 */
function makeMemFs(files: Map<string, Uint8Array>) {
  const dirs = new Set<string>(["/"])
  for (const path of files.keys()) {
    const parts = path.split("/").slice(1, -1)
    let current = ""
    for (const part of parts) {
      current += `/${part}`
      dirs.add(current)
    }
  }

  const normalize = (path: string) =>
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path

  const readFile = async (
    path: string,
    options?: { encoding?: string } | string,
  ) => {
    const data = files.get(normalize(path))
    if (data === undefined) throw enoent(path)
    const encoding = typeof options === "string" ? options : options?.encoding
    return encoding === "utf8" ? new TextDecoder().decode(data) : data
  }

  const stat = async (path: string) => {
    const key = normalize(path)
    const data = files.get(key)
    if (data !== undefined) return stats("file", data.byteLength)
    if (dirs.has(key)) return stats("dir", 0)
    throw enoent(path)
  }

  const readdir = async (path: string) => {
    const key = normalize(path)
    if (!dirs.has(key)) throw enoent(path)
    const prefix = key === "/" ? "/" : `${key}/`
    const names = new Set<string>()
    for (const candidate of [...files.keys(), ...dirs]) {
      if (candidate !== key && candidate.startsWith(prefix)) {
        names.add(candidate.slice(prefix.length).split("/")[0])
      }
    }
    return [...names]
  }

  const readonly = async () => {
    throw new Error("read-only fs")
  }

  return {
    promises: {
      readFile,
      readdir,
      stat,
      lstat: stat,
      readlink: async (path: string) => {
        throw enoent(path)
      },
      writeFile: readonly,
      mkdir: readonly,
      rmdir: readonly,
      unlink: readonly,
      symlink: readonly,
    },
  }
}

/**
 * Extract the commit history from the archive's nested .git directory.
 * Returns null when the archive carries no .git; throws a validation
 * DataError when the file is not a readable zip archive.
 */
export async function extractCorpusHistory(
  file: File,
): Promise<CorpusCommitInput[] | null> {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new DataError(
      "validation",
      "This does not look like a valid .corpus archive.",
    )
  }

  // The .git directory may sit at the archive root or under one folder —
  // pick the shallowest HEAD as the repository root.
  const heads = Object.keys(entries)
    .filter((name) => name === ".git/HEAD" || name.endsWith("/.git/HEAD"))
    .sort((a, b) => a.length - b.length)
  if (heads.length === 0) return null
  const gitPrefix = heads[0].slice(0, -"HEAD".length)

  const files = new Map<string, Uint8Array>()
  for (const [name, data] of Object.entries(entries)) {
    if (name.startsWith(gitPrefix) && !name.endsWith("/")) {
      files.set(`/repo/.git/${name.slice(gitPrefix.length)}`, data)
    }
  }

  const fs = makeMemFs(files)
  try {
    const [branch, log] = await Promise.all([
      git.currentBranch({ fs, dir: "/repo", fullname: false }),
      git.log({ fs, dir: "/repo", depth: MAX_COMMITS }),
    ])
    return log.map((entry) => ({
      sha: entry.oid,
      message: entry.commit.message.trim(),
      authorName: entry.commit.author?.name ?? null,
      authorEmail: entry.commit.author?.email ?? null,
      branch: branch ?? null,
      committedAt: entry.commit.author
        ? new Date(entry.commit.author.timestamp * 1000).toISOString()
        : null,
    }))
  } catch (error) {
    console.error("[corpus-history] could not read the .git history", error)
    throw new DataError(
      "validation",
      "The corpus carries a .git directory but its history could not be read.",
    )
  }
}
