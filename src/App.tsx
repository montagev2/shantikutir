import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StoreProvider } from './context/StoreContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/Layout'

// Customer Pages
import Menu from './pages/Menu'
import Auth from './pages/Auth'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import TrackOrder from './pages/TrackOrder'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import Support from './pages/Support'
import Legal from './pages/Legal'

// Rider Page
import RiderView from './pages/rider/RiderView'

// Kitchen / Staff Panel
import SellerHome from './pages/seller/SellerHome'
import SellerOrders from './pages/seller/SellerOrders'
import SellerProducts from './pages/seller/SellerProducts'

// Admin Panel
import AdminHome from './pages/admin/AdminHome'
import AdminOrders from './pages/admin/AdminOrders'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminStaff from './pages/admin/AdminStaff'
import AdminProducts from './pages/admin/AdminProducts'
import AdminTickets from './pages/admin/AdminTickets'
import AdminCleaner from './pages/admin/AdminCleaner'

function RequireRole({
  roles,
  children,
}: {
  roles: Array<'customer' | 'staff' | 'admin' | 'seller' | 'rider'>
  children: React.ReactNode
}) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/auth" replace />
  if (!roles.includes(profile.role)) {
    if (profile.role === 'admin') return <>{children}</>
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

// Global Scroll Reset on Navigation
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <StoreProvider>
            <Routes>
              {/* Customer Layout Routes */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Menu />} />
                <Route path="menu" element={<Menu />} />
                <Route path="shop" element={<Menu />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="order-success" element={<OrderSuccess />} />
                <Route path="track" element={<TrackOrder />} />
                <Route path="orders" element={<Orders />} />
                <Route path="profile" element={<Profile />} />
                <Route path="support" element={<Support />} />
                <Route path="legal" element={<Legal />} />
                <Route path="privacy" element={<Legal />} />
                <Route path="terms" element={<Legal />} />
                <Route path="refund" element={<Legal />} />
                <Route path="delivery-policy" element={<Legal />} />
                <Route path="auth" element={<Auth />} />

                {/* Rider delivery dashboard */}
                <Route
                  path="rider"
                  element={
                    <RequireRole roles={['rider', 'staff', 'seller', 'admin']}>
                      <RiderView />
                    </RequireRole>
                  }
                />
              </Route>

              {/* Kitchen Staff Panel */}
              <Route
                path="/seller"
                element={
                  <RequireRole roles={['staff', 'seller', 'admin']}>
                    <SellerHome />
                  </RequireRole>
                }
              >
                <Route index element={<SellerOrders />} />
                <Route path="orders" element={<SellerOrders />} />
                <Route path="products" element={<SellerProducts />} />
              </Route>

              {/* Admin Panel */}
              <Route
                path="/admin"
                element={
                  <RequireRole roles={['admin']}>
                    <AdminHome />
                  </RequireRole>
                }
              >
                <Route index element={<AdminOrders />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="staff" element={<AdminStaff />} />
                <Route path="tickets" element={<AdminTickets />} />
                <Route path="cleaner" element={<AdminCleaner />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
