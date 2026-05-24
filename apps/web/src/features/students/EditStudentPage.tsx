import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { studentsApi } from './api'
import { StudentForm } from './StudentForm'
import type { StudentCreateInput } from '@edb/shared'
import type { ApiError } from '@/lib/api'

export function EditStudentPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['students', id],
    queryFn: () => studentsApi.get(id),
    enabled: Boolean(id),
  })

  const mutation = useMutation({
    mutationFn: (values: StudentCreateInput) => studentsApi.update(id, values),
    onSuccess: () => {
      toast.success('Aluno atualizado.')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['students', id] })
      navigate('/students')
    },
    onError: (err: ApiError) => {
      setServerError(err.status === 409 ? 'CPF ou e-mail já cadastrado.' : 'Erro ao salvar.')
    },
  })

  async function onSubmit(values: StudentCreateInput) {
    setServerError(null)
    await mutation.mutateAsync(values)
  }

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Editar aluno</h1>
        <Button asChild variant="outline"><Link to="/students">Voltar</Link></Button>
      </header>

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {error && <p className="text-destructive">Aluno não encontrado.</p>}
      {data && (
        <StudentForm
          initial={data}
          submitLabel="Salvar"
          onSubmit={onSubmit}
          serverError={serverError}
        />
      )}
    </main>
  )
}
