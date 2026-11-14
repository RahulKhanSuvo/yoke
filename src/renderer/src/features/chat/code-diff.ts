/**
 * Small LCS-based line diff with word-level emphasis inside changed pairs —
 * the "FileExtBadge" green-wash effect in opencode's edit cards.
 */

export interface CodeDiffLine {
  kind: 'context' | 'add' | 'del'
  text: string
  /** Tokens of an add/del line paired against its counterpart; changed ones get the stronger wash. */
  words?: Array<{ text: string; changed: boolean }>
}

const WORD_RE = /(\s+|\w+|[^\s\w]+)/g

function tokens(line: string): string[] {
  return line.match(WORD_RE) ?? []
}

/** Marks which tokens of `next` are new relative to `previous` (common tokens unchanged). */
function wordDiff(previous: string, next: string): Array<{ text: string; changed: boolean }> {
  const a = tokens(previous)
  const b = tokens(next)
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const out: Array<{ text: string; changed: boolean }> = []
  let i = 0
  let j = 0

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ text: b[j], changed: false })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      i++
    } else {
      out.push({ text: b[j], changed: true })
      j++
    }
  }

  while (j < b.length) {
    out.push({ text: b[j], changed: true })
    j++
  }

  return mergeRuns(out)
}

/** Joins adjacent tokens of the same state so rendering stays cheap. */
function mergeRuns(
  words: Array<{ text: string; changed: boolean }>
): Array<{ text: string; changed: boolean }> {
  const out: Array<{ text: string; changed: boolean }> = []

  for (const word of words) {
    const last = out[out.length - 1]

    if (last && last.changed === word.changed) last.text += word.text
    else out.push({ ...word })
  }

  return out
}

/**
 * LCS line diff between two snippets. Deleted/added lines in the same replaced
 * run are paired for word-level emphasis, like opencode's edit card.
 */
export function lineDiff(oldText: string, newText: string): CodeDiffLine[] {
  const a = oldText ? oldText.split('\n') : []
  const b = newText ? newText.split('\n') : []

  // Cap for pathological inputs; edits are small in practice.
  if (a.length * b.length > 4_000_000) {
    return [
      ...a.map((text) => ({ kind: 'del' as const, text })),
      ...b.map((text) => ({ kind: 'add' as const, text }))
    ]
  }

  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  // First pass: the raw edit script as runs of dels/adds.
  type Op = { kind: 'context' | 'del' | 'add'; text: string }
  const ops: Op[] = []

  let i = 0
  let j = 0

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ kind: 'context', text: a[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ kind: 'del', text: a[i] })
      i++
    } else {
      ops.push({ kind: 'add', text: b[j] })
      j++
    }
  }

  while (i < a.length) ops.push({ kind: 'del', text: a[i++] })
  while (j < b.length) ops.push({ kind: 'add', text: b[j++] })

  // Second pass: pair each add with the nearest del in its run for word emphasis.
  const result: CodeDiffLine[] = []
  const pendingDels: string[] = []
  const pendingAdds: string[] = []

  const flush = (): void => {
    const pairs = Math.min(pendingDels.length, pendingAdds.length)

    for (let k = 0; k < pairs; k++) {
      result.push({
        kind: 'del',
        text: pendingDels[k],
        words: wordDiff(pendingAdds[k], pendingDels[k])
      })
    }

    for (let k = pairs; k < pendingDels.length; k++) {
      result.push({ kind: 'del', text: pendingDels[k] })
    }

    for (let k = 0; k < pairs; k++) {
      result.push({
        kind: 'add',
        text: pendingAdds[k],
        words: wordDiff(pendingDels[k], pendingAdds[k])
      })
    }

    for (let k = pairs; k < pendingAdds.length; k++) {
      result.push({ kind: 'add', text: pendingAdds[k] })
    }

    pendingDels.length = 0
    pendingAdds.length = 0
  }

  for (const op of ops) {
    if (op.kind === 'del') pendingDels.push(op.text)
    else if (op.kind === 'add') pendingAdds.push(op.text)
    else flush()
  }

  flush()

  return result
}

/** The `+N -M` counters for a diff. */
export function diffCounts(lines: CodeDiffLine[]): { additions: number; deletions: number } {
  let additions = 0
  let deletions = 0

  for (const line of lines) {
    if (line.kind === 'add') additions++
    else if (line.kind === 'del') deletions++
  }

  return { additions, deletions }
}
