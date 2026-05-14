// src/utils/csv/helpers.ts
import { sanitizeCell } from './sanitize'

export const IS_DATE  = /^\d{2}\/\d{2}\/\d{4}$/
export const IS_MONEY = /^-?[\d.]+,\d{2}$/
export const IS_INT_S = /^\d{1,4}$/
export const IS_COD   = /^\d{4,6}$/

/** Lê célula da linha, sanitiza e retorna '' para null/nan */
export function cell(row: string[], idx: number): string {
  if (idx < 0 || idx >= row.length) return ''
  const val = sanitizeCell(row[idx] ?? '')
  return val === 'nan' ? '' : val
}

/** Retorna o último valor monetário da linha */
export function lastMoney(row: string[]): string {
  let last = ''
  for (const val of row) {
    const t = sanitizeCell(val)
    if (IS_MONEY.test(t)) last = t
  }
  return last
}

export type MatchTipo = 'date' | 'money' | 'int'

export type Match = {
  value:      string
  confidence: number
  offset:     number
}

const NULL_MATCH: Match = { value: '', confidence: 0, offset: 0 }
const SEARCH_RANGE = [-2, -1, 0, 1, 2, 3, 4, 5]

// Cache de avisos já emitidos — evita poluição do console com repetições
const _warnCache = new Set<string>()

export function findNear(
  row: string[],
  hdrCol: number,
  tipo: MatchTipo,
  warnFn?: (msg: string) => void
): Match {
  for (const off of SEARCH_RANGE) {
    const c   = hdrCol + off
    const val = cell(row, c)
    const ok  =
      (tipo === 'date'  && IS_DATE.test(val))  ||
      (tipo === 'money' && IS_MONEY.test(val)) ||
      (tipo === 'int'   && IS_INT_S.test(val))

    if (ok) {
      const confidence = Math.max(0.1, 1.0 - Math.abs(off) / 10)
      // Só avisa se offset >= 4 e nunca repetiu o mesmo hdrCol+tipo
      if (Math.abs(off) >= 4 && warnFn) {
        const key = `${tipo}:${hdrCol}:${off}`
        if (!_warnCache.has(key)) {
          _warnCache.add(key)
          warnFn(`findNear: offset alto (${off > 0 ? '+' : ''}${off}) tipo=${tipo} hdrCol=${hdrCol} — verificar layout do CSV`)
        }
      }
      return { value: val, confidence, offset: off }
    }
  }
  return NULL_MATCH
}

export function findNearValue(
  row: string[],
  hdrCol: number,
  tipo: MatchTipo,
  warnFn?: (msg: string) => void
): string {
  return findNear(row, hdrCol, tipo, warnFn).value
}
