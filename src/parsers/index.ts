// src/parsers/index.ts
// Detecta o formato do CSV e delega ao parser correto

import Papa from 'papaparse'
import type { ParseResult, TotalFinal } from '../types'
import { parseCarteira } from './carteira.parser'
import { parseBancos }   from './bancos.parser'

type Row = string[]

/** Lê o arquivo como Windows-1252 e retorna as linhas */
function decodificar(buffer: ArrayBuffer): Row[] {
  const decoder = new TextDecoder('windows-1252')
  const text    = decoder.decode(buffer)

  const result  = Papa.parse<Row>(text, {
    delimiter:      '\x00',
    header:         false,
    skipEmptyLines: false,
    transform:      (val: string) => val.trim(),
  })

  return result.data as Row[]
}

/** Detecta o formato pelo conteúdo do arquivo */
function detectarFormato(rows: Row[]): 'carteira' | 'bancos' {
  for (const row of rows.slice(0, 20)) {
    const col0 = (row[0] ?? '').trim()
    if (col0 === 'Empresa:') return 'bancos'
  }
  return 'carteira'
}

function brFloat(s: string): number {
  return parseFloat((s || '0').replace(/\./g, '').replace(',', '.')) || 0
}

function brFormat(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Calcula o Total Geral sempre a partir dos dados extraídos — independente do CSV */
function calcularTotalGeral(resultado: ParseResult): TotalFinal {
  let totalTitulos  = 0
  let saldoSemJuros = 0
  let saldoComJuros = 0

  for (const cli of resultado.clientes) {
    // Total Títulos = soma de todos os Valores originais
    for (const t of cli.titulos) {
      totalTitulos  += brFloat(t.valor)
      saldoComJuros += brFloat(t.saldo)
    }
    // Saldo sem juros = soma dos Saldo Bruto de cada título
    for (const t of cli.titulos) {
      saldoSemJuros += brFloat(t.saldoBruto)
    }
  }

  return {
    label:         'Total Geral',
    totalTitulos:  brFormat(totalTitulos),
    saldoSemJuros: brFormat(saldoSemJuros),
    saldoComJuros: brFormat(saldoComJuros),
  }
}

export function parsearArquivo(buffer: ArrayBuffer): ParseResult {
  const rows    = decodificar(buffer)
  const formato = detectarFormato(rows)

  if (formato === 'bancos') {
    return parseBancos(rows)
  }
  return parseCarteira(rows)
}

export function parsearVarios(buffers: ArrayBuffer[]): ParseResult {
  const todos: ParseResult = { clientes: [], erros: [], totalFinal: null }

  for (const buf of buffers) {
    const resultado = parsearArquivo(buf)
    todos.clientes.push(...resultado.clientes)
    todos.erros.push(...resultado.erros)
  }

  // Sempre calcular o total a partir dos dados — não depende do CSV
  todos.totalFinal = calcularTotalGeral(todos)

  return todos
}
