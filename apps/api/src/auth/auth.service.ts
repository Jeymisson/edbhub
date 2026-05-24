import { Injectable, UnauthorizedException } from '@nestjs/common'
import { verify } from '@node-rs/argon2'
import { PrismaService } from '../prisma/prisma.service.js'

function invalidCredentials(): UnauthorizedException {
  return new UnauthorizedException({ statusCode: 401, message: 'Invalid credentials' })
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string): Promise<string> {
    const admin = await this.prisma.admin.findUnique({ where: { email: email.toLowerCase() } })
    if (!admin) {
      throw invalidCredentials()
    }
    const ok = await verify(admin.passwordHash, password)
    if (!ok) {
      throw invalidCredentials()
    }
    return admin.id
  }
}
