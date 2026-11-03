import { For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import AiBrain01Icon from '@hugeicons/core-free-icons/AiBrain01Icon'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import ChevronDownIcon from '@hugeicons/core-free-icons/ChevronDownIcon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { cn } from '@renderer/components/lib/utils'
import type { AgentInfo } from '@shared/ai'
import { aiStore } from './ai-store'

export interface AgentPickerProps {
  class?: string
}

/** Composer control that picks which agent (Build or Plan) answers the prompt. */
export function AgentPicker(props: AgentPickerProps): JSX.Element {
  const selected = () => aiStore.selectedAgent()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        class={cn(
          'flex h-7 max-w-44 shrink-0 items-center gap-1 rounded-md px-1.5 text-[13px] tracking-[-0.04px] text-foreground-muted transition hover:bg-surface-mute hover:text-foreground focus-visible:outline-none',
          props.class
        )}
        aria-label="Select agent"
      >
        <HugeiconsIcon icon={AiBrain01Icon} size={14} class="shrink-0 text-foreground-muted/70" />
        <span class="truncate">{selected().name}</span>
        <HugeiconsIcon icon={ChevronDownIcon} size={13} class="shrink-0 text-foreground-muted/60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent class="w-64">
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel class="text-[10.5px] font-medium tracking-wide text-neutral-400 uppercase">
            Agent
          </DropdownMenuGroupLabel>

          <For each={aiStore.agents}>
            {(agent: AgentInfo) => (
              <DropdownMenuItem
                class="flex-col items-start gap-0.5 py-2"
                onSelect={() => aiStore.setSelectedAgent(agent.id)}
              >
                <span class="flex w-full items-center gap-2">
                  <span class="flex-1 text-[13px] font-medium">{agent.name}</span>
                  <Show when={aiStore.selectedAgent().id === agent.id}>
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      size={14}
                      class="text-neutral-700"
                    />
                  </Show>
                </span>
                <span class="text-[11.5px] text-neutral-500">{agent.description}</span>
              </DropdownMenuItem>
            )}
          </For>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
