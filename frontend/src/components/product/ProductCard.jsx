import { Loader2, ShoppingCartPlus, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatPrice, sizedImage } from '../../lib/format'
import { useCart } from '../cart/CartContext'

export function RatingStars({ rating, count }) {
  if (rating == null) return <p className="h-4 text-xs text-slate-400">Chưa có đánh giá</p>
  return (
    <p className="flex h-4 items-center gap-1 text-xs text-slate-500" aria-label={`${rating} trên 5 sao, ${count} đánh giá`}>
      <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
      <span className="font-medium text-slate-700">{rating.toFixed(1)}</span>
      <span>({count})</span>
    </p>
  )
}

export default function ProductCard({ product, onClick }) {
  const { addToCart, busy } = useCart()
  const adding = busy === product.id

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card">
      <Link to={`/products/${product.slug}`} onClick={onClick} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-white">
          <img
            src={sizedImage(product.image, 300)}
            alt={product.name}
            loading="lazy"
            className={`size-full object-contain p-3 transition duration-500 group-hover:scale-105 ${
              product.in_stock ? '' : 'opacity-50'
            }`}
          />
          {!product.in_stock && (
            <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-white">
              Tạm hết hàng
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 px-3 pt-1 pb-3.5">
          <p className="truncate text-[11px] font-semibold tracking-wider text-brand-600 uppercase">
            {product.brand ?? 'LUMI Beauty'}
          </p>
          <h3 className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-700 group-hover:text-brand-700">
            {product.name}
          </h3>
          <div className="mt-auto flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold text-blush-600">{formatPrice(product.price)}</span>
          </div>
          <RatingStars rating={product.rating} count={product.review_count} />
        </div>
      </Link>

      <button
        type="button"
        onClick={() => addToCart(product.id)}
        disabled={!product.in_stock || adding}
        aria-label={product.in_stock ? `Thêm ${product.name} vào giỏ hàng` : `${product.name} tạm hết hàng`}
        title={product.in_stock ? 'Thêm vào giỏ hàng' : 'Tạm hết hàng'}
        className="absolute right-3 bottom-3 grid h-8 w-11 place-items-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {adding ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShoppingCartPlus className="size-4" aria-hidden />}
      </button>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 p-3" aria-hidden>
      <div className="aspect-square rounded-xl bg-slate-100" />
      <div className="mt-3 h-3 w-1/3 rounded bg-slate-100" />
      <div className="mt-2 h-4 rounded bg-slate-100" />
      <div className="mt-1 h-4 w-2/3 rounded bg-slate-100" />
      <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
    </div>
  )
}
