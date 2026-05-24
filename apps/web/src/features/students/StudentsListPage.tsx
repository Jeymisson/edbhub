import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '../auth/useAuth'
import { studentsApi } from './api'
import { formatCpf, formatPhone } from './format'
import type { Student } from './types'

export function StudentsListPage() {
  const { logout } = useAuth()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['students'],
    queryFn: studentsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      toast.success('Aluno removido.')
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
    onError: () => toast.error('Não foi possível remover o aluno.'),
  })

  const filtered = (data ?? []).filter((s) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const digits = q.replace(/\D/g, '')
    // CPF check only when the query actually contains digits — otherwise
    // `''.includes('')` is true for every row and the filter degenerates.
    return (
      s.nome.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (digits.length > 0 && s.cpf.includes(digits))
    )
  })

  return (
    <main className="p-8 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Alunos</h1>
          <p className="text-muted-foreground text-sm">Cadastro de alunos da Escola do Breno.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/students/new">Novo aluno</Link>
          </Button>
          <Button variant="outline" onClick={() => logout()}>Sair</Button>
        </div>
      </header>

      <Input
        placeholder="Buscar por nome, e-mail ou CPF"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
      />

      {isLoading && <p className="text-muted-foreground">Carregando…</p>}
      {error && <p className="text-destructive">Erro ao carregar alunos.</p>}

      {data && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum aluno encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{formatCpf(s.cpf)}</TableCell>
                  <TableCell>{formatPhone(s.telefone)}</TableCell>
                  <TableCell>{s.plano}</TableCell>
                  <TableCell>{s.status}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/students/${s.id}`}>Editar</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setPendingDelete(s)}
                    >
                      Apagar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover aluno</DialogTitle>
            <DialogDescription>
              {pendingDelete && (
                <>Confirma a remoção de <span className="font-semibold">{pendingDelete.nome}</span>? O registro será mantido em histórico.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!pendingDelete) return
                deleteMutation.mutate(pendingDelete.id, {
                  onSettled: () => setPendingDelete(null),
                })
              }}
            >
              {deleteMutation.isPending ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
