import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../ui/Toast'

const CartContext = createContext(null)

const EMPTY_CART = { items: [], count: 0, selected_count: 0, subtotal: 0 }

export function CartProvider({ children }) {
  const { user, loading: authLoading, openAuth, modalMode } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [cart, setCart] = useState(EMPTY_CART)
  const [isOpen, setIsOpen] = useState(false)
  // product_id đang gọi API, hoặc 'all' khi chọn tất cả / 'checkout'
  const [busy, setBusy] = useState(null)
  // Khách bấm "Tiến hành đặt hàng" khi chưa đăng nhập: đăng nhập xong thì đi tiếp
  const checkoutAfterLogin = useRef(false)
  // Tương tự cho nút "Thêm vào giỏ": nhớ sản phẩm đang định thêm
  const addAfterLogin = useRef(null)

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const refresh = useCallback(() => api.cart().then(setCart).catch(() => setCart(EMPTY_CART)), [])

  // Đăng nhập thì backend đã gộp giỏ khách vào giỏ tài khoản; đăng xuất thì về giỏ khách trống
  useEffect(() => {
    if (!authLoading) refresh()
  }, [user?.id, authLoading, refresh])

  const run = useCallback(
    async (key, call) => {
      setBusy(key)
      try {
        setCart(await call())
        return true
      } catch (err) {
        toast(err.message, 'error')
        refresh()
        return false
      } finally {
        setBusy(null)
      }
    },
    [toast, refresh],
  )

  const addToCart = useCallback(
    async (productId, quantity = 1) => {
      // Giỏ hàng luôn gắn với một tài khoản: chưa đăng nhập thì mời đăng nhập
      // trước, rồi tự thêm giúp để khách không phải bấm lại.
      if (!user) {
        addAfterLogin.current = { productId, quantity }
        openAuth('login')
        return false
      }
      const ok = await run(productId, () => api.addToCart(productId, quantity))
      if (ok) {
        toast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`)
        setIsOpen(true)
      }
      return ok
    },
    [run, toast, user, openAuth],
  )

  const updateQuantity = (productId, quantity) => run(productId, () => api.updateCartItem(productId, { quantity }))
  const toggleSelect = (productId, selected) => run(productId, () => api.updateCartItem(productId, { selected }))
  const selectAll = (selected) => run('all', () => api.selectAllCart(selected))
  const removeItem = (productId) => run(productId, () => api.removeCartItem(productId))

  const goToCheckout = useCallback(async () => {
    setBusy('checkout')
    try {
      await api.startCheckout()
      setIsOpen(false)
      navigate('/checkout')
    } catch (err) {
      toast(err.message, 'error')
      refresh()
    } finally {
      setBusy(null)
    }
  }, [navigate, toast, refresh])

  const checkout = () => {
    if (!user) {
      checkoutAfterLogin.current = true
      openAuth('login')
      return
    }
    goToCheckout()
  }

  useEffect(() => {
    if (user && checkoutAfterLogin.current) {
      checkoutAfterLogin.current = false
      goToCheckout()
    }
  }, [user, goToCheckout])

  useEffect(() => {
    if (user && addAfterLogin.current) {
      const { productId, quantity } = addAfterLogin.current
      addAfterLogin.current = null
      addToCart(productId, quantity)
    }
  }, [user, addToCart])

  // Đóng modal mà không đăng nhập thì huỷ các ý định đang chờ
  useEffect(() => {
    if (!modalMode && !user) {
      checkoutAfterLogin.current = false
      addAfterLogin.current = null
    }
  }, [modalMode, user])

  const value = {
    cart,
    count: cart.count,
    busy,
    isOpen,
    openCart,
    closeCart,
    addToCart,
    updateQuantity,
    toggleSelect,
    selectAll,
    removeItem,
    checkout,
    refresh,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
