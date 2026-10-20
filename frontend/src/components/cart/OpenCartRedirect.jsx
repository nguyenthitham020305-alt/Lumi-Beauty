import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useCart } from './CartContext'

/** Giỏ hàng là drawer, không còn trang riêng: link cũ /gio-hang về trang chủ và mở drawer */
export default function OpenCartRedirect() {
  const { openCart } = useCart()
  useEffect(() => openCart(), [openCart])
  return <Navigate to="/" replace />
}
