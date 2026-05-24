import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import fastifyCookie from '@fastify/cookie'
import { hash } from '@node-rs/argon2'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const ADMIN_EMAIL = 'e2e-students@example.com'
const ADMIN_PASSWORD = 'TestPassw0rd!'

async function login(app: NestFastifyApplication, email: string, password: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password },
  })
  return (res.headers['set-cookie'] as string).split(';')[0]!
}

describe('Students (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let cookie: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.register(fastifyCookie)
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    prisma = app.get(PrismaService)
    await prisma.student.deleteMany({ where: { email: { contains: 'e2e-' } } })
    await prisma.admin.upsert({
      where: { email: ADMIN_EMAIL },
      create: { email: ADMIN_EMAIL, passwordHash: await hash(ADMIN_PASSWORD) },
      update: { passwordHash: await hash(ADMIN_PASSWORD) },
    })

    cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD)
  })

  afterAll(async () => {
    await prisma.student.deleteMany({ where: { email: { contains: 'e2e-' } } })
    await prisma.admin.delete({ where: { email: ADMIN_EMAIL } }).catch(() => {})
    await app.close()
  })

  it('rejects unauthenticated list with 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/students' })
    expect(res.statusCode).toBe(401)
  })

  it('rejects unauthenticated create with 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/students', payload: {} })
    expect(res.statusCode).toBe(401)
  })

  it('rejects unauthenticated update with 401', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/students/00000000-0000-0000-0000-000000000000',
      payload: {},
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects unauthenticated delete with 401', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/students/00000000-0000-0000-0000-000000000000',
    })
    expect(res.statusCode).toBe(401)
  })

  const valid = {
    nome: 'Ana Souza',
    email: 'e2e-ana@example.com',
    cpf: '529.982.247-25',
    telefone: '(11) 98765-4321',
    plano: 'basic' as const,
    status: 'ativo' as const,
  }

  it('creates a student and normalizes PII fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie },
      payload: valid,
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.cpf).toBe('52998224725')
    expect(body.email).toBe('e2e-ana@example.com')
    expect(body.telefone).toBe('+5511987654321')
  })

  it('rejects invalid CPF with 400 and no value echo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie },
      payload: { ...valid, email: 'e2e-bad@example.com', cpf: '52998224700' },
    })
    expect(res.statusCode).toBe(400)
    const text = res.body
    expect(text).not.toContain('52998224700')
  })

  it('rejects duplicate CPF with generic 409', async () => {
    await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie },
      payload: { ...valid, email: 'e2e-first@example.com' },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie },
      payload: { ...valid, email: 'e2e-second@example.com' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json()).toEqual({ message: 'Conflict' })
  })

  it('lists only live students', async () => {
    const res = await app.inject({ method: 'GET', url: '/students', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    const rows = res.json() as any[]
    expect(rows.every((r) => r.deletedAt === null)).toBe(true)
  })

  it('soft-deletes a student', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie },
      payload: { ...valid, email: 'e2e-delete@example.com', cpf: '111.444.777-35' },
    })
    const id = created.json().id

    const del = await app.inject({
      method: 'DELETE',
      url: `/students/${id}`,
      headers: { cookie },
    })
    expect(del.statusCode).toBe(204)

    const get = await app.inject({
      method: 'GET',
      url: `/students/${id}`,
      headers: { cookie },
    })
    expect(get.statusCode).toBe(404)

    const row = await prisma.student.findUnique({ where: { id } })
    expect(row?.deletedAt).toBeInstanceOf(Date)
  })

  it('updates a student partially', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/students',
      headers: { cookie },
      payload: { ...valid, email: 'e2e-update@example.com', cpf: '935.411.347-80' },
    })
    const id = created.json().id

    const updated = await app.inject({
      method: 'PATCH',
      url: `/students/${id}`,
      headers: { cookie },
      payload: { status: 'pausado' },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().status).toBe('pausado')
  })
})
