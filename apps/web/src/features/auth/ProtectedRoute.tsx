import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return <div className="p-8 text-muted-foreground">Carregando…</div>
  }
  if (state.status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}
