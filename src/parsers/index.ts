// src/parsers/index.ts
// Detecta o formato do CSV e delega ao parser correto

import Papa from 'papaparse'
import type { ParseResult } from '../types'
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

export function parsearArquivo(buffer: ArrayBuffer): ParseResult {
  const rows    = decodificar(buffer)
  const formato = detectarFormato(rows)

  if (formato === 'bancos') {
    return parseBancos(rows)
  }
  return parseCarteira(rows)
}

export function parsearVarios(buffers: ArrayBuffer[]): ParseResult {
  const todos: ParseResult = { clientes: [], erros: [] }

  for (const buf of buffers) {
    const resultado = parsearArquivo(buf)
    todos.clientes.push(...resultado.clientes)
    todos.erros.push(...resultado.erros)
  }

  return todos
}
