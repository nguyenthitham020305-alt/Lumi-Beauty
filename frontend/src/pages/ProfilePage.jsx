import { KeyRound, Loader2, MapPin, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../components/auth/AuthContext'
import Breadcrumb from '../components/ui/Breadcrumb'
import FormField, { SelectField } from '../components/ui/FormField'
import { useToast } from '../components/ui/Toast'
import { useFetch } from '../hooks/useFetch'
import { api } from '../lib/api'

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-slate-800">{value || '—'}</dd>
    </div>
  )
}

/** Khối 1 — Xem hồ sơ cá nhân. Chỉ hiển thị, không sửa. */
function ProfileSummary({ user }) {
  return (
    <Section icon={UserRound} title="Hồ sơ cá nhân" subtitle="Thông tin tài khoản của bạn tại LUMI Beauty">
      <div className="mb-4 flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900">{user.name}</p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
        </div>
      </div>
      <dl>
        <Row label="Số điện thoại" value={user.phone} />
        <Row label="Địa chỉ mặc định" value={user.address?.full} />
        <Row
          label="Ngày tham gia"
          value={user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : null}
        />
      </dl>
    </Section>
  )
}

/** Khối 2 — Chỉnh sửa thông tin. Email không sửa được vì đó là tên đăng nhập. */
function EditProfile({ user, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    name: user.name ?? '',
    phone: user.phone ?? '',
    province_code: user.address?.province_code ? String(user.address.province_code) : '',
    ward_code: user.address?.ward_code ? String(user.address.ward_code) : '',
    street_address: user.address?.street_address ?? '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const { data: provinces } = useFetch(() => api.provinces(), [])
  const { data: wards, loading: wardsLoading } = useFetch(
    () => (form.province_code ? api.wards(form.province_code) : Promise.resolve({ items: [] })),
    [form.province_code],
  )

  // Đổi tỉnh thì phường cũ không còn thuộc tỉnh mới -> xoá đi cho khách chọn lại
  const set = (key) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [key]: value, ...(key === 'province_code' ? { ward_code: '' } : {}) }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const { user: updated } = await api.updateProfile({
        name: form.name,
        phone: form.phone,
        province_code: form.province_code || null,
        ward_code: form.ward_code || null,
        street_address: form.street_address || '',
      })
      onSaved(updated)
      toast('Đã cập nhật thông tin')
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section icon={MapPin} title="Chỉnh sửa thông tin" subtitle="Địa chỉ dưới đây sẽ được điền sẵn khi bạn đặt hàng">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField id="pf-name" label="Họ và tên" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />

        <div>
          <FormField id="pf-email" label="Email" value={user.email} disabled readOnly className="h-12 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500 outline-none" />
          <p className="mt-1 pl-1 text-xs text-slate-400">
            Email là tên đăng nhập nên không tự đổi được. Cần thay đổi, vui lòng liên hệ LUMI Beauty.
          </p>
        </div>

        <FormField
          id="pf-phone"
          label="Số điện thoại"
          value={form.phone}
          onChange={set('phone')}
          error={errors.phone}
          autoComplete="tel"
          placeholder="0912345678"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="pf-province"
            label="Tỉnh/Thành phố"
            value={form.province_code}
            onChange={set('province_code')}
            error={errors.province_code}
          >
            <option value="">-- Chọn tỉnh/thành --</option>
            {(provinces?.items ?? []).map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="pf-ward"
            label="Phường/Xã"
            value={form.ward_code}
            onChange={set('ward_code')}
            error={errors.ward_code}
            disabled={!form.province_code || wardsLoading}
          >
            <option value="">{wardsLoading ? 'Đang tải...' : '-- Chọn phường/xã --'}</option>
            {(wards?.items ?? []).map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </SelectField>
        </div>

        <FormField
          id="pf-street"
          label="Số nhà, tên đường"
          value={form.street_address}
          onChange={set('street_address')}
          error={errors.street_address}
          placeholder="Vd: Số 12 ngõ 30 đường Tạ Quang Bửu"
        />
        <p className="text-xs text-slate-400">Để trống cả ba ô địa chỉ nếu bạn chưa muốn lưu địa chỉ nào.</p>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Lưu thay đổi
        </button>
      </form>
    </Section>
  )
}

/** Khối 3 — Đổi mật khẩu. Bắt nhập mật khẩu hiện tại để tránh bị chiếm tài khoản. */
function ChangePassword() {
  const toast = useToast()
  const empty = { current_password: '', new_password: '', confirm_password: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      await api.changePassword(form)
      setForm(empty)
      toast('Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới nhé!')
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section icon={KeyRound} title="Đổi mật khẩu" subtitle="Mật khẩu từ 6 đến 32 ký tự, phải có cả chữ và số">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField
          id="pf-current"
          label="Mật khẩu hiện tại"
          type="password"
          value={form.current_password}
          onChange={set('current_password')}
          error={errors.current_password}
          autoComplete="current-password"
        />
        <FormField
          id="pf-new"
          label="Mật khẩu mới"
          type="password"
          value={form.new_password}
          onChange={set('new_password')}
          error={errors.new_password}
          autoComplete="new-password"
        />
        <FormField
          id="pf-confirm"
          label="Nhập lại mật khẩu mới"
          type="password"
          value={form.confirm_password}
          onChange={set('confirm_password')}
          error={errors.confirm_password}
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Đổi mật khẩu
        </button>
      </form>
    </Section>
  )
}

export default function ProfilePage() {
  const { user, loading, openAuth, updateUser } = useAuth()

  // Vào thẳng /tai-khoan khi chưa đăng nhập thì mời đăng nhập ngay
  useEffect(() => {
    if (!loading && !user) openAuth('login')
  }, [loading, user, openAuth])

  if (loading) return <p className="container-page py-20 text-center text-slate-500">Đang tải...</p>
  if (!user) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-slate-600">Vui lòng đăng nhập để xem tài khoản của bạn.</p>
        <button
          type="button"
          onClick={() => openAuth('login')}
          className="mt-4 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white"
        >
          Đăng nhập
        </button>
      </div>
    )
  }

  return (
    <div className="container-page py-6">
      <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Tài khoản của tôi' }]} />
      <h1 className="mt-3 font-display text-2xl font-semibold text-slate-900 md:text-3xl">Tài khoản của tôi</h1>

      <div className="mt-5 max-w-3xl space-y-5">
        <ProfileSummary user={user} />
        <EditProfile user={user} onSaved={updateUser} />
        <ChangePassword />
      </div>
    </div>
  )
}
