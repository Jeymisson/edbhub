import { Injectable, UnauthorizedException } from '@nestjs/common'
import { hash, verify } from '@node-rs/argon2'
import { randomBytes } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service.js'

function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({ statusCode: 401, message: 'Invalid credentials' })
}

// Used as a constant-time fallback when an unknown e-mail is submitted, so the
// not-found path costs the same ~argon2 verification time as the wrong-password
// path. Without this, response-time analysis lets an attacker enumerate valid
// admin e-mails. Computed lazily on first miss and cached.
let dummyHashCache: Promise<string> | null = null
function getDummyHash(): Promise<string> {
  if (!dummyHashCache) {
    dummyHashCache = hash(randomBytes(32).toString('hex'))
  }
  return dummyHashCache
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string): Promise<string> {
    const admin = await this.prisma.admin.findUnique({ where: { email: email.toLowerCase() } })
    const hashToCheck = admin?.passwordHash ?? (await getDummyHash())
    const ok = await verify(hashToCheck, password)
    if (!admin || !ok) {
      throw invalidCredentials()
    }
    return admin.id
  }
}
