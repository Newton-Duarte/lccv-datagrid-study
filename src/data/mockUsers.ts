import type { UserRecord } from '../users/model.ts'

const SEED_USERS: readonly UserRecord[] = [
  {
    id: 'user-001',
    name: 'Ana Luísa Ferreira',
    role: 'Administrador',
    birthDate: '1988-03-14',
    numericValue: 9850,
  },
  {
    id: 'user-002',
    name: 'João Pedro dos Santos',
    role: 'Editor',
    birthDate: '1994-09-27',
    numericValue: 5420.5,
  },
  {
    id: 'user-003',
    name: 'Conceição Nascimento',
    role: 'Visualizador',
    birthDate: '1979-12-08',
    numericValue: 3750,
  },
  {
    id: 'user-004',
    name: 'Vinícius Araújo',
    role: 'Editor',
    birthDate: '1991-06-21',
    numericValue: 6800,
  },
  {
    id: 'user-005',
    name: 'Mariana Costa Almeida',
    role: 'Administrador',
    birthDate: '1985-02-05',
    numericValue: 12400,
  },
  {
    id: 'user-006',
    name: 'Rafael Gonçalves',
    role: 'Editor',
    birthDate: '1996-11-19',
    numericValue: 4920,
  },
  {
    id: 'user-007',
    name: 'Beatriz Oliveira',
    role: 'Visualizador',
    birthDate: '1998-07-30',
    numericValue: 3280.75,
  },
  {
    id: 'user-008',
    name: 'Luiz Henrique Moreira',
    role: 'Editor',
    birthDate: '1982-01-11',
    numericValue: 7350,
  },
  {
    id: 'user-009',
    name: 'Camila Rodrigues',
    role: 'Visualizador',
    birthDate: '1993-04-23',
    numericValue: 4100,
  },
  {
    id: 'user-010',
    name: 'André Luiz Carvalho',
    role: 'Administrador',
    birthDate: '1980-08-16',
    numericValue: 14800,
  },
  {
    id: 'user-011',
    name: 'Jéssica Ribeiro',
    role: 'Editor',
    birthDate: '1995-05-09',
    numericValue: 5650.5,
  },
  {
    id: 'user-012',
    name: 'Thiago Martins',
    role: 'Visualizador',
    birthDate: '1989-10-02',
    numericValue: 3950,
  },
  {
    id: 'user-013',
    name: 'Patrícia Souza',
    role: 'Editor',
    birthDate: '1987-02-28',
    numericValue: 8120,
  },
  {
    id: 'user-014',
    name: 'José Carlos da Silva',
    role: 'Visualizador',
    birthDate: '1976-09-17',
    numericValue: 4560,
  },
  {
    id: 'user-015',
    name: 'Letícia Fernandes',
    role: 'Editor',
    birthDate: '1999-06-06',
    numericValue: 4780.25,
  },
  {
    id: 'user-016',
    name: 'Bruno Lima',
    role: 'Visualizador',
    birthDate: '1992-12-13',
    numericValue: 3620,
  },
  {
    id: 'user-017',
    name: 'Débora Melo',
    role: 'Administrador',
    birthDate: '1984-03-25',
    numericValue: 10900,
  },
  {
    id: 'user-018',
    name: 'Antônio César Barbosa',
    role: 'Editor',
    birthDate: '1990-08-04',
    numericValue: 6250,
  },
]

export function createMockUsers(): UserRecord[] {
  return SEED_USERS.map((user) => ({ ...user }))
}
