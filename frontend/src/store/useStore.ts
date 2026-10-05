import { create } from 'zustand'

/**
 * UI-only state (modals, sidebar). Anything that comes from the server —
 * balances, transactions, orders, prices — lives in useApiStore or is fetched
 * by the component that shows it.
 */

export type ModalType = 'send' | 'receive' | 'scan' | 'convert' | null

interface UIState {
  activeModal: ModalType
  sidebarOpen: boolean
}

interface AppStore {
  ui: UIState
  openModal: (modal: ModalType) => void
  closeModal: () => void
  toggleSidebar: () => void
}

export const useStore = create<AppStore>((set) => ({
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
    set(s => ({ ui: { ...s.ui, activeModal: null } }))
  },
}))
