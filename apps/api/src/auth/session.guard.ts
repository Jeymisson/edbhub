import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { SessionService } from './session.service.js'

export const SESSION_COOKIE_NAME_TOKEN = 'SESSION_COOKIE_NAME'

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
    @Inject(SESSION_COOKIE_NAME_TOKEN) private readonly cookieName: string,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      cookies?: Record<string, string | undefined>
      admin?: { id: string; email: string }
    }>()

    const sid = req.cookies?.[this.cookieName]
    if (!sid) throw new UnauthorizedException()

    const session = await this.sessions.get(sid)
    if (!session) throw new UnauthorizedException()

    const admin = await this.prisma.admin.findUnique({
      where: { id: session.adminId },
      select: { id: true, email: true },
    })
    if (!admin) throw new UnauthorizedException()

    req.admin = admin
    return true
  }
}
