import { splitProps, type JSX } from 'solid-js'

/** 5x7 pixel glyphs, one string per row, "1" = filled pixel. */
const GLYPHS: Record<string, string[]> = {
  y: ['10001', '10001', '10001', '01010', '00100', '00100', '00100'],
  o: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  k: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  e: ['01110', '10001', '10000', '11110', '10000', '10001', '01110']
}

export interface PixelTextProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  text: string
  /** Size of a single pixel in CSS pixels. */
  pixel?: number
}

/** Renders text as a blocky pixel-art wordmark. Pixels use `currentColor`. */
export function PixelText(props: PixelTextProps) {
  const [local, rest] = splitProps(props, ['text', 'pixel'])
  const pixel = () => local.pixel ?? 12

  return (
    <div
      {...rest}
      role="img"
      aria-label={local.text}
      class={`flex items-start gap-0.75 ${rest.class ?? ''}`}
    >
      {[...local.text].map((char) => {
        const rows = GLYPHS[char.toLowerCase()]
        if (!rows) return null
        return (
          <div
            class="grid"
            style={{
              'grid-template-columns': `repeat(${rows[0].length}, ${pixel()}px)`,
              'grid-auto-rows': `${pixel()}px`
            }}
          >
            {rows.map((row) =>
              [...row].map((cell) => (
                <div
                  style={{ 'background-color': cell === '1' ? 'currentColor' : 'transparent' }}
                />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}
