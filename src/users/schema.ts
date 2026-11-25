import { z } from 'zod'
import {
  isValidIsoDate,
  USER_ROLES,
  type UserRecord,
  type UsersFormValues,
} from './model.ts'

function localCalendarDate(): string {
  const today = new Date()
  const year = today.getFullYear().toString().padStart(4, '0')
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const day = today.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const userSchema: z.ZodType<UserRecord, UserRecord> = z.object({
  id: z.string().min(1, 'Identificador do usuário é obrigatório.'),
  name: z.string().refine((value) => value.trim().length > 0, {
    message: 'Nome é obrigatório.',
  }),
  role: z
    .union([z.enum(USER_ROLES), z.literal('')])
    .refine((value): value is UserRecord['role'] => {
      return value !== '' && USER_ROLES.includes(value)
    }, 'Selecione um perfil.'),
  birthDate: z
    .string()
    .refine(isValidIsoDate, 'Informe uma data de nascimento válida.')
    .refine((value) => value <= localCalendarDate(), {
      message: 'A data de nascimento não pode ser futura.',
    }),
  numericValue: z
    .number()
    .refine((value) => Number.isFinite(value) && value >= 0, {
      message: 'Informe um salário válido maior ou igual a zero.',
    })
    .nullable()
    .refine((value) => value !== null, {
      message: 'Salário mensal é obrigatório.',
    }),
})

export const usersFormSchema: z.ZodType<UsersFormValues, UsersFormValues> = z.object({
  users: z.array(userSchema),
})
