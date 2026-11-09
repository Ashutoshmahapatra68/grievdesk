import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { authApi } from '@/api/authApi'
import { userApi } from '@/api/userApi'
import { tokenStore, setUnauthorizedHandler } from '@/api/apiClient'
import i18n from '@/lib/i18n'
import { ROLES } from '@/lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!tokenStore.get())
  const [notice, setNotice] = useState(null)

  const logout = useCallback((reason = null) => {
    tokenStore.clear()
    setUser(null)
    setNotice(reason)
  }, [])

  // Auto logout on 401 token expiration or deactivated account
  useEffect(() => {
    setUnauthorizedHandler(() => logout('sessionExpired'))
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Fresh user profile fetch from database on app load
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false)
      return
    }

    userApi.getMe()
      .then((res) => {
        setUser(res.user)
      })
      .catch(() => {
        tokenStore.clear()
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Sync i18n locale with user's preferred language
  useEffect(() => {
    if (user?.preferred_language) {
      i18n.changeLanguage(user.preferred_language)
    }
  }, [user?.preferred_language])

  const login = useCallback(async (gmail, password) => {
    const data = await authApi.login({ gmail, password })
    tokenStore.set(data.access_token)
    setNotice(null)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (fields) => {
    return authApi.register(fields)
  }, [])

  const refreshUser = useCallback(async () => {
    const res = await userApi.getMe()
    setUser(res.user)
    return res.user
  }, [])

  const isResident = user?.role === ROLES.RESIDENT
  const isCommittee = user?.role === ROLES.COMMITTEE
  const isSecretary = user?.role === ROLES.SECRETARY
  const isStaff = isCommittee || isSecretary

  const value = useMemo(
    () => ({
      user,
      loading,
      notice,
      login,
      register,
      logout,
      refreshUser,
      isResident,
      isCommittee,
      isSecretary,
      isStaff,
    }),
    [user, loading, notice, login, register, logout, refreshUser, isResident, isCommittee, isSecretary, isStaff],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
