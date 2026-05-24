import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Test } from '@nestjs/testing'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import fastifyCookie from '@fastify/cookie'
import { AppModule } from '../src/app.module.js'

describe('Rate limiting (e2e)', () => {
  let app: NestFastifyApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    await app.register(fastifyCookie)
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('throttles /auth/login after 10 attempts per minute', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nobody@example.com', password: 'wrong' },
      })
      statuses.push(res.statusCode)
    }
    // The first ten attempts all fail authentication (401), but consume the
    // rate-limit budget. The eleventh should be blocked by ThrottlerGuard
    // before AuthService.login ever runs.
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true)
    expect(statuses[10]).toBe(429)
  })
})
