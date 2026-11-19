import { useEffect, useState } from 'react'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { formatPrice } from '../../lib/format'

export const PRICE_RANGES = [
  { label: 'Dưới 200.000₫', max: 200000 },
  { label: '200.000₫ - 500.000₫', min: 200000, max: 500000 },
  { label: '500.000₫ - 1.000.000₫', min: 500000, max: 1000000 },
  { label: 'Trên 1.000.000₫', min: 1000000 },
]

function FilterGroup({ title, children }) {
  return (
    <fieldset className="min-w-0 border-b border-slate-100 py-5 first:pt-0 last:border-0">
      <legend className="float-left mb-3 w-full text-sm font-semibold text-slate-800">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}

// ?brand=cosrx,bioderma
export const parseBrands = (value) => (value ? value.split(',').filter(Boolean) : [])

const normalize = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

function BrandFilter({ category, selected, onChange, idPrefix }) {
  // Chỉ liệt kê thương hiệu có sản phẩm trong danh mục đang xem
  const { data, loading } = useFetch(() => api.brands(category), [category])
  const [term, setTerm] = useState('')
  const brands = data?.items ?? []

  const toggle = (slug) => {
    const next = selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]
    onChange({ brand: next.length ? next.join(',') : undefined })
  }

  const matched = brands.filter((b) => normalize(b.name).includes(normalize(term.trim())))
  // Thương hiệu đã chọn luôn nằm đầu danh sách để không bị khuất khi cuộn
  const ordered = [...matched.filter((b) => selected.includes(b.slug)), ...matched.filter((b) => !selected.includes(b.slug))]

  return (
    <div>
      <label htmlFor={`${idPrefix}-brand-search`} className="sr-only">
        Tìm thương hiệu
      </label>
      <input
        id={`${idPrefix}-brand-search`}
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={`Tìm trong ${brands.length || ''} thương hiệu`}
        className="mb-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500"
      />
      {loading && !data ? (
        <p className="py-2 text-sm text-slate-400">Đang tải...</p>
      ) : ordered.length === 0 ? (
        <p className="py-2 text-sm text-slate-400">Không có thương hiệu phù hợp</p>
      ) : (
        <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
          {ordered.map((b) => (
            <li key={b.slug}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selected.includes(b.slug)}
                  onChange={() => toggle(b.slug)}
                  className="size-4 shrink-0 accent-brand-600"
                />
                <span className={`min-w-0 flex-1 truncate ${selected.includes(b.slug) ? 'font-semibold text-brand-700' : ''}`}>{b.name}</span>
                <span className="text-xs text-slate-400">{b.product_count}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {selected.length > 0 && (
        <button type="button" onClick={() => onChange({ brand: undefined })} className="mt-2 text-xs text-slate-500 hover:text-blush-600 hover:underline">
          Bỏ chọn {selected.length} thương hiệu
        </button>
      )}
    </div>
  )
}

/**
 * filters: { q, category, brand, min_price, max_price, in_stock } lấy từ URL
 * onChange(patch) — gộp patch vào URL, về trang 1
 */
export default function ProductFilters({ filters, onChange, idPrefix = 'side' }) {
  const [minInput, setMinInput] = useState(filters.min_price ?? '')
  const [maxInput, setMaxInput] = useState(filters.max_price ?? '')
  const [priceError, setPriceError] = useState('')

  // Đồng bộ lại khi URL đổi từ bên ngoài (nút Xoá bộ lọc, liên kết từ trang khác)
  useEffect(() => {
    setMinInput(filters.min_price ?? '')
    setMaxInput(filters.max_price ?? '')
  }, [filters.min_price, filters.max_price])

  const applyCustomPrice = (e) => {
    e.preventDefault()
    const min = minInput === '' ? '' : Number(minInput)
    const max = maxInput === '' ? '' : Number(maxInput)
    if ((min !== '' && (!Number.isInteger(min) || min < 0)) || (max !== '' && (!Number.isInteger(max) || max < 0))) {
      return setPriceError('Giá phải là số nguyên không âm')
    }
    if (min !== '' && max !== '' && min > max) return setPriceError('Giá từ phải nhỏ hơn giá đến')
    setPriceError('')
    onChange({ min_price: min === '' ? undefined : String(min), max_price: max === '' ? undefined : String(max) })
  }

  const isRangeActive = (r) =>
    (filters.min_price ?? '') === (r.min ? String(r.min) : '') && (filters.max_price ?? '') === (r.max ? String(r.max) : '')

  return (
    <div>
      <FilterGroup title="Thương hiệu">
        <BrandFilter category={filters.category} selected={parseBrands(filters.brand)} onChange={onChange} idPrefix={idPrefix} />
      </FilterGroup>

      <FilterGroup title="Khoảng giá">
        <div className="space-y-1.5">
          {PRICE_RANGES.map((r) => {
            const active = isRangeActive(r)
            return (
              <label key={r.label} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                <input
                  type="radio"
                  name={`${idPrefix}-price-range`}
                  checked={active}
                  onChange={() => onChange({ min_price: r.min ? String(r.min) : undefined, max_price: r.max ? String(r.max) : undefined })}
                  className="size-4 accent-brand-600"
                />
                {r.label}
              </label>
            )
          })}
        </div>
        <form onSubmit={applyCustomPrice} className="mt-4">
          <div className="flex items-center gap-2">
            <label htmlFor={`${idPrefix}-min`} className="sr-only">
              Giá từ
            </label>
            <input
              id={`${idPrefix}-min`}
              inputMode="numeric"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Từ ₫"
              className="h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500"
            />
            <span className="text-slate-300">-</span>
            <label htmlFor={`${idPrefix}-max`} className="sr-only">
              Giá đến
            </label>
            <input
              id={`${idPrefix}-max`}
              inputMode="numeric"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Đến ₫"
              className="h-9 w-full min-w-0 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-500"
            />
          </div>
          {priceError && <p className="mt-1.5 text-xs text-blush-600">{priceError}</p>}
          <button type="submit" className="mt-2.5 h-9 w-full rounded-lg bg-brand-600 text-sm font-semibold text-white hover:bg-brand-700">
            Áp dụng
          </button>
        </form>
      </FilterGroup>

      <FilterGroup title="Tình trạng">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={filters.in_stock === '1'}
            onChange={(e) => onChange({ in_stock: e.target.checked ? '1' : undefined })}
            className="size-4 accent-brand-600"
          />
          Chỉ hiện sản phẩm còn hàng
        </label>
      </FilterGroup>
    </div>
  )
}

export function describePrice(min, max) {
  if (min && max) return `${formatPrice(Number(min))} - ${formatPrice(Number(max))}`
  if (min) return `Từ ${formatPrice(Number(min))}`
  return `Dưới ${formatPrice(Number(max))}`
}
