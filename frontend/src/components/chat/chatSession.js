/** Lưu trữ hội thoại chatbot ở phía trình duyệt, kèm luật đổi tài khoản.
 *
 * Hội thoại nằm trong sessionStorage nên KHÔNG tự mất khi đăng xuất: nếu không
 * xử lý, người đăng nhập sau đọc được hội thoại của người trước trên cùng máy.
 * Máy chủ đã chặn đọc/ghi chéo phiên, phần thiếu chỉ là hiển thị.
 */
const SESSION_KEY = 'lumi_chat_session'

/** userId = chủ của hội thoại đang lưu. null = khách chưa đăng nhập. */
export const EMPTY_SESSION = { id: null, messages: [], context: [], userId: null }

export function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) ?? { ...EMPTY_SESSION }
  } catch {
    return { ...EMPTY_SESSION }
  }
}

export function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Trình duyệt chặn storage: chat vẫn chạy, chỉ mất lịch sử khi tải lại trang
  }
}

/**
 * Hội thoại nào được giữ lại khi người đang đăng nhập thay đổi.
 *
 * Chatbot chỉ dành cho người đã đăng nhập nên hội thoại luôn có chủ. Hễ chủ
 * không khớp với người đang đăng nhập — đăng xuất, đổi tài khoản, hay dữ liệu
 * cũ không ghi chủ — thì xoá sạch, để người sau không đọc được của người trước.
 *
 * @param {object} session  hội thoại đang có
 * @param {number|null} userId  id người đang đăng nhập, null nếu chưa đăng nhập
 */
export function sessionForUser(session, userId) {
  return session.userId === userId ? session : { ...EMPTY_SESSION, userId }
}
