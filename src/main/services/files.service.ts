import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

import type { FilePreview, FileTreeNode } from '../../shared/files'
import { isProjectDirectory } from './project.service'

/** Preview stops here; larger files show a truncated notice. */
const MAX_PREVIEW_BYTES = 200_000
const MAX_PREVIEW_LINES = 5_000

/** Resolves a project-relative path, refusing anything outside the project. */
function resolveInside(root: string, target: string): string | null {
  if (typeof target !== 'string' || target.includes('\0')) return null

  const full = path.resolve(root, target)
  const relative = path.relative(root, full)

  if (relative.startsWith('..') || path.isAbsolute(relative)) return null

  return full
}

async function isDirectory(value: string): Promise<boolean> {
  try {
    return (await stat(value)).isDirectory()
  } catch {
    return false
  }
}

/**
 * Lists one level of the project tree, folders first. The renderer walks the
 * tree lazily, folder by folder, like opencode's file browser.
 */
export async function getFileTree(directory: string, subPath: string): Promise<FileTreeNode[]> {
  if (!(await isProjectDirectory(directory))) return []

  const resolved = await resolveDirectory(directory)
  const full = resolved ? resolveInside(resolved, subPath) : null

  if (!full || !(await isDirectory(full))) return []

  const entries = await readdir(full, { withFileTypes: true })

  const nodes: FileTreeNode[] = entries.map((entry) => ({
    name: entry.name,
    path: subPath ? `${subPath}/${entry.name}` : entry.name,
    type: entry.isDirectory() ? 'directory' : 'file'
  }))

  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1

    return a.name.localeCompare(b.name)
  })
}

async function resolveDirectory(directory: string): Promise<string | null> {
  if (typeof directory !== 'string' || !directory.trim() || !path.isAbsolute(directory)) return null

  try {
    const info = await stat(directory)

    return info.isDirectory() ? path.resolve(directory) : null
  } catch {
    return null
  }
}

/** Reads a text file for the read-only preview, capped like opencode's. */
export async function readFilePreview(directory: string, filePath: string): Promise<FilePreview | null> {
  if (!(await isProjectDirectory(directory))) return null

  const resolved = await resolveDirectory(directory)
  const full = resolved ? resolveInside(resolved, filePath) : null

  if (!full) return null

  try {
    const info = await stat(full)

    if (!info.isFile() || info.size > MAX_PREVIEW_BYTES * 4) {
      return { path: filePath, content: '', lines: 0, truncated: true }
    }

    const buffer = await readFile(full)
    // A NUL byte early on means a binary file; the preview has nothing to show.
    const binary = buffer.subarray(0, 8_000).includes(0)

    if (binary) return { path: filePath, content: '', lines: 0, truncated: false }

    let text = buffer.toString('utf8')
    let truncated = text.length > MAX_PREVIEW_BYTES

    if (truncated) text = text.slice(0, MAX_PREVIEW_BYTES)

    let lines = text.split('\n')

    if (lines.length > MAX_PREVIEW_LINES) {
      lines = lines.slice(0, MAX_PREVIEW_LINES)
      truncated = true
    }

    return { path: filePath, content: lines.join('\n'), lines: lines.length, truncated }
  } catch {
    return null
  }
}
