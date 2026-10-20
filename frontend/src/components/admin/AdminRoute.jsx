import { Loader2, ShieldAlert } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

/**
 * Chặn ở giao diện cho gọn trải nghiệm. Quyền thật sự do backend kiểm tra
 * (@admin_required), nên gọi thẳng API vẫn bị 401/403.
 */
export default function AdminRoute({ children }) {
  const { user, loading, isAdmin, openAuth } = useAuth()

  useEffect(() => {
    if (!loading && !user) openAuth('login')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-brand-600">
        <Loader2 className="size-8 animate-spin" aria-label="Đang tải" />
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <ShieldAlert className="mx-auto size-14 text-blush-500" aria-hidden />
          <h1 className="mt-4 font-display text-2xl font-semibold text-slate-900">Bạn không có quyền truy cập</h1>
          <p className="mt-2 text-slate-500">Trang này chỉ dành cho quản trị viên LUMI Beauty.</p>
          <Link to="/" className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            Về trang chủ
          </Link>
        </div>
      </div>
    )
  }
  return children
}
