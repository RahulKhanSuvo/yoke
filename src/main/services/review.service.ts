import { execFile } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import type {
  ReviewFileDiff,
  ReviewFileEntry,
  ReviewFileStatus,
  ReviewSummary
} from '../../shared/review'

const run = promisify(execFile)

/** Git output can be large in monorepos; keep enough room for the full patch. */
const GIT_MAX_BUFFER = 32 * 1024 * 1024
/** The review pane renders at most this much of a single patch. */
const MAX_PATCH_LENGTH = 400_000
/** Untracked files above this size are treated as too large to preview. */
const MAX_UNTRACKED_BYTES = 2 * 1024 * 1024
const MAX_UNTRACKED_LINES = 20_000

interface GitResult {
  stdout: string
  stderr: string
}

interface PatchStats {
  additions: number
  deletions: number
  binary: boolean
}

async function git(directory: string, args: string[]): Promise<GitResult> {
  return run('git', ['-C', directory, '-c', 'core.quotepath=false', ...args], {
    maxBuffer: GIT_MAX_BUFFER,
    encoding: 'utf8'
  }) as unknown as GitResult
}

/** Resolves a session directory, returning null when it is missing or not absolute. */
async function resolveDirectory(directory: string): Promise<string | null> {
  if (typeof directory !== 'string' || !directory.trim() || !path.isAbsolute(directory)) return null

  try {
    const info = await stat(directory)

    return info.isDirectory() ? path.resolve(directory) : null
  } catch {
    return null
  }
}

async function isGitRepository(directory: string): Promise<boolean> {
  try {
    const { stdout } = await git(directory, ['rev-parse', '--is-inside-work-tree'])

    return stdout.trim() === 'true'
  } catch {
    return false
  }
}

/** Repositories without a first commit diff the index instead of HEAD. */
async function hasHeadCommit(directory: string): Promise<boolean> {
  try {
    await git(directory, ['rev-parse', '--verify', '--quiet', 'HEAD'])

    return true
  } catch {
    return false
  }
}

function diffBase(hasHead: boolean): string[] {
  return hasHead ? ['HEAD'] : ['--cached']
}

function statusFromCode(code: string): ReviewFileStatus {
  const index = code[0]
  const worktree = code[1]

  if (index === '?') return 'untracked'
  if (index === 'U' || worktree === 'U' || code === 'AA' || code === 'DD') return 'conflicted'
  if (index === 'R' || worktree === 'R' || index === 'C' || worktree === 'C') return 'renamed'
  if (index === 'A' || worktree === 'A') return 'added'
  if (index === 'D' || worktree === 'D') return 'deleted'

  return 'modified'
}

/** Parses `git status --porcelain=v1 -z`, skipping the original path of renames. */
function parseStatus(output: string): Array<{ path: string; status: ReviewFileStatus }> {
  const tokens = output.split('\0')
  const files: Array<{ path: string; status: ReviewFileStatus }> = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (!token || token.length < 4) continue

    const code = token.slice(0, 2)
    const filePath = token.slice(3)

    if (!filePath) continue

    // Rename and copy entries are followed by the original path.
    if (code.includes('R') || code.includes('C')) index += 1

    files.push({ path: filePath, status: statusFromCode(code) })
  }

  return files
}

/** Git quotes unusual paths with C-style escapes; decode them for display. */
function decodeGitPath(value: string): string {
  const trimmed = value.trim()

  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return trimmed

  return trimmed.slice(1, -1).replace(/\\([0-7]{3}|.)/g, (_, escape: string) => {
    if (/^[0-7]{3}$/.test(escape)) return String.fromCharCode(parseInt(escape, 8))

    switch (escape) {
      case 'n':
        return '\n'
      case 't':
        return '\t'
      case 'r':
        return '\r'
      case '\\':
        return '\\'
      case '"':
        return '"'
      default:
        return escape
    }
  })
}

function stripPrefix(value: string, prefix: 'a/' | 'b/'): string | undefined {
  const decoded = decodeGitPath(value)

  if (decoded === '/dev/null' || !decoded.startsWith(prefix)) return undefined

  return decoded.slice(prefix.length)
}

/**
 * Walks a unified diff once and collects per-file addition/deletion counts.
 * Keys are repository-relative paths using the post-change name.
 */
function parsePatchStats(patch: string): Map<string, PatchStats> {
  const stats = new Map<string, PatchStats>()
  let current: PatchStats | undefined
  let inHunk = false

  const track = (filePath: string | undefined): PatchStats | undefined => {
    if (!filePath) return undefined

    const existing = stats.get(filePath)

    if (existing) return existing

    const created: PatchStats = { additions: 0, deletions: 0, binary: false }
    stats.set(filePath, created)

    return created
  }

  for (const line of patch.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = undefined
      inHunk = false
      continue
    }

    if (!inHunk && line.startsWith('--- ')) {
      current = track(stripPrefix(line.slice(4), 'a/')) ?? current
      continue
    }

    if (!inHunk && line.startsWith('+++ ')) {
      current = track(stripPrefix(line.slice(4), 'b/')) ?? current
      continue
    }

    if (line.startsWith('Binary files ')) {
      const match = /^Binary files (.+) and (.+) differ$/.exec(line)
      const filePath = match
        ? (stripPrefix(match[2], 'b/') ?? stripPrefix(match[1], 'a/'))
        : undefined
      const entry = track(filePath)

      if (entry) entry.binary = true

      continue
    }

    if (line.startsWith('GIT binary patch')) {
      if (current) current.binary = true

      continue
    }

    if (line.startsWith('@@')) {
      inHunk = true
      continue
    }

    if (!inHunk || !current) continue

    if (line.startsWith('+')) current.additions += 1
    else if (line.startsWith('-')) current.deletions += 1
  }

  return stats
}

function looksBinary(buffer: Buffer): boolean {
  const limit = Math.min(buffer.length, 8_000)

  for (let index = 0; index < limit; index += 1) {
    if (buffer[index] === 0) return true
  }

  return false
}

interface UntrackedContent {
  patch: string
  additions: number
  binary: boolean
  truncated: boolean
}

/** Builds a synthetic "new file" patch for a file git does not track yet. */
async function readUntracked(directory: string, filePath: string): Promise<UntrackedContent> {
  const absolute = path.resolve(directory, filePath)

  try {
    const info = await stat(absolute)

    if (!info.isFile() || info.size > MAX_UNTRACKED_BYTES) {
      return { patch: '', additions: 0, binary: false, truncated: true }
    }

    const buffer = await readFile(absolute)

    if (looksBinary(buffer)) {
      return { patch: '', additions: 0, binary: true, truncated: false }
    }

    const text = buffer.toString('utf8')
    const endsWithNewline = text.endsWith('\n')
    const allLines = (endsWithNewline ? text.slice(0, -1) : text).split('\n')

    // An empty file has no content lines; splitting '' would otherwise yield one.
    const lines = text.length === 0 ? [] : allLines
    const truncated = lines.length > MAX_UNTRACKED_LINES
    const visible = truncated ? lines.slice(0, MAX_UNTRACKED_LINES) : lines

    const header = [
      `diff --git a/${filePath} b/${filePath}`,
      'new file mode 100644',
      '--- /dev/null',
      `+++ b/${filePath}`,
      `@@ -0,0 +1,${visible.length} @@`
    ]

    const body = visible.map((line) => `+${line}`)

    if (!endsWithNewline && visible.length > 0) body.push('\\ No newline at end of file')

    return {
      patch: [...header, ...body].join('\n'),
      additions: visible.length,
      binary: false,
      truncated
    }
  } catch {
    return { patch: '', additions: 0, binary: false, truncated: true }
  }
}

function isBinaryPatch(patch: string): boolean {
  return /^Binary files /m.test(patch) || /^GIT binary patch$/m.test(patch)
}

function clipPatch(patch: string): { patch: string; truncated: boolean } {
  if (patch.length <= MAX_PATCH_LENGTH) return { patch, truncated: false }

  return { patch: patch.slice(0, MAX_PATCH_LENGTH), truncated: true }
}

/**
 * Summarizes the working tree changes for a session directory: the changed
 * files, their status, and total addition/deletion counts.
 */
export async function getReviewSummary(directory: string): Promise<ReviewSummary> {
  const empty: ReviewSummary = { isRepo: false, files: [], additions: 0, deletions: 0 }
  const resolved = await resolveDirectory(directory)

  if (!resolved || !(await isGitRepository(resolved))) return empty

  let statusOutput = ''

  try {
    const result = await git(resolved, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
    statusOutput = result.stdout
  } catch {
    return empty
  }

  const entries = parseStatus(statusOutput)
  const hasHead = await hasHeadCommit(resolved)
  let patchStats = new Map<string, PatchStats>()

  try {
    const result = await git(resolved, [
      'diff',
      ...diffBase(hasHead),
      '--no-color',
      '--no-ext-diff',
      '-U0',
      '--'
    ])
    patchStats = parsePatchStats(result.stdout)
  } catch {
    // The status list is still useful even if the diff cannot be produced.
  }

  const files: ReviewFileEntry[] = []

  for (const entry of entries) {
    if (entry.status === 'untracked') {
      const content = await readUntracked(resolved, entry.path)

      files.push({
        path: entry.path,
        status: entry.status,
        additions: content.additions,
        deletions: 0,
        binary: content.binary
      })

      continue
    }

    const stats = patchStats.get(entry.path) ?? { additions: 0, deletions: 0, binary: false }

    files.push({
      path: entry.path,
      status: entry.status,
      additions: stats.additions,
      deletions: stats.deletions,
      binary: stats.binary
    })
  }

  files.sort((a, b) => a.path.localeCompare(b.path))

  return {
    isRepo: true,
    files,
    additions: files.reduce((total, file) => total + file.additions, 0),
    deletions: files.reduce((total, file) => total + file.deletions, 0)
  }
}

/** Reads one changed file's unified diff, validating that it stays in the directory. */
export async function getReviewFile(
  directory: string,
  filePath: string
): Promise<ReviewFileDiff | null> {
  const resolved = await resolveDirectory(directory)

  if (!resolved || typeof filePath !== 'string' || !filePath.trim()) return null

  const absolute = path.resolve(resolved, filePath)

  if (absolute !== resolved && !absolute.startsWith(`${resolved}${path.sep}`)) return null

  if (!(await isGitRepository(resolved))) return null

  let entries: Array<{ path: string; status: ReviewFileStatus }> = []

  try {
    const result = await git(resolved, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
    entries = parseStatus(result.stdout)
  } catch {
    return null
  }

  const entry = entries.find((candidate) => candidate.path === filePath)

  if (!entry) return null

  if (entry.status === 'untracked') {
    const content = await readUntracked(resolved, filePath)
    const clipped = clipPatch(content.patch)

    return {
      path: filePath,
      status: entry.status,
      patch: clipped.patch,
      binary: content.binary,
      truncated: clipped.truncated || content.truncated
    }
  }

  const hasHead = await hasHeadCommit(resolved)
  let patch = ''

  try {
    const result = await git(resolved, [
      'diff',
      ...diffBase(hasHead),
      '--no-color',
      '--no-ext-diff',
      '-U3',
      '--',
      filePath
    ])
    patch = result.stdout
  } catch {
    return null
  }

  const clipped = clipPatch(patch)

  return {
    path: filePath,
    status: entry.status,
    patch: clipped.patch,
    binary: isBinaryPatch(patch),
    truncated: clipped.truncated
  }
}
