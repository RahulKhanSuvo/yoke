import { stat } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import type { IPty } from 'node-pty'

import { isProjectDirectory } from './project.service'

/** How much scrollback the main process replays on reattach. */
const MAX_SCROLLBACK_BYTES = 200_000

interface TerminalSession {
  pty: IPty
  directory: string
  scrollback: string
}

const sessions = new Map<string, TerminalSession>()

/** The user's login shell, falling back to the environment's default. */
function resolveShell(): string {
  return process.env['SHELL'] || (process.platform === 'win32' ? 'powershell.exe' : '/bin/bash')
}

/** Guards that the pty never starts outside a registered project. */
async function resolveDirectory(directory: string): Promise<string | null> {
  if (typeof directory !== 'string' || !directory.trim() || !path.isAbsolute(directory)) return null
  if (!(await isProjectDirectory(directory))) {
    console.error('[terminal] refusing non-project directory:', directory)
    return null
  }

  const info = await stat(directory)

  return info.isDirectory() ? path.resolve(directory) : null
}

/** Spawns the shell for a project directory; `onData` streams its output. */
export async function startTerminal(
  directory: string,
  cols: number,
  rows: number,
  onData: (id: string, chunk: string) => void
): Promise<string | null> {
  const resolved = await resolveDirectory(directory)

  if (!resolved) return null

  // One persistent shell per project directory; reattaching replays it.
  for (const [id, session] of sessions) {
    if (session.directory === resolved) {
      onData(id, session.scrollback)
      return id
    }
  }

  const shell = resolveShell()
  const args = process.platform === 'win32' ? [] : ['-l']
  const id = randomUUID()

  try {
    // `node-pty` is a native module; the dynamic import keeps the main bundle loadable if it failed to build.
    const { default: pty } = await import('node-pty')
    const proc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: Number.isFinite(cols) ? Math.max(2, Math.floor(cols)) : 80,
      rows: Number.isFinite(rows) ? Math.max(2, Math.floor(rows)) : 24,
      cwd: resolved,
      env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>
    })

    const session: TerminalSession = { pty: proc, directory: resolved, scrollback: '' }

    proc.onData((chunk) => {
      session.scrollback = (session.scrollback + chunk).slice(-MAX_SCROLLBACK_BYTES)
      onData(id, chunk)
    })
    proc.onExit(() => {
      sessions.delete(id)
    })

    sessions.set(id, session)
    onData(id, '')

    return id
  } catch (error) {
    console.error('[terminal] failed to start shell:', error)
    // The shell may not exist or node-pty failed to load; the panel shows an error.
    return null
  }
}

export function writeTerminal(id: string, data: string): void {
  if (typeof data !== 'string' || data.length > 8_192) return

  sessions.get(id)?.pty.write(data)
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  if (!Number.isFinite(cols) || !Number.isFinite(rows)) return

  try {
    sessions.get(id)?.pty.resize(Math.max(2, Math.floor(cols)), Math.max(2, Math.floor(rows)))
  } catch {
    // A killed pty can no longer resize; ignore.
  }
}

export function stopTerminal(id: string): void {
  const session = sessions.get(id)

  if (!session) return

  sessions.delete(id)

  try {
    session.pty.kill()
  } catch {
    // Already gone.
  }
}

/** Stops every terminal whose pty is still alive; used on app quit. */
export function stopAllTerminals(): void {
  for (const [, session] of sessions) {
    try {
      session.pty.kill()
    } catch {
      // Already gone.
    }
  }

  sessions.clear()
}
