import { z } from 'zod'
import { isValidCpf, normalizeCpf } from './cpf'
import { normalizePhone } from './phone'

export const studentPlanoEnum = z.enum(['basic', 'premium'])
export const studentStatusEnum = z.enum(['ativo', 'pausado', 'cancelado'])

export type StudentPlano = z.infer<typeof studentPlanoEnum>
export type StudentStatus = z.infer<typeof studentStatusEnum>

const emailSchema = z
  .string()
  .trim()
  .min(1, 'required')
  .email('invalid email')
  .transform((value) => value.toLowerCase())

const cpfSchema = z
  .string()
  .min(1, 'required')
  .refine(isValidCpf, 'invalid CPF')
  .transform(normalizeCpf)

const phoneSchema = z
  .string()
  .min(1, 'required')
  .transform((value, ctx) => {
    const normalized = normalizePhone(value)
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid phone' })
      return z.NEVER
    }
    return normalized
  })

export const loginSchema = z.object({
  email: emailSchema,
  // argon2 hashes whatever it receives; cap the input so an attacker can't
  // submit a multi-megabyte payload as a DoS amplifier.
  password: z.string().min(1, 'required').max(256, 'too long'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const studentCreateSchema = z.object({
  nome: z.string().trim().min(1, 'required').max(255),
  email: emailSchema,
  cpf: cpfSchema,
  telefone: phoneSchema,
  plano: studentPlanoEnum,
  status: studentStatusEnum,
})

export type StudentCreateInput = z.infer<typeof studentCreateSchema>

export const studentUpdateSchema = studentCreateSchema.partial()
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>
