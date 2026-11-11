import { eq } from 'drizzle-orm'
import { realpath, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import { db } from '../database'
import { projects } from '../database/schema'

import type { ProjectKind } from '../../shared/project-kind'

type Project = typeof projects.$inferSelect

/** A project row as sent over IPC, with its detected stack. */
export type ProjectWithKind = Project & { kind: ProjectKind }

/** True when the given root file exists (any error counts as absent). */
const hasFile = (rootPath: string, name: string): Promise<boolean> =>
  stat(path.join(rootPath, name)).then(
    () => true,
    () => false
  )

/** Reads the project's package.json, or null when there is none. */
const readPackageJson = async (rootPath: string): Promise<Record<string, unknown> | null> => {
  try {
    return JSON.parse(await readFile(path.join(rootPath, 'package.json'), 'utf8'))
  } catch {
    return null
  }
}

/**
 * Detects the project's stack from its root files — package.json deps decide
 * the JavaScript flavors, other manifests decide the rest.
 */
export async function detectProjectKind(rootPath: string): Promise<ProjectKind> {
  try {
    // Non-JavaScript stacks first; they can sit alongside a package.json.
    if (await hasFile(rootPath, 'pyproject.toml')) return 'python'
    if (await hasFile(rootPath, 'requirements.txt')) return 'python'
    if (await hasFile(rootPath, 'composer.json')) return 'php'

    const pkg = await readPackageJson(rootPath)

    if (pkg) {
      const deps = {
        ...(pkg.dependencies as object | undefined),
        ...(pkg.devDependencies as object | undefined)
      }

      if ('next' in deps) return 'next'
      if ('react' in deps || 'react-dom' in deps) return 'react'
      if ('typescript' in deps || (await hasFile(rootPath, 'tsconfig.json'))) return 'typescript'

      return 'javascript'
    }

    if (await hasFile(rootPath, 'tsconfig.json')) return 'typescript'
    if (await hasFile(rootPath, 'index.js')) return 'javascript'
  } catch {
    // An unreadable root falls through to the generic folder icon.
  }

  return 'generic'
}

/**
 * True when the directory belongs to a registered project. Review IPC uses
 * this so a compromised renderer cannot diff arbitrary folders.
 */
export async function isProjectDirectory(directory: string): Promise<boolean> {
  if (typeof directory !== 'string' || !directory.trim() || !path.isAbsolute(directory)) {
    return false
  }

  const resolved = path.resolve(directory)

  const direct = await db.query.projects.findFirst({ where: eq(projects.rootPath, resolved) })

  if (direct) return true

  // Symlinked paths do not match the stored realpath; compare on the filesystem.
  try {
    const real = await realpath(resolved)
    const rows = await db.select({ rootPath: projects.rootPath }).from(projects)

    return rows.some((row) => row.rootPath === real)
  } catch {
    return false
  }
}

export async function createProject(rootPath: string): Promise<Project> {
  // 1. Validate input
  if (typeof rootPath !== 'string' || !rootPath.trim()) {
    throw new Error('Invalid project folder path')
  }

  if (!path.isAbsolute(rootPath)) {
    throw new Error('Project path must be absolute')
  }

  // 2. Resolve the actual filesystem path
  const resolvedPath = await realpath(rootPath)

  // 3. Ensure the path points to a directory
  const folderStats = await stat(resolvedPath)

  if (!folderStats.isDirectory()) {
    throw new Error('Selected path is not a directory')
  }

  // 4. Prevent duplicate projects
  const existingProject = await db.query.projects.findFirst({
    where: eq(projects.rootPath, resolvedPath)
  })

  if (existingProject) return existingProject

  // 5. Generate the name from the folder name
  const name = path.basename(resolvedPath)

  // 6. Insert into database
  const [project] = await db
    .insert(projects)
    .values({
      name,
      rootPath: resolvedPath
    })
    .returning()

  if (!project) {
    throw new Error('Failed to create project')
  }

  return project
}

export async function getProjects(): Promise<ProjectWithKind[]> {
  const rows = await db.query.projects.findMany({
    with: {
      sessions: {
        orderBy: (sessions, { desc }) => [desc(sessions.time_updated)]
      }
    },
    orderBy: (projects, { desc }) => [desc(projects.time_created)]
  })

  return Promise.all(
    rows.map(async (project) => ({ ...project, kind: await detectProjectKind(project.rootPath) }))
  )
}

export async function deleteProject(id: string): Promise<void> {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid project ID')
  }

  await db.delete(projects).where(eq(projects.id, id))
}
