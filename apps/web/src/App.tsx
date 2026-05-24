import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { StudentsListPage } from '@/features/students/StudentsListPage'
import { Toaster } from 'sonner'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <StudentsListPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/students" replace />} />
        </Routes>
        <Toaster richColors />
      </AuthProvider>
    </BrowserRouter>
  )
}
