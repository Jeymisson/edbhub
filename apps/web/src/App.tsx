import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { Toaster } from 'sonner'

function StudentsPlaceholder() {
  // TODO: replaced by Tasks 17–18 (StudentsListPage / StudentForm / CreateStudentPage / EditStudentPage).
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Alunos</h1>
      <p className="text-muted-foreground">Em construção.</p>
    </main>
  )
}

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
                <StudentsPlaceholder />
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
