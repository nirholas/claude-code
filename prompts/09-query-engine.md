# Prompt 09: Get the QueryEngine (Core LLM Loop) Functional

## Context

You are working in `/workspaces/claude-code`. The `QueryEngine` (`src/QueryEngine.ts`, ~46K lines) is the heart of the CLI — it:
1. Sends messages to the Anthropic API (streaming)
2. Processes streaming responses (text, thinking, tool_use blocks)
3. Executes tools when the LLM requests them (tool loop)
4. Handles retries, rate limits, and errors
5. Tracks token usage and costs
6. Manages conversation context (message history)

This is the most complex single file. The goal is to get it functional enough for a basic conversation loop.

## Key Dependencies

The QueryEngine depends on:
- `src/services/api/client.ts` — Anthropic SDK client
- `src/services/api/claude.ts` — Message API wrapper  
- `src/Tool.ts` — Tool definitions
- `src/tools.ts` — Tool registry
- `src/context.ts` — System context
- `src/constants/prompts.ts` — System prompt
- Token counting utilities
- Streaming event handlers

## Task

### Part A: Map the QueryEngine architecture

Read `src/QueryEngine.ts` and create a structural map:
1. **Class structure** — What classes/interfaces are defined?
2. **Public API** — What method starts a query? What does it return?
3. **Message flow** — How does a user message become an API call?
4. **Tool loop** — How are tool calls detected, executed, and fed back?
5. **Streaming** — How are streaming events processed?
6. **Retry logic** — How are API errors handled?

### Part B: Trace the API call path

Follow the chain from QueryEngine → API client:
1. Read `src/services/api/client.ts` — how is the Anthropic SDK client created?
2. Read `src/services/api/claude.ts` — what's the message creation wrapper?
3. What parameters are passed? (model, max_tokens, system prompt, tools, messages)
4. How is streaming handled? (SSE? SDK streaming?)

### Part C: Identify and fix blockers

The QueryEngine will have dependencies on many subsystems. For each dependency:
- **If it's essential** (API client, tool execution) → make sure it works
- **If it's optional** (analytics, telemetry, policy limits) → stub or skip it

Common blockers:
1. **Missing API configuration** → needs `ANTHROPIC_API_KEY` (Prompt 05)
2. **Policy limits service** → may block execution, needs stubbing
3. **GrowthBook/analytics** → needs stubbing or graceful failure
4. **Remote managed settings** → needs stubbing
5. **Bootstrap data fetch** → may need to be optional

### Part D: Create a minimal conversation test

Create `scripts/test-query.ts` that exercises the QueryEngine directly:

```ts
// scripts/test-query.ts
// Minimal test of the QueryEngine — single query, no REPL
// Usage: ANTHROPIC_API_KEY=sk-ant-... bun scripts/test-query.ts "What is 2+2?"

import './src/shims/preload.js'

async function main() {
  const query = process.argv[2] || 'What is 2+2?'
  
  // Import and set up minimal dependencies
  // You'll need to figure out the exact imports and initialization
  // by reading src/QueryEngine.ts, src/query.ts, and src/replLauncher.tsx
  
  // The basic flow should be:
  // 1. Create API client
  // 2. Build system prompt
  // 3. Create QueryEngine instance
  // 4. Send a query
  // 5. Print the response
  
  console.log(`Query: ${query}`)
  console.log('---')
  
  // TODO: Wire up the actual QueryEngine call
  // This is the hardest part — document what you need to do
}

main().catch(err => {
  console.error('Query test failed:', err)
  process.exit(1)
})
```

### Part E: Handle the streaming response

The QueryEngine likely uses the Anthropic SDK's streaming interface. Make sure:
1. Text content is printed to stdout as it streams
2. Thinking blocks are handled (displayed or hidden based on config)
3. Tool use blocks trigger tool execution
4. The tool loop feeds results back and continues

### Part F: Document what's still broken

After getting a basic query working, document:
1. Which features work
2. Which features are stubbed
3. What would need to happen for full functionality

## Verification

1. `ANTHROPIC_API_KEY=sk-ant-... bun scripts/test-query.ts "What is 2+2?"` gets a response
2. Streaming output appears in real-time
3. No unhandled crashes (graceful error messages are fine)
4. Architecture is documented
