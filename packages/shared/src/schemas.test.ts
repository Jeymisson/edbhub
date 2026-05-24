import { describe, expect, it } from 'vitest'
import {
  loginSchema,
  studentCreateSchema,
  studentUpdateSchema,
  studentPlanoEnum,
  studentStatusEnum,
} from './schemas'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'Admin@Example.com',
      password: 'hunter22',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('admin@example.com')
  })

  it('rejects invalid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
  })

  it('rejects missing password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false)
  })

  it('rejects passwords longer than 256 chars (argon2 DoS guard)', () => {
    const huge = 'x'.repeat(257)
    expect(loginSchema.safeParse({ email: 'a@b.com', password: huge }).success).toBe(false)
  })

  it('accepts passwords at the 256-char boundary', () => {
    const boundary = 'x'.repeat(256)
    expect(loginSchema.safeParse({ email: 'a@b.com', password: boundary }).success).toBe(true)
  })
})

describe('studentCreateSchema', () => {
  const valid = {
    nome: 'Ana Souza',
    email: 'Ana@Example.com',
    cpf: '529.982.247-25',
    telefone: '(11) 98765-4321',
    plano: 'basic' as const,
    status: 'ativo' as const,
  }

  it('accepts a valid student and normalizes PII fields', () => {
    const result = studentCreateSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('ana@example.com')
      expect(result.data.cpf).toBe('52998224725')
      expect(result.data.telefone).toBe('+5511987654321')
    }
  })

  it('rejects invalid CPF check digits', () => {
    expect(studentCreateSchema.safeParse({ ...valid, cpf: '52998224700' }).success).toBe(false)
  })

  it('rejects 11 identical digits as CPF', () => {
    expect(studentCreateSchema.safeParse({ ...valid, cpf: '11111111111' }).success).toBe(false)
  })

  it('rejects invalid phone', () => {
    expect(studentCreateSchema.safeParse({ ...valid, telefone: '123' }).success).toBe(false)
  })

  it('rejects unknown plano', () => {
    expect(
      studentCreateSchema.safeParse({ ...valid, plano: 'enterprise' }).success,
    ).toBe(false)
  })

  it('rejects unknown status', () => {
    expect(
      studentCreateSchema.safeParse({ ...valid, status: 'arquivado' }).success,
    ).toBe(false)
  })

  it('trims nome', () => {
    const result = studentCreateSchema.safeParse({ ...valid, nome: '   Ana   ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.nome).toBe('Ana')
  })
})

describe('studentUpdateSchema', () => {
  it('accepts a partial update', () => {
    const result = studentUpdateSchema.safeParse({ status: 'pausado' })
    expect(result.success).toBe(true)
  })

  it('still validates fields that are present', () => {
    expect(studentUpdateSchema.safeParse({ cpf: 'abc' }).success).toBe(false)
  })
})

describe('enums', () => {
  it('expose plano values', () => {
    expect(studentPlanoEnum.options).toEqual(['basic', 'premium'])
  })

  it('expose status values', () => {
    expect(studentStatusEnum.options).toEqual(['ativo', 'pausado', 'cancelado'])
  })
})
