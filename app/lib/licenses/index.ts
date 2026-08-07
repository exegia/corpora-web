// Data-access layer for the licence catalog + project attachments (002).
// Route modules import ONLY from this barrel — never supabase-js directly,
// never a submodule path.

export type {
  CatalogLicence,
  LicenceConformance,
  LicenceCreate,
  LicenceDetail,
  LicenceUpdate,
} from "./types"
export * from "./catalog"
export * from "./text"
export * from "./authoring"
export * from "./attachment"
