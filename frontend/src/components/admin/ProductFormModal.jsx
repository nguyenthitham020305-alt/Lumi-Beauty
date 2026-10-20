import { ImageOff, Loader2, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { formatPrice, sizedImage } from '../../lib/format'
import { useToast } from '../ui/Toast'

const MAX_IMAGES = 8

const EMPTY = {
  name: '',
  sku: '',
  brand_id: '',
  category_ids: [],
  description: '',
  original_price: '',
  price: '',
  stock: '',
  status: 'active',
  images: [''],
}

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
        <p id={`${htmlFor}-error`} className="mt-1 text-xs text-blush-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  )
}

/** product = null -> thêm mới; có product -> sửa */
export default function ProductFormModal({ open, product, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [options, setOptions] = useState({ categories: [], brands: [] })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const firstFieldRef = useRef(null)
  const isEdit = Boolean(product)

  useEffect(() => {
    if (!open) return
    api.adminProductFormOptions().then(setOptions).catch(() => toast('Không tải được danh mục / thương hiệu', 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Mở form sửa: lấy bản đầy đủ vì danh sách không kèm mô tả và gallery
  useEffect(() => {
    if (!open) return
    setErrors({})
    if (!product) {
      setForm(EMPTY)
      return
    }
    setLoading(true)
    api
      .adminProduct(product.id)
      .then(({ product: p }) => {
        setForm({
          name: p.name ?? '',
          sku: p.sku ?? '',
          brand_id: p.brand_id ?? '',
          category_ids: p.categories.map((c) => c.id),
          description: p.description ?? '',
          original_price: String(p.original_price ?? ''),
          price: String(p.price ?? ''),
          stock: String(p.stock ?? ''),
          status: p.status === 'hidden' ? 'hidden' : 'active',
          images: p.images.length ? p.images : [''],
        })
      })
      .catch((e) => {
        toast(e.message, 'error')
        onClose()
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, saving, onClose])

  useEffect(() => {
    if (open && !loading) firstFieldRef.current?.focus()
  }, [open, loading])

  if (!open) return null

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const toggleCategory = (id) => {
    setForm((f) => ({
      ...f,
      category_ids: f.category_ids.includes(id) ? f.category_ids.filter((c) => c !== id) : [...f.category_ids, id],
    }))
    setErrors((e) => (e.category_ids ? { ...e, category_ids: undefined } : e))
  }

  const setImage = (index, value) => {
    setForm((f) => ({ ...f, images: f.images.map((url, i) => (i === index ? value : url)) }))
    setErrors((e) => (e.images ? { ...e, images: undefined } : e))
  }

  const removeImage = (index) =>
    setForm((f) => {
      const next = f.images.filter((_, i) => i !== index)
      return { ...f, images: next.length ? next : [''] }
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    const payload = {
      ...form,
      brand_id: form.brand_id === '' ? null : Number(form.brand_id),
      images: form.images.map((u) => u.trim()).filter(Boolean),
    }
    try {
      const { product: saved } = isEdit ? await api.updateProduct(product.id, payload) : await api.createProduct(payload)
      toast(isEdit ? `Đã cập nhật "${saved.name}"` : `Đã thêm "${saved.name}"`)
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
  const original = Number(form.original_price) || 0
  const sale = form.price === '' ? original : Number(form.price) || 0
  const discount = original > sale && original > 0 ? Math.round(((original - sale) * 100) / original) : 0

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={() => !saving && onClose()} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="relative my-8 w-full max-w-3xl rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <h2 id="product-form-title" className="font-display text-xl font-semibold text-slate-900">
            {isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
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

        {loading ? (
          <p className="flex items-center justify-center gap-2 p-16 text-sm text-slate-500">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tải sản phẩm...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            <Field label="Tên sản phẩm" htmlFor="pf-name" error={errors.name} required>
              <input
                ref={firstFieldRef}
                id="pf-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="VD: Kem Dưỡng Ẩm Cerave Moisturising Cream 50ml"
                aria-invalid={Boolean(errors.name)}
                className={ring('name')}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="SKU" htmlFor="pf-sku" error={errors.sku} hint="Mã quản lý kho, không được trùng">
                <input id="pf-sku" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="VD: LUMI-001" className={ring('sku')} />
              </Field>
              <Field label="Thương hiệu" htmlFor="pf-brand" error={errors.brand_id}>
                <select id="pf-brand" value={form.brand_id} onChange={(e) => set('brand_id', e.target.value)} className={ring('brand_id')}>
                  <option value="">— Không có —</option>
                  {options.brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Danh mục" htmlFor="pf-categories" error={errors.category_ids} hint="Chọn ít nhất một danh mục" required>
              <div
                id="pf-categories"
                role="group"
                aria-invalid={Boolean(errors.category_ids)}
                className={`max-h-40 overflow-y-auto rounded-xl border p-2 ${errors.category_ids ? 'border-blush-400' : 'border-slate-200'}`}
              >
                <div className="grid gap-1 sm:grid-cols-2">
                  {options.categories.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={form.category_ids.includes(c.id)}
                        onChange={() => toggleCategory(c.id)}
                        className="size-4 accent-brand-600"
                      />
                      <span className="truncate text-slate-700">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Giá gốc (₫)" htmlFor="pf-original" error={errors.original_price} required>
                <input
                  id="pf-original"
                  type="number"
                  min="1"
                  value={form.original_price}
                  onChange={(e) => set('original_price', e.target.value)}
                  placeholder="500000"
                  aria-invalid={Boolean(errors.original_price)}
                  className={ring('original_price')}
                />
              </Field>
              <Field label="Giá khuyến mãi (₫)" htmlFor="pf-price" error={errors.price} hint="Bỏ trống = bán đúng giá gốc">
                <input
                  id="pf-price"
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  placeholder="400000"
                  aria-invalid={Boolean(errors.price)}
                  className={ring('price')}
                />
              </Field>
              <Field label="Tồn kho" htmlFor="pf-stock" error={errors.stock} required>
                <input
                  id="pf-stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => set('stock', e.target.value)}
                  placeholder="100"
                  aria-invalid={Boolean(errors.stock)}
                  className={ring('stock')}
                />
              </Field>
            </div>

            {discount > 0 && (
              <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
                Khách thấy giá <strong>{formatPrice(sale)}</strong>, gạch ngang {formatPrice(original)} — giảm{' '}
                <strong>{discount}%</strong>
              </p>
            )}
            {Number(form.stock) === 0 && form.stock !== '' && form.status === 'active' && (
              <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                Tồn kho bằng 0 nên sản phẩm sẽ hiển thị trạng thái <strong>Hết hàng</strong>.
              </p>
            )}

            <Field label="Trạng thái" htmlFor="pf-status" error={errors.status}>
              <select id="pf-status" value={form.status} onChange={(e) => set('status', e.target.value)} className={ring('status')}>
                <option value="active">Đang bán</option>
                <option value="hidden">Ẩn khỏi cửa hàng</option>
              </select>
            </Field>

            <Field label="Mô tả" htmlFor="pf-description" error={errors.description}>
              <textarea
                id="pf-description"
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Công dụng, thành phần, cách dùng..."
                className={`${ring('description')} resize-y`}
              />
            </Field>

            <Field
              label="Ảnh sản phẩm"
              htmlFor="pf-image-0"
              error={errors.images}
              hint={`Dán đường dẫn ảnh (http://... hoặc /images/...). Ảnh đầu tiên là ảnh đại diện. Tối đa ${MAX_IMAGES} ảnh.`}
              required
            >
              <div className="space-y-2">
                {form.images.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {url.trim() ? (
                        <img src={sizedImage(url, 100)} alt="" className="size-full object-contain" />
                      ) : (
                        <ImageOff className="size-4 text-slate-300" aria-hidden />
                      )}
                    </span>
                    <input
                      id={`pf-image-${i}`}
                      value={url}
                      onChange={(e) => setImage(i, e.target.value)}
                      placeholder={i === 0 ? 'Ảnh đại diện — https://...' : 'Ảnh phụ — https://...'}
                      aria-label={i === 0 ? 'Ảnh đại diện' : `Ảnh phụ ${i}`}
                      className={ring('images')}
                    />
                    {form.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label={`Xoá ảnh ${i + 1}`}
                        className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-blush-50 hover:text-blush-600"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
                {form.images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, images: [...f.images, ''] }))}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  >
                    <Plus className="size-3.5" aria-hidden /> Thêm ảnh
                  </button>
                )}
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
                {isEdit ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
