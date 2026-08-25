// Data-access layer for the seeded user directory (002, FR-018).
// Contract: specs/002-project-detail/contracts/data-access.md
// Route modules import ONLY from this barrel — never supabase-js directly,
// never a submodule path.
import * as users from "./users"

export type { DirectoryUser } from "./types"

const User = { ...users }

export default User
