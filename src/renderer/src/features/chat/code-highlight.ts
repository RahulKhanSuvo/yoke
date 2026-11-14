/**
 * Lightweight regex-based syntax highlighting for the chat UI — the same
 * keyword/string/type hues opencode's editor theme uses, without shipping a
 * full highlighter.
 */

export type CodeTokenClass =
  'tok-kw' | 'tok-str' | 'tok-num' | 'tok-type' | 'tok-fn' | 'tok-comment' | 'tok-tag'

export interface CodeSpan {
  text: string
  cls: CodeTokenClass | undefined
}

const JS_KEYWORDS =
  'as async await break case catch class const continue debugger default delete do else enum export extends false finally for from function get if implements import in instanceof interface let new null of package private protected public readonly return satisfies set static super switch this throw true try type typeof var void while with yield declare namespace abstract declare'

const PY_KEYWORDS =
  'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield match case'

const GO_KEYWORDS =
  'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var nil true false'

const RS_KEYWORDS =
  'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while'

const KEYWORDS: Record<string, Set<string>> = {
  ts: new Set(JS_KEYWORDS.split(' ')),
  js: new Set(JS_KEYWORDS.split(' ')),
  py: new Set(PY_KEYWORDS.split(' ')),
  go: new Set(GO_KEYWORDS.split(' ')),
  rs: new Set(RS_KEYWORDS.split(' ')),
  json: new Set(['true', 'false', 'null']),
  css: new Set(['important', 'media', 'keyframes', 'import', 'supports', 'layer']),
  sh: new Set([
    'if',
    'then',
    'else',
    'fi',
    'for',
    'do',
    'done',
    'while',
    'case',
    'esac',
    'function',
    'export',
    'local',
    'return',
    'in'
  ])
}

const ALIASES: Record<string, keyof typeof KEYWORDS> = {
  typescript: 'ts',
  tsconfig: 'ts',
  tsx: 'ts',
  jsx: 'js',
  javascript: 'js',
  mjs: 'js',
  cjs: 'js',
  node: 'js',
  python: 'py',
  py3: 'py',
  golang: 'go',
  rust: 'rs',
  bash: 'sh',
  shell: 'sh',
  zsh: 'sh',
  console: 'sh',
  yaml: 'sh',
  yml: 'sh',
  html: 'ts',
  diff: 'ts'
}

/** Resolves a file path or fence language to a highlighter key. */
export function codeLang(source: string): keyof typeof KEYWORDS | undefined {
  const raw = source.trim().toLowerCase()
  const ext = raw.includes('.') ? (raw.split('.').pop() ?? '') : raw

  const alias = ALIASES[ext] ?? ALIASES[raw]
  if (alias) return alias

  return (raw && raw in KEYWORDS ? raw : undefined) as keyof typeof KEYWORDS | undefined
}

const TOKEN_RE =
  /(\/\/[^\n]*|#[^\s!][^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\.)*`?|<\/?[A-Za-z][\w.:-]*|\b\d[\d_a-fA-FxX.]*\b|[A-Za-z_$][\w$]*|[^\sA-Za-z0-9_$]+)/g

/**
 * Splits one line into colored spans. `lang` comes from `codeLang` — undefined
 * renders plain text.
 */
export function highlightLine(line: string, lang: keyof typeof KEYWORDS | undefined): CodeSpan[] {
  if (!lang) return [{ text: line, cls: undefined }]

  const keywords = KEYWORDS[lang]
  const spans: CodeSpan[] = []
  let plain = ''
  let index = 0

  TOKEN_RE.lastIndex = 0

  for (let match = TOKEN_RE.exec(line); match; match = TOKEN_RE.exec(line)) {
    const [text] = match

    if (match.index > index) {
      plain += line.slice(index, match.index)
    }

    index = match.index + text.length

    const cls = classify(text, line, index, lang, keywords)

    if (cls) {
      if (plain) {
        spans.push({ text: plain, cls: undefined })
        plain = ''
      }

      spans.push({ text, cls })
    } else {
      plain += text
    }
  }

  if (index < line.length) plain += line.slice(index)
  if (plain) spans.push({ text: plain, cls: undefined })

  return spans
}

function classify(
  text: string,
  line: string,
  end: number,
  lang: string,
  keywords: Set<string>
): CodeTokenClass | undefined {
  if (text.startsWith('//') || text.startsWith('/*') || (lang !== 'rs' && text.startsWith('#'))) {
    return 'tok-comment'
  }

  if (/^["'`]/.test(text)) return 'tok-str'

  if (/^<\/?/.test(text)) return 'tok-tag'

  if (/^\d/.test(text)) return 'tok-num'

  if (keywords.has(text)) return 'tok-kw'

  if (/^[A-Z]/.test(text)) return 'tok-type'

  // A call: identifier immediately followed by an open paren.
  const rest = line.slice(end)

  if (/^\s*\(/.test(rest)) return 'tok-fn'

  return undefined
}

/** Highlights a whole snippet, one span list per line. */
export function highlightLines(
  code: string,
  lang: keyof typeof KEYWORDS | undefined
): CodeSpan[][] {
  return code.split('\n').map((line) => highlightLine(line, lang))
}
