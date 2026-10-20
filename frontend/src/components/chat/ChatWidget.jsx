import { Loader2, MessageCircleHeart, SendHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { formatPrice, sizedImage } from '../../lib/format'
import { SAMPLE_QUESTIONS } from '../home/AiPromo'
import { useChat } from './ChatContext'

const SESSION_KEY = 'lumi_chat_session'
const WELCOME = {
  sender: 'bot',
  content: 'Chào bạn! Mình là Lumi, trợ lý làm đẹp của LUMI Beauty. Bạn đang tìm sản phẩm gì, hoặc làn da bạn đang gặp vấn đề gì?',
}

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) ?? { id: null, messages: [] }
  } catch {
    return { id: null, messages: [] }
  }
}

function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Trình duyệt chặn storage: chat vẫn chạy, chỉ mất lịch sử khi tải lại trang
  }
}

function RecommendedProduct({ product }) {
  return (
    <Link
      to={`/products/${product.slug}`}
      onClick={() => api.trackRecommendationClick(product.reco_id).catch(() => {})}
      className="flex gap-3 rounded-xl border border-slate-100 bg-white p-2 transition hover:border-brand-300"
    >
      <img src={sizedImage(product.image, 150)} alt="" className="size-16 shrink-0 rounded-lg object-contain" />
      <span className="min-w-0 text-xs">
        <span className="line-clamp-2 font-medium text-slate-700">{product.name}</span>
        <span className="mt-0.5 block font-bold text-blush-600">{formatPrice(product.price)}</span>
        {product.reason && <span className="mt-0.5 line-clamp-1 block text-brand-600">✓ {product.reason}</span>}
      </span>
    </Link>
  )
}

export default function ChatWidget() {
  const { isOpen, setIsOpen, pendingQuestion, clearPendingQuestion } = useChat()
  const [session, setSession] = useState(readSession)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  const messages = [WELCOME, ...session.messages]

  useEffect(() => saveSession(session), [session])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [session.messages.length, sending, isOpen])

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && setIsOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, setIsOpen])

  const send = useCallback(
    async (text) => {
      const message = text.trim()
      if (!message || sending) return
      setInput('')
      setSending(true)
      setSession((s) => ({ ...s, messages: [...s.messages, { sender: 'user', content: message }] }))
      try {
        const res = await api.chat(message, session.id)
        setSession((s) => ({
          id: res.session_id,
          messages: [...s.messages, { sender: 'bot', content: res.reply, products: res.products }],
        }))
      } catch (err) {
        setSession((s) => ({
          ...s,
          messages: [...s.messages, { sender: 'bot', content: `Xin lỗi, Lumi đang gặp sự cố (${err.message}). Bạn thử lại sau nhé!`, isError: true }],
        }))
      } finally {
        setSending(false)
      }
    },
    [sending, session.id],
  )

  useEffect(() => {
    if (isOpen && pendingQuestion) {
      send(pendingQuestion)
      clearPendingQuestion()
    }
  }, [isOpen, pendingQuestion, send, clearPendingQuestion])

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Đóng trợ lý Lumi' : 'Mở trợ lý tư vấn Lumi'}
        aria-expanded={isOpen}
        className="fixed right-5 bottom-5 z-50 grid size-14 place-items-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-700/30 transition hover:scale-105 hover:bg-brand-700"
      >
        {isOpen ? <X className="size-6" aria-hidden /> : <MessageCircleHeart className="size-7" aria-hidden />}
        {!isOpen && <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand-400/40" aria-hidden />}
      </button>

      {isOpen && (
        <section
          role="dialog"
          aria-label="Trợ lý tư vấn Lumi"
          className="fixed inset-x-3 bottom-24 z-50 flex h-[min(600px,calc(100vh-8rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 sm:inset-x-auto sm:right-5 sm:w-[390px]"
        >
          <header className="flex items-center gap-3 bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-white">
            <img src="/images/logo-mark.png" alt="" className="size-10 rounded-full bg-white p-1" />
            <div className="flex-1">
              <p className="font-semibold">Lumi - Trợ lý làm đẹp</p>
              <p className="flex items-center gap-1.5 text-xs text-brand-100">
                <span className="size-2 rounded-full bg-emerald-300" aria-hidden /> Trực tuyến · Tư vấn bằng AI
              </p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Đóng" className="rounded-full p-1.5 hover:bg-white/15">
              <X className="size-5" aria-hidden />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={m.sender === 'user' ? 'flex justify-end' : 'flex gap-2'}>
                {m.sender === 'bot' && (
                  <img src="/images/logo-mark.png" alt="" className="mt-0.5 size-7 shrink-0 rounded-full bg-white p-0.5 ring-1 ring-brand-100" />
                )}
                <div className={`max-w-[85%] ${m.sender === 'user' ? '' : 'space-y-2'}`}>
                  <p
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line ${
                      m.sender === 'user'
                        ? 'rounded-br-md bg-brand-600 text-white'
                        : m.isError
                          ? 'rounded-tl-md bg-blush-50 text-blush-600'
                          : 'rounded-tl-md bg-white text-slate-700 shadow-sm'
                    }`}
                  >
                    {m.content}
                  </p>
                  {m.products?.map((p) => <RecommendedProduct key={p.reco_id} product={p} />)}
                </div>
              </div>
            ))}

            {session.messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pl-9">
                {SAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs text-brand-700 hover:bg-brand-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {sending && (
              <div className="flex items-center gap-2 pl-9 text-xs text-slate-500">
                <Loader2 className="size-4 animate-spin text-brand-600" aria-hidden /> Lumi đang tìm sản phẩm cho bạn...
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-3"
          >
            <label htmlFor="chat-input" className="sr-only">
              Nhập câu hỏi cho Lumi
            </label>
            <input
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Hỏi Lumi về sản phẩm, loại da..."
              className="h-11 min-w-0 flex-1 rounded-full bg-slate-100 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-200"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Gửi"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendHorizontal className="size-5" aria-hidden />
            </button>
          </form>
        </section>
      )}
    </>
  )
}
