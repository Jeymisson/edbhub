import { Module } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'

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
  ],
})
export class AppModule {}
