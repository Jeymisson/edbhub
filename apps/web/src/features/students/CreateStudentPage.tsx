import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { studentsApi } from './api'
import { StudentForm } from './StudentForm'
import type { StudentCreateInput } from '@edb/shared'
import type { ApiError } from '@/lib/api'

export function CreateStudentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (data: StudentCreateInput) => studentsApi.create(data),
    onSuccess: () => {
      toast.success('Aluno cadastrado.')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      navigate('/students')
    },
    onError: (err: ApiError) => {
      setServerError(err.status === 409 ? 'Já existe um aluno com este CPF ou e-mail.' : 'Erro ao salvar.')
    },
  })

  async function onSubmit(values: StudentCreateInput) {
    setServerError(null)
    await mutation.mutateAsync(values)
  }

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Novo aluno</h1>
        <Button asChild variant="outline"><Link to="/students">Voltar</Link></Button>
      </header>
      <StudentForm submitLabel="Cadastrar" onSubmit={onSubmit} serverError={serverError} />
    </main>
  )
}
