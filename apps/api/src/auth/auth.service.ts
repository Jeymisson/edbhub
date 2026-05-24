import { Injectable, UnauthorizedException } from '@nestjs/common'
import { verify } from '@node-rs/argon2'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string): Promise<string> {
    const admin = await this.prisma.admin.findUnique({ where: { email: email.toLowerCase() } })
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials')
    }
    const ok = await verify(admin.passwordHash, password)
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials')
    }
    return admin.id
  }
}
