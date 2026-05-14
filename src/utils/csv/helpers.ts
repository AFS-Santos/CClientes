// src/utils/csv/helpers.ts
// Helpers compartilhados para leitura de linhas do CSV do ERP

export const IS_DATE  = /^\d{2}\/\d{2}\/\d{4}$/
export const IS_MONEY = /^-?[\d.]+,\d{2}$/
export const IS_INT_S = /^\d{1,4}$/      // nº carteira
export const IS_COD   = /^\d{4,6}$/      // código cliente

/** Lê célula da linha, retorna '' para null/nan/undefined */
export function cell(row: string[], idx: number): string {
  if (idx < 0 || idx >= row.length) return ''
  const val = (row[idx] ?? '').trim()
  return val === 'nan' ? '' : val
}

/** Retorna o último valor monetário da linha */
export function lastMoney(row: string[]): string {
  let last = ''
  for (const val of row) {
    const t = val.trim()
    if (IS_MONEY.test(t)) last = t
  }
  return last
}

// ── findNear com confidence ──────────────────────────────────────────────────

export type MatchTipo = 'date' | 'money' | 'int'

export type Match = {
  value:      string
  confidence: number   // 0–1: 1 = mesmo índice do header, menor = mais longe
  offset:     number   // quantas colunas afastou do hdrCol
}

const NULL_MATCH: Match = { value: '', confidence: 0, offset: 0 }

const SEARCH_RANGE = [-2, -1, 0, 1, 2, 3, 4, 5] // offsets em ordem de preferência

/**
 * Busca o valor mais próximo de hdrCol do tipo esperado.
 * Retorna Match com confidence baseado na distância do offset.
 * confidence = 1.0 - (|offset| / 10) — penaliza offsets maiores.
 */
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
      if (Math.abs(off) >= 3 && warnFn) {
        warnFn(`findNear: offset alto (${off > 0 ? '+' : ''}${off}) para tipo=${tipo} hdrCol=${hdrCol} → val="${val}" confidence=${confidence.toFixed(2)}`)
      }
      return { value: val, confidence, offset: off }
    }
  }
  return NULL_MATCH
}

/** Versão simplificada — retorna só o valor (compatibilidade) */
export function findNearValue(
  row: string[],
  hdrCol: number,
  tipo: MatchTipo,
  warnFn?: (msg: string) => void
): string {
  return findNear(row, hdrCol, tipo, warnFn).value
}
