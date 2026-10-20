import { ImageOff, Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { sizedImage } from '../../lib/format'
import { api } from '../../lib/api'
import { useToast } from '../ui/Toast'

const EMPTY = { name: '', description: '', image: '', parent_id: '' }

const inputBase =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4'
const okRing = 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
const errRing = 'border-blush-400 focus:ring-blush-100'

function Field({ label, htmlFor, error, hint, required, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-blush-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-blush-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  )
}

/**
 * category = null -> thêm mới; có category -> sửa.
 * allCategories dùng cho dropdown "danh mục cha" (đã có sẵn ở panel, không gọi API lại).
 */
export default function CategoryFormModal({ open, category, allCategories, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const firstFieldRef = useRef(null)
  const isEdit = Boolean(category)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(
      category
        ? {
            name: category.name ?? '',
            description: category.description ?? '',
            image: category.image ?? '',
            parent_id: category.parent_id ?? '',
          }
        : EMPTY,
    )
  }, [open, category])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, saving, onClose])

  useEffect(() => {
    if (open) firstFieldRef.current?.focus()
  }, [open])

  if (!open) return null

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  // Không cho chọn chính nó hoặc con cháu của nó làm cha (backend cũng chặn)
  const descendants = new Set()
  if (isEdit) {
    const stack = [category.id]
    while (stack.length) {
      const id = stack.pop()
      descendants.add(id)
      allCategories.filter((c) => c.parent_id === id && !descendants.has(c.id)).forEach((c) => stack.push(c.id))
    }
  }
  const parentOptions = allCategories.filter((c) => !descendants.has(c.id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    const payload = { ...form, parent_id: form.parent_id === '' ? null : Number(form.parent_id) }
    try {
      const res = isEdit ? await api.updateCategory(category.id, payload) : await api.createCategory(payload)
      toast(isEdit ? `Đã cập nhật "${res.category.name}"` : `Đã thêm danh mục "${res.category.name}"`)
      onSaved()
      onClose()
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      toast(Object.keys(err.fieldErrors ?? {}).length ? 'Vui lòng kiểm tra lại các ô được đánh dấu' : err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const ring = (key) => `${inputBase} ${errors[key] ? errRing : okRing}`

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={() => !saving && onClose()} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
        className="relative my-8 w-full max-w-lg rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h2 id="category-form-title" className="font-display text-xl font-semibold text-slate-900">
            {isEdit ? 'Sửa danh mục' : 'Thêm danh mục mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <Field label="Tên danh mục" htmlFor="cf-name" error={errors.name} required>
            <input
              ref={firstFieldRef}
              id="cf-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="VD: Tẩy tế bào chết"
              aria-invalid={Boolean(errors.name)}
              className={ring('name')}
            />
          </Field>

          <Field
            label="Danh mục cha"
            htmlFor="cf-parent"
            error={errors.parent_id}
            hint="Để trống nếu đây là danh mục gốc"
          >
            <select id="cf-parent" value={form.parent_id} onChange={(e) => set('parent_id', e.target.value)} className={ring('parent_id')}>
              <option value="">— Danh mục gốc —</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Mô tả" htmlFor="cf-description" error={errors.description} hint="Tối đa 500 ký tự">
            <textarea
              id="cf-description"
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Mô tả ngắn hiển thị ở đầu trang danh mục..."
              className={`${ring('description')} resize-y`}
            />
          </Field>

          <Field label="Ảnh đại diện" htmlFor="cf-image" error={errors.image} hint="Đường dẫn ảnh (http://... hoặc /images/...)">
            <div className="flex items-center gap-2">
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {form.image.trim() ? (
                  <img src={sizedImage(form.image, 100)} alt="" className="size-full object-contain" />
                ) : (
                  <ImageOff className="size-4 text-slate-300" aria-hidden />
                )}
              </span>
              <input
                id="cf-image"
                value={form.image}
                onChange={(e) => set('image', e.target.value)}
                placeholder="https://..."
                aria-invalid={Boolean(errors.image)}
                className={ring('image')}
              />
            </div>
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {isEdit ? 'Lưu thay đổi' : 'Thêm danh mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
