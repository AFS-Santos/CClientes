// src/parsers/bancos.parser.ts
// Pipeline: sanitize → parse → normalize headers → infer columns → transform → validate
// Formato: BANCOS_*.csv — com linha Empresa:, cliente em col[1] ou col[2]

import type { Cliente, ParseResult } from '../types'
import { cell, lastMoney, findNearValue, IS_MONEY, IS_COD } from '../utils/csv'
import { buildColMap } from '../utils/csv'

type Row = string[]

function warn(avisos: string[], msg: string) {
  avisos.push(`[bancos.parser] ${msg}`)
}

function extrairClienteInfo(row: Row): { codigo: string; nome: string; cpfcnpj: string } {
  const allVals: Record<number, string> = {}
  let cnpjIdx: number | null = null

  row.forEach((val, i) => {
    const t = val.trim()
    if (t && !['', 'nan', 'Cliente:', 'CNPJ:', 'CPF:'].includes(t)) allVals[i] = t
    if (t === 'CNPJ:' || t === 'CPF:') cnpjIdx = i
  })

  let codigo = '', nome = '', cpfcnpj = ''

  for (const c of Object.keys(allVals).map(Number).sort((a, b) => a - b)) {
    const val = allVals[c]
    if (IS_COD.test(val) && !codigo)                                          { codigo = val; continue }
    if (val.length > 5 && !IS_MONEY.test(val) && !IS_COD.test(val) && !nome) { nome   = val; continue }
    if (cnpjIdx !== null && c === (cnpjIdx as number) + 2)                   cpfcnpj = val
  }

  return { codigo, nome, cpfcnpj }
}

export function parseBancos(rows: Row[]): ParseResult {
  const clientes: Cliente[]            = []
  const erros:    string[]             = []
  const avisos:   string[]             = []
  let current:    Cliente | null       = null
  let totalFinal: ParseResult['totalFinal'] = null
  let capturandoFinal                  = false
  let totalTemp:  Partial<NonNullable<ParseResult['totalFinal']>> = {}
  let colMap:     Record<string, number> = {}
  let empresaAtual = ''

  for (const row of rows) {
    const col0 = cell(row, 0)
    const col1 = cell(row, 1)
    const col2 = cell(row, 2)

    // ── Total Empresa → fechar cliente (evita vazamento dos totais globais) ──
    if (col0.startsWith('Total Empresa') || col0.startsWith('Total Geral')) {
      current = null; continue
    }

    // ── Capturar Total Final ──
    if (col0.startsWith('Total Final')) {
      current = null
      capturandoFinal = true
      totalTemp = { label: 'Total Final', totalTitulos: lastMoney(row) }
      continue
    }
    if (capturandoFinal) {
      const rs = row.join('|')
      if (rs.toLowerCase().includes('sem juros')) {
        totalTemp.saldoSemJuros = lastMoney(row); continue
      }
      if (rs.toLowerCase().includes('saldo a receber') && !rs.toLowerCase().includes('sem juros')) {
        totalTemp.saldoComJuros = lastMoney(row)
        totalFinal = totalTemp as NonNullable<ParseResult['totalFinal']>
        capturandoFinal = false; continue
      }
    }

    // ── Linha de Empresa ──
    if (col0 === 'Empresa:') {
      const nonEmpty = row
        .map((v, i) => ({ i, v: v.trim() }))
        .filter(x => x.v && x.v !== 'Empresa:' && x.v !== 'nan')
        .sort((a, b) => a.i - b.i)
      empresaAtual = nonEmpty.length > 1 ? nonEmpty[1].v : ''
      continue
    }

    // ── Normalize headers → buildColMap ──
    if (col0 === 'Título') {
      colMap = buildColMap(row)
      continue
    }

    // ── Linha de cliente ──
    if (col1 === 'Cliente:' || col2 === 'Cliente:') {
      const { codigo, nome, cpfcnpj } = extrairClienteInfo(row)
      current = {
        empresa: empresaAtual, codigo, nome, cpfcnpj,
        titulos: [], totalTitulos: '', saldoSemJuros: '', saldoComJuros: '', anotacao: '',
      } as unknown as Cliente
      clientes.push(current)
      continue
    }

    if (!current || Object.keys(colMap).length === 0) continue

    const rowStr = row.join('|')

    // ── Totalizadores por cliente ──
    if (col0.toLowerCase() === 'total cliente:') {
      current.totalTitulos = lastMoney(row); continue
    }
    if (rowStr.toLowerCase().includes('sem juros')) {
      current.saldoSemJuros = lastMoney(row); continue
    }
    if (rowStr.includes('Saldo a Receber.....')) {
      current.saldoComJuros = lastMoney(row); continue
    }

    // ── Linha de título ──
    if (!/^\d+$/.test(col0)) continue

    const warnFn = (m: string) => warn(avisos, m)

    current.titulos.push({
      titulo:     col0,
      emissao:    findNearValue(row, colMap['emissao']     ?? 99, 'date',  warnFn),
      vencimento: findNearValue(row, colMap['vencimento']  ?? 99, 'date',  warnFn),
      valor:      findNearValue(row, colMap['valor']        ?? 99, 'money', warnFn),
      saldoBruto: findNearValue(row, colMap['saldo_bruto']  ?? 99, 'money', warnFn),
      saldo:      findNearValue(row, colMap['saldo']         ?? 99, 'money', warnFn),
      nrCarteira: findNearValue(row, colMap['carteira']      ?? 99, 'int',   warnFn),
      anotacao:   '',
    } as Cliente['titulos'][number])
  }

  return {
    clientes: clientes.filter(c => c.titulos.length > 0),
    erros,
    avisos,
    totalFinal,
  }
}
