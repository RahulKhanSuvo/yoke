export type ReviewDiffLineKind = 'hunk' | 'add' | 'del' | 'context' | 'meta'

/** One rendered line of a unified diff, with its old/new line numbers. */
export interface ReviewDiffLine {
  kind: ReviewDiffLineKind
  text: string
  oldLine?: number
  newLine?: number
}

const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/

/** Header lines git emits before the actual hunks. */
const FILE_HEADERS = [
  'diff --git ',
  'index ',
  '--- ',
  '+++ ',
  'new file mode ',
  'deleted file mode ',
  'old mode ',
  'new mode ',
  'similarity index ',
  'dissimilarity index ',
  'rename from ',
  'rename to ',
  'copy from ',
  'copy to '
]

/** Parses unified diff text into rows the review pane can render. */
export function parseUnifiedDiff(patch: string): ReviewDiffLine[] {
  const lines: ReviewDiffLine[] = []
  let oldLine = 0
  let newLine = 0
  let inHunk = false

  for (const raw of patch.split('\n')) {
    if (FILE_HEADERS.some((header) => raw.startsWith(header))) continue

    const hunk = HUNK_HEADER.exec(raw)

    if (hunk) {
      oldLine = Number(hunk[1])
      newLine = Number(hunk[2])
      inHunk = true
      lines.push({ kind: 'hunk', text: raw })
      continue
    }

    if (!inHunk) {
      if (raw.startsWith('Binary files ') || raw.startsWith('GIT binary patch')) {
        lines.push({ kind: 'meta', text: raw })
      }

      continue
    }

    if (raw.startsWith('\\')) {
      lines.push({ kind: 'meta', text: raw })
      continue
    }

    if (raw.startsWith('+')) {
      lines.push({ kind: 'add', text: raw.slice(1), newLine })
      newLine += 1
      continue
    }

    if (raw.startsWith('-')) {
      lines.push({ kind: 'del', text: raw.slice(1), oldLine })
      oldLine += 1
      continue
    }

    if (raw.startsWith(' ')) {
      lines.push({ kind: 'context', text: raw.slice(1), oldLine, newLine })
      oldLine += 1
      newLine += 1
      continue
    }

    // A trailing empty line from splitting a patch that ends with a newline.
    if (raw === '') continue

    lines.push({ kind: 'meta', text: raw })
  }

  return lines
}

// ---------------------------------------------------------------------------
// Split view
// ---------------------------------------------------------------------------

/** One side of a split row: a code cell with its line number. */
export interface ReviewSplitCell {
  kind: 'del' | 'add' | 'context'
  text: string
  line?: number
}

export type ReviewSplitRow =
  | { type: 'hunk'; text: string }
  | { type: 'meta'; text: string }
  | { type: 'row'; old?: ReviewSplitCell; new?: ReviewSplitCell }

/**
 * Converts unified diff lines into side-by-side rows. Runs of deletions
 * followed by additions pair up (old left, new right); leftovers keep only
 * their own side, so pure deletions and insertions render with an empty cell.
 */
export function toSplitRows(lines: ReviewDiffLine[]): ReviewSplitRow[] {
  const rows: ReviewSplitRow[] = []
  const pendingDels: ReviewDiffLine[] = []

  const flushDels = () => {
    for (const line of pendingDels) {
      rows.push({
        type: 'row',
        old: { kind: 'del', text: line.text, line: line.oldLine }
      })
    }

    pendingDels.length = 0
  }

  for (const line of lines) {
    if (line.kind === 'hunk' || line.kind === 'meta') {
      flushDels()
      rows.push({ type: line.kind, text: line.text })
      continue
    }

    if (line.kind === 'del') {
      pendingDels.push(line)
      continue
    }

    if (line.kind === 'add') {
      const del = pendingDels.shift()

      if (del) {
        rows.push({
          type: 'row',
          old: { kind: 'del', text: del.text, line: del.oldLine },
          new: { kind: 'add', text: line.text, line: line.newLine }
        })
      } else {
        rows.push({
          type: 'row',
          new: { kind: 'add', text: line.text, line: line.newLine }
        })
      }

      continue
    }

    // A context line ends any deletion run; it belongs to both sides.
    flushDels()

    rows.push({
      type: 'row',
      old: { kind: 'context', text: line.text, line: line.oldLine },
      new: { kind: 'context', text: line.text, line: line.newLine }
    })
  }

  flushDels()

  return rows
}

// ---------------------------------------------------------------------------
// Collapsed context (opencode's "hide non-diff lines" mode)
// ---------------------------------------------------------------------------

/** A collapsed run of unchanged lines; rendering expands it on demand. */
export interface ReviewDiffGap {
  type: 'gap'
  count: number
  hidden: (ReviewDiffLine | ReviewSplitRow)[]
}

/**
 * Collapses every run of pure context (unified) or context-only rows (split)
 * into one gap row. Changed lines, hunk headers, and metadata stay visible.
 */
export function collapseContext<T extends ReviewDiffLine | ReviewSplitRow>(
  rows: readonly T[]
): Array<T | ReviewDiffGap> {
  const out: Array<T | ReviewDiffGap> = []
  let run: T[] = []

  const isContextOnly = (row: T): boolean =>
    'kind' in row ? row.kind === 'context' : row.type === 'row' && row.old?.kind === 'context' && row.new?.kind === 'context'

  const flush = () => {
    if (run.length === 0) return

    if (run.length === 1) {
      out.push(run[0])
    } else {
      out.push({ type: 'gap', count: run.length, hidden: run })
    }

    run = []
  }

  for (const row of rows) {
    if (isContextOnly(row)) {
      run.push(row)
      continue
    }

    flush()
    out.push(row)
  }

  flush()

  return out
}
