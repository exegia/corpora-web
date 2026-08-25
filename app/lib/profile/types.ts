export interface Profile {
  /** Full name, shown across Corpora. */
  name: string | null
  /** Handle used in mentions and links, without the `@`. */
  username: string | null
  /** Portrait image URL. The UI falls back to initials without one. */
  avatarUrl: string | null
  /** One of `VOCATIONS`, or a value written before the list existed. */
  vocation: string | null
  /** One of `TRADITIONS`, or a value written before the list existed. */
  tradition: string | null
  /** Working languages, freeform — e.g. "Latin, Koine Greek, Syriac". */
  languages: string | null
  /** Institution or society, e.g. "University of Tübingen". */
  affiliation: string | null
  /** Personal or academic site, without the scheme. */
  website: string | null
  /** Short profile summary. */
  bio: string | null
}

/** Everything the profile form can write. */
export type ProfileUpdate = Partial<Profile>
