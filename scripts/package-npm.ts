// scripts/package-npm.ts
// Generate a publishable npm package in dist/npm/
//
// Usage: bun scripts/package-npm.ts
//
// Prerequisites: run `bun run build:prod` first to generate dist/cli.mjs

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, chmodSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dir, '..')
const DIST = resolve(ROOT, 'dist')
const NPM_DIR = resolve(DIST, 'npm')
const CLI_BUNDLE = resolve(DIST, 'cli.mjs')

function main() {
  // Verify the bundle exists
  if (!existsSync(CLI_BUNDLE)) {
    console.error('Error: dist/cli.mjs not found. Run `bun run build:prod` first.')
    process.exit(1)
  }

  // Read source package.json
  const srcPkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))

  // Create npm output directory
  mkdirSync(NPM_DIR, { recursive: true })

  // Copy the bundled CLI
  copyFileSync(CLI_BUNDLE, resolve(NPM_DIR, 'cli.mjs'))
  chmodSync(resolve(NPM_DIR, 'cli.mjs'), 0o755)

  // Copy source map if it exists
  const sourceMap = resolve(DIST, 'cli.mjs.map')
  if (existsSync(sourceMap)) {
    copyFileSync(sourceMap, resolve(NPM_DIR, 'cli.mjs.map'))
  }

  // Generate a publishable package.json
  const npmPkg = {
    name: srcPkg.name || '@anthropic-ai/claude-code',
    version: srcPkg.version || '0.0.0',
    description: srcPkg.description || 'Anthropic Claude Code CLI',
    license: 'MIT',
    type: 'module',
    main: './cli.mjs',
    bin: {
      claude: './cli.mjs',
    },
    engines: {
      node: '>=20.0.0',
    },
    os: ['darwin', 'linux', 'win32'],
    files: [
      'cli.mjs',
      'cli.mjs.map',
      'README.md',
    ],
  }

  writeFileSync(
    resolve(NPM_DIR, 'package.json'),
    JSON.stringify(npmPkg, null, 2) + '\n',
  )

  // Copy README if it exists
  const readme = resolve(ROOT, 'README.md')
  if (existsSync(readme)) {
    copyFileSync(readme, resolve(NPM_DIR, 'README.md'))
  }

  // Summary
  const bundleSize = readFileSync(CLI_BUNDLE).byteLength
  const sizeMB = (bundleSize / 1024 / 1024).toFixed(2)

  console.log('npm package generated in dist/npm/')
  console.log(`  package:  ${npmPkg.name}@${npmPkg.version}`)
  console.log(`  bundle:   cli.mjs (${sizeMB} MB)`)
  console.log(`  bin:      claude → ./cli.mjs`)
  console.log('')
  console.log('To publish:')
  console.log('  cd dist/npm && npm publish')
}

main()
