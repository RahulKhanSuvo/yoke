import { isAbsolute, relative, resolve } from 'node:path'

/**
 * Resolves a tool path and refuses anything that escapes the project root.
 * Without this a model could read or write arbitrary files on the machine.
 */
export function resolveInside(root: string, target: string): string {
  const full = resolve(root, target)
  const rel = relative(root, full)

  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Path is outside the project: ${target}`)
  }

  return full
}
