// Data-access layer for the licence catalog + project attachments (002).
// Route modules import ONLY from this barrel — never supabase-js directly,
// never a submodule path.
import * as catalog from "./catalog"
import * as text from "./text"
import * as authoring from "./authoring"
import * as attachment from "./attachment"

export type { CatalogLicence, LicenceConformance, LicenceCreate, LicenceDetail, LicenceUpdate } from "./types"

export * from "./constants"

const License = {
    Catalog: catalog,
    Text: text,
    Authoring: authoring,
    Attachment: attachment,
}

export default License
