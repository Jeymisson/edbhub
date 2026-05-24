// Loads apps/api/.env when present (host dev / tests).
// No-op when env vars are already set, so it doesn't override docker compose
// values in production.
import 'dotenv/config'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Logger } from 'nestjs-pino'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 100 * 1024 }),
    { bufferLogs: true },
  )

  app.useLogger(app.get(Logger))
  app.enableShutdownHooks()

  await app.register(fastifyCookie)
  await app.register(fastifyCors, {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })

  const port = Number(process.env.API_PORT ?? 3000)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`API listening on :${port}`)
}

bootstrap()
