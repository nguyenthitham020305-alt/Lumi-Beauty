import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const { user, openAuth, modalMode } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  // Câu hỏi gửi từ nơi khác trên trang (vd khối "Hỏi Lumi"), ChatWidget sẽ tự gửi đi
  const [pendingQuestion, setPendingQuestion] = useState(null)
  // Khách bấm hỏi Lumi khi chưa đăng nhập: đăng nhập xong thì mở chat tiếp
  const openAfterLogin = useRef(null)

  /**
   * Mọi lối vào chatbot đều đi qua đây (nút "Tư vấn AI" trên thanh menu, nút tròn
   * góc màn hình, nút hỏi ở trang sản phẩm, khối gợi ý câu hỏi ở trang chủ), nên
   * chỉ cần chặn một chỗ là chặn được tất cả.
   */
  const openChat = useCallback(
    (question) => {
      if (!user) {
        openAfterLogin.current = { question: question ?? null }
        openAuth('login')
        return
      }
      setIsOpen(true)
      if (question) setPendingQuestion(question)
    },
    [user, openAuth],
  )

  // Đăng nhập xong thì mở chat giúp, kèm câu hỏi khách đang định hỏi
  useEffect(() => {
    if (user && openAfterLogin.current) {
      const { question } = openAfterLogin.current
      openAfterLogin.current = null
      setIsOpen(true)
      if (question) setPendingQuestion(question)
    }
  }, [user])

  // Đóng cửa sổ đăng nhập mà không đăng nhập thì bỏ ý định đang chờ
  useEffect(() => {
    if (!modalMode && !user) openAfterLogin.current = null
  }, [modalMode, user])

  // Đăng xuất giữa chừng thì đóng khung chat lại
  useEffect(() => {
    if (!user) setIsOpen(false)
  }, [user])

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        openChat,
        canChat: Boolean(user),
        pendingQuestion,
        clearPendingQuestion: () => setPendingQuestion(null),
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => useContext(ChatContext)
