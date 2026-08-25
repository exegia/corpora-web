// Data-access layer for the Project Workspace feature.
// Contract: specs/001-project-workspace/contracts/data-access.md
// Route modules import ONLY from this barrel — never supabase-js directly,
// never a submodule path.
import * as errors from "./errors"
import * as mutations from "./mutations"
import * as queries from "./queries"
import * as rules from "./rules"
import * as rows from "./rows"

export type {
  ProjectSummary,
  CorpusLink,
  CorpusSource,
  ProjectCorpus,
  CorpusCommit,
  ProjectCreator,
  ProjectOrganization,
  AttachedLicense,
  LicenseStatus,
  ProjectDetail,
  CorpusOption,
} from "./types"

export * from "./vocabulary"

const Project = {
  Errors: errors,
  Mutations: mutations,
  Queries: queries,
  Rules: rules,
  Rows: rows,
}

export default Project
