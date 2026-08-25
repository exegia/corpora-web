import type { Profile, ProfileUpdate } from "./types"

export function asOptional(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function toProfile(metadata: Record<string, unknown>): Profile {
  return {
    // Password signups write `name`; OAuth providers write `full_name`.
    name: asOptional(metadata.name) ?? asOptional(metadata.full_name),
    username: asOptional(metadata.username),
    avatarUrl: asOptional(metadata.avatar_url),
    vocation: asOptional(metadata.vocation),
    tradition: asOptional(metadata.tradition),
    languages: asOptional(metadata.languages),
    affiliation: asOptional(metadata.affiliation),
    website: asOptional(metadata.website),
    bio: asOptional(metadata.bio),
  }
}

export function toMetadata(
  update: ProfileUpdate,
): Record<string, string | null> {
  const metadata: Record<string, string | null> = {}
  const write = (key: string, value: string | null | undefined) => {
    if (value !== undefined) metadata[key] = asOptional(value)
  }
  write("name", update.name)
  write("username", update.username)
  write("avatar_url", update.avatarUrl)
  write("vocation", update.vocation)
  write("tradition", update.tradition)
  write("languages", update.languages)
  write("affiliation", update.affiliation)
  write("website", update.website)
  write("bio", update.bio)
  return metadata
}
