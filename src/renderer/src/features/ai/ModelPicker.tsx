import { createSignal, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import ChevronDownIcon from '@hugeicons/core-free-icons/ChevronDownIcon'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { cn } from '@renderer/components/lib/utils'
import type { ProviderId, ProviderStatus } from '@shared/ai'
import { aiStore } from './ai-store'
import { ProviderConnectDialog } from './ProviderConnectDialog'

export interface ModelPickerProps {
  class?: string
}

/**
 * Model selector: models from connected providers on top, then an
 * "Add more models" panel that opens the connect flow for any other provider.
 */
export function ModelPicker(props: ModelPickerProps): JSX.Element {
  const [open, setOpen] = createSignal(false)
  const [picking, setPicking] = createSignal(false)
  const [connecting, setConnecting] = createSignal<ProviderId>()

  const providers = () => aiStore.providers() ?? []
  const connected = () => providers().filter((entry) => entry.configured)

  const label = () => aiStore.selectedModelInfo()?.model.name ?? 'Select model'

  const isSelected = (providerId: string, modelId: string) => {
    const selection = aiStore.selectedModel()

    return selection?.providerId === providerId && selection.modelId === modelId
  }

  const pick = (provider: ProviderStatus, modelId: string) => {
    aiStore.setSelectedModel({ providerId: provider.id, modelId })
    setOpen(false)
  }

  const connect = (providerId: ProviderId) => {
    setOpen(false)
    setConnecting(providerId)
  }

  return (
    <>
      <button
        type="button"
        class={cn(
          'flex max-w-52 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none',
          props.class
        )}
        aria-label="Select model"
        onClick={() => setOpen(true)}
      >
        <span class="truncate">{label()}</span>
        <HugeiconsIcon icon={ChevronDownIcon} size={14} class="shrink-0 text-neutral-400" />
      </button>

      <Dialog open={open()} onOpenChange={(next) => setOpen(next)}>
        <DialogContent class="max-w-xl gap-0 p-0" disableAnimation>
          <DialogHeader class="border-b border-line/70 px-5 py-4">
            <DialogTitle class="text-[15px]">Select model</DialogTitle>
            <Show when={connected().length > 0}>
              <DialogDescription class="text-[12.5px]">
                Models available with your connected providers.
              </DialogDescription>
            </Show>
          </DialogHeader>

          <div class="flex max-h-[26rem] flex-col overflow-y-auto px-2 py-2">
            <Show
              when={connected().length > 0}
              fallback={
                <p class="px-3 py-4 text-[13px] text-neutral-500">
                  No provider connected yet. Add one below to start using models.
                </p>
              }
            >
              <For each={connected()}>
                {(provider) => (
                  <section class="flex flex-col">
                    <p class="px-3 pt-2 pb-1 text-[11px] font-medium text-neutral-400">
                      {provider.name}
                    </p>

                    <For each={provider.models}>
                      {(model) => (
                        <button
                          type="button"
                          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none"
                          onClick={() => pick(provider, model.id)}
                        >
                          <span class="min-w-0 flex-1 truncate text-[14px] font-medium text-neutral-900">
                            {model.name}
                          </span>
                          <Show when={isSelected(provider.id, model.id)}>
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              size={16}
                              class="shrink-0 text-neutral-700"
                            />
                          </Show>
                        </button>
                      )}
                    </For>
                  </section>
                )}
              </For>
            </Show>

            <Show when={providers().length > 0}>
              <section class="mt-2 flex flex-col gap-3 rounded-xl border border-line bg-surface-soft p-4">
                <p class="text-[13px] text-neutral-600">
                  Add more models from popular providers
                </p>

                <div class="grid grid-cols-2 gap-2.5">
                  <For each={providers()}>
                    {(provider) => (
                      <button
                        type="button"
                        class="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-3 text-left transition hover:border-neutral-300 hover:bg-neutral-50 focus-visible:border-neutral-300 focus-visible:outline-none"
                        onClick={() => connect(provider.id)}
                      >
                        <ProviderAvatar name={provider.name} />
                        <span class="min-w-0 flex-1">
                          <span class="block truncate text-[13.5px] font-medium text-neutral-900">
                            {provider.name}
                          </span>
                          <Show
                            when={provider.configured}
                            fallback={
                              <span class="block truncate text-[11.5px] text-neutral-400">
                                {provider.models.length} models
                              </span>
                            }
                          >
                            <span class="block text-[11.5px] text-green-700">Connected</span>
                          </Show>
                        </span>
                      </button>
                    )}
                  </For>
                </div>

                <button
                  type="button"
                  class="text-left text-[12.5px] text-neutral-500 transition hover:text-neutral-800"
                  onClick={() => {
                    setOpen(false)
                    setPicking(true)
                  }}
                >
                  See all providers →
                </button>
              </section>
            </Show>
          </div>
        </DialogContent>
      </Dialog>

      <ProviderConnectDialog
        open={picking() || connecting() !== undefined}
        providerId={connecting()}
        onClose={() => {
          setPicking(false)
          setConnecting(undefined)
        }}
      />
    </>
  )
}

function ProviderAvatar(props: { name: string }): JSX.Element {
  return (
    <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-[12px] font-semibold text-neutral-500">
      {props.name.slice(0, 1).toUpperCase()}
    </span>
  )
}
