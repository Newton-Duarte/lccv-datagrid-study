import type { UserRecord } from '../types.ts'
import { cloneUserRows } from '../utils/user-record.ts'

const SEED_USERS: readonly UserRecord[] = [
  { id: 'user-001', name: 'Ana Luísa Ferreira', role: 'Administrador', birthDate: '1988-03-14', salary: 9850 },
  { id: 'user-002', name: 'João Pedro dos Santos', role: 'Editor', birthDate: '1994-09-27', salary: 5420.5 },
  { id: 'user-003', name: 'Conceição Nascimento', role: 'Visualizador', birthDate: '1979-12-08', salary: 3750 },
  { id: 'user-004', name: 'Vinícius Araújo', role: 'Editor', birthDate: '1991-06-21', salary: 6800 },
  { id: 'user-005', name: 'Mariana Costa Almeida', role: 'Administrador', birthDate: '1985-02-05', salary: 12400 },
  { id: 'user-006', name: 'Rafael Gonçalves', role: 'Editor', birthDate: '1996-11-19', salary: 4920 },
  { id: 'user-007', name: 'Beatriz Oliveira', role: 'Visualizador', birthDate: '1998-07-30', salary: 3280.75 },
  { id: 'user-008', name: 'Luiz Henrique Moreira', role: 'Editor', birthDate: '1982-01-11', salary: 7350 },
  { id: 'user-009', name: 'Camila Rodrigues', role: 'Visualizador', birthDate: '1993-04-23', salary: 4100 },
  { id: 'user-010', name: 'André Luiz Carvalho', role: 'Administrador', birthDate: '1980-08-16', salary: 14800 },
  { id: 'user-011', name: 'Jéssica Ribeiro', role: 'Editor', birthDate: '1995-05-09', salary: 5650.5 },
  { id: 'user-012', name: 'Thiago Martins', role: 'Visualizador', birthDate: '1989-10-02', salary: 3950 },
  { id: 'user-013', name: 'Patrícia Souza', role: 'Editor', birthDate: '1987-02-28', salary: 8120 },
  { id: 'user-014', name: 'José Carlos da Silva', role: 'Visualizador', birthDate: '1976-09-17', salary: 4560 },
  { id: 'user-015', name: 'Letícia Fernandes', role: 'Editor', birthDate: '1999-06-06', salary: 4780.25 },
  { id: 'user-016', name: 'Bruno Lima', role: 'Visualizador', birthDate: '1992-12-13', salary: 3620 },
  { id: 'user-017', name: 'Débora Melo', role: 'Administrador', birthDate: '1984-03-25', salary: 10900 },
  { id: 'user-018', name: 'Antônio César Barbosa', role: 'Editor', birthDate: '1990-08-04', salary: 6250 },
]

export function createMockUsers(): UserRecord[] {
  return cloneUserRows(SEED_USERS)
}
