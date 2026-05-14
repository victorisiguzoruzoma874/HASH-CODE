import { create } from 'zustand'

export type ModalType = 'exchange' | 'send' | 'receive' | 'scan' | 'airtime' | 'data' | 'convert' | 'bill' | null

export type EscrowStatus = 'idle' | 'depositing' | 'confirming' | 'paying_out' | 'completed' | 'failed' | 'refunded'

export interface EscrowOrder {
  id: string
  txHash: string
  asset: string
  amountCrypto: string
  amountFiat: string
  currency: string
  bankName: string
  accountNumber: string
  status: EscrowStatus
  createdAt: string
  payoutRef?: string
  aptosEvent?: string
}

interface WalletState {
  address: string
  balance: string
  balanceUSD: string
  network: string
  isConnected: boolean
  isConnecting: boolean
}

interface PortfolioState {
  totalBalance: string
  changePercent: string
  changePositive: boolean
  timeframe: '1W' | '1M' | '3M' | 'ALL'
  chartData: { day: string; value: number }[]
}

interface Transaction {
  id: string
  type: 'swap' | 'receive' | 'send' | 'liquidity'
  description: string
  timestamp: string
  status: 'completed' | 'pending' | 'failed'
  amountIn: string
  amountOut: string
}

interface TransactionState {
  pending: Transaction[]
  history: Transaction[]
}

interface UIState {
  activeModal: ModalType
  sidebarOpen: boolean
  notifications: { id: string; message: string; read: boolean }[]
}

interface EscrowState {
  orders: EscrowOrder[]
  activeOrder: EscrowOrder | null
}

interface AppStore {
  wallet: WalletState
  portfolio: PortfolioState
  transactions: TransactionState
  ui: UIState
  escrow: EscrowState
  connectWallet: () => void
  disconnectWallet: () => void
  setTimeframe: (tf: PortfolioState['timeframe']) => void
  openModal: (modal: ModalType) => void
  closeModal: () => void
  markNotificationsRead: () => void
  submitEscrowOrder: (order: Omit<EscrowOrder, 'id' | 'createdAt' | 'status'>) => void
  advanceEscrowStatus: (id: string, status: EscrowStatus, extra?: Partial<EscrowOrder>) => void
  clearActiveOrder: () => void
}

const chartData1W = [
  { day: 'MON', value: 5800 },
  { day: 'TUE', value: 6100 },
  { day: 'WED', value: 5950 },
  { day: 'THU', value: 6400 },
  { day: 'FRI', value: 6200 },
  { day: 'SAT', value: 6700 },
  { day: 'SUN', value: 6842 },
]

const chartData1M = [
  { day: 'W1', value: 5200 },
  { day: 'W2', value: 5600 },
  { day: 'W3', value: 6100 },
  { day: 'W4', value: 6842 },
]

const chartData3M = [
  { day: 'JAN', value: 4200 },
  { day: 'FEB', value: 5100 },
  { day: 'MAR', value: 6842 },
]

const chartDataAll = [
  { day: '2023', value: 2100 },
  { day: 'Q2', value: 3400 },
  { day: 'Q3', value: 4800 },
  { day: 'Q4', value: 5200 },
  { day: '2024', value: 6842 },
]

const chartMap = {
  '1W': chartData1W,
  '1M': chartData1M,
  '3M': chartData3M,
  'ALL': chartDataAll,
}

export const useStore = create<AppStore>((set) => ({
  wallet: {
    address: '0x123...4567',
    balance: '2.45 ETH',
    balanceUSD: '$8,615.28',
    network: 'Ethereum Mainnet',
    isConnected: false,
    isConnecting: false,
  },
  portfolio: {
    totalBalance: '$6,842.12',
    changePercent: '+12.4%',
    changePositive: true,
    timeframe: '1W',
    chartData: chartData1W,
  },
  transactions: {
    pending: [],
    history: [
      {
        id: '1',
        type: 'swap',
        description: 'Swapped ETH for USDC',
        timestamp: '2 hours ago',
        status: 'completed',
        amountIn: '-0.5 ETH',
        amountOut: '+$1,429.55',
      },
      {
        id: '2',
        type: 'receive',
        description: 'Received LINK',
        timestamp: '5 hours ago',
        status: 'completed',
        amountIn: '+142.00 LINK',
        amountOut: '+$2,840.12',
      },
      {
        id: '3',
        type: 'liquidity',
        description: 'Added Liquidity (WETH/DAI)',
        timestamp: '1 day ago',
        status: 'completed',
        amountIn: '1.2 LP Tokens',
        amountOut: 'Vault ID: 4812',
      },
    ],
  },
  ui: {
    activeModal: null,
    sidebarOpen: true,
    notifications: [
      { id: '1', message: 'Swap completed: 0.5 ETH → $1,429.55 USDC', read: false },
      { id: '2', message: 'New liquidity pool available: WETH/DAI 8.2% APY', read: false },
      { id: '3', message: 'Network fee dropped to $0.88', read: true },
    ],
  },
  escrow: {
    orders: [
      {
        id: 'ESC-001',
        txHash: '0xabc...def1',
        asset: 'USDT',
        amountCrypto: '100 USDT',
        amountFiat: '₦78,500',
        currency: 'NGN',
        bankName: 'GTBank',
        accountNumber: '012•••4567',
        status: 'completed',
        createdAt: '2 hours ago',
        payoutRef: 'FLW-REF-8821',
        aptosEvent: 'DepositReceived(0x123, 100_000, USDT, 0xabc)',
      },
    ],
    activeOrder: null,
  },
  connectWallet: () => {
    set(s => ({ wallet: { ...s.wallet, isConnecting: true } }))
    setTimeout(() => {
      set(s => ({ wallet: { ...s.wallet, isConnected: true, isConnecting: false } }))
    }, 1500)
  },
  disconnectWallet: () => {
    set(s => ({ wallet: { ...s.wallet, isConnected: false } }))
  },
  setTimeframe: (tf) => {
    set(s => ({ portfolio: { ...s.portfolio, timeframe: tf, chartData: chartMap[tf] } }))
  },
  openModal: (modal) => {
    set(s => ({ ui: { ...s.ui, activeModal: modal } }))
  },
  closeModal: () => {
    set(s => ({ ui: { ...s.ui, activeModal: null } }))
  },
  markNotificationsRead: () => {
    set(s => ({
      ui: { ...s.ui, notifications: s.ui.notifications.map(n => ({ ...n, read: true })) },
    }))
  },
  submitEscrowOrder: (order) => {
    const newOrder: EscrowOrder = {
      ...order,
      id: `ESC-${Date.now()}`,
      createdAt: 'just now',
      status: 'depositing',
    }
    set(s => ({
      escrow: { orders: [newOrder, ...s.escrow.orders], activeOrder: newOrder },
    }))
  },
  advanceEscrowStatus: (id, status, extra = {}) => {
    set(s => {
      const orders = s.escrow.orders.map(o =>
        o.id === id ? { ...o, status, ...extra } : o
      )
      const activeOrder = s.escrow.activeOrder?.id === id
        ? { ...s.escrow.activeOrder, status, ...extra }
        : s.escrow.activeOrder
      return { escrow: { orders, activeOrder } }
    })
  },
  clearActiveOrder: () => {
    set(s => ({ escrow: { ...s.escrow, activeOrder: null } }))
  },
}))
