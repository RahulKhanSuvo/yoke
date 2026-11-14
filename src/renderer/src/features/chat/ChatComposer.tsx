import { Show, For, createSignal, createEffect, onCleanup, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ArrowUp01Icon from '@hugeicons/core-free-icons/ArrowUp01Icon'
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon'
import StopIcon from '@hugeicons/core-free-icons/StopIcon'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import ChevronDownIcon from '@hugeicons/core-free-icons/ChevronDownIcon'
import { AgentPicker } from '@renderer/features/ai/AgentPicker'
import { ModelPicker } from '@renderer/features/ai/ModelPicker'
import { aiStore } from '@renderer/features/ai/ai-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import BrainIcon from '@hugeicons/core-free-icons/BrainIcon'
import Image01Icon from '@hugeicons/core-free-icons/Image01Icon'
import ConsoleIcon from '@hugeicons/core-free-icons/ConsoleIcon'
import CommandIcon from '@hugeicons/core-free-icons/CommandIcon'
import AtSignIcon from '@hugeicons/core-free-icons/AtSignIcon'
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon'
import { type ThinkingLevel } from '@shared/ai'

/** Menu option labels, opencode's variant names. */
const THINKING_LABELS: Record<ThinkingLevel, string> = {
  default: 'Default',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  max: 'Max'
}

export interface ChatComposerProps {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  busy?: boolean
  disabled?: boolean
  onCancel?: () => void
  autofocus?: boolean
  placeholder?: string
  /** Absolute paths attached through the + menu, shown as chips. */
  attachments?: string[]
  /** Removes one attachment chip. */
  onRemoveAttachment?: (path: string) => void
  /** Opens the "Images and files" picker (the + menu and Ctrl+U). */
  onAttachFiles?: () => void
  /** Inserts a trigger character — / for commands, @ for context, ! for shell. */
  onInsertPrefix?: (prefix: string) => void
}

/**
 * Opencode-style thinking-variant menu: the pill shows the active level with a
 * chevron, and the dropdown lists every level with a check on the current one.
 */
function ThinkingMenu(): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [button, setButton] = createSignal<HTMLButtonElement | undefined>()
  /** Fixed-position anchor so the composer's overflow-clip cannot cut the menu. */
  const [anchor, setAnchor] = createSignal<{ bottom: number; left: number }>({ bottom: 0, left: 0 })

  /** The model's own level list, with Default in front like opencode's variants. */
  const levels = (): ThinkingLevel[] => ['default', ...aiStore.selectedModelThinkingLevels()]

  // Switching models invalidates a level the new one does not support.
  createEffect(() => {
    if (aiStore.thinking() !== 'default' && !levels().includes(aiStore.thinking())) {
      aiStore.setThinking('default')
    }
  })

  const toggle = (): void => {
    if (!open()) {
      const rect = button()?.getBoundingClientRect()

      if (rect) setAnchor({ bottom: window.innerHeight - rect.top + 6, left: rect.left })
    }

    setOpen(!open())
  }

  const choose = (level: ThinkingLevel): void => {
    aiStore.setThinking(level)
    setOpen(false)
  }

  const onDocPointerDown = (event: MouseEvent): void => {
    if (!open()) return

    const target = event.target as Node

    if (!button()?.contains(target) && !document.querySelector('[role="menu"]')?.contains(target)) {
      setOpen(false)
    }
  }

  document.addEventListener('pointerdown', onDocPointerDown)
  onCleanup(() => document.removeEventListener('pointerdown', onDocPointerDown))

  return (
    <>
      <button
        ref={setButton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-label="Thinking level"
        class="flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-[13px] tracking-[-0.04px] transition focus-visible:outline-none"
        classList={{
          'bg-surface-mute text-foreground': aiStore.thinking() !== 'default' || open(),
          'text-foreground-muted hover:bg-surface-mute hover:text-foreground':
            aiStore.thinking() === 'default' && !open()
        }}
        onClick={toggle}
      >
        <HugeiconsIcon icon={BrainIcon} size={14} />
        <span class="hidden truncate sm:inline">{THINKING_LABELS[aiStore.thinking()]}</span>
        <HugeiconsIcon icon={ChevronDownIcon} size={12} />
      </button>

      <Show when={open()}>
        <div
          role="menu"
          class="fixed z-50 min-w-40 rounded-lg border border-line bg-surface py-1 shadow-lg"
          style={{ bottom: `${anchor().bottom}px`, left: `${anchor().left}px` }}
        >
          <For each={levels()}>
            {(level) => (
              <button
                type="button"
                role="menuitem"
                class="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-[13px] tracking-[-0.04px] text-foreground transition hover:bg-surface-mute"
                onClick={() => choose(level)}
              >
                <span>{THINKING_LABELS[level]}</span>
                <Show when={aiStore.thinking() === level}>
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={14}
                    class="text-foreground-muted"
                  />
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </>
  )
}

/** Image extensions render as thumbnails instead of a plain dot. */
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])

const isImagePath = (file: string): boolean =>
  IMAGE_EXTENSIONS.has(file.split('.').pop()?.toLowerCase() ?? '')

/** One row of the + menu: icon, label, right-aligned shortcut like opencode. */
function AttachMenuItem(props: {
  icon: typeof Image01Icon
  label: string
  shortcut: string
  onSelect: () => void
}): JSX.Element {
  return (
    <DropdownMenuItem
      class="flex items-center justify-between gap-6 py-1.5"
      onSelect={props.onSelect}
    >
      <span class="flex items-center gap-2.5">
        <HugeiconsIcon icon={props.icon} size={15} class="shrink-0 text-foreground-muted" />
        <span class="text-[13px] tracking-[-0.04px]">{props.label}</span>
      </span>
      <span class="text-[12px] tracking-[-0.04px] text-foreground-muted/70">{props.shortcut}</span>
    </DropdownMenuItem>
  )
}

/**
 * Opencode-style prompt dock: a borderless editor over a 44px control row with
 * add, agent, and model on the left and send/stop on the right.
 */
export function ChatComposer(props: ChatComposerProps): JSX.Element {
  const canSend = () => props.value.trim().length > 0 && !props.busy && !props.disabled

  const submit = () => {
    if (!props.value.trim() || props.disabled) return
    props.onSubmit()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      if (!props.busy) submit()
    }

    // opencode's attach shortcut.
    if (event.key.toLowerCase() === 'u' && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
      event.preventDefault()
      props.onAttachFiles?.()
    }
  }

  return (
    <div class="flex w-full flex-col overflow-clip rounded-xl border border-line bg-surface shadow-xs transition-colors focus-within:border-foreground/20">
      <Show when={props.attachments?.length}>
        <div class="flex flex-wrap gap-1.5 px-3 pt-3">
          <For each={props.attachments}>
            {(file) => (
              <span class="flex items-center gap-1.5 rounded-md bg-surface-mute py-1 pr-1.5 text-[12px] text-foreground-muted">
                <Show
                  when={isImagePath(file)}
                  fallback={<span class="size-1.5 rounded-full bg-foreground-muted/50" />}
                >
                  <img
                    src={`file://${file}`}
                    alt=""
                    class="size-8 shrink-0 rounded object-cover"
                    onError={(event) => {
                      ;(event.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </Show>
                <span class="max-w-48 truncate">{file.split('/').pop()}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.split('/').pop()}`}
                  class="flex size-5 items-center justify-center rounded transition hover:bg-surface hover:text-foreground"
                  onClick={() => props.onRemoveAttachment?.(file)}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </button>
              </span>
            )}
          </For>
        </div>
      </Show>

      <textarea
        rows={1}
        value={props.value}
        autofocus={props.autofocus ?? true}
        placeholder={props.placeholder ?? 'Ask anything, / for commands, @ for context…'}
        class="field-sizing-content max-h-56 w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[13px] leading-[1.6] tracking-[-0.04px] text-foreground outline-none placeholder:text-foreground-muted/70"
        onInput={(event) => props.onValueChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
      />

      <div class="flex h-11 shrink-0 items-center justify-between gap-2 px-2">
        <div class="flex min-w-0 items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Add attachment"
              class="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground-muted transition hover:bg-surface-mute hover:text-foreground focus-visible:outline-none"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={15} />
            </DropdownMenuTrigger>

            <DropdownMenuContent class="w-56">
              <DropdownMenuGroup>
                <AttachMenuItem
                  icon={Image01Icon}
                  label="Images and files"
                  shortcut="Ctrl+U"
                  onSelect={() => props.onAttachFiles?.()}
                />
                <AttachMenuItem
                  icon={CommandIcon}
                  label="Commands"
                  shortcut="/"
                  onSelect={() => props.onInsertPrefix?.('/')}
                />
                <AttachMenuItem
                  icon={AtSignIcon}
                  label="Context"
                  shortcut="@"
                  onSelect={() => props.onInsertPrefix?.('@')}
                />
                <AttachMenuItem
                  icon={ConsoleIcon}
                  label="Shell command"
                  shortcut="!"
                  onSelect={() => props.onInsertPrefix?.('!')}
                />
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <AgentPicker />
          <ModelPicker />
          <Show when={aiStore.selectedModelSupportsThinking()}>
            <ThinkingMenu />
          </Show>
        </div>

        <Show
          when={props.busy}
          fallback={
            <button
              type="button"
              aria-label="Send"
              disabled={!canSend()}
              class="flex size-7 shrink-0 items-center justify-center rounded-lg transition-all"
              classList={{
                'bg-foreground text-background hover:opacity-85 cursor-pointer': canSend(),
                'bg-surface-mute text-foreground-muted/40 cursor-not-allowed': !canSend()
              }}
              onClick={submit}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
            </button>
          }
        >
          <button
            type="button"
            aria-label="Stop generation"
            class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-surface-mute text-foreground transition hover:bg-line"
            onClick={props.onCancel}
          >
            <HugeiconsIcon icon={StopIcon} size={13} />
          </button>
        </Show>
      </div>
    </div>
  )
}
