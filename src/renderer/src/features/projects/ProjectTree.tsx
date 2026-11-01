import { createSignal, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Add01Icon from '@hugeicons/core-free-icons/Add01Icon'
import BubbleChatIcon from '@hugeicons/core-free-icons/BubbleChatIcon'
import ChevronRightIcon from '@hugeicons/core-free-icons/ChevronRightIcon'
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import { IconButton } from '@renderer/components/ui/IconButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { MoreVerticalIcon } from '@hugeicons/core-free-icons'

type ProjectWithSessions = Awaited<ReturnType<typeof window.api.projects.list>>[number]
type Session = Awaited<ReturnType<typeof window.api.sessions.list>>[number]

export interface ProjectTreeProps {
  projects: ProjectWithSessions[]
  activeProjectId?: string
  activeSessionId?: string
  /** Re-reads the project list (and its nested sessions) from the main process. */
  onRefresh: () => unknown
  onSelectProject: (project: ProjectWithSessions) => void
  onSelectSession: (session: Session) => void
  onDeleteSession: (session: Session) => void | Promise<void>
  onRemoveProject: (project: ProjectWithSessions) => void
}

interface ProjectNodeProps {
  project: ProjectWithSessions
  expanded: boolean
  active: boolean
  activeSessionId?: string
  onToggle: () => void
  onSelectProject: () => void
  onSelectSession: (session: Session) => void
  onDeleteSession: (session: Session) => void | Promise<void>
  onRemoveProject: () => void
  onRefresh: () => unknown
}

function ProjectNode(props: ProjectNodeProps): JSX.Element {
  const [creating, setCreating] = createSignal(false)

  // Creates a session in the project root and refreshes the tree so it shows up immediately.
  const addSession = async () => {
    if (creating() || !window.api) return

    setCreating(true)

    try {
      const session = await window.api.sessions.create(props.project.id, props.project.rootPath)

      if (!props.expanded) props.onToggle()

      await props.onRefresh()
      props.onSelectSession(session)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div class="flex flex-col">
      <div
        class="group/project flex items-center gap-0.5 rounded-md pr-0.5 transition-colors"
        classList={{
          'bg-neutral-200/60 text-neutral-900': props.active,
          'text-neutral-600 hover:bg-neutral-100': !props.active
        }}
      >
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1.5 pl-1 text-left text-[13px] font-medium"
          aria-expanded={props.expanded}
          title={props.project.rootPath}
          onClick={() => {
            props.onSelectProject()
            props.onToggle()
          }}
        >
          <HugeiconsIcon
            icon={ChevronRightIcon}
            size={13}
            class={`shrink-0 text-neutral-400 transition-transform duration-150 ${
              props.expanded ? 'rotate-90' : ''
            }`}
          />
          <HugeiconsIcon icon={Folder01Icon} size={15} class="shrink-0 text-neutral-400" />
          <span class="truncate">{props.project.name}</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            class="flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-400 opacity-0 transition hover:bg-neutral-200/70 hover:text-neutral-700 focus-visible:opacity-100 focus-visible:outline-none group-hover/project:opacity-100 data-expanded:opacity-100"
            aria-label={`${props.project.name} options`}
            disabled={creating()}
          >
            <HugeiconsIcon icon={MoreVerticalIcon} size={30} />
          </DropdownMenuTrigger>

          <DropdownMenuContent class="min-w-44">
            <DropdownMenuItem class="text-[12.5px]" onSelect={() => void addSession()}>
              <HugeiconsIcon icon={Add01Icon} size={14} class="text-neutral-400" />
              New session
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              class="text-[12.5px] text-danger focus:bg-danger/10 focus:text-danger"
              onSelect={props.onRemoveProject}
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} />
              Remove project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Show when={props.expanded}>
        <div class="mb-1 flex flex-col gap-0.5 pl-5.5">
          <Show when={props.project.sessions.length === 0}>
            <p class="px-2 py-1 text-[12px] text-neutral-400">No sessions yet</p>
          </Show>

          <For each={props.project.sessions}>
            {(session) => (
              <div
                class="group/session flex items-center gap-0.5 rounded-md pr-0.5 transition-colors"
                classList={{
                  'bg-neutral-200/60 text-neutral-900': props.activeSessionId === session.id,
                  'text-neutral-600 hover:bg-neutral-100': props.activeSessionId !== session.id
                }}
              >
                <button
                  type="button"
                  class="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 pl-2 pr-1 text-left text-[12.5px]"
                  title={session.directory}
                  onClick={() => props.onSelectSession(session)}
                >
                  <HugeiconsIcon
                    icon={BubbleChatIcon}
                    size={13}
                    class="shrink-0 text-neutral-400"
                  />
                  <span class="truncate">{session.title}</span>
                </button>

                <IconButton
                  label={`Delete ${session.title}`}
                  class="p-1 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover/session:opacity-100"
                  onClick={() => void props.onDeleteSession(session)}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={12} />
                </IconButton>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export function ProjectTree(props: ProjectTreeProps): JSX.Element {
  // Every project starts expanded; the record only tracks the ones the user collapsed.
  const [collapsed, setCollapsed] = createSignal<Record<string, boolean>>({})

  const isExpanded = (projectId: string) => !collapsed()[projectId]

  const toggle = (projectId: string) =>
    setCollapsed((previous) => ({ ...previous, [projectId]: !previous[projectId] }))

  return (
    <div class="flex flex-col gap-0.5">
      <For each={props.projects}>
        {(project) => (
          <ProjectNode
            project={project}
            expanded={isExpanded(project.id)}
            active={props.activeProjectId === project.id}
            activeSessionId={props.activeSessionId}
            onToggle={() => toggle(project.id)}
            onSelectProject={() => props.onSelectProject(project)}
            onSelectSession={props.onSelectSession}
            onDeleteSession={props.onDeleteSession}
            onRemoveProject={() => props.onRemoveProject(project)}
            onRefresh={props.onRefresh}
          />
        )}
      </For>
    </div>
  )
}
