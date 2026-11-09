/** How a changed file appears in the working tree. */
export type ReviewFileStatus =
  'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'conflicted'

/** One changed file in the session's working tree. */
export interface ReviewFileEntry {
  path: string
  status: ReviewFileStatus
  additions: number
  deletions: number
  binary: boolean
}

/** The working tree changes shown by the session's Review panel. */
export interface ReviewSummary {
  /** False when the session directory is missing or not inside a git repository. */
  isRepo: boolean
  files: ReviewFileEntry[]
  additions: number
  deletions: number
}

/** A single file's unified diff, as returned by `review:file`. */
export interface ReviewFileDiff {
  path: string
  status: ReviewFileStatus
  /** Unified diff text; empty for binary files. */
  patch: string
  binary: boolean
  /** True when the patch was clipped because the file is very large. */
  truncated: boolean
}
