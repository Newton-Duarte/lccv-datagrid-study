export const USER_ROLES = [
  'Administrador',
  'Editor',
  'Visualizador',
] as const

export const USER_FIELDS = ['name', 'role', 'birthDate', 'salary'] as const

export const USER_FIELD_LABELS: Record<(typeof USER_FIELDS)[number], string> = {
  name: 'Nome',
  role: 'Perfil',
  birthDate: 'Data de nascimento',
  salary: 'Salário mensal',
}
