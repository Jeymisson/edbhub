import {
  BadRequestException,
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common'
import type { ZodTypeAny } from 'zod'

@Injectable()
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown, _metadata?: ArgumentMetadata) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      throw new BadRequestException({ message: 'Validation failed', errors })
    }
    return result.data
  }
}
