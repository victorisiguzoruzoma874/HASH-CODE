/**
 * HashPay API Client
 * ──────────────────
 * Typed wrapper around the backend REST API.
 *
 * Set VITE_API_URL in .env to point at your backend.
 * Set VITE_MOCK_API=true to use mock data (no backend needed).
 */

const BASE      = import.meta.env.VITE_API_URL  ?? 'http://localhost:4000/api/v1'
const MOCK_MODE = import.meta.env.VITE_MOCK_API === 'true'

// ── Types ────────────────────────────────────────────────────

export interface User {
  id:                string
  email:             string
  fullName:          string
  aptosAddress:      string | null
  suiAddress:        string | null
  evmAddress:        string | null
  kycStatus:         'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
  kycLevel:          'NONE' | 'BASIC' | 'FULL'
  preferredCurrency: string | null
  role:              string
}

export interface EscrowOrder {
  id:            string
  aptosEventSeq: string | null
  suiOrderId:    string | null
  txHash:        string
  userAddress:   string
  asset:         string
  amountRaw:     string
  ngnAmount:     number | null
  payoutRef:     string | null
  currencyOut:   string | null
  recordId:      string | null
  chain:         string | null
  status:        'DEPOSITING' | 'PENDING_PAYOUT' | 'COMPLETED' | 'PAYOUT_FAILED' | 'REFUNDED'
  createdAt:     string
  completedAt:   string | null
}

export interface SwapQuote {
  assetIn:       string
  assetOut:      string
  amountIn:      number
  amountOut:     number
  minOut:        number
  rate:          number
  slippageBps:   number
  priceImpact:   number
  networkFeeUSD: number
  expiresAt:     string
  quoteId:       string
}

export interface ConvertQuote {
  asset:          string
  amount:         number
  targetCurrency: string
  rate:           number
  gross:          number
  fee:            number
  netAmount:      number
  feeBps:         number
  expiresAt:      string
  // Sui on-chain fields
  orderId?:       string
  amountInU64?:   string
  amountOutU64?:  string
  expiry?:        string
  signature?:     string | null
  backendPubkey?: string | null
  signed?:        boolean
}

export interface PriceData {
  asset:     string
  usd:       number
  ngn:       number
  timestamp: string
}

// ── Error class ───────────────────────────────────────────────

class ApiError extends Error {
  readonly status:  number
  readonly code:    string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name    = 'ApiError'
    this.status  = status
    this.code    = code
    this.details = details
  }
}

// ── Core fetch wrapper ────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('hp_token')

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (networkErr) {
    // Network error — backend not reachable
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot connect to HashPay server. Make sure the backend is running on port 4000.',
    )
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.code    ?? 'UNKNOWN',
      data.error   ?? `Request failed (${res.status})`,
      data.details,
    )
  }

  return data as T
}

const get  = <T>(path: string)                => request<T>(path, { method: 'GET' })
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })
const put  = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT',  body: JSON.stringify(body) })

// ── Mock data (used when VITE_MOCK_API=true) ──────────────────

const MOCK_USER: User = {
  id: 'mock-user-001', email: 'demo@hashpay.io', fullName: 'Demo User',
  aptosAddress: null, suiAddress: null, evmAddress: null,
  kycStatus: 'APPROVED', kycLevel: 'BASIC', preferredCurrency: 'NGN', role: 'USER',
}

const MOCK_TOKEN = 'mock-jwt-token-dev'

function mockDelay<T>(data: T, ms = 800): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), ms))
}

// ── Auth ──────────────────────────────────────────────────────

export const authApi = {
  register: (body: { email: string; password: string; fullName: string }) => {
    if (MOCK_MODE) return mockDelay({ user: { ...MOCK_USER, email: body.email, fullName: body.fullName }, token: MOCK_TOKEN })
    return post<{ user: User; token: string }>('/auth/register', body)
  },

  login: (body: { email: string; password: string }) => {
    if (MOCK_MODE) return mockDelay({ user: { ...MOCK_USER, email: body.email }, token: MOCK_TOKEN })
    return post<{ user: User; token: string }>('/auth/login', body)
  },

  connectWallet: (body: { walletAddress: string; chain: string; signature: string }) => {
    if (MOCK_MODE) return mockDelay({ user: MOCK_USER, token: MOCK_TOKEN })
    return post<{ user: User; token: string }>('/auth/connect-wallet', body)
  },

  me: () => {
    if (MOCK_MODE) return mockDelay({ user: MOCK_USER })
    return get<{ user: User }>('/auth/me')
  },
}

// ── Escrow ────────────────────────────────────────────────────

export const escrowApi = {
  getOrders: (params?: { page?: number; limit?: number; status?: string }) => {
    if (MOCK_MODE) return mockDelay({ orders: [] as EscrowOrder[], pagination: { total: 0, pages: 0 } })
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return get<{ orders: EscrowOrder[]; pagination: { total: number; pages: number } }>(
      `/escrow/orders${qs ? `?${qs}` : ''}`,
    )
  },

  getOrder: (id: string) => {
    if (MOCK_MODE) return mockDelay({ order: null })
    return get<{ order: EscrowOrder }>(`/escrow/orders/${id}`)
  },

  getQuote: (body: { asset: string; amountIn?: number; amount?: number; targetCurrency?: string; currencyOut?: string }) => {
    if (MOCK_MODE) {
      const amt = body.amountIn ?? body.amount ?? 1
      return mockDelay<ConvertQuote>({
        asset: body.asset, amount: amt,
        targetCurrency: body.targetCurrency ?? body.currencyOut ?? 'NGN',
        rate: 1565, gross: Math.floor(amt * 1565), fee: Math.floor(amt * 1565 * 0.005),
        netAmount: Math.floor(amt * 1565 * 0.995), feeBps: 50,
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
        signed: false,
      })
    }
    return post<ConvertQuote>('/escrow/quote', body)
  },

  getStats: () => {
    if (MOCK_MODE) return mockDelay({ totalOrders: 0, completedOrders: 0, pendingOrders: 0, totalNgnPaid: 0 })
    return get<{ totalOrders: number; completedOrders: number; pendingOrders: number; totalNgnPaid: number }>('/escrow/stats')
  },
}

// ── Swap ──────────────────────────────────────────────────────

export const swapApi = {
  getQuote: (body: { assetIn: string; assetOut: string; amountIn: number; slippageBps?: number }) => {
    if (MOCK_MODE) {
      return mockDelay<SwapQuote>({
        assetIn: body.assetIn, assetOut: body.assetOut, amountIn: body.amountIn,
        amountOut: body.amountIn * 3516.44, minOut: body.amountIn * 3516.44 * 0.995,
        rate: 3516.44, slippageBps: 50, priceImpact: 0.05,
        networkFeeUSD: 4.12, expiresAt: new Date(Date.now() + 30_000).toISOString(),
        quoteId: `mock-${Date.now()}`,
      })
    }
    return post<SwapQuote>('/swap/quote', body)
  },

  buildTx: (body: object) => {
    if (MOCK_MODE) return mockDelay({ transaction: null })
    return post<{ transaction: unknown }>('/swap/build-tx', body)
  },

  submit: (body: object) => {
    if (MOCK_MODE) return mockDelay({ txHash: '0xmock', success: true })
    return post<{ txHash: string; success: boolean }>('/swap/submit', body)
  },
}

// ── Payout ────────────────────────────────────────────────────

export const payoutApi = {
  getBanks: () => {
    if (MOCK_MODE) return mockDelay({ banks: [
      { code: '058', name: 'GTBank' }, { code: '033', name: 'UBA' },
      { code: '057', name: 'Zenith Bank' }, { code: '011', name: 'First Bank' },
      { code: '044', name: 'Access Bank' }, { code: '526', name: 'Kuda Bank' },
    ]})
    return get<{ banks: { code: string; name: string }[] }>('/payout/banks')
  },

  verifyAccount: (body: { accountNumber: string; bankCode: string }) => {
    if (MOCK_MODE) return mockDelay({ accountName: 'JOHN DOE', verified: true })
    return post<{ accountName: string; verified: boolean }>('/payout/verify-account', body)
  },

  saveBankDetails: (body: object) => {
    if (MOCK_MODE) return mockDelay({ user: MOCK_USER })
    return put<{ user: User }>('/payout/bank-details', body)
  },
}

// ── Price ─────────────────────────────────────────────────────

export const priceApi = {
  getAll: () => {
    if (MOCK_MODE) return mockDelay({
      prices: {
        ETH:  { price: 3516.44, timestamp: Date.now() },
        BTC:  { price: 65000,   timestamp: Date.now() },
        USDC: { price: 1,       timestamp: Date.now() },
        USDT: { price: 1,       timestamp: Date.now() },
        APT:  { price: 9,       timestamp: Date.now() },
        SUI:  { price: 3.24,    timestamp: Date.now() },
      },
      timestamp: new Date().toISOString(),
    })
    return get<{ prices: Record<string, { price: number; timestamp: number }> }>('/price/all')
  },

  getAsset: (asset: string) => {
    if (MOCK_MODE) return mockDelay<PriceData>({ asset, usd: 3516.44, ngn: 5_502_728, timestamp: new Date().toISOString() })
    return get<PriceData>(`/price/${asset}`)
  },

  convert: (asset: string, currency: string) => {
    if (MOCK_MODE) return mockDelay({ rate: 5_502_728 })
    return get<{ rate: number }>(`/price/convert/${asset}/${currency}`)
  },
}

// ── Airtime ───────────────────────────────────────────────────

export const airtimeApi = {
  topup: (body: object) => {
    if (MOCK_MODE) return mockDelay({ success: true, reference: 'MOCK-REF-001', cryptoCost: 0.0036 })
    return post<{ success: boolean; reference: string; cryptoCost: number }>('/airtime/topup', body)
  },

  getHistory: () => {
    if (MOCK_MODE) return mockDelay({ transactions: [] })
    return get<{ transactions: unknown[] }>('/airtime/history')
  },
}

// ── KYC ───────────────────────────────────────────────────────

export const kycApi = {
  getStatus: () => {
    if (MOCK_MODE) return mockDelay({ kyc: { kycStatus: 'APPROVED', kycLevel: 'BASIC' } })
    return get<{ kyc: { kycStatus: string; kycLevel: string } }>('/kyc/status')
  },

  submit: (body: object) => {
    if (MOCK_MODE) return mockDelay({ jobId: 'mock-job', status: 'PENDING' })
    return post<{ jobId: string; status: string }>('/kyc/submit', body)
  },
}

// ── Health ────────────────────────────────────────────────────

export const healthApi = {
  check: () => {
    if (MOCK_MODE) return mockDelay({ status: 'healthy', checks: { database: 'mock', redis: 'mock' } })
    return get<{ status: string; checks: Record<string, string> }>('/health')
  },
}

// ── Wallet ────────────────────────────────────────────────────

export interface WalletBalance {
  ngnBalance:           string
  hashpayAccountNumber: string | null
  virtualAccount:       { accountNumber: string; bankName: string | null } | null
}

export const walletApi = {
  getBalance: () => {
    if (MOCK_MODE) return mockDelay<{ data: WalletBalance }>({
      data: { ngnBalance: '25000.00', hashpayAccountNumber: '4031285796', virtualAccount: null },
    })
    return get<{ data: WalletBalance }>('/wallet/balance')
  },

  send: (body: { recipientAccountNumber: string; amount: number }) => {
    if (MOCK_MODE) return mockDelay({ message: 'Transfer successful', data: { reference: 'TRF-MOCK' } })
    return post<{ message: string; data: { reference: string } }>('/wallet/send', body)
  },

  lookup: (accountNumber: string) => {
    if (MOCK_MODE) return mockDelay({ data: { fullName: 'Demo User', accountNumber } })
    return get<{ data: { fullName: string; accountNumber: string } }>(`/wallet/lookup/${accountNumber}`)
  },

  getTransactions: (page = 1, pageSize = 20) => {
    if (MOCK_MODE) return mockDelay({ data: { transactions: [], total: 0, page, pageSize } })
    return get<{ data: { transactions: unknown[]; total: number; page: number; pageSize: number } }>(
      `/wallet/transactions?page=${page}&pageSize=${pageSize}`
    )
  },

  getRate: (token = 'USDC', network = 'base', amount = '1') => {
    if (MOCK_MODE) return mockDelay({ data: { buyRate: '1565', sellRate: '1560' } })
    return get<{ data: Record<string, string> }>(`/wallet/rate?token=${token}&network=${network}&amount=${amount}`)
  },
}

// ── Token helpers ─────────────────────────────────────────────

export function saveToken(token: string): void  { localStorage.setItem('hp_token', token) }
export function clearToken(): void              { localStorage.removeItem('hp_token') }
export function getToken(): string | null       { return localStorage.getItem('hp_token') }

export { ApiError }
