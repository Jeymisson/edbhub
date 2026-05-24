import type { StudentPlano, StudentStatus } from '@edb/shared'

export interface Student {
  id: string
  nome: string
  email: string
  cpf: string
  telefone: string
  plano: StudentPlano
  status: StudentStatus
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
