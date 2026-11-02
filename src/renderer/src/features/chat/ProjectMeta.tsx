import type { JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import GitBranchIcon from '@hugeicons/core-free-icons/GitBranchIcon'
import MonitorIcon from '@hugeicons/core-free-icons/MonitorIcon'
import { PixelText } from '@renderer/components/ui/PixelText'

export interface ProjectMetaProps {
  name: string
  path: string
  branch?: string
}

/** Compact project / branch / path row shown under a composer. */
export function ProjectMeta(props: ProjectMetaProps): JSX.Element {
  return (
    <div class="flex items-center justify-between gap-4 px-1 text-[12.5px] text-neutral-500">
      <div class="flex min-w-0 items-center gap-2.5">
        <span class="flex size-4.5 shrink-0 items-center justify-center rounded-[5px] bg-neutral-900">
          <PixelText text="y" pixel={2} class="text-white" />
        </span>
        <span class="truncate text-neutral-700">{props.name}</span>
        <span class="size-1.5 shrink-0 rounded-full bg-blue-500" />
        {props.branch && (
          <span class="flex shrink-0 items-center gap-1">
            <HugeiconsIcon icon={GitBranchIcon} size={13} class="text-neutral-400" />
            {props.branch}
          </span>
        )}
      </div>

      <div class="flex min-w-0 items-center gap-1.5">
        <HugeiconsIcon icon={MonitorIcon} size={13} class="shrink-0 text-neutral-400" />
        <span class="truncate">{props.path}</span>
      </div>
    </div>
  )
}
