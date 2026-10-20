import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // 'login' | 'register' | null
  const [modalMode, setModalMode] = useState(null)

  useEffect(() => {
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password)
    setUser(res.user)
    return res.user
  }, [])

  const register = useCallback(async (form) => {
    const res = await api.register(form)
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUser(null)
  }, [])

  const value = {
    user,
    loading,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    modalMode,
    openAuth: (mode = 'login') => setModalMode(mode),
    closeAuth: () => setModalMode(null),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
