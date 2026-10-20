import { Loader2, ShoppingBag, Trash2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, sizedImage } from '../../lib/format'
import { useAuth } from '../auth/AuthContext'
import QuantityStepper from '../ui/QuantityStepper'
import { useCart } from './CartContext'

function CartLine({ item }) {
  const { busy, updateQuantity, toggleSelect, removeItem, closeCart } = useCart()
  const pending = busy === item.product_id || busy === 'all'

  return (
    <li className={`flex gap-3 py-4 transition ${pending ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        checked={item.selected && item.available}
        disabled={!item.available || pending}
        onChange={(e) => toggleSelect(item.product_id, e.target.checked)}
        aria-label={`Chọn ${item.name}`}
        className="mt-8 size-4.5 shrink-0 accent-brand-600"
      />
      <Link to={`/products/${item.slug}`} onClick={closeCart} className="shrink-0">
        <img
          src={sizedImage(item.image, 150)}
          alt=""
          className={`size-20 rounded-xl border border-slate-100 bg-white object-contain p-1 ${item.available ? '' : 'opacity-50'}`}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <Link
            to={`/products/${item.slug}`}
            onClick={closeCart}
            className="line-clamp-2 flex-1 text-sm leading-5 text-slate-700 hover:text-brand-700"
          >
            {item.name}
          </Link>
          <button
            type="button"
            onClick={() => removeItem(item.product_id)}
            disabled={pending}
            aria-label={`Xoá ${item.name} khỏi giỏ hàng`}
            className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-blush-50 hover:text-blush-600"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
        {item.sku && <p className="mt-0.5 text-xs text-slate-400">SKU: {item.sku}</p>}
        {!item.available && (
          <p className="mt-1 text-xs font-medium text-blush-600">
            {item.stock === 0 ? 'Sản phẩm đã hết hàng' : `Chỉ còn ${item.stock} sản phẩm, vui lòng giảm số lượng`}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <QuantityStepper
            id={`cart-qty-${item.product_id}`}
            size="sm"
            label={`Số lượng ${item.name}`}
            value={item.quantity}
            max={Math.max(item.max_quantity, 1)}
            disabled={pending || item.stock === 0}
            onChange={(q) => q !== item.quantity && updateQuantity(item.product_id, q)}
          />
          <p className="font-bold text-blush-600">{formatPrice(item.line_total)}</p>
        </div>
      </div>
    </li>
  )
}

export default function CartDrawer() {
  const { cart, isOpen, closeCart, busy, selectAll, checkout } = useCart()
  const { user } = useAuth()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector('button')?.focus()
    const onKey = (e) => e.key === 'Escape' && closeCart()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const selectable = cart.items.filter((i) => i.available)
  const allSelected = selectable.length > 0 && selectable.every((i) => i.selected)
  const someSelected = selectable.some((i) => i.selected)

  return (
    <div className={`fixed inset-0 z-[55] ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        inert={!isOpen}
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="cart-title" className="font-display text-2xl font-semibold text-slate-900">
            Giỏ hàng của tôi {cart.count > 0 && <span className="font-sans text-base font-medium text-slate-400">({cart.count})</span>}
          </h2>
          <button type="button" onClick={closeCart} aria-label="Đóng giỏ hàng" className="grid size-9 place-items-center rounded-full hover:bg-slate-100">
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="grid size-24 place-items-center rounded-full bg-brand-50">
              <ShoppingBag className="size-11 text-brand-400" aria-hidden />
            </span>
            <p className="mt-5 font-display text-xl font-semibold text-slate-900">Giỏ hàng trống</p>
            <p className="mt-1 text-sm text-slate-500">Hãy thêm vài sản phẩm yêu thích vào giỏ nhé!</p>
            <Link
              to="/products"
              onClick={closeCart}
              className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <>
            <label className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-5 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => el && (el.indeterminate = someSelected && !allSelected)}
                disabled={busy === 'all' || selectable.length === 0}
                onChange={(e) => selectAll(e.target.checked)}
                className="size-4.5 accent-brand-600"
              />
              Chọn tất cả ({selectable.length})
            </label>

            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
              {cart.items.map((item) => (
                <CartLine key={item.product_id} item={item} />
              ))}
            </ul>

            <footer className="border-t border-slate-100 bg-white px-5 pt-4 pb-5 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.12)]">
              <dl className="flex items-baseline justify-between">
                <dt className="font-semibold text-slate-800">
                  Tổng tiền <span className="text-sm font-normal text-slate-500">({cart.selected_count} sản phẩm)</span>
                </dt>
                <dd className="text-xl font-bold text-blush-600">{formatPrice(cart.subtotal)}</dd>
              </dl>
              <p className="mt-1 text-xs text-slate-400">Phí vận chuyển được tính ở bước đặt hàng.</p>
              <button
                type="button"
                onClick={checkout}
                disabled={cart.selected_count === 0 || busy === 'checkout'}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300 disabled:shadow-none"
              >
                {busy === 'checkout' && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Tiến hành đặt hàng
              </button>
              {!user && <p className="mt-2 text-center text-xs text-slate-500">Bạn cần đăng nhập để đặt hàng. Giỏ hàng sẽ được giữ nguyên.</p>}
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
