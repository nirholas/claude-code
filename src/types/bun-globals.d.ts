// Bun runtime global type augmentations.
// The bun-types package provides these when installed; this file acts as a
// lightweight fallback so the project type-checks without it.

interface ImportMeta {
  /** Bun: absolute path of the directory containing the current file */
  dir: string
  /** Node 21+ / Bun: same as dir */
  dirname: string
}
