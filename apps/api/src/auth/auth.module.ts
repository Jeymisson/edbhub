import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { SessionService } from './session.service.js'
import { SessionGuard, SESSION_COOKIE_NAME_TOKEN } from './session.guard.js'

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    SessionGuard,
    {
      provide: SESSION_COOKIE_NAME_TOKEN,
      useValue: process.env.SESSION_COOKIE_NAME ?? 'edb_sid',
    },
  ],
  exports: [SessionService, SessionGuard, SESSION_COOKIE_NAME_TOKEN],
})
export class AuthModule {}
