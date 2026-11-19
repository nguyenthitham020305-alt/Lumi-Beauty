import { ArrowLeft, BadgeCheck, Loader2, MessageCircleHeart, RefreshCcw, ShoppingBag, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCart } from '../components/cart/CartContext'
import { useChat } from '../components/chat/ChatContext'
import SectionHeading from '../components/home/SectionHeading'
import ImageGallery from '../components/product/ImageGallery'
import ProductCard, { RatingStars } from '../components/product/ProductCard'
import ReviewSection from '../components/product/ReviewSection'
import Breadcrumb from '../components/ui/Breadcrumb'
import QuantityStepper from '../components/ui/QuantityStepper'
import { useFetch } from '../hooks/useFetch'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'

const MAX_QUANTITY = 99
const DESCRIPTION_PREVIEW = 600

// Mô tả crawl về là một đoạn liền, các ý ngăn bởi " - " rồi chữ hoa ("- Công dụng: ... - Hiệu ứng: ...")
function descriptionParts(text) {
  return (text ?? '')
    .split(/\s+-\s+(?=\p{Lu})/u)
    .map((s) => s.replace(/^-\s*/, '').trim())
    .filter(Boolean)
}

function Description({ text }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return <p className="text-sm text-slate-500">Sản phẩm chưa có mô tả.</p>
  const long = text.length > DESCRIPTION_PREVIEW
  const parts = descriptionParts(expanded || !long ? text : `${text.slice(0, DESCRIPTION_PREVIEW)}…`)

  return (
    <div>
      <div className="space-y-2 text-sm leading-relaxed text-slate-600">
        {parts.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {long && (
        <button type="button" onClick={() => setExpanded(!expanded)} className="mt-3 text-sm font-semibold text-brand-600 hover:underline">
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="container-page grid animate-pulse gap-8 py-8 md:grid-cols-2" aria-hidden>
      <div className="aspect-square rounded-3xl bg-slate-100" />
      <div className="space-y-4">
        <div className="h-4 w-24 rounded bg-slate-100" />
        <div className="h-8 rounded bg-slate-100" />
        <div className="h-8 w-2/3 rounded bg-slate-100" />
        <div className="h-10 w-1/2 rounded bg-slate-100" />
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { openChat } = useChat()
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [version, setVersion] = useState(0)
  const { data, loading, error } = useFetch(() => api.productDetail(slug), [slug, version])

  useEffect(() => {
    setQuantity(1)
    window.scrollTo({ top: 0 })
  }, [slug])

  useEffect(() => {
    if (data?.product) document.title = `${data.product.name} | LUMI Beauty`
    return () => {
      document.title = 'LUMI Beauty - Mỹ phẩm chính hãng'
    }
  }, [data])

  // Vào thẳng từ link ngoài thì không có trang trước trong lịch sử của app
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/products'))

  if (loading && !data) return <DetailSkeleton />
  if (error) {
    return (
      <div className="container-page py-20 text-center">
        <img src="/images/logo-mark.png" alt="" className="mx-auto size-28" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-slate-900">
          {error.status === 404 ? 'Không tìm thấy sản phẩm' : 'Không tải được sản phẩm'}
        </h1>
        <p className="mt-2 text-slate-500">{error.status === 404 ? 'Sản phẩm có thể đã ngừng kinh doanh.' : error.message}</p>
        <Link to="/products" className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">
          Xem sản phẩm khác
        </Link>
      </div>
    )
  }

  const { product, related } = data
  const category = product.categories[0]
  const purchasable = product.in_stock && product.status === 'active'
  const maxQuantity = Math.min(product.stock, MAX_QUANTITY)

  const handleAdd = async () => {
    setAdding(true)
    await addToCart(product.id, quantity)
    setAdding(false)
  }

  return (
    <div className="container-page py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb
          items={[
            { label: 'Trang chủ', to: '/' },
            { label: 'Sản phẩm', to: '/products' },
            ...(category ? [{ label: category.name, to: `/products?category=${category.slug}` }] : []),
            { label: product.name },
          ]}
        />
        <button type="button" onClick={goBack} className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="size-4" aria-hidden /> Quay lại
        </button>
      </div>

      <div className="mt-5 grid gap-8 md:grid-cols-2 lg:gap-12">
        <ImageGallery images={product.images} name={product.name} />

        <div className="min-w-0">
          {product.brand && (
            <Link
              to={`/products?brand=${product.brand_slug}`}
              className="text-sm font-semibold tracking-wider text-brand-600 uppercase hover:text-brand-700"
            >
              {product.brand}
            </Link>
          )}
          <h1 className="mt-1.5 text-2xl leading-snug font-semibold text-slate-900 md:text-[28px]">{product.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <RatingStars rating={product.rating} count={product.review_count} />
            {product.sku && <span>SKU: {product.sku}</span>}
          </div>

          <div className="mt-5 rounded-2xl bg-gradient-to-r from-blush-50 to-white p-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-blush-600">{formatPrice(product.price)}</span>
            </div>
          </div>

          <p className={`mt-5 text-sm font-medium ${purchasable ? 'text-brand-700' : 'text-blush-600'}`}>
            {purchasable ? `Còn hàng · ${product.stock} sản phẩm có sẵn` : 'Tạm hết hàng'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} max={maxQuantity} onChange={setQuantity} disabled={!purchasable} />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!purchasable || adding}
              className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-sm whitespace-nowrap sm:px-8 font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:flex-none"
            >
              {adding ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
              {purchasable ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => openChat(`Tư vấn giúp mình về sản phẩm "${product.name}", có hợp với da mình không?`)}
            className="mt-3 flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <MessageCircleHeart className="size-5" aria-hidden /> Hỏi Lumi AI về sản phẩm này
          </button>

          <ul className="mt-6 grid gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600 sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <BadgeCheck className="size-5 text-brand-600" aria-hidden /> Chính hãng 100%
            </li>
            <li className="flex items-center gap-2">
              <Truck className="size-5 text-brand-600" aria-hidden /> Freeship từ 499K
            </li>
            <li className="flex items-center gap-2">
              <RefreshCcw className="size-5 text-brand-600" aria-hidden /> Đổi trả trong 7 ngày
            </li>
          </ul>
        </div>
      </div>

      <section className="mt-12 rounded-3xl border border-slate-100 p-5 md:p-8" aria-labelledby="desc-heading">
        <h2 id="desc-heading" className="mb-4 font-display text-xl font-semibold text-slate-900">
          Mô tả sản phẩm
        </h2>
        <Description text={product.description} />
      </section>

      <section className="mt-8 rounded-3xl border border-slate-100 p-5 md:p-8" aria-labelledby="review-heading">
        <h2 id="review-heading" className="mb-5 font-display text-xl font-semibold text-slate-900">
          Đánh giá sản phẩm
        </h2>
        <ReviewSection productId={product.id} onRatingChange={() => setVersion((v) => v + 1)} />
      </section>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related-heading">
          <SectionHeading
            title={<span id="related-heading">Sản phẩm tương tự</span>}
            to={category ? `/products?category=${category.slug}` : '/products'}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
