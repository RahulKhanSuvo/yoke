import { createSignal, For, Show, type JSX } from 'solid-js'
import { HugeiconsIcon } from '@hugeicons/solid-js'
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon'
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon'
import { Button } from '@renderer/components/ui/button'
import type { ProviderId, ProviderStatus } from '@shared/ai'
import { aiStore } from '@renderer/features/ai/ai-store'
import { ProviderConnectDialog } from '@renderer/features/ai/ProviderConnectDialog'

export default function SettingsView(): JSX.Element {
  const [dialogOpen, setDialogOpen] = createSignal(false)
  const [selected, setSelected] = createSignal<ProviderId>()

  const providers = () => aiStore.providers() ?? []
  const connected = () => providers().filter((entry) => entry.configured)
  const available = () => providers().filter((entry) => !entry.configured)

  const connect = (providerId?: ProviderId) => {
    setSelected(providerId)
    setDialogOpen(true)
  }

  return (
    <div class="h-full overflow-y-auto bg-surface-soft">
      <div class="mx-auto flex w-full max-w-180 flex-col gap-6 px-8 py-8">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-[18px] font-semibold text-neutral-900">AI providers</h1>
            <p class="mt-1 max-w-xl text-[13px] leading-6 text-neutral-500">
              Bring your own API key. Yoke stores keys in your operating system keychain and talks
              to the provider directly — no account or free tier is included.
            </p>
          </div>

          <Button size="sm" class="shrink-0 gap-1.5" onClick={() => connect()}>
            <HugeiconsIcon icon={PlusSignIcon} size={14} />
            Add provider
          </Button>
        </div>

        <Show when={aiStore.providers.loading}>
          <p class="text-[12.5px] text-neutral-400">Loading providers…</p>
        </Show>

        <Show when={aiStore.providers.error}>
          <p class="text-[12.5px] text-danger">Could not load the provider list.</p>
        </Show>

        <section class="overflow-hidden rounded-xl border border-line bg-surface">
          <header class="border-b border-line/70 px-4 py-2.5">
            <h2 class="text-[12px] font-medium tracking-wide text-neutral-500 uppercase">
              Connected
            </h2>
          </header>

          <Show
            when={connected().length > 0}
            fallback={
              <div class="flex flex-col items-start gap-1 px-4 py-5">
                <p class="text-[13px] text-neutral-600">No providers connected yet.</p>
                <p class="text-[12.5px] text-neutral-400">
                  Add an API key to start using models from Anthropic, OpenAI, or Google.
                </p>
              </div>
            }
          >
            <For each={connected()}>
              {(provider) => (
                <ProviderRow
                  provider={provider}
                  action="Manage"
                  onAction={() => connect(provider.id)}
                />
              )}
            </For>
          </Show>
        </section>

        <section class="overflow-hidden rounded-xl border border-line bg-surface">
          <header class="border-b border-line/70 px-4 py-2.5">
            <h2 class="text-[12px] font-medium tracking-wide text-neutral-500 uppercase">
              Available
            </h2>
          </header>

          <Show
            when={available().length > 0}
            fallback={
              <p class="px-4 py-5 text-[13px] text-neutral-500">All providers are connected.</p>
            }
          >
            <For each={available()}>
              {(provider) => (
                <ProviderRow
                  provider={provider}
                  action="Connect"
                  onAction={() => connect(provider.id)}
                />
              )}
            </For>
          </Show>
        </section>
      </div>

      <ProviderConnectDialog
        open={dialogOpen()}
        providerId={selected()}
        onClose={() => {
          setDialogOpen(false)
          setSelected(undefined)
        }}
      />
    </div>
  )
}

function ProviderRow(props: {
  provider: ProviderStatus
  action: string
  onAction: () => void
}): JSX.Element {
  return (
    <div class="flex items-center gap-3 border-b border-line/50 px-4 py-3 last:border-b-0">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-[12px] font-semibold text-neutral-500">
        {props.provider.name.slice(0, 1).toUpperCase()}
      </span>

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <p class="truncate text-[13.5px] font-medium text-neutral-900">{props.provider.name}</p>
          <Show when={props.provider.configured}>
            <span class="flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={10} />
              Connected
            </span>
          </Show>
        </div>
        <p class="truncate text-[12px] text-neutral-400">
          {props.provider.models.map((model) => model.name).join(' · ')}
        </p>
      </div>

      <Button variant="outline" size="sm" class="shrink-0" onClick={props.onAction}>
        {props.action}
      </Button>
    </div>
  )
}
