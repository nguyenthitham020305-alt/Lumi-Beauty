import { ChevronDown, LayoutDashboard, LogOut, Package, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function Avatar({ name }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

export default function AccountMenu() {
  const { user, loading, isAdmin, logout, openAuth } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onClick = (e) => !menuRef.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (loading) return <span className="size-9 animate-pulse rounded-full bg-slate-100" aria-hidden />

  if (!user) {
    return (
      <div className="flex items-center gap-2 rounded-full px-2 py-1.5 text-sm md:px-3">
        <button type="button" onClick={() => openAuth('login')} aria-label="Đăng nhập" className="lg:hidden">
          <UserRound className="size-6 text-brand-600" aria-hidden />
        </button>
        <UserRound className="hidden size-6 text-brand-600 lg:block" aria-hidden />
        <span className="hidden leading-tight lg:block">
          <button type="button" onClick={() => openAuth('login')} className="block font-semibold hover:text-brand-700">
            Đăng nhập
          </button>
          <span className="text-xs text-slate-500">
            hoặc{' '}
            <button type="button" onClick={() => openAuth('register')} className="hover:text-brand-700 hover:underline">
              Đăng ký
            </button>
          </span>
        </span>
      </div>
    )
  }

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-left text-sm hover:bg-brand-50"
      >
        <Avatar name={user.name} />
        <span className="hidden max-w-36 leading-tight lg:block">
          <span className="block text-xs text-slate-500">{isAdmin ? 'Quản trị viên' : 'Xin chào,'}</span>
          <span className="block truncate font-semibold">{user.name}</span>
        </span>
        <ChevronDown className="hidden size-4 text-slate-400 lg:block" aria-hidden />
      </button>

      {open && (
        <div role="menu" className="absolute top-full right-0 z-40 mt-2 w-60 rounded-2xl border border-slate-100 bg-white p-2 shadow-card">
          <div className="border-b border-slate-100 px-3 pt-1 pb-3">
            <p className="truncate font-semibold text-slate-800">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <Link
            to="/orders"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
          >
            <Package className="size-4" aria-hidden /> Đơn hàng của tôi
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
            >
              <LayoutDashboard className="size-4" aria-hidden /> Trang quản trị
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-blush-50 hover:text-blush-600"
          >
            <LogOut className="size-4" aria-hidden /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}
