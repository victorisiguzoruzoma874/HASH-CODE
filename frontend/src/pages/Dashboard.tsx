import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/dashboard/Sidebar'
import { TopBar } from '../components/dashboard/TopBar'
import { PortfolioChart } from '../components/dashboard/PortfolioChart'
import { QuickActions } from '../components/dashboard/QuickActions'
import { AssetBalance } from '../components/dashboard/AssetBalance'
import { EstimatedYield } from '../components/dashboard/EstimatedYield'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { SwapPanel } from '../components/dashboard/SwapPanel'
import { StakeBanner } from '../components/dashboard/StakeBanner'
import { ExchangeModal } from '../components/modals/ExchangeModal'
import { SendModal } from '../components/modals/SendModal'
import { ReceiveModal } from '../components/modals/ReceiveModal'
import { ScanModal } from '../components/modals/ScanModal'
import { AirtimeModal } from '../components/modals/AirtimeModal'
import { DataModal } from '../components/modals/DataModal'
import { ConvertModal } from '../components/modals/ConvertModal'
import { BillPayModal } from '../components/modals/BillPayModal'
import { GreetingBar } from '../components/dashboard/GreetingBar'
import { useStore } from '../store/useStore'
import { useApiStore } from '../store/useApiStore'

export const Dashboard: React.FC = () => {
  const activeModal = useStore(s => s.ui.activeModal)
  const closeModal  = useStore(s => s.closeModal)
  const location    = useLocation()
  const isHome      = location.pathname === '/dashboard'

  // Fetch live data on mount
  const fetchPrices = useApiStore(s => s.fetchPrices)
  const fetchOrders = useApiStore(s => s.fetchOrders)
  const fetchMe     = useApiStore(s => s.fetchMe)

  useEffect(() => {
    fetchMe()
    fetchPrices()
    fetchOrders()
    // Refresh prices every 30s
    const interval = setInterval(fetchPrices, 30_000)
    return () => clearInterval(interval)
  }, [fetchMe, fetchPrices, fetchOrders])

  return (
    // Full viewport, no scroll on root
    <div className="h-screen bg-[#0B0F1A] flex overflow-hidden">

      {/* ── Fixed sidebar ── */}
      <Sidebar />

      {/* ── Everything to the right of sidebar ── */}
      <div
        className="flex flex-col flex-1 overflow-hidden"
        style={{ marginLeft: 220 }}
      >
        {/* Sticky top bar */}
        <TopBar />
        {/* Greeting bar — only on home */}
        {isHome && <GreetingBar />}

        {/* ── Content row (fills remaining height) ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Scrollable main area ── */}
          <main className="flex-1 overflow-y-auto">
            {isHome ? (
              /* ─── Dashboard home ─── */
              <div className="p-6 flex flex-col gap-5 min-h-full">
                <PortfolioChart />
                <QuickActions />
                <div className="grid grid-cols-2 gap-5">
                  <AssetBalance />
                  <EstimatedYield />
                </div>
                <RecentActivity />
              </div>
            ) : (
              /* ─── Sub-pages: Swap / Pools / Portfolio ─── */
              <Outlet />
            )}
          </main>

          {/* ── Fixed right panel (only on dashboard home) ── */}
          {isHome && (
            <aside
              className="flex-shrink-0 border-l border-white/[0.08] overflow-y-auto flex flex-col gap-4 p-4"
              style={{ width: 280 }}
            >
              <SwapPanel />
              <AssetBalance compact />
              <EstimatedYield compact />
              <StakeBanner />
            </aside>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <ExchangeModal isOpen={activeModal === 'exchange'} onClose={closeModal} />
      <SendModal     isOpen={activeModal === 'send'}     onClose={closeModal} />
      <ReceiveModal  isOpen={activeModal === 'receive'}  onClose={closeModal} />
      <ScanModal     isOpen={activeModal === 'scan'}     onClose={closeModal} />
      <AirtimeModal  isOpen={activeModal === 'airtime'}  onClose={closeModal} />
      <DataModal     isOpen={activeModal === 'data'}     onClose={closeModal} />
      <ConvertModal  isOpen={activeModal === 'convert'}  onClose={closeModal} />
      <BillPayModal  isOpen={activeModal === 'bill'}     onClose={closeModal} />
    </div>
  )
}
