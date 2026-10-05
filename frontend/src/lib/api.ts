/**
 * HashPay API Client
 * ──────────────────
 * Typed wrapper around the backend REST API.
 *
 * Set VITE_API_URL in .env to point at your backend.
 */

const BASE      = import.meta.env.VITE_API_URL  ?? 'http://localhost:4000/api/v1'

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
      'Cannot reach the HashPay server. Check your connection and try again.',
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

// ── Auth ──────────────────────────────────────────────────────

export const authApi = {
  register: (body: { email: string; password: string; fullName: string }) => {
    return post<{ user: User; token: string }>('/auth/register', body)
  },

  login: (body: { email: string; password: string }) => {
    return post<{ user: User; token: string }>('/auth/login', body)
  },

  connectWallet: (body: { walletAddress: string; chain: string; signature: string }) => {
    return post<{ user: User; token: string }>('/auth/connect-wallet', body)
  },

  me: () => {
    return get<{ user: User }>('/auth/me')
  },
}

// ── Escrow ────────────────────────────────────────────────────

export const escrowApi = {
  getOrders: (params?: { page?: number; limit?: number; status?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return get<{ orders: EscrowOrder[]; pagination: { total: number; pages: number } }>(
      `/escrow/orders${qs ? `?${qs}` : ''}`,
    )
  },

  getOrder: (id: string) => {
    return get<{ order: EscrowOrder }>(`/escrow/orders/${id}`)
  },

  getQuote: (body: { asset: string; amountIn?: number; amount?: number; targetCurrency?: string; currencyOut?: string }) => {
    return post<ConvertQuote>('/escrow/quote', body)
  },

  getStats: () => {
    return get<{ totalOrders: number; completedOrders: number; pendingOrders: number; totalNgnPaid: number }>('/escrow/stats')
  },
}

// ── Swap ──────────────────────────────────────────────────────

export const swapApi = {
  getQuote: (body: { assetIn: string; assetOut: string; amountIn: number; slippageBps?: number }) => {
    return post<SwapQuote>('/swap/quote', body)
  },

  buildTx: (body: object) => {
    return post<{ transaction: unknown }>('/swap/build-tx', body)
  },

  submit: (body: object) => {
    return post<{ txHash: string; success: boolean }>('/swap/submit', body)
  },
}

// ── Payout ────────────────────────────────────────────────────

export const payoutApi = {
  getBanks: () => {
    return get<{ banks: { code: string; name: string }[] }>('/payout/banks')
  },

  verifyAccount: (body: { accountNumber: string; bankCode: string }) => {
    return post<{ accountName: string; verified: boolean }>('/payout/verify-account', body)
  },

  saveBankDetails: (body: object) => {
    return put<{ user: User }>('/payout/bank-details', body)
  },
}

// ── Price ─────────────────────────────────────────────────────

export const priceApi = {
  getAll: () => {
    return get<{ prices: Record<string, { price: number; timestamp: number }> }>('/price/all')
  },

  getAsset: (asset: string) => {
    return get<PriceData>(`/price/${asset}`)
  },

  convert: (asset: string, currency: string) => {
    return get<{ rate: number }>(`/price/convert/${asset}/${currency}`)
  },
}

// ── Airtime ───────────────────────────────────────────────────

export const airtimeApi = {
  topup: (body: object) => {
    return post<{ success: boolean; reference: string; cryptoCost: number }>('/airtime/topup', body)
  },

  getHistory: () => {
    return get<{ transactions: unknown[] }>('/airtime/history')
  },
}

// ── KYC ───────────────────────────────────────────────────────

export const kycApi = {
  getStatus: () => {
    return get<{ kyc: { kycStatus: string; kycLevel: string } }>('/kyc/status')
  },

  submit: (body: object) => {
    return post<{ jobId: string; status: string }>('/kyc/submit', body)
  },
}

// ── Health ────────────────────────────────────────────────────

export const healthApi = {
  check: () => {
    return get<{ status: string; checks: Record<string, string> }>('/health')
  },
}

// ── Wallet ────────────────────────────────────────────────────

export interface WalletBalance {
  ngnBalance:           string
  hashpayAccountNumber: string | null
  virtualAccount:       { accountNumber: string; bankName: string | null } | null
}

export interface WalletTransaction {
  id:            string
  type:          'CREDIT' | 'DEBIT' | string
  source:        string
  status:        'PENDING' | 'COMPLETED' | 'FAILED' | string
  amount:        string
  balanceAfter:  string
  description:   string | null
  reference:     string | null
  cryptoAsset:   string | null
  cryptoAmount:  string | null
  createdAt:     string
  sender:        { fullName: string; hashpayAccountNumber: string | null } | null
  recipient:     { fullName: string; hashpayAccountNumber: string | null } | null
}

export const walletApi = {
  getBalance: () => {
    return get<{ data: WalletBalance }>('/wallet/balance')
  },

  send: (body: { recipientAccountNumber: string; amount: number }) => {
    return post<{ message: string; data: { reference: string } }>('/wallet/send', body)
  },

  lookup: (accountNumber: string) => {
    return get<{ data: { fullName: string; accountNumber: string } }>(`/wallet/lookup/${accountNumber}`)
  },

  createVirtualAccount: () => {
    return post<{ message: string; data: { accountNumber: string } }>('/wallet/create-virtual-account', {})
  },

  getTransactions: (page = 1, pageSize = 20) => {
    return get<{ data: { transactions: WalletTransaction[]; total: number; page: number; pageSize: number } }>(
      `/wallet/transactions?page=${page}&pageSize=${pageSize}`
    )
  },

  getRate: (token = 'USDC', network = 'base', amount = '1') => {
    return get<{ data: Record<string, string> }>(`/wallet/rate?token=${token}&network=${network}&amount=${amount}`)
  },
}

// ── Token helpers ─────────────────────────────────────────────

export function saveToken(token: string): void  { localStorage.setItem('hp_token', token) }
export function clearToken(): void              { localStorage.removeItem('hp_token') }
export function getToken(): string | null       { return localStorage.getItem('hp_token') }

export { ApiError }
