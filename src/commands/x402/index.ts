import type { Command } from '../../commands.js'

const x402 = {
  type: 'local',
  name: 'x402',
  aliases: ['wallet', 'pay'],
  description: 'Configure x402 crypto payments (USDC on Base)',
  argumentHint: '[setup|status|enable|disable|set-limit|remove]',
  supportsNonInteractive: true,
  load: () => import('./x402.js'),
} satisfies Command

export default x402
