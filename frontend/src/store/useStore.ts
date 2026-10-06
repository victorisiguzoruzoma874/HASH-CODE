import { create } from 'zustand'

/**
 * UI-only state (modals, sidebar). Anything that comes from the server —
 * balances, transactions, orders, prices — lives in useApiStore or is fetched
 * by the component that shows it.
 */

export type ModalType = 'send' | 'receive' | 'scan' | 'convert' | 'bills' | null

interface UIState {
  activeModal: ModalType
  sidebarOpen: boolean
}

interface AppStore {
  sendDraft: { recipientAccountNumber: string; amount: number } | null
  prepareSend: (draft: { recipientAccountNumber: string; amount: number }) => void
  ui: UIState
  openModal: (modal: ModalType) => void
  closeModal: () => void
  toggleSidebar: () => void
  walletNetworks: Record<string, string>
  selectWalletNetwork: (walletKey: string, network: string) => void
}

export const useStore = create<AppStore>((set) => ({
  sendDraft: null,
  prepareSend: (draft) => set(s => ({ sendDraft: draft, ui: { ...s.ui, activeModal: 'send' } })),
  walletNetworks: {},
  selectWalletNetwork: (walletKey, network) => set(s => ({ walletNetworks: { ...s.walletNetworks, [walletKey]: network } })),
  ui: {
    activeModal: null,
    sidebarOpen: true,
  },
  toggleSidebar: () => {
    set(s => ({ ui: { ...s.ui, sidebarOpen: !s.ui.sidebarOpen } }))
  },
  openModal: (modal) => {
    set(s => ({ ui: { ...s.ui, activeModal: modal } }))
  },
  closeModal: () => {
    set(s => ({ sendDraft: null, ui: { ...s.ui, activeModal: null } }))
  },
}))
