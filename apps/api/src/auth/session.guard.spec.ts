import { describe, expect, it, vi } from 'vitest'
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common'
import { SessionGuard } from './session.guard.js'

function makeContext(cookies: Record<string, string | undefined>): ExecutionContext {
  const req = { cookies, admin: undefined as { id: string } | undefined }
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext
}

const COOKIE_NAME = 'edb_sid'

describe('SessionGuard', () => {
  it('throws when the cookie is missing', async () => {
    const guard = new SessionGuard(
      { get: vi.fn() } as any,
      { admin: { findUnique: vi.fn() } } as any,
      COOKIE_NAME,
    )
    await expect(guard.canActivate(makeContext({}))).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('throws when the session is not in Redis', async () => {
    const guard = new SessionGuard(
      { get: vi.fn().mockResolvedValue(null) } as any,
      { admin: { findUnique: vi.fn() } } as any,
      COOKIE_NAME,
    )
    await expect(
      guard.canActivate(makeContext({ [COOKIE_NAME]: 'stale' })),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('throws when the admin no longer exists', async () => {
    const guard = new SessionGuard(
      { get: vi.fn().mockResolvedValue({ adminId: 'a-1' }) } as any,
      { admin: { findUnique: vi.fn().mockResolvedValue(null) } } as any,
      COOKIE_NAME,
    )
    await expect(
      guard.canActivate(makeContext({ [COOKIE_NAME]: 'good' })),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('attaches the admin and returns true on success', async () => {
    const admin = { id: 'a-1', email: 'a@b.com' }
    const ctx = makeContext({ [COOKIE_NAME]: 'good' })
    const guard = new SessionGuard(
      { get: vi.fn().mockResolvedValue({ adminId: 'a-1' }) } as any,
      { admin: { findUnique: vi.fn().mockResolvedValue(admin) } } as any,
      COOKIE_NAME,
    )
    expect(await guard.canActivate(ctx)).toBe(true)
    const req = (ctx.switchToHttp().getRequest() as any)
    expect(req.admin).toEqual({ id: 'a-1', email: 'a@b.com' })
  })
})
