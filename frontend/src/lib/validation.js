// Giữ khớp với backend/app/services/auth.py; backend vẫn kiểm tra lại
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/
export const PHONE_RE = /^(0|\+84)[35789]\d{8}$/

export const normalizePhone = (phone) => phone.replace(/[\s.-]/g, '')
