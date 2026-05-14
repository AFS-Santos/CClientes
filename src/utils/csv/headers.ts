// src/utils/csv/headers.ts
// Normalização e mapeamento de headers — tolerante a variações do ERP

/**
 * Normaliza um header: remove acentos, lowercase, substitui espaços por _.
 * Ex: "Emissão" → "emissao", "Saldo Bruto" → "saldo_bruto"
 */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remover diacríticos
    .replace(/[^\w\s]/g, '')         // remover pontuação
    .replace(/\s+/g, '_')            // espaços → _
}

/**
 * Aliases: mapeia variações conhecidas do ERP para chaves canônicas.
 * Chave = canônico, valores = variações normalizadas que mapeiam para ele.
 */
const ALIASES: Record<string, string[]> = {
  titulo:      ['titulo', 'ttulo', 'num_titulo', 'numero', 'nr'],
  emissao:     ['emissao', 'dt_emissao', 'data_emissao', 'emiss'],
  vencimento:  ['vencimento', 'vencto', 'dt_vencimento', 'venc'],
  valor:       ['valor', 'valor_titulo', 'vl_titulo', 'vl_original'],
  saldo_bruto: ['saldo_bruto', 'saldo_sem_juros', 'vl_saldo_bruto'],
  saldo:       ['saldo', 'saldo_atual', 'vl_saldo', 'saldo_devedor'],
  carteira:    ['carteira', 'nr_carteira', 'num_carteira', 'crt'],
  despesas:    ['despesas', 'desp', 'vl_despesas'],
  origem:      ['origem', 'nfe', 'nota_fiscal'],
}

/** Resolve variações para a chave canônica. Retorna null se não reconhecer. */
export function resolveAlias(normalized: string): string | null {
  for (const [canonical, variants] of Object.entries(ALIASES)) {
    if (variants.includes(normalized)) return canonical
  }
  return null
}

/**
 * Constrói o colMap a partir de uma linha de header do CSV.
 * Retorna { chaveCanonica: índiceColuna }
 */
export function buildColMap(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  headerRow.forEach((cell, i) => {
    const norm     = normalizeHeader(cell)
    if (!norm) return
    const canonical = resolveAlias(norm) ?? norm
    map[canonical] = i
  })
  return map
}
