import { Loader2, ShieldCheck, Star } from 'lucide-react'
import { useState } from 'react'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../ui/Toast'

function Stars({ value, size = 'size-4' }) {
  return (
    <span className="flex" aria-label={`${value} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} aria-hidden />
      ))}
    </span>
  )
}

function ReviewForm({ productId, onCreated }) {
  const toast = useToast()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) return setError('Vui lòng chọn số sao')
    setSending(true)
    setError('')
    try {
      await api.createReview(productId, rating, comment.trim())
      toast('Cảm ơn bạn đã đánh giá sản phẩm!')
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
      <p className="font-semibold text-slate-800">Viết đánh giá của bạn</p>
      <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Chọn số sao" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i}
            aria-label={`${i} sao`}
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            className="rounded p-0.5"
          >
            <Star className={`size-7 transition ${i <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} aria-hidden />
          </button>
        ))}
      </div>
      <label htmlFor="review-comment" className="sr-only">
        Nhận xét
      </label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Chia sẻ cảm nhận của bạn về sản phẩm (không bắt buộc)"
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
      />
      {error && <p className="mt-1 text-sm text-blush-600">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="mt-3 flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {sending && <Loader2 className="size-4 animate-spin" aria-hidden />} Gửi đánh giá
      </button>
    </form>
  )
}

function ReviewNotice({ reason }) {
  const { openAuth } = useAuth()
  if (reason === 'login_required') {
    return (
      <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <button type="button" onClick={() => openAuth('login')} className="font-semibold text-brand-600 hover:underline">
          Đăng nhập
        </button>{' '}
        để đánh giá sản phẩm bạn đã mua.
      </p>
    )
  }
  const text = {
    not_purchased: 'Chỉ khách hàng đã mua và nhận sản phẩm này mới có thể viết đánh giá.',
    already_reviewed: 'Bạn đã đánh giá sản phẩm này. Cảm ơn bạn đã chia sẻ!',
  }[reason]
  if (!text) return null
  return (
    <p className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
      <ShieldCheck className="size-5 shrink-0 text-brand-600" aria-hidden /> {text}
    </p>
  )
}

export default function ReviewSection({ productId, onRatingChange }) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const { data, loading, error } = useFetch(() => api.productReviews(productId, page), [productId, page, user?.id, version])

  if (loading && !data) return <p className="text-sm text-slate-500">Đang tải đánh giá...</p>
  if (error) return <p className="text-sm text-blush-600">Không tải được đánh giá.</p>

  const { summary, items, pagination } = data
  const userReviewTotal = Object.values(summary.distribution).reduce((a, b) => a + b, 0)

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div className="rounded-2xl border border-slate-100 p-5 text-center lg:self-start">
        <p className="text-5xl font-bold text-slate-900">{summary.rating != null ? summary.rating.toFixed(1) : '—'}</p>
        <div className="mt-2 flex justify-center">
          <Stars value={summary.rating ?? 0} size="size-5" />
        </div>
        <p className="mt-1 text-sm text-slate-500">{summary.review_count} lượt đánh giá</p>
        <ul className="mt-5 space-y-1.5 text-left">
          {Object.entries(summary.distribution)
            .sort(([a], [b]) => b - a)
            .map(([star, n]) => (
            <li key={star} className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-8">{star} ★</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full bg-amber-400" style={{ width: `${userReviewTotal ? (n / userReviewTotal) * 100 : 0}%` }} />
              </span>
              <span className="w-6 text-right">{n}</span>
            </li>
          ))}
        </ul>
        {summary.review_count > userReviewTotal && (
          <p className="mt-4 text-xs text-slate-400">Điểm tổng hợp gồm cả đánh giá gốc từ nhà phân phối.</p>
        )}
      </div>

      <div className="space-y-5">
        {data.can_review ? (
          <ReviewForm
            productId={productId}
            onCreated={() => {
              setPage(1)
              setVersion((v) => v + 1)
              onRatingChange?.()
            }}
          />
        ) : (
          <ReviewNotice reason={data.cannot_review_reason} />
        )}

        <h3 className="font-semibold text-slate-800">Nhận xét từ khách hàng LUMI ({pagination.total})</h3>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
            Chưa có nhận xét nào cho sản phẩm này.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => (
              <li key={r.id} className="py-4 first:pt-0">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {r.user_name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{r.user_name}</p>
                    <div className="flex items-center gap-2">
                      <Stars value={r.rating} size="size-3.5" />
                      <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
                      <span className="flex items-center gap-1 text-xs text-brand-600">
                        <ShieldCheck className="size-3.5" aria-hidden /> Đã mua hàng
                      </span>
                    </div>
                  </div>
                </div>
                {r.comment && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-600">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border border-slate-200 px-4 py-1.5 disabled:opacity-40">
              Trước
            </button>
            <span className="text-slate-500">
              {page} / {pagination.pages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.pages}
              onClick={() => setPage(page + 1)}
              className="rounded-full border border-slate-200 px-4 py-1.5 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
