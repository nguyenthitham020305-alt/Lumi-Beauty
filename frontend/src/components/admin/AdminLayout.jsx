import { Home, LayoutDashboard, LogOut, Package, ShoppingCart, Users } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const MENU = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/admin/san-pham', label: 'Sản phẩm', icon: Package },
  { to: '/admin/don-hang', label: 'Đơn hàng', icon: ShoppingCart },
  { to: '/admin/khach-hang', label: 'Khách hàng', icon: Users },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    // Rời /admin trước, nếu không AdminRoute thấy user = null sẽ bật modal đăng nhập
    navigate('/')
    await logout()
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <Link to="/admin" className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <img src="/images/logo.png" alt="LUMI Beauty" className="h-12 w-auto" />
          <span className="text-xs font-semibold tracking-wider text-brand-600 uppercase">Quản trị</span>
        </Link>
        <nav aria-label="Menu quản trị" className="flex-1 space-y-1 p-3">
          {MENU.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                }`
              }
            >
              <Icon className="size-5" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">
          <Home className="size-5" aria-hidden /> Về trang cửa hàng
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-8">
          <Link to="/" className="shrink-0 md:hidden">
            <img src="/images/logo.png" alt="LUMI Beauty" className="h-10 w-auto" />
          </Link>
          <p className="hidden text-sm text-slate-500 md:block">Hệ thống quản trị LUMI Beauty</p>
          <div className="flex min-w-0 items-center gap-3">
            <span className="min-w-0 text-right text-sm leading-tight">
              <span className="block truncate font-semibold text-slate-800">{user.name}</span>
              <span className="hidden truncate text-xs text-slate-500 sm:block">{user.email}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Đăng xuất"
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 p-2 text-sm text-slate-600 hover:border-blush-300 hover:text-blush-600 sm:px-3 sm:py-1.5"
            >
              <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>
        {/* Sidebar ẩn trên mobile nên cần menu ngang thay thế */}
        <nav aria-label="Menu quản trị" className="no-scrollbar flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          {[...MENU, { to: '/', label: 'Cửa hàng', icon: Home }].map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end ?? to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                  isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                }`
              }
            >
              <Icon className="size-4" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
