import axios, { AxiosError } from 'axios'
import { Decimal } from '@prisma/client/runtime/library'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../config/database'
import { cacheGet, cacheSet } from '../../config/redis'
import { AppError } from '../../middleware/errorHandler'
import { logger } from '../../utils/logger'

/**
 * BillsService
 * ────────────
 * Airtime, data bundles and electricity through Flutterwave Bill Payments.
 *
 * Money safety rules:
 *  1. The wallet is debited first, atomically, and only if the balance covers
 *     the full cost. A concurrent purchase cannot overdraw it.
 *  2. The price comes from the provider's catalogue on the server. The client
 *     only chooses an item and, for variable-amount items, an amount.
 *  3. If the provider clearly rejects the purchase, the user is refunded.
 *  4. If the outcome is unknown (timeout, 5xx), the debit stays PENDING for
 *     manual review. We never refund a purchase that may have gone through.
 *
 * Purchases are recorded in the existing wallet ledger (metadata.kind = 'BILL'),
 * so no database migration is needed.
 */

export type BillCategory = 'airtime' | 'data' | 'electricity'

export interface BillItem {
  category:    BillCategory
  billerCode:  string
  billerName:  string
  itemCode:    string
  name:        string
  labelName:   string   // what the customer field is called, e.g. "Mobile Number"
  amount:      number   // 0 means the user chooses the amount
  fee:         number
}

const FLW_BASE = 'https://api.flutterwave.com/v3'
const CATALOGUE_TTL = 60 * 60   // seconds

// Query flag Flutterwave uses to filter bill-categories
const CATEGORY_FLAG: Record<BillCategory, string> = {
  airtime:     'airtime=1',
  data:        'data_bundle=1',
  electricity: 'power=1',
}

// Bounds for variable-amount purchases (naira)
const LIMITS: Record<BillCategory, { min: number; max: number }> = {
  airtime:     { min: 50,   max: 50_000 },
  data:        { min: 50,   max: 100_000 },
  electricity: { min: 500,  max: 200_000 },
}

function flwHeaders() {
  const key = process.env.FLUTTERWAVE_SECRET_KEY
  if (!key) throw new AppError(503, 'Bill payments are not configured.', 'BILLS_NOT_CONFIGURED')
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

async function safeGet<T>(key: string): Promise<T | null> {
  try { return await cacheGet<T>(key) } catch { return null }
}
async function safeSet(key: string, value: unknown, ttl: number) {
  try { await cacheSet(key, value, ttl) } catch { /* cache is optional */ }
}

export class BillsService {
  /** Provider catalogue for a category (cached for an hour) */
  async getCatalogue(category: BillCategory): Promise<BillItem[]> {
    const cacheKey = `bills:catalogue:${category}`
    const cached = await safeGet<BillItem[]>(cacheKey)
    if (cached) return cached

    let rows: any[]
    try {
      const res = await axios.get(`${FLW_BASE}/bill-categories?country=NG&${CATEGORY_FLAG[category]}`, {
        headers: flwHeaders(), timeout: 15_000,
      })
      rows = Array.isArray(res.data?.data) ? res.data.data : []
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.warn(`[Bills] catalogue fetch failed for ${category}: ${(err as AxiosError).message}`)
      throw new AppError(502, 'Could not load providers right now. Try again shortly.', 'BILLS_PROVIDER_ERROR')
    }

    const items: BillItem[] = rows
      .filter(r => r.biller_code && r.item_code)
      .map(r => ({
        category,
        billerCode: String(r.biller_code),
        billerName: String(r.biller_name ?? r.name ?? r.biller_code),
        itemCode:   String(r.item_code),
        name:       String(r.name ?? r.short_name ?? r.item_code),
        labelName:  String(r.label_name ?? (category === 'electricity' ? 'Meter Number' : 'Phone Number')),
        amount:     Number(r.amount) || 0,
        fee:        Number(r.fee) || 0,
      }))

    await safeSet(cacheKey, items, CATALOGUE_TTL)
    return items
  }

  /** Confirm the meter / account name before the user pays */
  async validateCustomer(category: BillCategory, billerCode: string, itemCode: string, customer: string) {
    const item = await this.findItem(category, billerCode, itemCode)
    try {
      const res = await axios.get(
        `${FLW_BASE}/bill-items/${encodeURIComponent(item.itemCode)}/validate`,
        { headers: flwHeaders(), timeout: 15_000, params: { code: item.billerCode, customer } },
      )
      const d = res.data?.data ?? {}
      return { name: (d.name ?? d.customer_name ?? null) as string | null, valid: res.data?.status === 'success' }
    } catch (err) {
      if (err instanceof AppError) throw err
      const msg = (err as AxiosError<any>).response?.data?.message
      throw new AppError(400, msg ?? 'Could not verify that number. Check it and try again.', 'CUSTOMER_INVALID')
    }
  }

  private async findItem(category: BillCategory, billerCode: string, itemCode: string): Promise<BillItem> {
    const items = await this.getCatalogue(category)
    const item = items.find(i => i.billerCode === billerCode && i.itemCode === itemCode)
    if (!item) throw new AppError(400, 'That product is not available.', 'ITEM_NOT_FOUND')
    return item
  }

  /** Buy: debit → provider → settle or refund */
  async pay(opts: {
    userId: string; category: BillCategory; billerCode: string; itemCode: string
    customer: string; amount?: number
  }) {
    const item = await this.findItem(opts.category, opts.billerCode, opts.itemCode)

    // ── Price: fixed items use the catalogue, variable items are bounded ──
    let amount: number
    if (item.amount > 0) {
      amount = item.amount
    } else {
      amount = Number(opts.amount)
      const { min, max } = LIMITS[opts.category]
      if (!Number.isFinite(amount) || amount < min || amount > max) {
        throw new AppError(400, `Amount must be between ₦${min.toLocaleString()} and ₦${max.toLocaleString()}.`, 'INVALID_AMOUNT')
      }
    }
    const total = new Decimal(amount).plus(item.fee)
    const reference = `BILL-${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 18)}`
    const description = `${item.billerName} ${opts.category === 'electricity' ? 'electricity' : opts.category} for ${opts.customer}`

    // ── 1. Debit the wallet atomically ────────────────────────────
    const ledgerId = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: opts.userId } })
      if (!wallet) throw new AppError(400, 'Insufficient balance', 'INSUFFICIENT_BALANCE')

      // The conditional update fails if a concurrent purchase already spent the balance
      const updated = await tx.wallet.updateMany({
        where: { id: wallet.id, ngnBalance: { gte: total } },
        data:  { ngnBalance: { decrement: total } },
      })
      if (updated.count === 0) throw new AppError(400, 'Insufficient balance', 'INSUFFICIENT_BALANCE')

      const after  = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } })
      const before = new Decimal(after.ngnBalance).plus(total)

      const row = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id, type: 'DEBIT', source: 'WITHDRAWAL', status: 'PENDING',
          amount: total, balanceBefore: before, balanceAfter: after.ngnBalance,
          reference, description,
          metadata: {
            kind: 'BILL', category: opts.category, billerCode: item.billerCode, billerName: item.billerName,
            itemCode: item.itemCode, customer: opts.customer, amount, fee: item.fee,
          },
        },
      })
      return row.id
    })

    // ── 2. Call the provider ──────────────────────────────────────
    try {
      const res = await axios.post(
        `${FLW_BASE}/billers/${encodeURIComponent(item.billerCode)}/items/${encodeURIComponent(item.itemCode)}/payment`,
        { country: 'NG', customer_id: opts.customer, amount, reference },
        { headers: flwHeaders(), timeout: 45_000 },
      )

      if (res.data?.status !== 'success') {
        await this.refund(ledgerId, reference, total, res.data?.message ?? 'Provider declined the purchase')
        throw new AppError(502, 'The purchase did not go through. You have not been charged.', 'BILL_FAILED')
      }

      const data = res.data?.data ?? {}
      await prisma.walletTransaction.update({
        where: { id: ledgerId },
        data:  {
          status: 'COMPLETED',
          metadata: {
            kind: 'BILL', category: opts.category, billerCode: item.billerCode, billerName: item.billerName,
            itemCode: item.itemCode, customer: opts.customer, amount, fee: item.fee,
            flwRef: data.flw_ref ?? null, txRef: data.tx_ref ?? null, extra: data.extra ?? data.token ?? null,
          },
        },
      })

      return {
        status: 'COMPLETED' as const, reference, amount, fee: item.fee, total: total.toNumber(),
        description, token: (data.extra ?? data.token ?? null) as string | null,
      }
    } catch (err) {
      if (err instanceof AppError) throw err

      const ax = err as AxiosError<any>
      const httpStatus = ax.response?.status

      // A 4xx from the provider is a definite rejection: the purchase did not happen.
      if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
        await this.refund(ledgerId, reference, total, ax.response?.data?.message ?? `Provider error ${httpStatus}`)
        throw new AppError(502, ax.response?.data?.message ?? 'The purchase did not go through. You have not been charged.', 'BILL_FAILED')
      }

      // Timeout / network / 5xx: we cannot tell whether it went through. Keep it pending.
      logger.error(`[Bills] UNKNOWN OUTCOME ref=${reference} user=${opts.userId}: ${ax.message}`)
      return {
        status: 'PENDING' as const, reference, amount, fee: item.fee, total: total.toNumber(),
        description, token: null as string | null,
      }
    }
  }

  /** Return the money and mark the original entry failed */
  private async refund(ledgerId: string, reference: string, total: Decimal, reason: string) {
    await prisma.$transaction(async (tx) => {
      const original = await tx.walletTransaction.findUniqueOrThrow({ where: { id: ledgerId } })
      if (original.status !== 'PENDING') return   // already settled, never refund twice

      const wallet = await tx.wallet.update({
        where: { id: original.walletId },
        data:  { ngnBalance: { increment: total } },
      })
      const before = new Decimal(wallet.ngnBalance).minus(total)

      await tx.walletTransaction.update({
        where: { id: ledgerId },
        data:  { status: 'FAILED', metadata: { ...(original.metadata as object ?? {}), failureReason: reason } },
      })
      await tx.walletTransaction.create({
        data: {
          walletId: original.walletId, type: 'CREDIT', source: 'REVERSAL', status: 'COMPLETED',
          amount: total, balanceBefore: before, balanceAfter: wallet.ngnBalance,
          reference: `${reference}-REV`, description: `Refund: ${original.description ?? 'bill payment'}`,
          metadata: { kind: 'BILL_REFUND', original: reference },
        },
      })
    })
  }
}

export const billsService = new BillsService()
