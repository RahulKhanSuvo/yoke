import { For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import JavaScriptIcon from '@hugeicons/core-free-icons/JavaScriptIcon'
import NextIcon from '@hugeicons/core-free-icons/NextIcon'
import PhpIcon from '@hugeicons/core-free-icons/PhpIcon'
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon'
import PythonIcon from '@hugeicons/core-free-icons/PythonIcon'
import ReactIcon from '@hugeicons/core-free-icons/ReactIcon'
import Typescript01Icon from '@hugeicons/core-free-icons/Typescript01Icon'
import MoreVerticalIcon from '@hugeicons/core-free-icons/MoreVerticalIcon'
import XIcon from '@hugeicons/core-free-icons/XIcon'
import { IconButton } from '@renderer/components/ui/IconButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

type ProjectWithSessions = Awaited<ReturnType<typeof window.api.projects.list>>[number]
type SessionRow = ProjectWithSessions['sessions'][number]

export interface ProjectListProps {
  projects: ProjectWithSessions[]
  /** The project whose session list is expanded, if any. */
  expandedProjectId?: string
  /** The project whose session is currently open, for highlight state. */
  activeProjectId?: string
  /** The session currently open, for highlighting its row under its project. */
  activeSessionId?: string
  /** True while a session is being created, so rows show a disabled +. */
  busy?: boolean
  /** Clicking a project: expansion is toggled (the parent owns the expanded id). */
  onSelectProject: (project: ProjectWithSessions) => void
  onNewSession: (project: ProjectWithSessions) => void
  onOpenSession: (project: ProjectWithSessions, session: SessionRow) => void
  onDeleteSession: (project: ProjectWithSessions, session: SessionRow) => void
  onRemoveProject: (project: ProjectWithSessions) => void
}

/** The brand icon for a project's detected stack; the folder for anything else. */
type IconObject = typeof Folder01Icon
const kindIcons: Record<ProjectWithSessions['kind'], IconObject> = {
  react: ReactIcon,
  next: NextIcon,
  typescript: Typescript01Icon,
  javascript: JavaScriptIcon,
  python: PythonIcon,
  php: PhpIcon,
  generic: Folder01Icon
}

/** A project's sessions, newest first. */
const sortedSessions = (project: ProjectWithSessions): SessionRow[] =>
  [...(project.sessions as SessionRow[])].sort(
    (a, b) => (b.time_updated ?? b.time_created ?? 0) - (a.time_updated ?? a.time_created ?? 0)
  )

/**
 * The sidebar's Projects section: one row per project that expands, when
 * clicked, into the project's sessions — newest first, the open one
 * highlighted, and a hover X to delete each session. Each project row also
 * carries a hover + for a new session and a menu with Remove project.
 */
export function ProjectList(props: ProjectListProps): JSX.Element {
  return (
    <div class="flex flex-col gap-0.2">
      <For each={props.projects}>
        {(project) => {
          const expanded = () => props.expandedProjectId === project.id

          return (
            <div class="flex flex-col">
              <div
                class="group/project flex items-center gap-0.5 rounded-md pr-0.5 transition-colors"
                classList={{
                  // When one of the project's sessions is open, the session row carries the highlight —
                  // not the project row too.
                  'bg-surface-mute text-foreground':
                    props.activeProjectId === project.id && !props.activeSessionId,
                  'text-foreground hover:bg-foreground/[0.03]':
                    props.activeProjectId !== project.id || !!props.activeSessionId
                }}
              >
                <button
                  type="button"
                  class="flex min-w-0 flex-1 cursor-default items-center gap-1.5 rounded-md py-2 pl-1 text-left text-[13px] font-medium focus-visible:outline-none"
                  title={project.rootPath}
                  aria-expanded={expanded()}
                  onClick={() => props.onSelectProject(project)}
                >
                  <HugeiconsIcon
                    icon={kindIcons[project.kind] ?? Folder01Icon}
                    size={15}
                    class="shrink-0 text-foreground-muted"
                  />
                  <span class="truncate">{project.name}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    class="flex size-6 shrink-0 items-center justify-center rounded-md text-foreground-muted opacity-0 transition hover:bg-surface-mute hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover/project:opacity-100 data-expanded:opacity-100"
                    aria-label={`${project.name} options`}
                  >
                    <HugeiconsIcon icon={MoreVerticalIcon} size={30} />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent class="min-w-44">
                    <DropdownMenuItem
                      class="text-[12.5px] text-danger focus:bg-danger/10 focus:text-danger"
                      onSelect={() => props.onRemoveProject(project)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <IconButton
                  label={`New session in ${project.name}`}
                  class="p-1 opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/project:opacity-100"
                  disabled={props.busy}
                  onClick={() => props.onNewSession(project)}
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={14} class="text-foreground-muted" />
                </IconButton>
              </div>

              {/* The project's sessions, shown while the project is expanded. */}
              <Show when={expanded()}>
                <div class="mb-0.5 flex flex-col gap-px py-0.5">
                  <For
                    each={sortedSessions(project)}
                    fallback={
                      <p class="px-2 py-1 text-[12px] text-foreground-muted/70">No sessions</p>
                    }
                  >
                    {(session) => (
                      <div
                        class="group/session flex h-7 min-w-0 items-center rounded-sm transition-colors"
                        classList={{
                          'bg-surface-mute': props.activeSessionId === session.id,
                          'hover:bg-foreground/[0.03]': props.activeSessionId !== session.id
                        }}
                      >
                        <button
                          type="button"
                          class="flex h-full min-w-0 flex-1 items-center rounded-md px-2 text-left text-[12.5px] transition-colors focus-visible:outline-none"
                          classList={{
                            'font-medium text-foreground': props.activeSessionId === session.id,
                            'text-foreground-muted': props.activeSessionId !== session.id
                          }}
                          onClick={() => props.onOpenSession(project, session)}
                        >
                          <span class="truncate">{session.title}</span>
                        </button>

                        <button
                          type="button"
                          aria-label={`Delete session ${session.title}`}
                          class="flex size-5 shrink-0 items-center justify-center rounded text-foreground-muted opacity-0 transition group-hover/session:opacity-100 hover:text-danger focus-visible:opacity-100 focus-visible:outline-none"
                          onClick={() => props.onDeleteSession(project, session)}
                        >
                          <HugeiconsIcon icon={XIcon} size={13} />
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          )
        }}
      </For>
    </div>
  )
}
