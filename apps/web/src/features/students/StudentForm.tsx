import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { studentCreateSchema, type StudentCreateInput } from '@edb/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface StudentFormProps {
  initial?: Partial<StudentCreateInput>
  submitLabel: string
  onSubmit: (values: StudentCreateInput) => Promise<void>
  serverError?: string | null
}

export function StudentForm({ initial, submitLabel, onSubmit, serverError }: StudentFormProps) {
  const form = useForm<StudentCreateInput>({
    resolver: standardSchemaResolver(studentCreateSchema),
    defaultValues: {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      plano: 'basic',
      status: 'ativo',
      ...initial,
    },
  })

  return (
    <form className="space-y-4 max-w-xl" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Field label="Nome" error={form.formState.errors.nome?.message}>
        <Input {...form.register('nome')} />
      </Field>
      <Field label="E-mail" error={form.formState.errors.email?.message}>
        <Input type="email" {...form.register('email')} />
      </Field>
      <Field label="CPF" error={form.formState.errors.cpf?.message}>
        <Input {...form.register('cpf')} placeholder="000.000.000-00" />
      </Field>
      <Field label="Telefone" error={form.formState.errors.telefone?.message}>
        <Input {...form.register('telefone')} placeholder="(11) 98765-4321" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Plano" error={form.formState.errors.plano?.message}>
          <Select
            defaultValue={form.getValues('plano')}
            onValueChange={(v) => form.setValue('plano', v as StudentCreateInput['plano'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">basic</SelectItem>
              <SelectItem value="premium">premium</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status" error={form.formState.errors.status?.message}>
          <Select
            defaultValue={form.getValues('status')}
            onValueChange={(v) => form.setValue('status', v as StudentCreateInput['status'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">ativo</SelectItem>
              <SelectItem value="pausado">pausado</SelectItem>
              <SelectItem value="cancelado">cancelado</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Salvando…' : submitLabel}
      </Button>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
