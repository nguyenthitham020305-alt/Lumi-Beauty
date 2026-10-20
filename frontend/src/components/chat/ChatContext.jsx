import { createContext, useCallback, useContext, useState } from 'react'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  // Câu hỏi gửi từ nơi khác trên trang (vd khối "Hỏi Lumi"), ChatWidget sẽ tự gửi đi
  const [pendingQuestion, setPendingQuestion] = useState(null)

  const openChat = useCallback((question) => {
    setIsOpen(true)
    if (question) setPendingQuestion(question)
  }, [])

  return (
    <ChatContext.Provider
      value={{ isOpen, setIsOpen, openChat, pendingQuestion, clearPendingQuestion: () => setPendingQuestion(null) }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => useContext(ChatContext)
