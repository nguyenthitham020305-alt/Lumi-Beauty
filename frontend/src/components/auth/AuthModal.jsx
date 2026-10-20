import { Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EMAIL_RE, PHONE_RE } from '../../lib/validation'
import Field from '../ui/FormField'
import { useAuth } from './AuthContext'


function validateRegister(f) {
  const errors = {}
  const name = f.name.trim()
  if (name.length < 2 || name.length > 100) errors.name = 'Họ tên phải từ 2 đến 100 ký tự'
  if (!PHONE_RE.test(f.phone.replace(/[\s.-]/g, ''))) errors.phone = 'Số điện thoại không hợp lệ (vd 0912345678)'
  if (!EMAIL_RE.test(f.email.trim())) errors.email = 'Email không hợp lệ'
  if (f.password.length < 6 || f.password.length > 32) errors.password = 'Mật khẩu phải từ 6 đến 32 ký tự'
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) errors.password = 'Mật khẩu phải có cả chữ và số'
  else if (f.password !== f.confirm_password) errors.confirm_password = 'Mật khẩu xác nhận không khớp'
  if (!f.agree) errors.agree = 'Bạn cần đồng ý với điều khoản để tiếp tục'
  return errors
}

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

function FormError({ message }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl bg-blush-50 px-4 py-2.5 text-sm text-blush-600">
      {message}
    </p>
  )
}

function LoginForm({ onSuccess, switchTo }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.password) return setError('Vui lòng nhập email và mật khẩu')
    setLoading(true)
    setError('')
    try {
      onSuccess(await login(form.email.trim(), form.password))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormError message={error} />
      <Field id="login-email" label="Email *" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
      <Field id="login-password" label="Mật khẩu *" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} />
      <div className="flex justify-end">
        <button type="button" className="text-sm text-brand-600 hover:underline">
          Quên mật khẩu?
        </button>
      </div>
      <SubmitButton loading={loading}>Đăng nhập</SubmitButton>
      <p className="text-center text-sm text-slate-500">
        Chưa có tài khoản?{' '}
        <button type="button" onClick={switchTo} className="font-semibold text-brand-600 hover:underline">
          Tạo tài khoản
        </button>
      </p>
    </form>
  )
}

const EMPTY_REGISTER = { name: '', phone: '', email: '', password: '', confirm_password: '', agree: false }

function RegisterForm({ onSuccess, switchTo }) {
  const { register } = useAuth()
  const [form, setForm] = useState(EMPTY_REGISTER)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [key]: value })
    if (errors[key]) setErrors({ ...errors, [key]: undefined })
  }

  const submit = async (e) => {
    e.preventDefault()
    const clientErrors = validateRegister(form)
    setErrors(clientErrors)
    setFormError('')
    if (Object.keys(clientErrors).length) return

    setLoading(true)
    try {
      const { agree: _agree, ...payload } = form
      onSuccess(await register(payload))
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      setFormError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3.5">
      <FormError message={formError} />
      <Field id="reg-name" label="Họ và tên *" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
      <Field id="reg-phone" label="Số điện thoại *" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
      <Field id="reg-email" label="Email *" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
      <Field
        id="reg-password"
        label="Mật khẩu từ 6 - 32 ký tự, gồm chữ và số *"
        type="password"
        autoComplete="new-password"
        value={form.password}
        onChange={set('password')}
        error={errors.password}
      />
      <Field
        id="reg-confirm"
        label="Nhập lại mật khẩu *"
        type="password"
        autoComplete="new-password"
        value={form.confirm_password}
        onChange={set('confirm_password')}
        error={errors.confirm_password}
      />
      <div>
        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input type="checkbox" checked={form.agree} onChange={set('agree')} className="mt-0.5 size-4.5 shrink-0 accent-brand-600" />
          <span>
            Khi nhấn Đăng ký, bạn đồng ý với <span className="font-medium text-brand-600">điều kiện sử dụng và chính sách bảo mật</span> của
            LUMI Beauty
          </span>
        </label>
        {errors.agree && <p className="mt-1 pl-7 text-xs text-blush-600">{errors.agree}</p>}
      </div>
      <SubmitButton loading={loading}>Đăng ký</SubmitButton>
      <p className="text-center text-sm text-slate-500">
        Đã có tài khoản?{' '}
        <button type="button" onClick={switchTo} className="font-semibold text-brand-600 hover:underline">
          Đăng nhập
        </button>
      </p>
    </form>
  )
}

const TABS = [
  { mode: 'login', label: 'Đăng nhập' },
  { mode: 'register', label: 'Tạo tài khoản' },
]

export default function AuthModal() {
  const { modalMode, openAuth, closeAuth } = useAuth()
  const navigate = useNavigate()
  const dialogRef = useRef(null)

  const isOpen = Boolean(modalMode)

  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') return closeAuth()
      if (e.key !== 'Tab') return
      // Giữ focus trong modal khi bấm Tab
      const focusable = dialogRef.current?.querySelectorAll('button, input, [href]')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
    // closeAuth đổi mỗi render nhưng chỉ gọi setState nên không cần làm dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Chạy cả khi chuyển tab Đăng nhập <-> Tạo tài khoản
  useEffect(() => {
    if (modalMode) dialogRef.current?.querySelector('input')?.focus()
  }, [modalMode])

  if (!isOpen) return null

  const onSuccess = (user) => {
    closeAuth()
    if (user.role === 'admin') navigate('/admin')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={closeAuth} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <h2 id="auth-modal-title" className="sr-only">
          {modalMode === 'login' ? 'Đăng nhập LUMI Beauty' : 'Tạo tài khoản LUMI Beauty'}
        </h2>
        <div role="tablist" className="grid grid-cols-2">
          {TABS.map((t) => (
            <button
              key={t.mode}
              type="button"
              role="tab"
              aria-selected={modalMode === t.mode}
              onClick={() => openAuth(t.mode)}
              className={`h-14 text-sm font-bold tracking-wide uppercase transition ${
                modalMode === t.mode
                  ? 'bg-gradient-to-r from-brand-600 to-brand-400 text-white'
                  : 'bg-white text-slate-600 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 pt-5 pb-6">
          <div className="mb-5 flex items-center gap-3">
            <img src="/images/logo-mark.png" alt="" className="size-10" />
            <p className="text-sm text-slate-500">
              {modalMode === 'login'
                ? 'Chào mừng bạn quay lại với LUMI Beauty!'
                : 'Tạo tài khoản để nhận ưu đãi thành viên và lưu lịch sử tư vấn.'}
            </p>
          </div>
          {modalMode === 'login' ? (
            <LoginForm onSuccess={onSuccess} switchTo={() => openAuth('register')} />
          ) : (
            <RegisterForm onSuccess={onSuccess} switchTo={() => openAuth('login')} />
          )}
        </div>

        <button
          type="button"
          onClick={closeAuth}
          aria-label="Đóng"
          className="absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-white/90 text-slate-600 shadow hover:text-slate-900"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
