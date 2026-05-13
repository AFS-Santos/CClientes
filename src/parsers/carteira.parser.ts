// src/parsers/carteira.parser.ts
// Formato: carteira_8.csv — sem linha Empresa, cliente em col[0]

import type { Cliente, Titulo, ParseResult } from '../types'
import { IS_DATE, IS_MONEY } from '../utils/date'

type Row = string[]

function v(row: Row, idx: number): string {
  if (idx < 0 || idx >= row.length) return ''
  const val = (row[idx] ?? '').trim()
  return val === 'nan' ? '' : val
}

function detectLayout(row: Row): 'A' | 'B' {
  const c3 = v(row, 3)
  return c3 && IS_DATE.test(c3) ? 'A' : 'B'
}

function extrairTitulo(row: Row): Titulo {
  const lay = detectLayout(row)
  if (lay === 'A') {
    return {
      titulo:     v(row, 0),
      emissao:    v(row, 3),
      vencimento: v(row, 8),
      valor:      v(row, 14),
      saldoBruto: v(row, 18),
      saldo:      v(row, 20),
      nrCarteira: v(row, 24),
      anotacao:   '',
    }
  }
  return {
    titulo:     v(row, 0),
    emissao:    v(row, 2),
    vencimento: v(row, 7),
    valor:      v(row, 12),
    saldoBruto: v(row, 16),
    saldo:      v(row, 18),
    nrCarteira: v(row, 22),
    anotacao:   '',
  }
}

function getLastMoney(row: Row): string {
  let last = ''
  for (const val of row) {
    const t = val.trim()
    if (IS_MONEY.test(t)) last = t
  }
  return last
}

export function parseCarteira(rows: Row[]): ParseResult {
  const clientes: Cliente[] = []
  let current: Cliente | null = null

  for (const row of rows) {
    const col0 = v(row, 0)

    if (col0.startsWith('Total Geral')) break

    if (col0 === 'Cliente:') {
      const c5 = v(row, 5)
      const c4 = v(row, 4)
      const usaC5 = c5 && /^\d{4,6}$/.test(c5)
      current = {
        empresa:       '',
        codigo:        usaC5 ? c5 : c4,
        nome:          usaC5 ? v(row, 9) : v(row, 8),
        cpfcnpj:       usaC5 ? v(row, 22) : v(row, 20),
        titulos:       [],
        totalTitulos:  '',
        saldoSemJuros: '',
        saldoComJuros: '',
      }
      clientes.push(current)
      continue
    }

    if (!current) continue

    const rowStr = row.join('|')

    if (col0 === 'Total Cliente:') {
      current.totalTitulos = getLastMoney(row)
      continue
    }
    if (rowStr.toLowerCase().includes('sem juros')) {
      current.saldoSemJuros = getLastMoney(row)
      continue
    }
    if (rowStr.includes('Saldo a Receber.....')) {
      current.saldoComJuros = getLastMoney(row)
      continue
    }

    if (!/^\d+$/.test(col0)) continue

    current.titulos.push(extrairTitulo(row))
  }

  return {
    clientes: clientes.filter(c => c.titulos.length > 0),
    erros: [],
  }
}
