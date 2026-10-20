import { ArrowLeft, CalendarDays, Loader2, Lock, LockOpen, Mail, Phone, Receipt, ShoppingBag, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_METHOD_SHORT,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
} from '../../components/order/orderLabels'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { formatPrice } from '../../lib/format'
import { StatusBadge } from './AdminCustomersPage'

const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

/* Cùng kiểu với thẻ thống kê ở Tổng quan: font-display (serif) chỉ dành cho
   tiêu đề trang, số liệu dùng font-sans để đồng bộ với bảng bên dưới. */
function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Icon className="size-4 text-brand-600" aria-hidden /> {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="break-words text-sm text-slate-800">{children}</p>
      </div>
    </div>
  )
}

export default function AdminCustomerDetailPage() {
  const { id } = useParams()
  const toast = useToast()
  const [reloadKey, setReloadKey] = useState(0)
  const { data, error } = useFetch(() => api.adminCustomer(id), [id, reloadKey])
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  // Phải dùng block body: arrow một dòng sẽ TRẢ VỀ giá trị của scrollTo,
  // React 19 coi đó là hàm dọn dẹp rồi gọi nó -> "destroy is not a function"
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const backLink = (
    <Link to="/admin/khach-hang" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-700">
      <ArrowLeft className="size-4" aria-hidden /> Danh sách khách hàng
    </Link>
  )

  if (error) {
    return (
      <>
        {backLink}
        <p className="mt-4 rounded-2xl bg-blush-50 p-6 text-sm text-blush-600">{error.message}</p>
      </>
    )
  }
  if (!data) {
    return (
      <>
        {backLink}
        <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tải thông tin khách hàng...
        </p>
      </>
    )
  }

  const { customer, orders, status_breakdown: breakdown } = data
  const locking = customer.is_active

  const toggle = async () => {
    setBusy(true)
    try {
      const res = await api.setCustomerActive(customer.id, !customer.is_active)
      toast(res.customer.is_active ? 'Đã mở khoá tài khoản' : 'Đã khoá tài khoản')
      setConfirming(false)
      setReloadKey((k) => k + 1)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {backLink}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">{customer.name}</h1>
            <StatusBadge active={customer.is_active} />
          </div>
          <p className="mt-1 font-mono text-xs text-slate-400">Mã khách hàng #{customer.id}</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm ${
            locking ? 'bg-blush-600 text-white hover:bg-blush-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {locking ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
          {locking ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={ShoppingBag} label="Tổng số đơn" value={customer.order_count} hint={`Đơn gần nhất: ${formatDate(customer.last_order_at)}`} />
        <StatCard icon={Wallet} label="Tổng chi tiêu" value={formatPrice(customer.total_spent)} hint="Không tính đơn đã huỷ" />
        <StatCard icon={CalendarDays} label="Ngày đăng ký" value={formatDate(customer.created_at)} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Thông tin liên hệ</h2>
          <div className="mt-2 divide-y divide-slate-100">
            <InfoRow icon={Mail} label="Email">
              {customer.email}
            </InfoRow>
            <InfoRow icon={Phone} label="Số điện thoại">
              {customer.phone || <span className="text-slate-400">Chưa cập nhật</span>}
            </InfoRow>
          </div>

          {Object.keys(breakdown).length > 0 && (
            <>
              <h3 className="mt-5 border-t border-slate-100 pt-4 text-sm font-semibold text-slate-900">Đơn theo trạng thái</h3>
              <ul className="mt-2 space-y-1.5">
                {Object.entries(breakdown).map(([status, n]) => (
                  <li key={status} className="flex items-center justify-between text-sm">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-500'}`}
                    >
                      {ORDER_STATUS_LABEL[status] ?? status}
                    </span>
                    <span className="font-semibold text-slate-700">{n}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">
            Lịch sử đơn hàng <span className="text-sm font-normal text-slate-500">({orders.length})</span>
          </h2>

          {orders.length === 0 ? (
            <div className="py-14 text-center">
              <Receipt className="mx-auto size-10 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm text-slate-500">Khách hàng chưa đặt đơn nào.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Mã đơn</th>
                      <th className="px-4 py-3 font-medium">Ngày đặt</th>
                      <th className="px-4 py-3 text-right font-medium">Số SP</th>
                      <th className="px-4 py-3 text-right font-medium">Tổng tiền</th>
                      <th className="px-4 py-3 font-medium">Thanh toán</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((o) => (
                      <tr key={o.order_code} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <Link to={`/admin/don-hang/${o.order_code}`} className="font-semibold text-brand-700 hover:underline">
                            {o.order_code}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDateTime(o.order_date)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{o.item_count}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatPrice(o.total_amount)}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{PAYMENT_METHOD_SHORT[o.payment_method] ?? '—'}</span>
                          {o.payment_status && (
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_STYLE[o.payment_status]}`}>
                              {PAYMENT_STATUS_LABEL[o.payment_status]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLE[o.status]}`}>
                            {ORDER_STATUS_LABEL[o.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 md:hidden">
                {orders.map((o) => (
                  <li key={o.order_code} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link to={`/admin/don-hang/${o.order_code}`} className="font-semibold text-brand-700 hover:underline">
                          {o.order_code}
                        </Link>
                        <p className="text-xs text-slate-500">{formatDateTime(o.order_date)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLE[o.status]}`}>
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {o.item_count} sản phẩm · {PAYMENT_METHOD_SHORT[o.payment_method] ?? '—'}
                      </span>
                      <span className="font-bold text-blush-600">{formatPrice(o.total_amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirming}
        title={locking ? 'Khoá tài khoản này?' : 'Mở khoá tài khoản này?'}
        confirmLabel={locking ? 'Khoá tài khoản' : 'Mở khoá'}
        danger={locking}
        busy={busy}
        onConfirm={toggle}
        onClose={() => !busy && setConfirming(false)}
      >
        <p>
          Tài khoản <strong className="text-slate-800">{customer.name}</strong> ({customer.email})
          {locking ? ' sẽ không đăng nhập được nữa.' : ' sẽ đăng nhập lại được bình thường.'}
        </p>
        {locking && customer.order_count > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {customer.order_count} đơn hàng đã đặt vẫn được giữ nguyên và xử lý bình thường.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
