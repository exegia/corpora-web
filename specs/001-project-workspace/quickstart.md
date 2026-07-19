# Quickstart: Project Workspace

**Feature**: 001-project-workspace

## Prerequisites

- Bun installed; repo cloned; on branch `001-project-workspace`
- A Supabase project (or a Supabase branch database for previews)

## Setup

1. **Install the new dependency**

   ```bash
   bun add @supabase/supabase-js
   ```

2. **Apply the schema**

   Copy [contracts/schema.sql](./contracts/schema.sql) to `supabase/migrations/<timestamp>_project_workspace.sql` and apply it (Supabase CLI `supabase db push`, the SQL editor, or the Supabase MCP `apply_migration`).

3. **Configure environment**

   ```bash
   # .env (managed by dotenvx; mirror in .env.example with empty values)
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable/anon key>
   ```

   Set the same two variables in Vercel for preview/production environments.

4. **Generate database types**

   ```bash
   supabase gen types typescript --project-id <project-ref> > app/types/database.ts
   ```

5. **Run**

   ```bash
   bun run dev        # http://localhost:5173/project
   ```

## Verify (maps to user stories)

| Check | Story |
| --- | --- |
| `/project` shows an empty state; create "Test Project" → appears in list; rename it; delete it (confirmation required) | US1 |
| Seed one `corpora` row (SQL editor), open a project → link the corpus, see it listed; relink attempt is blocked; unlink leaves the corpus row intact | US2 |
| Add a reference with only a title → appears; edit adds an author; delete removes it; empty-title save is rejected with a message | US3 |
| Set the corpus row `available = false` → link renders as unavailable with a remove affordance | FR-008 |
| Reload the app → everything persists (cloud-backed) | SC-003 |

## Quality gates

```bash
bun run typecheck && bun run lint && bun run test
```

## Notes

- Anonymous v1: everyone shares one project pool; RLS policies are intentionally permissive and will be replaced by `corpora-auth`.
- This feature never uploads or deletes corpus files; `corpora.hf_path` is only displayed/stored as a pointer.
