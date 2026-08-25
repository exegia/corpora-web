import type { ProjectDetail } from "./types"
import { PROJECT_STATUSES, type ProjectStatus } from "./vocabulary"

// ---- Status workflow (003) ------------------------------------------------

/** While a project awaits review it is read-only except for status changes. */
export function isProjectReadOnly(status: ProjectStatus): boolean {
  return status === "ready-for-review"
}

/**
 * What still blocks a submission for review. Empty means the creator may move
 * the project to ready-for-review.
 */
export function reviewIssues(project: ProjectDetail): string[] {
  const issues: string[] = []
  if (project.licenses.length === 0) {
    issues.push("Attach and agree to at least one licence.")
  }
  if (!project.type) {
    issues.push("Classify the project (bible, book, …).")
  }
  if (!project.corpus) {
    issues.push("Attach a corpus — upload a .corpus file or a Hugging Face URL.")
  }
  return issues
}

/**
 * Legal next statuses from the project's current one. The workflow is
 * draft → ready-for-review → published: the creator submits for review once
 * the requirements pass; publishing decisions (into published, out of
 * ready-for-review or published) belong to the superadmin. The legacy
 * "started"/"failed" statuses still display but only move back to draft.
 */
export function allowedStatusChanges(
  project: ProjectDetail,
  isSuperadmin: boolean,
): ProjectStatus[] {
  switch (project.status) {
    case "ready-for-review":
      return isSuperadmin ? ["published", "draft"] : []
    case "published":
      return isSuperadmin ? ["draft"] : []
    default: {
      const next: ProjectStatus[] = []
      if (project.status !== "draft") next.push("draft")
      if (reviewIssues(project).length === 0) next.push("ready-for-review")
      return next
    }
  }
}

/** Human-readable reason a transition is refused, or null when it is legal. */
export function refuseStatusChange(
  project: ProjectDetail,
  next: ProjectStatus,
  isSuperadmin: boolean,
): string | null {
  if (!PROJECT_STATUSES.includes(next)) {
    return "That is not a valid project status."
  }
  if (next === project.status) return null
  if (allowedStatusChanges(project, isSuperadmin).includes(next)) return null
  if (next === "ready-for-review") {
    const issues = reviewIssues(project)
    if (issues.length > 0) {
      return `Not ready for review yet. ${issues.join(" ")}`
    }
  }
  if (
    next === "published" ||
    project.status === "ready-for-review" ||
    project.status === "published"
  ) {
    return "Only the superadmin can approve or change a project in review or published."
  }
  return `A ${project.status} project cannot move to ${next}.`
}
