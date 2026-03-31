import { describe, it, expect, beforeEach } from 'vitest'
import { getSystemContext, getGitStatus } from '../../src/context.js'

describe('getSystemContext()', () => {
  beforeEach(() => {
    // Clear memoize cache so each test gets a fresh call
    getSystemContext.cache?.clear?.()
    getGitStatus.cache?.clear?.()
  })

  it('returns an object', async () => {
    const ctx = await getSystemContext()
    expect(typeof ctx).toBe('object')
    expect(ctx).not.toBeNull()
  })

  it('all values are strings', async () => {
    const ctx = await getSystemContext()
    for (const val of Object.values(ctx)) {
      expect(typeof val).toBe('string')
    }
  })

  it('git status is skipped in test environment (NODE_ENV=test)', async () => {
    // getGitStatus() has an early return when NODE_ENV === 'test'
    const status = await getGitStatus()
    expect(status).toBeNull()
  })
})

describe('platform detection', () => {
  it('runs on a known platform', () => {
    const known = ['linux', 'darwin', 'win32', 'freebsd', 'openbsd', 'sunos', 'aix']
    expect(known).toContain(process.platform)
  })

  it('process.env.HOME or USER is set', () => {
    expect(process.env.HOME ?? process.env.USER).toBeTruthy()
  })
})
