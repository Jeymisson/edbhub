import { createContext, useEffect, useState, type ReactNode } from 'react'
import { api, type ApiError } from '@/lib/api'

export interface Admin {
  id: string
  email: string
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; admin: Admin }
  | { status: 'unauthenticated' }

export interface AuthContextValue {
  state: AuthState
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    api
      .get<Admin>('/auth/me')
      .then((admin) => {
        if (!cancelled) setState({ status: 'authenticated', admin })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unauthenticated' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function login(email: string, password: string) {
    await api.post('/auth/login', { email, password })
    const admin = await api.get<Admin>('/auth/me')
    setState({ status: 'authenticated', admin })
  }

  async function logout() {
    try {
      await api.post('/auth/logout', {})
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr.status !== 401) throw err
    }
    setState({ status: 'unauthenticated' })
  }

  return <AuthContext value={{ state, login, logout }}>{children}</AuthContext>
}
