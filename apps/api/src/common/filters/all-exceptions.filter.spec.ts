import { describe, expect, it, vi } from 'vitest'
import { HttpException, HttpStatus } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { AllExceptionsFilter } from './all-exceptions.filter.js'

function makeHost(): { host: any; statusSpy: any; sendSpy: any } {
  const sendSpy = vi.fn()
  const statusSpy = vi.fn().mockReturnValue({ send: sendSpy })
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status: statusSpy }),
      getRequest: () => ({ url: '/x', method: 'POST' }),
    }),
  }
  return { host, statusSpy, sendSpy }
}

describe('AllExceptionsFilter', () => {
  it('passes HttpException status and body through', () => {
    const filter = new AllExceptionsFilter()
    const { host, statusSpy, sendSpy } = makeHost()
    const ex = new HttpException({ message: 'x' }, HttpStatus.BAD_REQUEST)
    filter.catch(ex, host as any)
    expect(statusSpy).toHaveBeenCalledWith(400)
    expect(sendSpy).toHaveBeenCalledWith({ message: 'x' })
  })

  it('maps Prisma P2002 (unique constraint) to generic 409', () => {
    const filter = new AllExceptionsFilter()
    const { host, statusSpy, sendSpy } = makeHost()
    const ex = new Prisma.PrismaClientKnownRequestError('unique violation', {
      code: 'P2002',
      clientVersion: 'x',
      meta: { target: ['cpf'] },
    })
    filter.catch(ex, host as any)
    expect(statusSpy).toHaveBeenCalledWith(409)
    expect(sendSpy).toHaveBeenCalledWith({ message: 'Conflict' })
    const body = sendSpy.mock.calls[0][0]
    expect(JSON.stringify(body)).not.toContain('cpf')
  })

  it('maps unknown errors to generic 500 without leaking details', () => {
    const filter = new AllExceptionsFilter()
    const { host, statusSpy, sendSpy } = makeHost()
    filter.catch(new Error('database password is hunter2'), host as any)
    expect(statusSpy).toHaveBeenCalledWith(500)
    expect(sendSpy).toHaveBeenCalledWith({ message: 'Internal server error' })
  })
})
