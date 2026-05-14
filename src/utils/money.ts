// src/utils/money.ts
export function parseMoney(s: string): number | null {
  if (!s) return null
  const n = parseFloat(s.trim().replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

export function formatMoney(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
