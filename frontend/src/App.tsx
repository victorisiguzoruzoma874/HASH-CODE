import { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Landing }       from './pages/Landing'
import { Login }         from './pages/Login'
import { Signup }        from './pages/Signup'
import { Dashboard }     from './pages/Dashboard'
import { SwapPage }      from './pages/SwapPage'
import { PoolsPage }     from './pages/PoolsPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { OfframpPage }   from './pages/OfframpPage'
import { AuthGuard }     from './components/ui/AuthGuard'
import { HashPayIcon }   from './components/ui/HashPayLogo'

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#07111F' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="animate-pulse"><HashPayIcon size={52} /></div>
      <div className="text-[13px]" style={{ color: '#64748B' }}>Loading HashPay…</div>
    </div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* ── Public routes ── */}
          <Route path="/"       element={<Landing />} />
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* ── Protected routes — require JWT ── */}
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          >
            <Route index            element={null} />
            <Route path="swap"      element={<SwapPage />} />
            <Route path="pools"     element={<PoolsPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="offramp"   element={<OfframpPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
