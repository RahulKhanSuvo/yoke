import { createMemo, Show, type JSX, type Accessor } from 'solid-js'

const FallbackContextWindow = 200_000

/** Formats a token count the way opencode does: compact thousands. */
function formatTokens(value: number): string {
  if (value < 1000) return String(value)
  if (value < 10_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${Math.round(value / 1000)}k`
}

/**
 * Opencode's session context indicator: a thin ring that fills as the
 * conversation's tokens approach the model's context window, with the count.
 */
export function UsageRing(props: { tokens: Accessor<number>; contextWindow?: Accessor<number | undefined> }): JSX.Element {
  const total = () => Math.max(0, props.tokens())
  const contextWindow = () => props.contextWindow?.() ?? FallbackContextWindow

  const used = createMemo(() => Math.min(1, total() / contextWindow()))

  // The ring unwinds as tokens accumulate, like a clock at the end of its day.
  const offset = createMemo(() => RingCircumference * (1 - used()))

  return (
    <Show when={total() > 0}>
      <span
        class="flex items-center gap-1.5 text-foreground"
        title={`${Math.round(used() * 100)}% of context used (${formatTokens(total())} tokens)`}
      >
        <svg viewBox="0 0 16 16" class="size-4 shrink-0" aria-hidden="true">
          <circle
            cx="8"
            cy="8"
            r={RingRadius}
            fill="none"
            stroke="var(--line)"
            stroke-width="1.6"
          />
          <circle
            cx="8"
            cy="8"
            r={RingRadius}
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-dasharray={`${RingCircumference}`}
            stroke-dashoffset={`${offset()}`}
            transform="rotate(-90 8 8)"
          />
        </svg>
        <span class="text-[12px] leading-none tracking-[-0.04px] text-foreground-muted tabular-nums">
          {formatTokens(total())}
        </span>
      </span>
    </Show>
  )
}

const RingRadius = 6.4
const RingCircumference = 2 * Math.PI * RingRadius
