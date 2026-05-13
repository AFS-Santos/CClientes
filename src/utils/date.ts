// src/utils/date.ts

/** Converte "DD/MM/YYYY" para objeto Date */
export function parseDate(s: string): Date | null {
  if (!s) return null
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return new Date(+m[3], +m[2] - 1, +m[1])
}

export const IS_DATE  = /^\d{2}\/\d{2}\/\d{4}$/
export const IS_MONEY = /^-?[\d.]+,\d{2}$/
export const IS_INT_S = /^\d{1,4}$/     // nº carteira
export const IS_COD   = /^\d{4,6}$/     // código cliente
