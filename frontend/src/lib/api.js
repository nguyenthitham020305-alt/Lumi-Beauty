async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(data.error || `Lỗi máy chủ (${res.status})`)
    error.status = res.status
    error.fieldErrors = data.errors ?? {}
    throw error
  }
  return data
}

const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) })
const patch = (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) })

let categoriesPromise = null

export const api = {
  categories: () => {
    categoriesPromise ??= request('/categories').catch((err) => {
      categoriesPromise = null
      throw err
    })
    return categoriesPromise
  },
  brands: (category) => request(`/brands${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  featuredBrands: (limit = 12) => request(`/brands/featured?limit=${limit}`),
  products: ({ sort = 'bestseller', category, limit = 10, inStock } = {}) => {
    const params = new URLSearchParams({ sort, limit })
    if (category) params.set('category', category)
    if (inStock) params.set('in_stock', '1')
    return request(`/products?${params}`)
  },
  chat: (message, sessionId) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId }),
    }),
  trackRecommendationClick: (recoId) =>
    request(`/chat/recommendations/${recoId}/click`, { method: 'POST' }),

  /** params: { q, category, brand, min_price, max_price, in_stock, sort, page, per_page } */
  productList: (params) => {
    const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    return request(`/products?${search}`)
  },
  productDetail: (slug) => request(`/products/${encodeURIComponent(slug)}`),
  productReviews: (productId, page = 1) => request(`/products/${productId}/reviews?page=${page}`),
  createReview: (productId, rating, comment) => post(`/products/${productId}/reviews`, { rating, comment }),

  cart: () => request('/cart'),
  addToCart: (productId, quantity) => post('/cart/items', { product_id: productId, quantity }),
  /** patch: { quantity?, selected? } */
  updateCartItem: (productId, patch) => request(`/cart/items/${productId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  selectAllCart: (selected) => request('/cart/select-all', { method: 'PATCH', body: JSON.stringify({ selected }) }),
  removeCartItem: (productId) => request(`/cart/items/${productId}`, { method: 'DELETE' }),
  startCheckout: () => post('/cart/checkout'),

  provinces: () => request('/address/provinces'),
  wards: (provinceCode) => request(`/address/provinces/${provinceCode}/wards`),
  checkoutSummary: () => request('/checkout/summary'),
  createOrder: (form) => post('/orders', form),
  myOrders: () => request('/orders'),
  order: (code) => request(`/orders/${encodeURIComponent(code)}`),

  me: () => request('/auth/me'),
  login: (email, password) => post('/auth/login', { email, password }),
  register: (form) => post('/auth/register', form),
  logout: () => post('/auth/logout'),

  /** params: { range: 7d|30d|90d|month|custom, from, to } */
  adminStats: (params) => {
    const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    return request(`/admin/stats?${search}`)
  },
  /** params: { q, status, payment_method, sort, page } */
  adminOrders: (params) => {
    const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    return request(`/admin/orders?${search}`)
  },
  adminOrder: (code) => request(`/admin/orders/${encodeURIComponent(code)}`),
  updateOrderStatus: (code, status, reason) => patch(`/admin/orders/${encodeURIComponent(code)}/status`, { status, reason }),
  updatePaymentStatus: (code, status) => patch(`/admin/orders/${encodeURIComponent(code)}/payment`, { status }),

  /** params: { q, category, status, sort, page } */
  adminProducts: (params) => {
    const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    return request(`/admin/products?${search}`)
  },
  adminProduct: (id) => request(`/admin/products/${id}`),
  adminProductFormOptions: () => request('/admin/products/form-options'),
  createProduct: (form) => post('/admin/products', form),
  updateProduct: (id, form) => request(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(form) }),
  deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),

  /** params: { q, status, sort, page } */
  adminCustomers: (params) => {
    const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    return request(`/admin/customers?${search}`)
  },
  adminCustomer: (id) => request(`/admin/customers/${id}`),
  setCustomerActive: (id, isActive) => patch(`/admin/customers/${id}/status`, { is_active: isActive }),

  adminCategories: (q) => request(`/admin/categories${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createCategory: (form) => post('/admin/categories', form),
  updateCategory: (id, form) => request(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(form) }),
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),
}
