import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<{ status: (code: number) => { send: (body: unknown) => void } }>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      response.status(status).send(exception.getResponse())
      return
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        response.status(HttpStatus.CONFLICT).send({ message: 'Conflict' })
        return
      }
      if (exception.code === 'P2025') {
        response.status(HttpStatus.NOT_FOUND).send({ message: 'Not found' })
        return
      }
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception))
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message: 'Internal server error' })
  }
}
