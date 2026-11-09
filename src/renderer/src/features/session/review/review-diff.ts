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
