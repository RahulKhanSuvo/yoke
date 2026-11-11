import { For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon'
import Folder01Icon from '@hugeicons/core-free-icons/Folder01Icon'
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon'
import MoreVerticalIcon from '@hugeicons/core-free-icons/MoreVerticalIcon'
import { IconButton } from '@renderer/components/ui/IconButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

type ProjectWithSessions = Awaited<ReturnType<typeof window.api.projects.list>>[number]

export interface ProjectListProps {
  projects: ProjectWithSessions[]
  /** The project whose session is currently open, for highlight state. */
  activeProjectId?: string
  /** True while a session is being created, so rows show a disabled +. */
  busy?: boolean
  /** Opens the project: its latest session, or a new one when it has none. */
  onSelectProject: (project: ProjectWithSessions) => void
  onNewSession: (project: ProjectWithSessions) => void
  onRemoveProject: (project: ProjectWithSessions) => void
}

/** A flat row per project: folder, name, and a hover menu. No expandable tree. */
export function ProjectList(props: ProjectListProps): JSX.Element {
  return (
    <div class="flex flex-col gap-0.5">
      <For each={props.projects}>
        {(project) => (
          <div
            class="group/project flex items-center gap-0.5 rounded-md pr-0.5 transition-colors"
            classList={{
              'bg-surface-mute text-foreground': props.activeProjectId === project.id,
              'text-foreground hover:bg-foreground/[0.03]': props.activeProjectId !== project.id
            }}
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 cursor-default items-center gap-1.5 rounded-md py-1.5 pl-1 text-left text-[13px] font-medium focus-visible:outline-none"
              title={project.rootPath}
              onClick={() => props.onSelectProject(project)}
            >
              <HugeiconsIcon icon={Folder01Icon} size={15} class="shrink-0 text-foreground-muted" />
              <span class="truncate">{project.name}</span>
            </button>

            <IconButton
              label={`New session in ${project.name}`}
              class="p-1 opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/project:opacity-100"
              disabled={props.busy}
              onClick={() => props.onNewSession(project)}
            >
              <HugeiconsIcon icon={PlusSignIcon} size={14} class="text-foreground-muted" />
            </IconButton>

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
                  Remove project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </For>

      <Show when={props.projects.length === 0}>
        <p class="px-2 py-1.5 text-[12px] text-foreground-muted/70">No projects yet</p>
      </Show>
    </div>
  )
}
