// src/parsers/index.ts
// Pipeline principal: decodificar → sanitize → parse → calcular totais

import Papa from 'papaparse'
import type { ParseResult, TotalFinal } from '../types'
import { decodificarBuffer } from '../utils/csv'
import { parseCarteira }     from './carteira.parser'
import { parseBancos }       from './bancos.parser'

type Row = string[]

// ── Etapa: detectar formato ───────────────────────────────────────────────────

function detectarFormato(rows: Row[]): 'carteira' | 'bancos' {
  for (const row of rows.slice(0, 20)) {
    if ((row[0] ?? '').trim() === 'Empresa:') return 'bancos'
  }
  return 'carteira'
}

// ── Etapa: parse CSV (PapaParse após sanitização) ─────────────────────────────

function parsearLinhas(texto: string): Row[] {
  const result = Papa.parse<Row>(texto, {
    delimiter:      '\x00',
    header:         false,
    skipEmptyLines: false,
    transform:      (val: string) => val.trim(),
  })
  return result.data as Row[]
}

// ── Etapa: calcular Total Geral ───────────────────────────────────────────────

function brFloat(s: string): number {
  return parseFloat((s || '0').replace(/\./g, '').replace(',', '.')) || 0
}

function brFormat(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Prioridade do Total Geral:
 * 1. Total Final do CSV (mais fiel ao ERP — inclui cálculos de juros internos)
 * 2. Soma dos totalizadores por cliente (calculados pelo ERP por cliente)
 * 3. Soma dos campos individuais dos títulos (fallback)
 */
function calcularTotalGeral(resultado: ParseResult): TotalFinal {
  if (resultado.totalFinal) {
    return { ...resultado.totalFinal, label: 'Total Geral' }
  }

  let totalTitulos = 0, saldoSemJuros = 0, saldoComJuros = 0

  for (const cli of resultado.clientes) {
    totalTitulos  += cli.totalTitulos  ? brFloat(cli.totalTitulos)  : cli.titulos.reduce((s, t) => s + brFloat(t.valor),      0)
    saldoSemJuros += cli.saldoSemJuros ? brFloat(cli.saldoSemJuros) : cli.titulos.reduce((s, t) => s + brFloat(t.saldoBruto), 0)
    saldoComJuros += cli.saldoComJuros ? brFloat(cli.saldoComJuros) : cli.titulos.reduce((s, t) => s + brFloat(t.saldo),      0)
  }

  return {
    label:         'Total Geral',
    totalTitulos:  brFormat(totalTitulos),
    saldoSemJuros: brFormat(saldoSemJuros),
    saldoComJuros: brFormat(saldoComJuros),
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

export function parsearArquivo(buffer: ArrayBuffer): ParseResult {
  // 1. Decodificar + sanitizar
  const texto   = decodificarBuffer(buffer)
  // 2. Parse CSV
  const rows    = parsearLinhas(texto)
  // 3. Detectar formato e delegar
  const formato = detectarFormato(rows)
  const resultado = formato === 'bancos' ? parseBancos(rows) : parseCarteira(rows)
  // 4. Calcular Total Geral
  resultado.totalFinal = calcularTotalGeral(resultado)
  return resultado
}

export function parsearVarios(buffers: ArrayBuffer[]): ParseResult {
  const consolidado: ParseResult = {
    clientes:   [],
    erros:      [],
    avisos:     [],
    totalFinal: null,
  }

  for (const buf of buffers) {
    const r = parsearArquivo(buf)
    consolidado.clientes.push(...r.clientes)
    consolidado.erros.push(...r.erros)
    consolidado.avisos.push(...r.avisos)
  }

  // Recalcular Total Geral consolidado
  consolidado.totalFinal = calcularTotalGeral(consolidado)
  return consolidado
}
