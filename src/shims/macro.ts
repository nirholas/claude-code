// src/shims/macro.ts

// Read version from package.json at startup
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const pkgPath = resolve(dirname(__filename), '..', '..', 'package.json')
let version = '0.0.0-dev'
try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  version = pkg.version || version
} catch {}

const MACRO_OBJ = {
  VERSION: version,
  PACKAGE_URL: '@anthropic-ai/claude-code',
  ISSUES_EXPLAINER:
    'report issues at https://github.com/anthropics/claude-code/issues',
}

// Install as global
;(globalThis as any).MACRO = MACRO_OBJ

export default MACRO_OBJ
