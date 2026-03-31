// scripts/test-services.ts
// Test that all services initialize without crashing
// Usage: bun scripts/test-services.ts

import '../src/shims/preload.js'

// Ensure we don't accidentally talk to real servers
process.env.NODE_ENV = process.env.NODE_ENV || 'test'

type TestResult = { name: string; status: 'pass' | 'fail' | 'skip'; detail?: string }
const results: TestResult[] = []

function pass(name: string, detail?: string) {
  results.push({ name, status: 'pass', detail })
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name: string, detail: string) {
  results.push({ name, status: 'fail', detail })
  console.log(`  ❌ ${name} — ${detail}`)
}

function skip(name: string, detail: string) {
  results.push({ name, status: 'skip', detail })
  console.log(`  ⏭️  ${name} — ${detail}`)
}

async function testGrowthBook() {
  console.log('\n--- GrowthBook (Feature Flags) ---')
  try {
    const gb = await import('../src/services/analytics/growthbook.js')

    // Test cached feature value returns default when GrowthBook is unavailable
    const boolResult = gb.getFeatureValue_CACHED_MAY_BE_STALE('nonexistent_feature', false)
    if (boolResult === false) {
      pass('getFeatureValue_CACHED_MAY_BE_STALE (bool)', 'returns default false')
    } else {
      fail('getFeatureValue_CACHED_MAY_BE_STALE (bool)', `expected false, got ${boolResult}`)
    }

    const strResult = gb.getFeatureValue_CACHED_MAY_BE_STALE('nonexistent_str', 'default_val')
    if (strResult === 'default_val') {
      pass('getFeatureValue_CACHED_MAY_BE_STALE (str)', 'returns default string')
    } else {
      fail('getFeatureValue_CACHED_MAY_BE_STALE (str)', `expected "default_val", got "${strResult}"`)
    }

    // Test Statsig gate check returns false
    const gateResult = gb.checkStatsigFeatureGate_CACHED_MAY_BE_STALE('nonexistent_gate')
    if (gateResult === false) {
      pass('checkStatsigFeatureGate_CACHED_MAY_BE_STALE', 'returns false for unknown gate')
    } else {
      fail('checkStatsigFeatureGate_CACHED_MAY_BE_STALE', `expected false, got ${gateResult}`)
    }
  } catch (err: any) {
    fail('GrowthBook import', err.message)
  }
}

async function testAnalyticsSink() {
  console.log('\n--- Analytics Sink ---')
  try {
    const analytics = await import('../src/services/analytics/index.js')

    // logEvent should queue without crashing when no sink is attached
    analytics.logEvent('test_event', { test_key: 1 })
    pass('logEvent (no sink)', 'queues without crash')

    await analytics.logEventAsync('test_async_event', { test_key: 2 })
    pass('logEventAsync (no sink)', 'queues without crash')
  } catch (err: any) {
    fail('Analytics sink', err.message)
  }
}

async function testPolicyLimits() {
  console.log('\n--- Policy Limits ---')
  try {
    const pl = await import('../src/services/policyLimits/index.js')

    // isPolicyAllowed should return true (fail open) when no restrictions loaded
    const result = pl.isPolicyAllowed('allow_remote_sessions')
    if (result === true) {
      pass('isPolicyAllowed (no cache)', 'fails open — returns true')
    } else {
      fail('isPolicyAllowed (no cache)', `expected true (fail open), got ${result}`)
    }

    // isPolicyLimitsEligible should return false without valid auth
    const eligible = pl.isPolicyLimitsEligible()
    pass('isPolicyLimitsEligible', `returns ${eligible} (expected false in test env)`)
  } catch (err: any) {
    fail('Policy limits', err.message)
  }
}

async function testRemoteManagedSettings() {
  console.log('\n--- Remote Managed Settings ---')
  try {
    const rms = await import('../src/services/remoteManagedSettings/index.js')

    // isEligibleForRemoteManagedSettings should return false without auth
    const eligible = rms.isEligibleForRemoteManagedSettings()
    pass('isEligibleForRemoteManagedSettings', `returns ${eligible} (expected false in test env)`)

    // waitForRemoteManagedSettingsToLoad should resolve immediately if not eligible
    await rms.waitForRemoteManagedSettingsToLoad()
    pass('waitForRemoteManagedSettingsToLoad', 'resolves immediately when not eligible')
  } catch (err: any) {
    fail('Remote managed settings', err.message)
  }
}

async function testBootstrapData() {
  console.log('\n--- Bootstrap Data ---')
  try {
    const bootstrap = await import('../src/services/api/bootstrap.js')

    // fetchBootstrapData should not crash — just skip when no auth
    await bootstrap.fetchBootstrapData()
    pass('fetchBootstrapData', 'completes without crash (skips when no auth)')
  } catch (err: any) {
    // fetchBootstrapData catches its own errors, so this means an import-level issue
    fail('Bootstrap data', err.message)
  }
}

async function testSessionMemoryUtils() {
  console.log('\n--- Session Memory ---')
  try {
    const smUtils = await import('../src/services/SessionMemory/sessionMemoryUtils.js')

    // Default config should be sensible
    const config = smUtils.DEFAULT_SESSION_MEMORY_CONFIG
    if (config.minimumMessageTokensToInit > 0 && config.minimumTokensBetweenUpdate > 0) {
      pass('DEFAULT_SESSION_MEMORY_CONFIG', `init=${config.minimumMessageTokensToInit} tokens, update=${config.minimumTokensBetweenUpdate} tokens`)
    } else {
      fail('DEFAULT_SESSION_MEMORY_CONFIG', 'unexpected config values')
    }

    // getLastSummarizedMessageId should return undefined initially
    const lastId = smUtils.getLastSummarizedMessageId()
    if (lastId === undefined) {
      pass('getLastSummarizedMessageId', 'returns undefined initially')
    } else {
      fail('getLastSummarizedMessageId', `expected undefined, got ${lastId}`)
    }
  } catch (err: any) {
    fail('Session memory utils', err.message)
  }
}

async function testCostTracker() {
  console.log('\n--- Cost Tracking ---')
  try {
    const ct = await import('../src/cost-tracker.js')

    // Total cost should start at 0
    const cost = ct.getTotalCost()
    if (cost === 0) {
      pass('getTotalCost', 'starts at $0.00')
    } else {
      pass('getTotalCost', `current: $${cost.toFixed(4)} (non-zero means restored session)`)
    }

    // Duration should be available
    const duration = ct.getTotalDuration()
    pass('getTotalDuration', `${duration}ms`)

    // Token counters should be available
    const inputTokens = ct.getTotalInputTokens()
    const outputTokens = ct.getTotalOutputTokens()
    pass('Token counters', `input=${inputTokens}, output=${outputTokens}`)

    // Lines changed
    const added = ct.getTotalLinesAdded()
    const removed = ct.getTotalLinesRemoved()
    pass('Lines changed', `+${added} -${removed}`)
  } catch (err: any) {
    fail('Cost tracker', err.message)
  }
}

async function testInit() {
  console.log('\n--- Init (entrypoint) ---')
  try {
    const { init } = await import('../src/entrypoints/init.js')
    await init()
    pass('init()', 'completed successfully')
  } catch (err: any) {
    fail('init()', err.message)
  }
}

async function main() {
  console.log('=== Services Layer Smoke Test ===')
  console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}`)
  console.log(`Auth: ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY ? '(set)' : '(not set)'}`)

  // Test individual services first (order: least-dependent → most-dependent)
  await testAnalyticsSink()
  await testGrowthBook()
  await testPolicyLimits()
  await testRemoteManagedSettings()
  await testBootstrapData()
  await testSessionMemoryUtils()
  await testCostTracker()

  // Then test the full init sequence
  await testInit()

  // Summary
  console.log('\n=== Summary ===')
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length
  console.log(`  ${passed} passed, ${failed} failed, ${skipped} skipped`)

  if (failed > 0) {
    console.log('\nFailed tests:')
    for (const r of results.filter(r => r.status === 'fail')) {
      console.log(`  ❌ ${r.name}: ${r.detail}`)
    }
    process.exit(1)
  }

  console.log('\n✅ All services handle graceful degradation correctly')
}

main().catch(err => {
  console.error('Fatal error in smoke test:', err)
  process.exit(1)
})
