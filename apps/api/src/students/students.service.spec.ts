import { describe, expect, it, vi } from 'vitest'
import { StudentsService } from './students.service.js'

function makePrisma(initial: any[] = []) {
  const rows = new Map<string, any>(initial.map((r) => [r.id, r]))
  return {
    student: {
      findMany: vi.fn(async ({ where }: any) => {
        let result = [...rows.values()]
        if (where?.deletedAt === null) {
          result = result.filter((r) => r.deletedAt === null)
        }
        return result
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        return [...rows.values()].find(
          (r) => r.id === where.id && (where.deletedAt === null ? r.deletedAt === null : true),
        ) ?? null
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: 'gen-id', deletedAt: null, ...data }
        rows.set(row.id, row)
        return row
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = rows.get(where.id)
        if (!row) throw new Error('not found')
        const next = { ...row, ...data }
        rows.set(where.id, next)
        return next
      }),
    },
    _rows: rows,
  }
}

const validInput = {
  nome: 'Ana',
  email: 'ana@example.com',
  cpf: '52998224725',
  telefone: '+5511987654321',
  plano: 'basic' as const,
  status: 'ativo' as const,
}

describe('StudentsService', () => {
  it('list filters out soft-deleted rows', async () => {
    const prisma = makePrisma([
      { id: '1', ...validInput, deletedAt: null },
      { id: '2', ...validInput, deletedAt: new Date() },
    ])
    const service = new StudentsService(prisma as any)
    const rows = await service.list()
    expect(rows.map((r) => r.id)).toEqual(['1'])
  })

  it('get returns a single live student', async () => {
    const prisma = makePrisma([{ id: '1', ...validInput, deletedAt: null }])
    const service = new StudentsService(prisma as any)
    expect(await service.get('1')).not.toBeNull()
  })

  it('get returns null for soft-deleted students', async () => {
    const prisma = makePrisma([{ id: '1', ...validInput, deletedAt: new Date() }])
    const service = new StudentsService(prisma as any)
    expect(await service.get('1')).toBeNull()
  })

  it('create inserts a new student', async () => {
    const prisma = makePrisma()
    const service = new StudentsService(prisma as any)
    const result = await service.create(validInput)
    expect(result.id).toBeDefined()
    expect(prisma.student.create).toHaveBeenCalled()
  })

  it('update applies a partial change', async () => {
    const prisma = makePrisma([{ id: '1', ...validInput, deletedAt: null }])
    const service = new StudentsService(prisma as any)
    const result = await service.update('1', { status: 'pausado' })
    expect(result?.status).toBe('pausado')
  })

  it('remove sets deletedAt instead of deleting the row', async () => {
    const prisma = makePrisma([{ id: '1', ...validInput, deletedAt: null }])
    const service = new StudentsService(prisma as any)
    await service.remove('1')
    expect(prisma._rows.get('1').deletedAt).toBeInstanceOf(Date)
  })
})
