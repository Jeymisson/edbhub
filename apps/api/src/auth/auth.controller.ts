import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { loginSchema, type LoginInput } from '@edb/shared'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import { AuthService } from './auth.service.js'
import { SessionService } from './session.service.js'
import { SessionGuard, SESSION_COOKIE_NAME_TOKEN } from './session.guard.js'
import { CurrentAdmin, type CurrentAdminContext } from './current-admin.decorator.js'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    @Inject(SESSION_COOKIE_NAME_TOKEN) private readonly cookieName: string,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const adminId = await this.auth.login(body.email, body.password)
    const ttl = Number(process.env.SESSION_TTL_SECONDS ?? 28800)
    const sid = await this.sessions.create({ adminId }, ttl)
    reply.setCookie(this.cookieName, sid, {
      httpOnly: true,
      secure: (process.env.WEB_ORIGIN ?? '').startsWith('https://'),
      sameSite: 'strict',
      path: '/',
      maxAge: ttl,
    })
    return { ok: true }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const sid = (req as FastifyRequest & { cookies?: Record<string, string | undefined> })
      .cookies?.[this.cookieName]
    if (sid) await this.sessions.destroy(sid)
    reply.clearCookie(this.cookieName, { path: '/' })
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentAdmin() admin: CurrentAdminContext) {
    return { id: admin.id, email: admin.email }
  }
}
