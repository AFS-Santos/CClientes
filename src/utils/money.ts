// src/utils/money.ts

/** Converte "1.060,00" ou "-99,81" para float */
export function parseMoney(s: string): number | null {
  if (!s) return null
  const clean = s.trim().replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

/** Formata float para string BR "1.060,00" */
export function formatMoney(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
