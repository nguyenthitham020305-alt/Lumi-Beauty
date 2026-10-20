import { Banknote, Loader2, LogIn, MapPin, Pencil, QrCode, ShoppingBag, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthContext'
import { useCart } from '../components/cart/CartContext'
import PriceSummary from '../components/order/PriceSummary'
import Breadcrumb from '../components/ui/Breadcrumb'
import FormField, { SelectField } from '../components/ui/FormField'
import QuantityStepper from '../components/ui/QuantityStepper'
import { useToast } from '../components/ui/Toast'
import { useFetch } from '../hooks/useFetch'
import { api } from '../lib/api'
import { formatPrice, sizedImage } from '../lib/format'
import { EMAIL_RE, normalizePhone, PHONE_RE } from '../lib/validation'

const PAYMENT_OPTIONS = [
  {
    value: 'cod',
    icon: Banknote,
    title: 'Thanh toán khi nhận hàng (COD)',
    text: 'Trả tiền mặt cho nhân viên giao hàng.',
  },
  {
    value: 'bank_transfer',
    icon: QrCode,
    title: 'Chuyển khoản qua mã QR',
    text: 'Quét mã VietQR bằng app ngân hàng bất kỳ.',
  },
]

function validate(form) {
  const errors = {}
  if (form.recipient_name.trim().length < 2) errors.recipient_name = 'Vui lòng nhập họ tên'
  if (!PHONE_RE.test(normalizePhone(form.recipient_phone))) errors.recipient_phone = 'Số điện thoại không hợp lệ (vd 0912345678)'
  if (!EMAIL_RE.test(form.recipient_email.trim())) errors.recipient_email = 'Email không hợp lệ'
  if (!form.province_code) errors.province_code = 'Tỉnh/Thành phố là bắt buộc'
  if (!form.ward_code) errors.ward_code = 'Phường/Xã là bắt buộc'
  if (form.street_address.trim().length < 5) errors.street_address = 'Vui lòng nhập số nhà, tên đường'
  return errors
}

function Section({ title, children, action }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function LoginRequired() {
  const { openAuth } = useAuth()
  return (
    <div className="container-page py-20 text-center">
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-brand-50">
        <LogIn className="size-9 text-brand-500" aria-hidden />
      </span>
      <h1 className="mt-4 font-display text-2xl font-semibold text-slate-900">Đăng nhập để đặt hàng</h1>
      <p className="mt-2 text-slate-500">Giỏ hàng của bạn vẫn được giữ nguyên sau khi đăng nhập.</p>
      <button
        type="button"
        onClick={() => openAuth('login')}
        className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Đăng nhập / Đăng ký
      </button>
    </div>
  )
}

function OrderLine({ item }) {
  const { busy, updateQuantity, removeItem } = useCart()
  const pending = busy === item.product_id
  return (
    <li className={`flex gap-3 py-3 ${pending ? 'opacity-60' : ''}`}>
      <img src={sizedImage(item.image, 150)} alt="" className="size-16 shrink-0 rounded-xl border border-slate-100 object-contain p-1" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="line-clamp-2 flex-1 text-sm leading-5 text-slate-700">{item.name}</p>
          <button
            type="button"
            onClick={() => removeItem(item.product_id)}
            disabled={pending}
            aria-label={`Xoá ${item.name} khỏi đơn`}
            className="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-blush-50 hover:text-blush-600"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
        {item.sku && <p className="text-xs text-slate-400">SKU: {item.sku}</p>}
        {!item.available && <p className="text-xs font-medium text-blush-600">Không đủ hàng, vui lòng giảm số lượng hoặc xoá</p>}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <QuantityStepper
            id={`checkout-qty-${item.product_id}`}
            size="sm"
            label={`Số lượng ${item.name}`}
            value={item.quantity}
            max={Math.max(item.max_quantity, 1)}
            disabled={pending}
            onChange={(q) => q !== item.quantity && updateQuantity(item.product_id, q)}
          />
          <span className="text-sm font-bold text-slate-800">{formatPrice(item.line_total)}</span>
        </div>
      </div>
    </li>
  )
}

function CheckoutForm({ user }) {
  const { cart, refresh: refreshCart, openCart } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    recipient_name: user.name,
    recipient_phone: user.phone ?? '',
    recipient_email: user.email,
    province_code: '',
    ward_code: '',
    street_address: '',
    note: '',
    payment_method: 'cod',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  // Khách đã có địa chỉ lưu -> hiện gọn lại, chỉ mở form khi bấm "Đổi địa chỉ"
  const [editingAddress, setEditingAddress] = useState(false)
  const [savedAddress, setSavedAddress] = useState(null)

  const { data: provinceData } = useFetch(() => api.provinces())
  const { data: wardData, loading: wardsLoading } = useFetch(
    () => (form.province_code ? api.wards(form.province_code) : Promise.resolve({ items: [] })),
    [form.province_code],
  )
  // Tính lại tiền mỗi khi giỏ đổi (sửa số lượng / xoá ngay trên trang này)
  const { data: summary, loading: summaryLoading } = useFetch(() => api.checkoutSummary(), [cart])

  // Điền sẵn địa chỉ đã lưu từ lần đặt hàng trước. Chỉ chạy một lần khi
  // nhận được dữ liệu, không ghi đè nếu khách đang sửa dở.
  useEffect(() => {
    const addr = summary?.saved_address
    if (!addr || savedAddress) return
    setSavedAddress(addr)
    setForm((f) => ({
      ...f,
      province_code: String(addr.province_code),
      ward_code: String(addr.ward_code),
      street_address: addr.street_address,
    }))
  }, [summary, savedAddress])

  const set = (key) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [key]: value, ...(key === 'province_code' ? { ward_code: '' } : {}) }))
    if (errors[key]) setErrors((err) => ({ ...err, [key]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const clientErrors = validate(form)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) {
      document.getElementById(`co-${Object.keys(clientErrors)[0]}`)?.focus()
      return
    }
    setSubmitting(true)
    try {
      const { order } = await api.createOrder({
        ...form,
        recipient_phone: normalizePhone(form.recipient_phone),
        province_code: Number(form.province_code),
        ward_code: Number(form.ward_code),
      })
      toast(`Đặt hàng thành công! Mã đơn ${order.order_code}`)
      refreshCart()
      navigate(`/orders/${order.order_code}`, { state: { justPlaced: true }, replace: true })
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      toast(err.message, 'error')
      refreshCart()
    } finally {
      setSubmitting(false)
    }
  }

  if (summaryLoading && !summary) {
    return <p className="container-page py-20 text-center text-slate-500">Đang tải đơn hàng...</p>
  }

  const items = summary?.items ?? []
  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-brand-50">
          <ShoppingBag className="size-9 text-brand-400" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold text-slate-900">Chưa có sản phẩm để đặt</h1>
        <p className="mt-2 text-slate-500">Hãy chọn sản phẩm trong giỏ hàng trước khi thanh toán.</p>
        <div className="mt-6 flex justify-center gap-3">
          {cart.count > 0 && (
            <button type="button" onClick={openCart} className="rounded-full border border-brand-600 px-6 py-3 text-sm font-semibold text-brand-700">
              Mở giỏ hàng
            </button>
          )}
          <Link to="/products" className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    )
  }

  const provinces = provinceData?.items ?? []
  const wards = wardData?.items ?? []
  // Hiện dạng gọn khi: có địa chỉ đã lưu và khách chưa bấm "Đổi địa chỉ"
  const showSavedAddress = Boolean(savedAddress) && !editingAddress
  const canSubmit = summary.unavailable_count === 0 && !submitting

  return (
    <form onSubmit={submit} noValidate className="container-page py-6">
      <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Thanh toán' }]} />
      <h1 className="mt-3 font-display text-2xl font-semibold text-slate-900 md:text-3xl">Thông tin thanh toán</h1>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-5">
          <Section title="Thông tin người mua hàng">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField id="co-recipient_name" label="Họ và tên *" autoComplete="name" value={form.recipient_name} onChange={set('recipient_name')} error={errors.recipient_name} />
              </div>
              <FormField id="co-recipient_phone" label="Số điện thoại *" type="tel" autoComplete="tel" value={form.recipient_phone} onChange={set('recipient_phone')} error={errors.recipient_phone} />
              <FormField id="co-recipient_email" label="Email *" type="email" autoComplete="email" value={form.recipient_email} onChange={set('recipient_email')} error={errors.recipient_email} />
            </div>
          </Section>

          <Section
            title="Thông tin nhận hàng"
            action={
              showSavedAddress && (
                <button
                  type="button"
                  onClick={() => setEditingAddress(true)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-700"
                >
                  <Pencil className="size-3.5" aria-hidden /> Đổi địa chỉ
                </button>
              )
            }
          >
            {/* Đã có địa chỉ lưu từ lần mua trước -> hiện gọn, khỏi nhập lại */}
            {showSavedAddress && (
              <div className="flex gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
                <MapPin className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{savedAddress.full}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Địa chỉ đã lưu từ lần đặt hàng trước. Bấm “Đổi địa chỉ” nếu muốn giao tới nơi khác.
                  </p>
                </div>
              </div>
            )}

            <div className={`grid gap-3 sm:grid-cols-2 ${showSavedAddress ? 'hidden' : ''}`}>
              <SelectField id="co-province_code" label="Tỉnh/Thành phố" value={form.province_code} onChange={set('province_code')} error={errors.province_code}>
                <option value="">Tỉnh/Thành phố *</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id="co-ward_code"
                label="Phường/Xã"
                value={form.ward_code}
                onChange={set('ward_code')}
                error={errors.ward_code}
                disabled={!form.province_code || wardsLoading}
              >
                <option value="">{wardsLoading ? 'Đang tải...' : 'Phường/Xã *'}</option>
                {wards.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name}
                  </option>
                ))}
              </SelectField>
              <div className="sm:col-span-2">
                <FormField
                  id="co-street_address"
                  label="Số nhà, tên đường, toà nhà *"
                  autoComplete="street-address"
                  value={form.street_address}
                  onChange={set('street_address')}
                  error={errors.street_address}
                />
              </div>
            </div>

            {/* Ghi chú luôn hiện: mỗi đơn một yêu cầu khác nhau, không lưu lại */}
            <div className={showSavedAddress ? '' : 'mt-3'}>
              <label htmlFor="co-note" className="sr-only">
                Ghi chú
              </label>
              <textarea
                id="co-note"
                rows={2}
                maxLength={500}
                value={form.note}
                onChange={set('note')}
                placeholder="Ghi chú cho đơn hàng (không bắt buộc), vd: giao giờ hành chính"
                className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {!showSavedAddress && (
              <p className="mt-2 text-xs text-slate-400">Địa chỉ theo đơn vị hành chính mới (2 cấp) áp dụng từ 01/07/2025.</p>
            )}
          </Section>

          <Section title="Phương thức thanh toán">
            <div className="grid gap-3" role="radiogroup" aria-label="Phương thức thanh toán">
              {PAYMENT_OPTIONS.map(({ value, icon: Icon, title, text }) => {
                const active = form.payment_method === value
                return (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${
                      active ? 'border-brand-500 bg-brand-50/60' : 'border-slate-100 hover:border-brand-200'
                    }`}
                  >
                    <input type="radio" name="payment_method" value={value} checked={active} onChange={set('payment_method')} className="size-4.5 accent-brand-600" />
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">{title}</span>
                      <span className="block text-xs text-slate-500">{text}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            {form.payment_method === 'bank_transfer' && (
              <div className="mt-4 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                <QrCode className="size-5 shrink-0" aria-hidden />
                <p>
                  Sau khi bấm <b>Đặt hàng</b>, mã QR chuyển khoản <b>{formatPrice(summary.total_amount)}</b> sẽ hiện ngay, với nội dung là mã đơn để
                  LUMI đối soát. Đơn được xác nhận khi LUMI nhận được tiền.
                </p>
              </div>
            )}
          </Section>
        </div>

        <aside className="min-w-0 rounded-3xl border border-slate-100 bg-white p-5 shadow-card lg:sticky lg:top-40">
          <h2 className="text-lg font-semibold text-slate-900">Đơn hàng ({items.reduce((n, i) => n + i.quantity, 0)} sản phẩm)</h2>
          <ul className="mt-2 max-h-80 divide-y divide-slate-100 overflow-y-auto pr-1">
            {items.map((item) => (
              <OrderLine key={item.product_id} item={item} />
            ))}
          </ul>
          <div className="mt-3 border-t border-slate-100 pt-4">
            <PriceSummary
              subtotal={summary.subtotal}
              discount={summary.discount_amount}
              shippingFee={summary.shipping_fee}
              total={summary.total_amount}
              freeShippingThreshold={summary.free_shipping_threshold}
            />
          </div>
          {summary.unavailable_count > 0 && (
            <p className="mt-3 text-xs font-medium text-blush-600">Có sản phẩm không đủ hàng, vui lòng điều chỉnh trước khi đặt.</p>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 text-sm font-bold tracking-wide text-white uppercase shadow-lg shadow-brand-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Đặt hàng
          </button>
          <p className="mt-2 text-center text-xs text-slate-400">Bấm Đặt hàng là bạn đồng ý với chính sách mua hàng của LUMI Beauty.</p>
        </aside>
      </div>
    </form>
  )
}

export default function CheckoutPage() {
  const { user, loading } = useAuth()
  if (loading) return <p className="container-page py-20 text-center text-slate-500">Đang tải...</p>
  if (!user) return <LoginRequired />
  return <CheckoutForm user={user} />
}
