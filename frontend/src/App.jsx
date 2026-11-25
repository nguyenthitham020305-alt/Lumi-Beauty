import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/admin/AdminLayout'
import AdminRoute from './components/admin/AdminRoute'
import { AuthProvider } from './components/auth/AuthContext'
import AuthModal from './components/auth/AuthModal'
import { CartProvider } from './components/cart/CartContext'
import CartDrawer from './components/cart/CartDrawer'
import OpenCartRedirect from './components/cart/OpenCartRedirect'
import { ChatProvider } from './components/chat/ChatContext'
import Layout from './components/layout/Layout'
import LegacyRedirect from './components/layout/LegacyRedirect'
import { ToastProvider } from './components/ui/Toast'
import AdminCustomerDetailPage from './pages/admin/AdminCustomerDetailPage'
import AdminCustomersPage from './pages/admin/AdminCustomersPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import CheckoutPage from './pages/CheckoutPage'
import ComingSoonPage from './pages/ComingSoonPage'
import HomePage from './pages/HomePage'
import OrderDetailPage from './pages/OrderDetailPage'
import OrdersPage from './pages/OrdersPage'
import ProfilePage from './pages/ProfilePage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProductListPage from './pages/ProductListPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <ChatProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="products" element={<ProductListPage />} />
                  <Route path="products/:slug" element={<ProductDetailPage />} />
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="tai-khoan" element={<ProfilePage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:code" element={<OrderDetailPage />} />

                  <Route path="san-pham" element={<LegacyRedirect to="list" />} />
                  <Route path="san-pham/:slug" element={<LegacyRedirect to="detail" />} />
                  <Route path="danh-muc/:slug" element={<LegacyRedirect to="category" />} />
                  <Route path="thuong-hieu/:slug" element={<LegacyRedirect to="brand" />} />
                  <Route path="tim-kiem" element={<LegacyRedirect to="search" />} />
                  <Route path="khuyen-mai" element={<LegacyRedirect to="sale" />} />
                  <Route path="gio-hang" element={<OpenCartRedirect />} />

                  <Route path="*" element={<ComingSoonPage />} />
                </Route>
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="san-pham" element={<AdminProductsPage />} />
                  <Route path="don-hang" element={<AdminOrdersPage />} />
                  <Route path="don-hang/:code" element={<AdminOrderDetailPage />} />
                  <Route path="khach-hang" element={<AdminCustomersPage />} />
                  <Route path="khach-hang/:id" element={<AdminCustomerDetailPage />} />
                  <Route path="*" element={<ComingSoonPage />} />
                </Route>
              </Routes>
              <CartDrawer />
              <AuthModal />
            </ChatProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
