// scripts/test-auth.ts
// Quick test that the API key is configured and can reach Anthropic
// Usage: bun scripts/test-auth.ts

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function main() {
  try {
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
    })
    console.log('✅ API connection successful!')
    console.log('Response:', msg.content[0].type === 'text' ? msg.content[0].text : msg.content[0])
  } catch (err: any) {
    console.error('❌ API connection failed:', err.message)
    process.exit(1)
  }
}

main()
