import { describe, expect, it, vi } from 'vitest'
import { UnauthorizedException } from '@nestjs/common'
import { hash } from '@node-rs/argon2'
import { AuthService } from './auth.service.js'

describe('AuthService.login', () => {
  it('returns the admin id when credentials are valid', async () => {
    const passwordHash = await hash('hunter22')
    const prisma = {
      admin: {
        findUnique: vi.fn().mockResolvedValue({ id: 'admin-1', email: 'a@b.com', passwordHash }),
      },
    }
    const service = new AuthService(prisma as any)
    const adminId = await service.login('a@b.com', 'hunter22')
    expect(adminId).toBe('admin-1')
  })

  it('throws UnauthorizedException when the admin does not exist', async () => {
    const prisma = { admin: { findUnique: vi.fn().mockResolvedValue(null) } }
    const service = new AuthService(prisma as any)
    await expect(service.login('a@b.com', 'x')).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('throws UnauthorizedException when the password is wrong', async () => {
    const passwordHash = await hash('correct')
    const prisma = {
      admin: {
        findUnique: vi.fn().mockResolvedValue({ id: 'admin-1', email: 'a@b.com', passwordHash }),
      },
    }
    const service = new AuthService(prisma as any)
    await expect(service.login('a@b.com', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('does not echo submitted credentials in the error message', async () => {
    const prisma = { admin: { findUnique: vi.fn().mockResolvedValue(null) } }
    const service = new AuthService(prisma as any)
    try {
      await service.login('victim@example.com', 'topsecret')
    } catch (err) {
      const message = (err as UnauthorizedException).message
      expect(message).not.toContain('victim@example.com')
      expect(message).not.toContain('topsecret')
    }
  })
})
