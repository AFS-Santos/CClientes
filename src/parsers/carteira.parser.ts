// src/parsers/carteira.parser.ts
// Pipeline: sanitize → parse → normalize headers → infer columns → transform → validate
// Formato: carteira_*.csv — sem linha Empresa, cliente em col[0]

import type { Cliente, ParseResult } from '../types'
import { cell, lastMoney, findNearValue, IS_DATE, IS_COD } from '../utils/csv'
import { buildColMap } from '../utils/csv'

type Row = string[]

// ── helpers locais ────────────────────────────────────────────────────────────

function warn(avisos: string[], msg: string) {
  avisos.push(`[carteira.parser] ${msg}`)
}

// ── extração de título (etapa: transform) ─────────────────────────────────────

function extrairTitulo(row: Row, colMap: Record<string, number>, avisos: string[]) {
  const warnFn = (m: string) => warn(avisos, m)

  if (Object.keys(colMap).length > 0) {
    return {
      titulo:     cell(row, 0),
      emissao:    findNearValue(row, colMap['emissao']     ?? 99, 'date',  warnFn),
      vencimento: findNearValue(row, colMap['vencimento']  ?? 99, 'date',  warnFn),
      valor:      findNearValue(row, colMap['valor']        ?? 99, 'money', warnFn),
      saldoBruto: findNearValue(row, colMap['saldo_bruto']  ?? 99, 'money', warnFn),
      saldo:      findNearValue(row, colMap['saldo']         ?? 99, 'money', warnFn),
      nrCarteira: findNearValue(row, colMap['carteira']      ?? 99, 'int',   warnFn),
      anotacao:   '',
    }
  }
  // Fallback: detectar layout pelo dado (arquivos sem cabeçalho explícito)
  const c3  = cell(row, 3)
  const lay = c3 && IS_DATE.test(c3) ? 'A' : 'B'
  warn(avisos, `colMap vazio — usando fallback layout ${lay} para título ${cell(row,0)}`)
  return lay === 'A'
    ? { titulo: cell(row,0), emissao: cell(row,3), vencimento: cell(row,8), valor: cell(row,14), saldoBruto: cell(row,18), saldo: cell(row,20), nrCarteira: cell(row,24), anotacao: '' }
    : { titulo: cell(row,0), emissao: cell(row,2), vencimento: cell(row,7), valor: cell(row,12), saldoBruto: cell(row,16), saldo: cell(row,18), nrCarteira: cell(row,22), anotacao: '' }
}

// ── parser principal ──────────────────────────────────────────────────────────

export function parseCarteira(rows: Row[]): ParseResult {
  const clientes: Cliente[]            = []
  const erros:    string[]             = []
  const avisos:   string[]             = []
  let current:    Cliente | null       = null
  let totalFinal: ParseResult['totalFinal'] = null
  let capturandoTotal                  = false
  let totalTemp:  Partial<NonNullable<ParseResult['totalFinal']>> = {}
  let colMap:     Record<string, number> = {}

  for (const row of rows) {
    const col0 = cell(row, 0)

    // ── etapa: capturar Total Geral do CSV ──
    if (col0.startsWith('Total Geral')) {
      capturandoTotal = true
      totalTemp = { label: 'Total Geral', totalTitulos: lastMoney(row) }
      continue
    }
    if (capturandoTotal) {
      const rs = row.join('|')
      if (rs.toLowerCase().includes('sem juros')) {
        totalTemp.saldoSemJuros = lastMoney(row); continue
      }
      if (rs.includes('Saldo a Receber.....')) {
        totalTemp.saldoComJuros = lastMoney(row)
        totalFinal = totalTemp as NonNullable<ParseResult['totalFinal']>
        capturandoTotal = false; continue
      }
    }

    // ── etapa: normalize headers → buildColMap ──
    if (col0 === 'Título') {
      colMap = buildColMap(row)
      continue
    }

    // ── etapa: linha de cliente ──
    if (col0 === 'Cliente:') {
      const c5    = cell(row, 5)
      const c4    = cell(row, 4)
      const usaC5 = c5 && IS_COD.test(c5)
      current = {
        empresa: '', codigo: usaC5 ? c5 : c4,
        nome:    usaC5 ? cell(row, 9)  : cell(row, 8),
        cpfcnpj: usaC5 ? cell(row, 22) : cell(row, 20),
        titulos: [], totalTitulos: '', saldoSemJuros: '', saldoComJuros: '', anotacao: '',
      } as unknown as Cliente
      clientes.push(current)
      continue
    }

    if (!current) continue

    const rowStr = row.join('|')

    // ── etapa: totalizadores por cliente ──
    if (col0 === 'Total Cliente:') {
      current.totalTitulos = lastMoney(row); continue
    }
    if (rowStr.toLowerCase().includes('sem juros')) {
      current.saldoSemJuros = lastMoney(row); continue
    }
    if (rowStr.includes('Saldo a Receber.....')) {
      current.saldoComJuros = lastMoney(row); continue
    }

    // ── etapa: linha de título ──
    if (!/^\d+$/.test(col0)) continue

    current.titulos.push(extrairTitulo(row, colMap, avisos) as Cliente['titulos'][number])
  }

  return {
    clientes: clientes.filter(c => c.titulos.length > 0),
    erros,
    avisos,
    totalFinal,
  }
}
