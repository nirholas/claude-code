# Prompt 06: Verify and Fix the Ink/React Terminal UI Pipeline

## Context

You are working in `/workspaces/claude-code`. The CLI renders its UI using **React + Ink** — a framework that renders React components to the terminal (not a browser). This project includes a **custom fork of Ink** embedded directly in `src/ink/`.

Key files:
- `src/ink.ts` — Public API (re-exports `render()` and `createRoot()`, wraps with `ThemeProvider`)
- `src/ink/root.ts` — Ink's root renderer
- `src/ink/ink.tsx` — Core Ink component
- `src/ink/reconciler.ts` — React reconciler for terminal output
- `src/ink/dom.ts` — Terminal DOM implementation
- `src/ink/renderer.ts` — Renders virtual DOM to terminal strings
- `src/ink/components/` — Built-in Ink components (Box, Text, etc.)
- `src/components/` — Claude Code's ~140 custom components

## Task

### Part A: Trace the render pipeline

Read these files in order and document the rendering flow:

1. `src/ink.ts` → how `render()` and `createRoot()` work
2. `src/ink/root.ts` → how Ink creates a root and mounts React
3. `src/ink/reconciler.ts` → what React reconciler is used
4. `src/ink/renderer.ts` → how the virtual DOM becomes terminal output
5. `src/ink/dom.ts` → what the "DOM nodes" look like

Create a brief architecture doc in a comment block or README section.

### Part B: Verify Ink components compile

Check that the core Ink components are self-contained:
```
src/ink/components/
```
List them all and verify they don't have missing imports.

### Part C: Check the ThemeProvider

Read `src/components/design-system/ThemeProvider.tsx` (or wherever it lives). Verify it:
1. Exists
2. Exports a `ThemeProvider` component
3. The theme system doesn't depend on external resources

### Part D: Create a minimal render test

Create `scripts/test-ink.tsx`:
```tsx
// scripts/test-ink.tsx
// Minimal test that the Ink terminal UI renders
// Usage: bun scripts/test-ink.tsx

import React from 'react'

// We need the shims loaded first
import './src/shims/preload.js'

// Now try to use Ink
import { render } from './src/ink.js'

// Minimal component
function Hello() {
  return <Text>Hello from Claude Code Ink UI!</Text>
}

// Need to import Text from Ink
import { Text } from './src/ink/components/Text.js'

async function main() {
  const instance = await render(<Hello />)
  // Give it a moment to render
  setTimeout(() => {
    instance.unmount()
    process.exit(0)
  }, 500)
}

main().catch(err => {
  console.error('Ink render test failed:', err)
  process.exit(1)
})
```

Adjust the imports based on what you find — the Text component path may differ.

### Part E: Fix any issues

If Ink rendering fails, the common issues are:
1. **Missing `yoga-wasm-web` or `yoga-layout`** — Ink uses Yoga for flexbox layout. Check if there's a Yoga dependency or if it's embedded.
2. **React version mismatch** — The code uses React 19. Verify the reconciler is compatible.
3. **Terminal detection** — Ink checks if stdout is a TTY. In some environments this may need to be forced.
4. **Missing chalk/ansi dependency** — Terminal colors.

Fix whatever you find to make the test render successfully.

### Part F: Verify component imports

Check that `src/components/` components can import from the Ink system without errors. Pick 3-5 key components:
- `src/components/MessageResponse.tsx` (or similar — the main chat message renderer)
- `src/components/ToolUseResult.tsx` (or similar — tool output display)
- `src/components/PermissionRequest.tsx` (or similar — permission modal)

Read their imports and verify nothing is missing.

## Verification

1. `scripts/test-ink.tsx` renders "Hello from Claude Code Ink UI!" to the terminal
2. No new TypeScript errors introduced
3. You've documented the render pipeline flow
