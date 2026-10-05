import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/dashboard/Sidebar'
import { TopBar } from '../components/dashboard/TopBar'
import { SendModal } from '../components/modals/SendModal'
import { ReceiveModal } from '../components/modals/ReceiveModal'
import { ScanModal } from '../components/modals/ScanModal'
import { ConvertModal } from '../components/modals/ConvertModal'
import { useStore } from '../store/useStore'
import { useApiStore } from '../store/useApiStore'
import { DashboardHome } from '../components/dashboard/DashboardHome'
import { FLAT_CSS, useFlatTheme } from '../components/ui/FlatShell'
import { DASH_CSS } from '../components/dashboard/dashCss'

export const Dashboard: React.FC = () => {
  const activeModal = useStore(s => s.ui.activeModal)
  const closeModal  = useStore(s => s.closeModal)
  const toggleSidebar = useStore(s => s.toggleSidebar)
  const sidebarOpen = useStore(s => s.ui.sidebarOpen)
  const location    = useLocation()
  const isHome      = location.pathname === '/dashboard'

  const fetchPrices = useApiStore(s => s.fetchPrices)
  const fetchOrders = useApiStore(s => s.fetchOrders)
  const fetchMe     = useApiStore(s => s.fetchMe)

  useEffect(() => {
    fetchMe()
    fetchPrices()
    fetchOrders()
    const interval = setInterval(fetchPrices, 30_000)
    return () => clearInterval(interval)
  }, [fetchMe, fetchPrices, fetchOrders])

  const { theme } = useFlatTheme()

  // The sidebar is an overlay below 1024px, so start it closed there
  useEffect(() => {
    if (window.innerWidth < 1024 && useStore.getState().ui.sidebarOpen) toggleSidebar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="lp dash" data-theme={theme}>
      <style>{FLAT_CSS + DASH_CSS}</style>
      <Sidebar />

      <div className={`dash-main${sidebarOpen ? ' shifted' : ''}`}>
        <TopBar />

        <main className="dash-scroll">
          {isHome ? <DashboardHome /> : <Outlet />}
        </main>
      </div>

      <SendModal     isOpen={activeModal === 'send'}     onClose={closeModal} />
      <ReceiveModal  isOpen={activeModal === 'receive'}  onClose={closeModal} />
      <ScanModal     isOpen={activeModal === 'scan'}     onClose={closeModal} />
      <ConvertModal  isOpen={activeModal === 'convert'}  onClose={closeModal} />
    </div>
  )
}
