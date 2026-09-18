// Data-access layer for the researcher's persona profile, stored in user_metadata.
// Route modules import ONLY from this barrel — never supabase-js directly,
// never a submodule path.
import * as profile from "./profile"

export type { Profile, ProfileUpdate } from "./types"

export * from "./constants"

const Profile = {
  GetSet: profile,
}

export default Profile
