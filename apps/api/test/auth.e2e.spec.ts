import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import fastifyCookie from '@fastify/cookie'
import { hash } from '@node-rs/argon2'
import { AppModule } from '../src/app.module.js'
import { PrismaService } from '../src/prisma/prisma.service.js'
import { RedisService } from '../src/redis/redis.service.js'

const ADMIN_EMAIL = 'e2e-auth@example.com'
const ADMIN_PASSWORD = 'TestPassw0rd!'

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let _redis: RedisService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.register(fastifyCookie)
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    prisma = app.get(PrismaService)
    _redis = app.get(RedisService)

    await prisma.admin.upsert({
      where: { email: ADMIN_EMAIL },
      create: { email: ADMIN_EMAIL, passwordHash: await hash(ADMIN_PASSWORD) },
      update: { passwordHash: await hash(ADMIN_PASSWORD) },
    })
  })

  afterAll(async () => {
    await prisma.admin.delete({ where: { email: ADMIN_EMAIL } }).catch(() => {})
    await app.close()
  })

  it('rejects unknown user with generic 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'x' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ message: 'Invalid credentials', statusCode: 401 })
  })

  it('rejects wrong password with generic 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: ADMIN_EMAIL, password: 'wrong' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ message: 'Invalid credentials', statusCode: 401 })
  })

  it('logs in successfully and sets an httpOnly cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    expect(res.statusCode).toBe(200)
    const setCookie = res.headers['set-cookie'] as string | string[]
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie
    expect(cookie).toMatch(/edb_sid=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
  })

  it('rejects /auth/me without a session', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('accepts /auth/me with a valid session', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    const cookie = (login.headers['set-cookie'] as string).split(';')[0]
    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie },
    })
    expect(me.statusCode).toBe(200)
    expect(me.json()).toEqual({ id: expect.any(String), email: ADMIN_EMAIL })
  })

  it('logout invalidates the session', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    const cookie = (login.headers['set-cookie'] as string).split(';')[0]

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie },
    })
    expect(logout.statusCode).toBe(204)

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })
    expect(me.statusCode).toBe(401)
  })
})
