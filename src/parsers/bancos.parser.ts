// src/parsers/bancos.parser.ts
// Formato: BANCOS_*.csv — com linha Empresa, cliente em col[1] ou col[2]

import type { Cliente, Titulo, ParseResult, TotalFinal } from '../types'
import { IS_DATE, IS_MONEY, IS_INT_S, IS_COD } from '../utils/date'

type Row = string[]

function v(row: Row, idx: number): string {
  if (idx < 0 || idx >= row.length) return ''
  const val = (row[idx] ?? '').trim()
  return val === 'nan' ? '' : val
}

/** Busca o valor mais próximo de hdrCol do tipo esperado */
function findNear(row: Row, hdrCol: number, tipo: 'date' | 'money' | 'int'): string {
  for (let off = -3; off <= 5; off++) {
    const c = hdrCol + off
    const val = v(row, c)
    if (tipo === 'date'  && IS_DATE.test(val))  return val
    if (tipo === 'money' && IS_MONEY.test(val)) return val
    if (tipo === 'int'   && IS_INT_S.test(val)) return val
  }
  return ''
}

function getLastMoney(row: Row): string {
  let last = ''
  for (const val of row) {
    const t = val.trim()
    if (IS_MONEY.test(t)) last = t
  }
  return last
}

function extrairClienteInfo(row: Row): { codigo: string; nome: string; cpfcnpj: string } {
  const allVals: Record<number, string> = {}
  let cnpjIdx: number | null = null

  row.forEach((val, i) => {
    const t = val.trim()
    if (t && !['', 'nan', 'Cliente:', 'CNPJ:', 'CPF:'].includes(t)) {
      allVals[i] = t
    }
    if (t === 'CNPJ:' || t === 'CPF:') cnpjIdx = i
  })

  let codigo = '', nome = '', cpfcnpj = ''

  for (const c of Object.keys(allVals).map(Number).sort((a, b) => a - b)) {
    const val = allVals[c]
    if (IS_COD.test(val) && !codigo) { codigo = val; continue }
    if (val.length > 5 && !IS_MONEY.test(val) && !IS_COD.test(val) && !nome) { nome = val; continue }
    if (cnpjIdx !== null && c === (cnpjIdx as number) + 2) cpfcnpj = val
  }

  return { codigo, nome, cpfcnpj }
}

export function parseBancos(rows: Row[]): ParseResult {
  const clientes: Cliente[] = []
  let current: Cliente | null = null
  let empresaAtual = ''
  let colMap: Record<string, number> = {}
  let totalFinal: TotalFinal | null = null
  let capturandoTotal = false
  let totalTemp: Partial<TotalFinal> = {}

  for (const row of rows) {
    const col0 = v(row, 0)
    const col1 = v(row, 1)
    const col2 = v(row, 2)

    // Capturar Total Final (última linha de totais)
    if (col0.startsWith('Total Final')) {
      capturandoTotal = true
      totalTemp = { label: 'Total Final', totalTitulos: getLastMoney(row) }
      continue
    }
    if (capturandoTotal) {
      const rowStr = row.join('|')
      if (rowStr.toLowerCase().includes('sem juros')) {
        totalTemp.saldoSemJuros = getLastMoney(row); continue
      }
      if (rowStr.toLowerCase().includes('saldo a receber')) {
        totalTemp.saldoComJuros = getLastMoney(row)
        totalFinal = totalTemp as TotalFinal
        capturandoTotal = false; continue
      }
    }

    if (
      col0.startsWith('Total Empresa') ||
      col0.startsWith('Total Geral')
    ) continue  // pular, não break — Total Final vem depois

    // Linha de Empresa
    if (col0 === 'Empresa:') {
      const nonEmpty = row
        .map((val, i) => ({ i, val: val.trim() }))
        .filter(x => x.val && x.val !== 'Empresa:' && x.val !== 'nan')
        .sort((a, b) => a.i - b.i)
      empresaAtual = nonEmpty.length > 1 ? nonEmpty[1].val : ''
      continue
    }

    // Cabeçalho de colunas — mapear posições
    if (col0 === 'Título') {
      colMap = {}
      row.forEach((val, i) => {
        const t = val.trim()
        if (t && t !== 'nan') colMap[t] = i
      })
      continue
    }

    // Linha de cliente (col1 ou col2 == 'Cliente:')
    if (col1 === 'Cliente:' || col2 === 'Cliente:') {
      const { codigo, nome, cpfcnpj } = extrairClienteInfo(row)
      current = {
        empresa:       empresaAtual,
        codigo,
        nome,
        cpfcnpj,
        titulos:       [],
        totalTitulos:  '',
        saldoSemJuros: '',
        saldoComJuros: '',
      }
      clientes.push(current)
      continue
    }

    if (!current || Object.keys(colMap).length === 0) continue

    const rowStr = row.join('|')

    if (col0.toLowerCase() === 'total cliente:') {
      current.totalTitulos = getLastMoney(row); continue
    }
    if (rowStr.toLowerCase().includes('sem juros')) {
      current.saldoSemJuros = getLastMoney(row); continue
    }
    if (rowStr.includes('Saldo a Receber.....')) {
      current.saldoComJuros = getLastMoney(row); continue
    }

    if (!/^\d+$/.test(col0)) continue

    const titulo: Titulo = {
      titulo:     col0,
      emissao:    findNear(row, colMap['Emissão']     ?? 99, 'date'),
      vencimento: findNear(row, colMap['Vencimento']  ?? 99, 'date'),
      valor:      findNear(row, colMap['Valor']        ?? 99, 'money'),
      saldoBruto: findNear(row, colMap['Saldo Bruto']  ?? 99, 'money'),
      saldo:      findNear(row, colMap['Saldo']         ?? 99, 'money'),
      nrCarteira: findNear(row, colMap['Carteira']      ?? 99, 'int'),
      anotacao:   '',
    }
    current.titulos.push(titulo)
  }

  return {
    clientes:   clientes.filter(c => c.titulos.length > 0),
    erros:      [],
    totalFinal,
  }
}
