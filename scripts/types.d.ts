// Local type declarations for scripts/ — avoids depending on installed packages
// for type checking in build scripts.

// ── esbuild (minimal surface used by build-bundle.ts) ──
declare module 'esbuild' {
  export interface Plugin {
    name: string
    setup(build: PluginBuild): void
  }

  export interface PluginBuild {
    onResolve(
      options: { filter: RegExp },
      callback: (args: OnResolveArgs) => OnResolveResult | undefined | null,
    ): void
  }

  export interface OnResolveArgs {
    path: string
    importer: string
    namespace: string
    resolveDir: string
    kind: string
    pluginData: unknown
  }

  export interface OnResolveResult {
    path?: string
    external?: boolean
    namespace?: string
    pluginData?: unknown
  }

  export interface BuildOptions {
    entryPoints?: string[]
    bundle?: boolean
    platform?: string
    target?: string[]
    format?: string
    outdir?: string
    outExtension?: Record<string, string>
    splitting?: boolean
    plugins?: Plugin[]
    tsconfig?: string
    alias?: Record<string, string>
    external?: string[]
    jsx?: string
    sourcemap?: boolean | string
    minify?: boolean
    treeShaking?: boolean
    define?: Record<string, string>
    banner?: Record<string, string>
    resolveExtensions?: string[]
    logLevel?: string
    metafile?: boolean
    [key: string]: unknown
  }

  export interface Metafile {
    inputs: Record<string, { bytes: number; imports: unknown[] }>
    outputs: Record<string, { bytes: number; inputs: unknown[]; exports: string[] }>
  }

  export interface BuildResult {
    errors: { text: string }[]
    warnings: { text: string }[]
    metafile?: Metafile
  }

  export interface BuildContext {
    watch(): Promise<void>
    serve(options?: unknown): Promise<unknown>
    rebuild(): Promise<BuildResult>
    dispose(): Promise<void>
  }

  export function build(options: BuildOptions): Promise<BuildResult>
  export function context(options: BuildOptions): Promise<BuildContext>
  export function analyzeMetafile(metafile: Metafile, options?: { verbose?: boolean }): Promise<string>
}

// ── Bun's ImportMeta extensions ──
interface ImportMeta {
  dir: string
  dirname: string
}
