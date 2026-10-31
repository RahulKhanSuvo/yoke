import { createEffect, createResource, createSignal, createUniqueId, For, Show } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import {
  Delete02Icon,
  Folder01Icon,
  FolderAddIcon,
  PanelLeftIcon,
  SearchIcon as SearchIconData,
  SettingsIcon as SettingsIconData
} from '@hugeicons/core-free-icons'
import DashboardSquareAddIcon from '@hugeicons/core-free-icons/DashboardSquareAddIcon'
import { IconButton } from '@renderer/components/ui/IconButton'
import { NavItem } from '@renderer/components/ui/NavItem'
import { useSidebar } from '../context/sidebar-state'

const SEARCH_SHORTCUT = /Mac/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'

export const AppSidebar = () => {
  const sidebar = useSidebar()
  // The sidebar renders twice while peeking (docked column + overlay), so each instance needs its own id.
  const id = createUniqueId()

  const [projects, { refetch }] = createResource(async () => {
    if (!window.api) return []
    return window.api.projects.list()
  })

  createEffect(() => {
    console.log('Projects changed:', projects())
  })
  const [activeProjectId, setActiveProjectId] = createSignal<string>()
  const [busy, setBusy] = createSignal(false)

  const addProject = async () => {
    setBusy(true)

    try {
      const project = await window.api.projects.selectFolder()

      if (project) {
        setActiveProjectId(project.id)
        await refetch()
      }
    } finally {
      setBusy(false)
    }
  }

  const removeProject = async (projectId: string) => {
    await window.api.projects.delete(projectId)

    if (activeProjectId() === projectId) setActiveProjectId(undefined)

    await refetch()
  }

  return (
    <aside id={id} class="flex h-full w-full flex-col overflow-hidden">
      <div class="flex h-12 shrink-0 items-center justify-between px-3">
        <NavItem
          icon={<HugeiconsIcon icon={DashboardSquareAddIcon} size={15} class="text-neutral-400" />}
          label="Home"
        />
        <IconButton
          label={sidebar.collapsed() ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebar.collapsed()}
          aria-controls={id}
          class="p-1"
          onClick={sidebar.toggle}
        >
          <HugeiconsIcon icon={PanelLeftIcon} size={16} class="text-neutral-400" />
        </IconButton>
      </div>

      <div class="flex flex-col gap-0.5 px-2 pt-2">
        <NavItem
          icon={<HugeiconsIcon icon={SearchIconData} size={15} class="text-neutral-400" />}
          label="Search"
          shortcut={SEARCH_SHORTCUT}
        />
      </div>

      <div class="mt-4 flex shrink-0 items-center justify-between px-3 pb-1">
        <span class="text-[13px] font-medium tracking-wide text-neutral-500">Projects</span>
        <IconButton
          label="Add project"
          class="p-1"
          disabled={busy()}
          onClick={() => void addProject()}
        >
          <HugeiconsIcon icon={FolderAddIcon} size={15} class="text-neutral-600" />
        </IconButton>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <Show when={projects.error}>
          <div class="mx-1 mt-1 rounded-md border border-dashed border-red-200 px-3 py-2 text-center">
            <p class="text-[12px] text-red-500">Couldn't load projects</p>
          </div>
        </Show>

        <Show when={projects.loading && !projects()}>
          <p class="mx-1 mt-1 px-2 text-[12px] text-neutral-400">Loading…</p>
        </Show>

        <Show when={projects()?.length === 0}>
          <div class="mx-1 mt-1 rounded-md border border-dashed border-neutral-200 px-3 py-2 text-center">
            <p class="text-[12px] text-neutral-500">No projects yet</p>
          </div>
        </Show>

        <div class="flex flex-col gap-0.5">
          <For each={projects()}>
            {(project) => (
              <div
                class="group flex items-center rounded-md transition-colors"
                classList={{
                  'bg-neutral-200/60': activeProjectId() === project.id,
                  'hover:bg-neutral-100': activeProjectId() !== project.id
                }}
              >
                <button
                  type="button"
                  class="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px]"
                  classList={{
                    'text-neutral-900': activeProjectId() === project.id,
                    'text-neutral-600 group-hover:text-neutral-900':
                      activeProjectId() !== project.id
                  }}
                  title={project.rootPath}
                  onClick={() => setActiveProjectId(project.id)}
                >
                  <HugeiconsIcon icon={Folder01Icon} size={15} class="shrink-0 text-neutral-400" />
                  <span class="truncate">{project.name}</span>
                </button>

                <IconButton
                  label={`Remove ${project.name}`}
                  class="mr-1 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => void removeProject(project.id)}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={13} />
                </IconButton>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class="shrink-0 border-t border-neutral-200/70 p-2">
        <NavItem
          icon={<HugeiconsIcon icon={SettingsIconData} size={15} class="text-neutral-400" />}
          label="Settings"
        />
      </div>
    </aside>
  )
}
