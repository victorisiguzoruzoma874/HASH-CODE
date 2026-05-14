/**
 * useApiStore
 * ───────────
 * Zustand slice that wraps the backend API.
 * Keeps server state (prices, orders, user) separate from UI state.
 */
import { create } from 'zustand'
import {
  authApi, escrowApi, swapApi, payoutApi, priceApi,
  saveToken, clearToken,
  type User, type EscrowOrder, type SwapQuote, type ConvertQuote,
} from '../lib/api'

interface ApiState {
  // Auth
  user:          User | null
  authLoading:   boolean
  authError:     string | null

  // Prices
  prices:        Record<string, number>
  pricesLoading: boolean

  // Escrow orders
  orders:        EscrowOrder[]
  ordersLoading: boolean

  // Swap
  swapQuote:     SwapQuote | null
  swapLoading:   boolean

  // Convert quote
  convertQuote:  ConvertQuote | null

  // Banks
  banks:         { code: string; name: string }[]

  // Actions
  login:         (email: string, password: string) => Promise<void>
  register:      (email: string, password: string, fullName: string) => Promise<void>
  logout:        () => void
  fetchMe:       () => Promise<void>
  fetchPrices:   () => Promise<void>
  fetchOrders:   () => Promise<void>
  getSwapQuote:  (assetIn: string, assetOut: string, amountIn: number) => Promise<void>
  getConvertQuote: (asset: string, amount: number) => Promise<void>
  fetchBanks:    () => Promise<void>
}

export const useApiStore = create<ApiState>((set) => ({
  user:          null,
  authLoading:   false,
  authError:     null,
  prices:        {},
  pricesLoading: false,
  orders:        [],
  ordersLoading: false,
  swapQuote:     null,
  swapLoading:   false,
  convertQuote:  null,
  banks:         [],

  // ── Auth ──────────────────────────────────────────────────

  login: async (email, password) => {
    set({ authLoading: true, authError: null })
    try {
      const { user, token } = await authApi.login({ email, password })
      saveToken(token)
      set({ user, authLoading: false })
    } catch (err: any) {
      const msg = err.code === 'NETWORK_ERROR'
        ? 'Backend server is not running. Set VITE_MOCK_API=true in frontend/.env to use demo mode.'
        : (err.message ?? 'Login failed.')
      set({ authError: msg, authLoading: false })
      throw new Error(msg)
    }
  },

  register: async (email, password, fullName) => {
    set({ authLoading: true, authError: null })
    try {
      const { user, token } = await authApi.register({ email, password, fullName })
      saveToken(token)
      set({ user, authLoading: false })
    } catch (err: any) {
      const msg = err.code === 'NETWORK_ERROR'
        ? 'Backend server is not running. Set VITE_MOCK_API=true in frontend/.env to use demo mode.'
        : (err.message ?? 'Registration failed.')
      set({ authError: msg, authLoading: false })
      throw new Error(msg)
    }
  },

  logout: () => {
    clearToken()
    set({ user: null, orders: [], swapQuote: null, convertQuote: null })
  },

  fetchMe: async () => {
    try {
      const { user } = await authApi.me()
      set({ user })
    } catch {
      // Token expired or invalid — clear it
      clearToken()
      set({ user: null })
    }
  },

  // ── Prices ────────────────────────────────────────────────

  fetchPrices: async () => {
    set({ pricesLoading: true })
    try {
      const { prices } = await priceApi.getAll()
      const flat: Record<string, number> = {}
      for (const [asset, data] of Object.entries(prices)) {
        flat[asset] = data.price
      }
      set({ prices: flat, pricesLoading: false })
    } catch {
      set({ pricesLoading: false })
    }
  },

  // ── Orders ────────────────────────────────────────────────

  fetchOrders: async () => {
    set({ ordersLoading: true })
    try {
      const { orders } = await escrowApi.getOrders({ limit: 50 })
      set({ orders, ordersLoading: false })
    } catch {
      set({ ordersLoading: false })
    }
  },

  // ── Swap ──────────────────────────────────────────────────

  getSwapQuote: async (assetIn, assetOut, amountIn) => {
    set({ swapLoading: true })
    try {
      const quote = await swapApi.getQuote({ assetIn, assetOut, amountIn })
      set({ swapQuote: quote, swapLoading: false })
    } catch {
      set({ swapLoading: false })
    }
  },

  // ── Convert ───────────────────────────────────────────────

  getConvertQuote: async (asset, amount) => {
    try {
      const quote = await escrowApi.getQuote({ asset, amount, targetCurrency: 'NGN' })
      set({ convertQuote: quote })
    } catch {
      // silently fail — UI shows stale quote
    }
  },

  // ── Banks ─────────────────────────────────────────────────

  fetchBanks: async () => {
    try {
      const { banks } = await payoutApi.getBanks()
      set({ banks })
    } catch {
      // use hardcoded fallback
    }
  },
}))
