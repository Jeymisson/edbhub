import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

export interface CurrentAdminContext {
  id: string
  email: string
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAdminContext => {
    const req = ctx.switchToHttp().getRequest<{ admin?: CurrentAdminContext }>()
    if (!req.admin) {
      throw new Error('CurrentAdmin used on a route without SessionGuard')
    }
    return req.admin
  },
)
