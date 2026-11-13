import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StoreProvider } from './context/StoreContext'
import { ErrorBoundary } from './components/ErrorBoundary'

import Menu from './pages/Menu'
import Auth from './pages/Auth'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import TrackOrder from './pages/TrackOrder'

import SellerHome from './pages/seller/SellerHome'
import SellerOrders from './pages/seller/SellerOrders'
import SellerProducts from './pages/seller/SellerProducts'

import AdminHome from './pages/admin/AdminHome'
import AdminOrders from './pages/admin/AdminOrders'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminStaff from './pages/admin/AdminStaff'
import AdminProducts from './pages/admin/AdminProducts'

function RequireRole({ role, children }: { role: 'staff' | 'admin'; children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (!profile) return <Navigate to="/auth" replace />
  if (role === 'admin' && profile.role !== 'admin') return <Navigate to="/" replace />
  if (role === 'staff' && profile.role !== 'staff' && profile.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <StoreProvider>
            <Routes>
              {/* Customer routes */}
              <Route path="/" element={<Menu />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/track" element={<TrackOrder />} />

              {/* Seller routes */}
              <Route path="/seller" element={<RequireRole role="staff"><SellerHome /></RequireRole>}>
                <Route index element={<SellerOrders />} />
                <Route path="products" element={<SellerProducts />} />
              </Route>

              {/* Admin routes */}
              <Route path="/admin" element={<RequireRole role="admin"><AdminHome /></RequireRole>}>
                <Route index element={<AdminOrders />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="staff" element={<AdminStaff />} />
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
