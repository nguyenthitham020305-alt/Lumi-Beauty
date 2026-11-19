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
 * - Khách vãng lai rồi đăng nhập (chủ đang là null): GIỮ, vì máy chủ gắn luôn
 *   phiên chat đó cho tài khoản vừa đăng nhập.
 * - Đăng xuất, hoặc đổi sang tài khoản khác: XOÁ sạch hội thoại của người trước.
 *
 * @param {object} session  hội thoại đang có
 * @param {number|null} userId  id người đang đăng nhập, null nếu chưa đăng nhập
 */
export function sessionForUser(session, userId) {
  const owner = session.userId

  // Dữ liệu còn lại từ bản TRƯỚC khi có trường userId: không biết của ai.
  // Chưa đăng nhập thì coi là của khách vãng lai; đã có người đăng nhập thì
  // xoá cho chắc, vì rất có thể là hội thoại của tài khoản đăng nhập trước đó.
  if (owner === undefined) {
    return userId === null ? { ...session, userId: null } : { ...EMPTY_SESSION, userId }
  }

  // Khách vãng lai rồi đăng nhập: giữ, máy chủ gắn phiên đó cho tài khoản mới.
  if (owner === null) return userId === null ? session : { ...session, userId }

  // Đăng xuất hoặc đổi tài khoản: xoá sạch hội thoại của người trước.
  return owner === userId ? session : { ...EMPTY_SESSION, userId }
}
