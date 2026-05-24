import { api } from '@/lib/api'
import type { StudentCreateInput, StudentUpdateInput } from '@edb/shared'
import type { Student } from './types'

export const studentsApi = {
  list: () => api.get<Student[]>('/students'),
  get: (id: string) => api.get<Student>(`/students/${id}`),
  create: (data: StudentCreateInput) => api.post<Student>('/students', data),
  update: (id: string, data: StudentUpdateInput) => api.patch<Student>(`/students/${id}`, data),
  delete: (id: string) => api.delete<void>(`/students/${id}`),
}
