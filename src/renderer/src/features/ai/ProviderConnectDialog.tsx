import { createEffect, createSignal, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import type { ProviderId, ProviderStatus } from '@shared/ai'
import { aiStore } from './ai-store'

export interface ProviderConnectDialogProps {
  open: boolean
  /** Skip the picker and go straight to this provider. */
  providerId?: ProviderId
  /** Model to select after the key is saved (e.g. the one the user clicked). */
  modelId?: string
  onClose: () => void
}

/**
 * Provider onboarding, modelled on opencode's connect flow: pick a provider from a
 * searchable list, then paste an API key. Keys are stored in the OS keychain by the
 * main process; the renderer only ever sees the `configured` flag.
 */
export function ProviderConnectDialog(props: ProviderConnectDialogProps): JSX.Element {
  const [selected, setSelected] = createSignal<ProviderId>()
  const [search, setSearch] = createSignal('')
  const [apiKey, setApiKey] = createSignal('')
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal<string>()

  const providers = () => aiStore.providers() ?? []

  const provider = (): ProviderStatus | undefined => aiStore.provider(selected())

  const matches = (entry: ProviderStatus) => {
    const query = search().trim().toLowerCase()

    return !query || entry.name.toLowerCase().includes(query) || entry.id.includes(query)
  }

  // The picker mirrors opencode's Integrations dialog: curated first, everything else after.
  const popular = () => providers().filter((entry) => entry.popular !== false && matches(entry))
  const services = () => providers().filter((entry) => entry.popular === false && matches(entry))

  // Reset whenever the dialog opens, optionally jumping straight to one provider.
  createEffect(() => {
    if (!props.open) return

    setSelected(props.providerId)
    setSearch('')
    setApiKey('')
    setError()
  })

  const save = async () => {
    const entry = provider()

    if (!entry || busy()) return

    const key = apiKey().trim()

    if (!key) {
      setError('Enter an API key first')
      return
    }

    setBusy(true)
    setError()

    try {
      const hadSelection = Boolean(aiStore.selectedModel())

      await window.api.ai.saveKey(entry.id, key)
      await aiStore.refreshProviders()

      const modelId = props.modelId ?? entry.models[0]?.id

      if (modelId && (!hadSelection || props.modelId)) {
        aiStore.setSelectedModel({ providerId: entry.id, modelId })
      }

      props.onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the API key')
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    const entry = provider()

    if (!entry || busy()) return

    setBusy(true)
    setError()

    try {
      await window.api.ai.removeKey(entry.id)
      await aiStore.refreshProviders()
      setApiKey('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the API key')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
    >
      <DialogContent class="max-w-md gap-0 p-0">
        <Show
          when={provider()}
          fallback={
            <>
              <DialogHeader class="border-b border-line/70 px-5 py-4">
                <DialogTitle class="text-[15px]">Integrations</DialogTitle>
                <DialogDescription class="text-[13px]">
                  Connect services so Yoke can use them.
                </DialogDescription>
              </DialogHeader>

              <div class="flex items-center gap-2 border-b border-line/70 px-5 py-3">
                <HugeiconsIcon icon={Search01Icon} size={15} class="shrink-0 text-neutral-400" />
                <input
                  type="search"
                  value={search()}
                  autofocus
                  placeholder="Search"
                  class="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-neutral-400"
                  onInput={(event) => setSearch(event.currentTarget.value)}
                />
              </div>

              <div class="flex max-h-96 flex-col gap-3 overflow-y-auto px-3 py-3">
                <ProviderGroup
                  title="Popular"
                  providers={popular()}
                  onSelect={(entry) => setSelected(entry.id)}
                />
                <ProviderGroup
                  title="Services"
                  providers={services()}
                  onSelect={(entry) => setSelected(entry.id)}
                  empty={search().trim() ? 'No providers match your search.' : undefined}
                />
              </div>
            </>
          }
        >
          {(entry) => (
            <>
              <DialogHeader class="border-b border-line/70 px-5 py-4">
                <div class="flex items-center gap-2">
                  <Show when={!props.providerId}>
                    <button
                      type="button"
                      aria-label="Back to providers"
                      class="-ml-1 rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                      onClick={() => {
                        setSelected(undefined)
                        setApiKey('')
                        setError()
                      }}
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} size={15} />
                    </button>
                  </Show>

                  <DialogTitle class="flex items-center gap-2 text-[15px]">
                    <ProviderAvatar name={entry().name} />
                    Connect {entry().name}
                  </DialogTitle>
                </div>

                <DialogDescription class="text-[13px]">
                  {entry().configured
                    ? `${entry().name} already has a key. Save a new one to replace it.`
                    : `Paste an API key to use ${entry().name} models. It never leaves this app.`}
                </DialogDescription>
              </DialogHeader>

              <form
                class="flex flex-col gap-3 px-5 py-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void save()
                }}
              >
                <input
                  type="password"
                  value={apiKey()}
                  autofocus
                  spellcheck={false}
                  autocomplete="off"
                  placeholder="sk-..."
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-neutral-400 focus-visible:border-neutral-300 focus-visible:ring-2 focus-visible:ring-ring/30"
                  onInput={(event) => setApiKey(event.currentTarget.value)}
                />

                <a
                  href={entry().apiKeyUrl}
                  target="_blank"
                  rel="noreferrer"
                  class="text-[12.5px] text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
                >
                  Get an API key from {entry().name}
                </a>

                <Show when={error()}>
                  {(message) => <p class="text-[12.5px] text-danger">{message()}</p>}
                </Show>

                <DialogFooter class="gap-2 pt-1">
                  <Show when={entry().configured}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="me-auto"
                      disabled={busy()}
                      onClick={() => void disconnect()}
                    >
                      Remove key
                    </Button>
                  </Show>

                  <Button type="button" variant="ghost" size="sm" onClick={props.onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={busy() || !apiKey().trim()}>
                    {busy() ? 'Saving…' : entry().configured ? 'Replace key' : 'Save key'}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </Show>
      </DialogContent>
    </Dialog>
  )
}

function ProviderGroup(props: {
  title: string
  providers: ProviderStatus[]
  onSelect: (provider: ProviderStatus) => void
  empty?: string
}): JSX.Element {
  return (
    <Show when={props.providers.length > 0 || props.empty}>
      <section class="flex flex-col gap-0.5">
        <p class="px-2 pt-1 pb-1.5 text-[12px] text-neutral-500">{props.title}</p>

        <For each={props.providers}>
          {(entry) => (
            <button
              type="button"
              class="flex items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none"
              onClick={() => props.onSelect(entry)}
            >
              <ProviderAvatar name={entry.name} />
              <span class="min-w-0 flex-1 truncate text-[13.5px] text-neutral-800">
                {entry.name}
              </span>
              <Show when={entry.configured}>
                <span class="flex shrink-0 items-center gap-1 text-[11.5px] text-green-700">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} />
                  Connected
                </span>
              </Show>
            </button>
          )}
        </For>

        <Show when={props.empty && props.providers.length === 0}>
          {(message) => <p class="px-2 py-2 text-[12.5px] text-neutral-400">{message()}</p>}
        </Show>
      </section>
    </Show>
  )
}

function ProviderAvatar(props: { name: string }): JSX.Element {
  return (
    <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-[11px] font-semibold text-neutral-500">
      {props.name.slice(0, 1).toUpperCase()}
    </span>
  )
}
