// Data-access layer for the Project Workspace feature.
// Contract: specs/001-project-workspace/contracts/data-access.md
// Route modules import ONLY from this barrel — never supabase-js directly,
// never a submodule path.
import * as errors from "./errors"
import * as mutations from "./mutations"
import * as queries from "./queries"
import * as rules from "./rules"

export type {
  AttachedLicense,
  BookType,
  CategorizedType,
  CategoryType,
  Classification,
  CorpusCommit,
  CorpusLink,
  CorpusOption,
  CorpusSource,
  DataErrorCode,
  LanguageType,
  LicenseStatus,
  ProjectCorpus,
  ProjectCreator,
  ProjectDetail,
  ProjectOrganization,
  ProjectStatus,
  ProjectSummary,
  ScripturalType,
} from "./types"

export * from "./constants"

// The one helper the UI needs; the rest of utils.ts is internal plumbing.
export { languageOptionsFor } from "./utils"

const Project = {
  Errors: errors,
  Mutations: mutations,
  Queries: queries,
  Rules: rules,
}

export default Project
