import { describe, expect, it } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { z } from 'zod'
import { ZodValidationPipe } from './zod-validation.pipe.js'

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().nonnegative(),
})

describe('ZodValidationPipe', () => {
  it('returns parsed data on success', () => {
    const pipe = new ZodValidationPipe(schema)
    const result = pipe.transform({ name: 'Ana', age: 30 })
    expect(result).toEqual({ name: 'Ana', age: 30 })
  })

  it('throws BadRequestException on failure', () => {
    const pipe = new ZodValidationPipe(schema)
    expect(() => pipe.transform({ name: '', age: -1 })).toThrow(BadRequestException)
  })

  it('exposes field-level errors without echoing input values', () => {
    const pipe = new ZodValidationPipe(schema)
    try {
      pipe.transform({ name: '', age: -1 })
    } catch (err) {
      const exception = err as BadRequestException
      const response = exception.getResponse() as {
        message: string
        errors: Array<{ path: string; message: string }>
      }
      expect(response.message).toBe('Validation failed')
      expect(response.errors).toEqual(
        expect.arrayContaining([
          { path: 'name', message: expect.any(String) },
          { path: 'age', message: expect.any(String) },
        ]),
      )
      const serialized = JSON.stringify(response)
      expect(serialized).not.toContain('-1')
    }
  })
})
