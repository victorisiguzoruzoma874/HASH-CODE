import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '../components/dashboard/Sidebar'
import { TopBar } from '../components/dashboard/TopBar'
import { ExchangeModal } from '../components/modals/ExchangeModal'
import { SendModal } from '../components/modals/SendModal'
import { ReceiveModal } from '../components/modals/ReceiveModal'
import { ScanModal } from '../components/modals/ScanModal'
import { AirtimeModal } from '../components/modals/AirtimeModal'
import { DataModal } from '../components/modals/DataModal'
import { ConvertModal } from '../components/modals/ConvertModal'
import { BillPayModal } from '../components/modals/BillPayModal'
import { useStore } from '../store/useStore'
import { useApiStore } from '../store/useApiStore'
import { DashboardHome } from '../components/dashboard/DashboardHome'

export const Dashboard: React.FC = () => {
  const activeModal = useStore(s => s.ui.activeModal)
  const closeModal  = useStore(s => s.closeModal)
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

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#EEF3FB' }}>
      <Sidebar />

      <div
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? 220 : 0 }}
      >
        <TopBar />

        <main className="flex-1 overflow-y-auto">
          {isHome ? <DashboardHome /> : <Outlet />}
        </main>
      </div>

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
