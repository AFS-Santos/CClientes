// src/utils/date.ts
// Re-exporta as regex de utils/csv/helpers para compatibilidade com imports existentes
export { IS_DATE, IS_MONEY, IS_INT_S, IS_COD } from './csv/helpers'

/** Converte "DD/MM/YYYY" para objeto Date */
export function parseDate(s: string): Date | null {
  if (!s) return null
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return new Date(+m[3], +m[2] - 1, +m[1])
}
