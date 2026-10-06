import { z } from 'zod'
import { prisma } from '../../config/database'
import { PriceOracleService } from '../oracle/PriceOracleService'

export const screens = ['dashboard', 'swap', 'portfolio', 'offramp'] as const
export const forms = ['send', 'receive', 'scan', 'convert', 'bills'] as const
export type AssistantAction = { kind: 'navigate' | 'open_form' | 'prepare_send'; target?: string; recipientAccountNumber?: string; amount?: number }
const empty = z.object({}).strict()
export const toolSchemas = {
  get_account: empty,
  get_transactions: z.object({ limit: z.number().int().min(1).max(20).optional() }).strict(),
  get_orders: z.object({ limit: z.number().int().min(1).max(20).optional() }).strict(),
  get_prices: empty,
  open_screen: z.object({ screen: z.enum(screens) }).strict(),
  open_form: z.object({ form: z.enum(forms) }).strict(),
  prepare_send: z.object({ recipientAccountNumber: z.string().regex(/^\d{10}$/), amount: z.number().finite().min(1).max(10000000).refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6) }).strict(),
}
const definitions = [
  ['get_account', 'Read the signed-in user’s NGN balance, KYC status and linked wallet addresses.', {}, []],
  ['get_transactions', 'Read the signed-in user’s recent wallet transactions.', { limit: { type: 'integer', minimum: 1, maximum: 20 } }, []],
  ['get_orders', 'Read the signed-in user’s recent crypto conversion orders.', { limit: { type: 'integer', minimum: 1, maximum: 20 } }, []],
  ['get_prices', 'Read current app crypto prices. Do not invent exchange rates.', {}, []],
  ['open_screen', 'Offer a button to open an app screen. It opens only when the user clicks.', { screen: { type: 'string', enum: screens } }, ['screen']],
  ['open_form', 'Offer a button to open an existing app form. It does not submit or execute a payment.', { form: { type: 'string', enum: forms } }, ['form']],
  ['prepare_send', 'Validate a HashPay recipient and prepare a transfer review form. Never transfers funds. Ask for missing recipient or amount; never guess.', { recipientAccountNumber: { type: 'string', pattern: '^\\d{10}$' }, amount: { type: 'number', minimum: 1, maximum: 10000000 } }, ['recipientAccountNumber', 'amount']],
] as const
export const assistantToolDefinitions = definitions.map(([name, description, properties, required]) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required, additionalProperties: false } } }))

const oracle = new PriceOracleService()
export async function executeAssistantTool(userId: string, name: string, raw: unknown): Promise<{ data?: unknown; action?: AssistantAction; label?: string }> {
  if (!Object.prototype.hasOwnProperty.call(toolSchemas, name)) throw new Error('Unsupported assistant tool')
  const args = toolSchemas[name as keyof typeof toolSchemas].parse(raw)
  switch (name) {
    case 'get_account': {
      const account = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, kycStatus: true, kycLevel: true, hashpayAccountNumber: true, preferredCurrency: true, wallet: { select: { ngnBalance: true } }, linkedWallets: { select: { chain: true, provider: true, address: true } } } })
      if (!account) throw new Error('Account unavailable')
      return { data: account }
    }
    case 'get_transactions': return { data: await prisma.walletTransaction.findMany({ where: { wallet: { userId } }, orderBy: { createdAt: 'desc' }, take: toolSchemas.get_transactions.parse(args).limit ?? 10, select: { type: true, amount: true, status: true, source: true, reference: true, createdAt: true } }) }
    case 'get_orders': return { data: await prisma.escrowOrder.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: toolSchemas.get_orders.parse(args).limit ?? 10, select: { id: true, asset: true, amountRaw: true, ngnAmount: true, status: true, chain: true, createdAt: true } }) }
    case 'get_prices': return { data: { prices: await oracle.getAllPrices(), checkedAt: new Date().toISOString() } }
    case 'open_screen': { const { screen } = toolSchemas.open_screen.parse(args); return { action: { kind: 'navigate', target: screen }, label: `Open ${screen}` } }
    case 'open_form': { const { form } = toolSchemas.open_form.parse(args); return { action: { kind: 'open_form', target: form }, label: `Open ${form} form` } }
    case 'prepare_send': {
      const draft = toolSchemas.prepare_send.parse(args)
      const recipient = await prisma.user.findUnique({ where: { hashpayAccountNumber: draft.recipientAccountNumber }, select: { id: true, fullName: true } })
      if (!recipient) throw new Error('Recipient account not found')
      if (recipient.id === userId) throw new Error('Cannot send to yourself')
      return { data: { recipientName: recipient.fullName, amount: draft.amount, currency: 'NGN', status: 'review_required', fundsMoved: false }, action: { kind: 'prepare_send', ...draft }, label: `Review NGN ${draft.amount.toLocaleString('en-NG')} to ${recipient.fullName}` }
    }
    default: throw new Error('Unsupported assistant tool')
  }
}
