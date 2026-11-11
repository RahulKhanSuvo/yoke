/** A file or folder row in the side panel's Files tab. */
export interface FileTreeNode {
  name: string
  /** Path relative to the project root; directories end with `/`. */
  path: string
  type: 'file' | 'directory'
}

/** A text file's contents for the read-only preview. */
export interface FilePreview {
  path: string
  content: string
  lines: number
  truncated: boolean
}
