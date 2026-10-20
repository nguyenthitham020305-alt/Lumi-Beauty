import { MessageCircleHeart, Sparkles } from 'lucide-react'
import { useChat } from '../chat/ChatContext'

export const SAMPLE_QUESTIONS = [
  'Da dầu mụn nên dùng sữa rửa mặt nào?',
  'Kem chống nắng cho da nhạy cảm',
  'Serum dưỡng sáng da dưới 500K',
  'Son kem lì lâu trôi màu đỏ',
]

export default function AiPromo() {
  const { openChat } = useChat()

  return (
    <section className="container-page mt-14" aria-labelledby="ai-promo-heading">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-50 via-white to-blush-50 p-6 ring-1 ring-brand-100 md:p-10">
        <img src="/images/logo-mark.png" alt="" className="pointer-events-none absolute -top-6 right-4 hidden size-56 opacity-40 md:block" />
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-600">
            <Sparkles className="size-4" aria-hidden /> Trợ lý làm đẹp AI
          </p>
          <h2 id="ai-promo-heading" className="mt-2 font-display text-2xl font-semibold text-slate-900 md:text-3xl">
            Chưa biết chọn gì? Hỏi Lumi nhé!
          </h2>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            Kể cho Lumi về làn da và mong muốn của bạn, Lumi sẽ gợi ý sản phẩm phù hợp từ hơn 1.400 sản phẩm chính hãng.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => openChat(q)}
                className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm text-brand-700 transition hover:border-brand-500 hover:bg-brand-50"
              >
                {q}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openChat()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700"
          >
            <MessageCircleHeart className="size-5" aria-hidden /> Bắt đầu tư vấn
          </button>
        </div>
      </div>
    </section>
  )
}
