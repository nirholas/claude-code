/**
 * Integration tests for the claude-code-explorer MCP server.
 *
 * Tests the actual server implementation (not a generic echo server) —
 * covering list_tools, get_tool_source, search_source, find_usages,
 * get_subsystem_source, get_related_files, list_directory, and get_architecture.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createServer } from '../../mcp-server/src/server.js'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let server: Server
let client: Client

beforeAll(async () => {
  server = createServer()
  client = new Client({ name: 'test-client', version: '0.0.1' }, { capabilities: {} })

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
})

afterAll(async () => {
  await client.close()
  await server.close()
})

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

describe('connection', () => {
  it('client connects successfully', () => {
    expect(client.getServerVersion()).toBeDefined()
  })

  it('server version is defined', () => {
    const version = client.getServerVersion()
    expect(typeof version?.version).toBe('string')
    expect(version?.version.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Tools manifest
// ---------------------------------------------------------------------------

describe('tools manifest', () => {
  it('returns a non-empty tools list', async () => {
    const result = await client.listTools()
    expect(Array.isArray(result.tools)).toBe(true)
    expect(result.tools.length).toBeGreaterThan(0)
  })

  const expectedTools = [
    'list_tools',
    'list_commands',
    'get_tool_source',
    'get_command_source',
    'read_source_file',
    'search_source',
    'list_directory',
    'get_architecture',
    'find_usages',
    'get_subsystem_source',
    'get_related_files',
  ]

  for (const toolName of expectedTools) {
    it(`exposes the "${toolName}" tool`, async () => {
      const result = await client.listTools()
      const found = result.tools.find((t) => t.name === toolName)
      expect(found, `Expected tool "${toolName}" in manifest`).toBeDefined()
    })
  }

  it('every tool has a non-empty description', async () => {
    const result = await client.listTools()
    for (const tool of result.tools) {
      expect(tool.description, `Tool "${tool.name}" missing description`).toBeTruthy()
    }
  })

  it('every tool has an inputSchema', async () => {
    const result = await client.listTools()
    for (const tool of result.tools) {
      expect(tool.inputSchema, `Tool "${tool.name}" missing inputSchema`).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// list_tools
// ---------------------------------------------------------------------------

describe('list_tools', () => {
  it('returns JSON content', async () => {
    const result = await client.callTool({ name: 'list_tools', arguments: {} })
    expect(Array.isArray(result.content)).toBe(true)
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )
    expect(block).toBeDefined()
    const parsed = JSON.parse(block!.text!)
    expect(Array.isArray(parsed)).toBe(true)
  })

  it('includes expected core tools', async () => {
    const result = await client.callTool({ name: 'list_tools', arguments: {} })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    const tools: Array<{ name: string }> = JSON.parse(block.text!)
    const names = tools.map((t) => t.name)
    expect(names).toContain('BashTool')
    expect(names).toContain('FileReadTool')
    expect(names).toContain('FileWriteTool')
    expect(names).toContain('GrepTool')
  })

  it('each entry has name, directory, and files fields', async () => {
    const result = await client.callTool({ name: 'list_tools', arguments: {} })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    const tools: Array<{ name: string; directory: string; files: string[] }> = JSON.parse(
      block.text!,
    )
    for (const tool of tools) {
      expect(typeof tool.name).toBe('string')
      expect(typeof tool.directory).toBe('string')
      expect(Array.isArray(tool.files)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// list_commands
// ---------------------------------------------------------------------------

describe('list_commands', () => {
  it('returns a non-empty list', async () => {
    const result = await client.callTool({ name: 'list_commands', arguments: {} })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    const commands = JSON.parse(block.text!)
    expect(Array.isArray(commands)).toBe(true)
    expect(commands.length).toBeGreaterThan(0)
  })

  it('includes /commit and /review commands', async () => {
    const result = await client.callTool({ name: 'list_commands', arguments: {} })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    const commands: Array<{ name: string }> = JSON.parse(block.text!)
    const names = commands.map((c) => c.name)
    expect(names).toContain('commit')
    expect(names).toContain('review')
  })
})

// ---------------------------------------------------------------------------
// get_tool_source
// ---------------------------------------------------------------------------

describe('get_tool_source', () => {
  it('returns source for BashTool', async () => {
    const result = await client.callTool({
      name: 'get_tool_source',
      arguments: { toolName: 'BashTool' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toBeTruthy()
    expect(block.text!.length).toBeGreaterThan(100)
  })

  it('throws on unknown tool', async () => {
    await expect(
      client.callTool({ name: 'get_tool_source', arguments: { toolName: '__nonexistent__' } }),
    ).rejects.toThrow()
  })

  it('throws when toolName is missing', async () => {
    await expect(client.callTool({ name: 'get_tool_source', arguments: {} })).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// read_source_file
// ---------------------------------------------------------------------------

describe('read_source_file', () => {
  it('reads QueryEngine.ts', async () => {
    const result = await client.callTool({
      name: 'read_source_file',
      arguments: { path: 'QueryEngine.ts' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text!.length).toBeGreaterThan(100)
  })

  it('respects startLine/endLine', async () => {
    const result = await client.callTool({
      name: 'read_source_file',
      arguments: { path: 'QueryEngine.ts', startLine: 1, endLine: 5 },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    const lines = block.text!.trim().split('\n')
    expect(lines.length).toBeLessThanOrEqual(5)
  })

  it('blocks path traversal', async () => {
    await expect(
      client.callTool({ name: 'read_source_file', arguments: { path: '../../package.json' } }),
    ).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// search_source
// ---------------------------------------------------------------------------

describe('search_source', () => {
  it('finds results for "BashTool"', async () => {
    const result = await client.callTool({
      name: 'search_source',
      arguments: { pattern: 'BashTool', filePattern: '.ts' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('Found')
    expect(block.text).toContain('BashTool')
  })

  it('returns no matches for nonsense pattern', async () => {
    const result = await client.callTool({
      name: 'search_source',
      arguments: { pattern: 'ZZZ_DEFINITELY_NOT_IN_CODE_XYZ_ABC_123' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('No matches')
  })

  it('respects maxResults', async () => {
    const result = await client.callTool({
      name: 'search_source',
      arguments: { pattern: 'import', maxResults: 3 },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    // Should have at most 3 result lines (plus the "Found N" header)
    const matchLines = block.text!
      .split('\n')
      .filter((l) => l.match(/^\S+:\d+:/))
    expect(matchLines.length).toBeLessThanOrEqual(3)
  })
})

// ---------------------------------------------------------------------------
// list_directory
// ---------------------------------------------------------------------------

describe('list_directory', () => {
  it('lists root src/ directory', async () => {
    const result = await client.callTool({
      name: 'list_directory',
      arguments: { path: '' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('tools/')
    expect(block.text).toContain('commands/')
  })

  it('lists tools/ subdirectory', async () => {
    const result = await client.callTool({
      name: 'list_directory',
      arguments: { path: 'tools' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('BashTool/')
  })

  it('throws on nonexistent directory', async () => {
    await expect(
      client.callTool({ name: 'list_directory', arguments: { path: '__does_not_exist__' } }),
    ).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// get_architecture
// ---------------------------------------------------------------------------

describe('get_architecture', () => {
  it('returns a markdown overview', async () => {
    const result = await client.callTool({ name: 'get_architecture', arguments: {} })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('Claude Code')
    expect(block.text).toContain('BashTool')
  })

  it('mentions key subsystems', async () => {
    const result = await client.callTool({ name: 'get_architecture', arguments: {} })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('bridge/')
    expect(block.text).toContain('coordinator/')
  })
})

// ---------------------------------------------------------------------------
// find_usages (new tool)
// ---------------------------------------------------------------------------

describe('find_usages', () => {
  it('finds usages of "BashTool"', async () => {
    const result = await client.callTool({
      name: 'find_usages',
      arguments: { symbol: 'BashTool', filePattern: '.ts' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('BashTool')
  })

  it('searchType=imports returns only import lines', async () => {
    const result = await client.callTool({
      name: 'find_usages',
      arguments: { symbol: 'BashTool', searchType: 'imports', filePattern: '.ts' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    if (block.text!.startsWith('Found')) {
      // All match lines should be import-related
      const matchLines = block.text!
        .split('\n')
        .filter((l) => l.match(/^\S+:\d+:/))
      for (const line of matchLines) {
        const codePart = line.split(': ').slice(1).join(': ')
        expect(codePart).toMatch(/import|require|from/)
      }
    }
  })

  it('respects maxResults', async () => {
    const result = await client.callTool({
      name: 'find_usages',
      arguments: { symbol: 'import', maxResults: 5 },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    const matchLines = block.text!
      .split('\n')
      .filter((l) => l.match(/^\S+:\d+:/))
    expect(matchLines.length).toBeLessThanOrEqual(5)
  })

  it('returns no-match message for unknown symbol', async () => {
    const result = await client.callTool({
      name: 'find_usages',
      arguments: { symbol: '__ZZZZ_NOT_IN_CODE_9999__' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('No usages')
  })

  it('throws when symbol is missing', async () => {
    await expect(client.callTool({ name: 'find_usages', arguments: {} })).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// get_subsystem_source (new tool)
// ---------------------------------------------------------------------------

describe('get_subsystem_source', () => {
  it('returns source for the bridge/ subsystem', async () => {
    const result = await client.callTool({
      name: 'get_subsystem_source',
      arguments: { subsystem: 'bridge', maxFiles: 3, maxLinesPerFile: 50 },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('bridge')
    expect(block.text).toContain('```typescript')
  })

  it('throws on nonexistent subsystem', async () => {
    await expect(
      client.callTool({
        name: 'get_subsystem_source',
        arguments: { subsystem: '__does_not_exist__' },
      }),
    ).rejects.toThrow()
  })

  it('respects maxFiles', async () => {
    const result = await client.callTool({
      name: 'get_subsystem_source',
      arguments: { subsystem: 'tools', maxFiles: 2, maxLinesPerFile: 5 },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    // Should have at most 2 file sections (## headers)
    const headers = block.text!.split('\n').filter((l) => l.startsWith('## '))
    expect(headers.length).toBeLessThanOrEqual(2)
  })

  it('throws when subsystem is missing', async () => {
    await expect(
      client.callTool({ name: 'get_subsystem_source', arguments: {} }),
    ).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// get_related_files (new tool)
// ---------------------------------------------------------------------------

describe('get_related_files', () => {
  it('returns related files for QueryEngine.ts', async () => {
    const result = await client.callTool({
      name: 'get_related_files',
      arguments: { path: 'QueryEngine.ts' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('QueryEngine.ts')
    expect(block.text).toMatch(/Dependents|Dependencies/)
  })

  it('direction=dependencies returns only dependency section', async () => {
    const result = await client.callTool({
      name: 'get_related_files',
      arguments: { path: 'QueryEngine.ts', direction: 'dependencies' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('Dependencies')
    expect(block.text).not.toContain('Dependents')
  })

  it('direction=dependents returns only dependents section', async () => {
    const result = await client.callTool({
      name: 'get_related_files',
      arguments: { path: 'QueryEngine.ts', direction: 'dependents' },
    })
    const block = (result.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text',
    )!
    expect(block.text).toContain('Dependents')
    expect(block.text).not.toContain('Dependencies')
  })

  it('throws on nonexistent file', async () => {
    await expect(
      client.callTool({
        name: 'get_related_files',
        arguments: { path: '__does_not_exist__.ts' },
      }),
    ).rejects.toThrow()
  })

  it('throws when path is missing', async () => {
    await expect(
      client.callTool({ name: 'get_related_files', arguments: {} }),
    ).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

describe('resources', () => {
  it('lists available resources', async () => {
    const result = await client.listResources()
    expect(Array.isArray(result.resources)).toBe(true)
    expect(result.resources.length).toBeGreaterThan(0)
  })

  it('includes architecture, tools, and commands resources', async () => {
    const result = await client.listResources()
    const uris = result.resources.map((r) => r.uri)
    expect(uris).toContain('claude-code://architecture')
    expect(uris).toContain('claude-code://tools')
    expect(uris).toContain('claude-code://commands')
  })
})

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

describe('prompts', () => {
  it('lists available prompts', async () => {
    const result = await client.listPrompts()
    expect(Array.isArray(result.prompts)).toBe(true)
    expect(result.prompts.length).toBeGreaterThan(0)
  })

  it('includes explain_tool, architecture_overview, and compare_tools prompts', async () => {
    const result = await client.listPrompts()
    const names = result.prompts.map((p) => p.name)
    expect(names).toContain('explain_tool')
    expect(names).toContain('architecture_overview')
    expect(names).toContain('compare_tools')
  })
})
