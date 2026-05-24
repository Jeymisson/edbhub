import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  studentCreateSchema,
  studentUpdateSchema,
  type StudentCreateInput,
  type StudentUpdateInput,
} from '@edb/shared'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import { SessionGuard } from '../auth/session.guard.js'
import { StudentsService } from './students.service.js'

@Controller('students')
@UseGuards(SessionGuard)
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list() {
    return this.students.list()
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const student = await this.students.get(id)
    if (!student) throw new NotFoundException('Not found')
    return student
  }

  @Post()
  @HttpCode(201)
  create(@Body(new ZodValidationPipe(studentCreateSchema)) body: StudentCreateInput) {
    return this.students.create(body)
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(studentUpdateSchema)) body: StudentUpdateInput,
  ) {
    const existing = await this.students.get(id)
    if (!existing) throw new NotFoundException('Not found')
    return this.students.update(id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const existing = await this.students.get(id)
    if (!existing) throw new NotFoundException('Not found')
    await this.students.remove(id)
  }
}
