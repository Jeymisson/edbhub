import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { LoggerModule } from 'nestjs-pino'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js'
import { PrismaModule } from './prisma/prisma.module.js'
import { RedisModule } from './redis/redis.module.js'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        ...(process.env.NODE_ENV !== 'production'
          ? { transport: { target: 'pino-pretty', options: { singleLine: true } } }
          : {}),
        redact: {
          paths: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.body.password',
            'req.body.cpf',
            'req.body.email',
            'req.body.telefone',
            'req.body.phone',
            '*.cpf',
            '*.email',
            '*.telefone',
            '*.phone',
            '*.password',
            '*.passwordHash',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    PrismaModule,
    RedisModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
