import { Injectable } from '@nestjs/common'
import type { StudentCreateInput, StudentUpdateInput } from '@edb/shared'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.student.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  get(id: string) {
    return this.prisma.student.findFirst({ where: { id, deletedAt: null } })
  }

  create(data: StudentCreateInput) {
    return this.prisma.student.create({ data })
  }

  update(id: string, data: StudentUpdateInput) {
    // Cast needed: Zod .partial() infers `T | undefined` but Prisma requires
    // exactOptionalPropertyTypes-compatible types (no explicit `undefined`).
    return this.prisma.student.update({ where: { id }, data: data as any })
  }

  async remove(id: string) {
    await this.prisma.student.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }
}
