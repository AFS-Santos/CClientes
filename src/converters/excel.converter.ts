// src/converters/excel.converter.ts

import ExcelJS from 'exceljs'
import type { Cliente, TotalFinal } from '../types'
import { parseMoney } from '../utils/money'
import { parseDate }  from '../utils/date'

const COLS   = ['Título','Emissão','Vencimento','Valor','Saldo Bruto','Saldo','Nº Carteira','Anotação'] as const
const WIDTHS = [13, 12, 12, 15, 15, 15, 12, 18]

const FMT_MOEDA = '"R$"\\ #,##0.00'
const FMT_DATA  = 'DD/MM/YYYY'
const FMT_INT   = '0'

type Cor = string

function cor(hex: Cor): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + hex.toUpperCase() } }
}

function fnt(opts: { bold?: boolean; size?: number; color?: Cor; italic?: boolean }): Partial<ExcelJS.Font> {
  return {
    name:   'Arial',
    size:   opts.size  ?? 9,
    bold:   opts.bold  ?? false,
    italic: opts.italic ?? false,
    color:  { argb: 'FF' + (opts.color ?? '1A1A1A').toUpperCase() },
  }
}

function aln(h: ExcelJS.Alignment['horizontal'] = 'left'): Partial<ExcelJS.Alignment> {
  return { horizontal: h, vertical: 'middle' }
}

const THIN: Partial<ExcelJS.Border> = { style: 'thin',   color: { argb: 'FFCCCCCC' } }
const MED:  Partial<ExcelJS.Border> = { style: 'medium', color: { argb: 'FF999999' } }

function brdD(): Partial<ExcelJS.Borders> {
  return { left: THIN, right: THIN, top: THIN, bottom: THIN }
}
function brdH(): Partial<ExcelJS.Borders> {
  return { left: THIN, right: THIN, top: MED, bottom: MED }
}
function brdT(last = false): Partial<ExcelJS.Borders> {
  return { left: THIN, right: THIN, top: THIN, bottom: last ? MED : THIN }
}

function escreverClientes(ws: ExcelJS.Worksheet, clientes: Cliente[]): void {
  for (const cli of clientes) {
    if (!cli.titulos.length) continue
    const qtd = cli.titulos.length

    // Linha nome
    const nomeTexto = cli.empresa
      ? `  ${cli.codigo}  —  ${cli.nome}  |  ${cli.empresa}`
      : `  ${cli.codigo}  —  ${cli.nome}`

    const rNome = ws.addRow([nomeTexto, '', '', '', '', '', '', ''])
    ws.mergeCells(`A${rNome.number}:H${rNome.number}`)
    rNome.height = 22
    const cNome = rNome.getCell(1)
    cNome.fill      = cor('1F3864')
    cNome.font      = fnt({ bold: true, size: 11, color: 'FFFFFF' })
    cNome.alignment = aln('left')

    // Linha CPF + qtd
    const rCpf = ws.addRow([`  CPF/CNPJ: ${cli.cpfcnpj}`, '', '', '', '', `${qtd} título(s)  `, '', ''])
    ws.mergeCells(`A${rCpf.number}:F${rCpf.number}`)
    ws.mergeCells(`G${rCpf.number}:H${rCpf.number}`)
    rCpf.height = 15
    const cCpf = rCpf.getCell(1)
    cCpf.fill = cor('263F6B'); cCpf.font = fnt({ size: 9, color: 'C8D8F0', italic: true }); cCpf.alignment = aln('left')
    const cQtd = rCpf.getCell(7)
    cQtd.fill = cor('263F6B'); cQtd.font = fnt({ size: 9, color: 'C8D8F0', italic: true }); cQtd.alignment = aln('right')

    // Header colunas
    const rHdr = ws.addRow([...COLS])
    rHdr.height = 17
    for (let c = 1; c <= 8; c++) {
      const cell = rHdr.getCell(c)
      cell.fill = cor('A50000'); cell.font = fnt({ bold: true, color: 'FFFFFF' })
      cell.alignment = aln('center'); cell.border = brdH()
    }

    // Linhas de dados
    for (let i = 0; i < cli.titulos.length; i++) {
      const rec = cli.titulos[i]
      const bg  = i % 2 === 0 ? 'F4F6FA' : 'FFFFFF'

      const vals: (string | number | Date | null)[] = [
        parseInt(rec.titulo)   || rec.titulo,
        parseDate(rec.emissao),
        parseDate(rec.vencimento),
        parseMoney(rec.valor),
        parseMoney(rec.saldoBruto),
        parseMoney(rec.saldo),
        parseInt(rec.nrCarteira) || rec.nrCarteira || '',
        '',
      ]

      const rDad = ws.addRow(vals)
      rDad.height = 15

      const colNames = [...COLS]
      for (let c = 1; c <= 8; c++) {
        const cell    = rDad.getCell(c)
        const colName = colNames[c - 1]
        cell.fill   = cor(bg)
        cell.font   = fnt({ color: '1A1A1A' })
        cell.border = brdD()

        if (['Valor', 'Saldo Bruto', 'Saldo'].includes(colName)) {
          cell.numFmt    = FMT_MOEDA
          cell.alignment = aln('right')
        } else if (['Emissão', 'Vencimento'].includes(colName)) {
          cell.numFmt    = FMT_DATA
          cell.alignment = aln('center')
        } else if (['Título', 'Nº Carteira'].includes(colName)) {
          cell.numFmt    = FMT_INT
          cell.alignment = aln('center')
        } else {
          cell.alignment = aln('left')
        }
      }
    }

    // Separador
    const rSep = ws.addRow(['', '', '', '', '', '', '', ''])
    rSep.height = 3
    for (let c = 1; c <= 8; c++) {
      rSep.getCell(c).fill   = cor('D0D8E8')
      rSep.getCell(c).border = { top: MED, bottom: MED }
    }

    // Totalizadores
    const tots: [string, string, Cor, Cor][] = [
      ['Total Títulos (Valor Original):',   cli.totalTitulos,  'DDEEFF', '1A3A5C'],
      ['Saldo a Receber sem Juros/Multa:',  cli.saldoSemJuros, 'DDEFDD', '1A4C2E'],
      ['Saldo a Receber (c/ Juros/Multa):', cli.saldoComJuros, 'FFF3D0', '7F5500'],
    ]

    for (let ti = 0; ti < tots.length; ti++) {
      const [label, valorStr, bgHex, fgHex] = tots[ti]
      const last  = ti === tots.length - 1
      const valor = parseMoney(valorStr)

      const rTot = ws.addRow([label, valor, '', '', '', '', '', ''])
      rTot.height = 16

      const cLbl = rTot.getCell(1)
      cLbl.fill = cor(bgHex); cLbl.font = fnt({ bold: true, size: 9, color: fgHex })
      cLbl.alignment = aln('right'); cLbl.border = brdT(last)

      const cVal = rTot.getCell(2)
      cVal.fill = cor(bgHex); cVal.font = fnt({ bold: true, size: 10, color: fgHex })
      cVal.numFmt = FMT_MOEDA; cVal.alignment = aln('right'); cVal.border = brdT(last)

      for (let c = 3; c <= 8; c++) {
        const cell = rTot.getCell(c)
        cell.fill = cor(bgHex); cell.border = brdT(last)
      }
    }

    // Espaço entre clientes
    const rEsp = ws.addRow(['', '', '', '', '', '', '', ''])
    rEsp.height = 10
    for (let c = 1; c <= 8; c++) rEsp.getCell(c).fill = cor('F0F2F7')
  }
}

function escreverTotalFinal(ws: ExcelJS.Worksheet, total: TotalFinal): void {
  // Linha de separação mais grossa antes do total
  const rSep = ws.addRow(['', '', '', '', '', '', '', ''])
  rSep.height = 6
  for (let c = 1; c <= 8; c++) {
    const cell = rSep.getCell(c)
    cell.fill   = cor('1F3864')
    cell.border = { top: MED, bottom: MED }
  }

  // Título do bloco
  const rTit = ws.addRow([`  ${total.label}`, '', '', '', '', '', '', ''])
  ws.mergeCells(`A${rTit.number}:H${rTit.number}`)
  rTit.height = 22
  const cTit = rTit.getCell(1)
  cTit.fill      = cor('1F3864')
  cTit.font      = fnt({ bold: true, size: 11, color: 'FFFFFF' })
  cTit.alignment = aln('left')

  // 3 linhas de total
  const tots: [string, string, Cor, Cor][] = [
    ['Total Títulos (Valor Original):',   total.totalTitulos,  'DDEEFF', '1A3A5C'],
    ['Saldo a Receber sem Juros/Multa:',  total.saldoSemJuros, 'DDEFDD', '1A4C2E'],
    ['Saldo a Receber (c/ Juros/Multa):', total.saldoComJuros, 'FFF3D0', '7F5500'],
  ]

  for (let ti = 0; ti < tots.length; ti++) {
    const [label, valorStr, bgHex, fgHex] = tots[ti]
    const last  = ti === tots.length - 1
    const valor = parseMoney(valorStr)

    const rTot = ws.addRow([label, valor, '', '', '', '', '', ''])
    rTot.height = 18

    const cLbl = rTot.getCell(1)
    cLbl.fill      = cor(bgHex)
    cLbl.font      = fnt({ bold: true, size: 10, color: fgHex })
    cLbl.alignment = aln('right')
    cLbl.border    = brdT(last)

    const cVal = rTot.getCell(2)
    cVal.fill      = cor(bgHex)
    cVal.font      = fnt({ bold: true, size: 11, color: fgHex })
    cVal.numFmt    = FMT_MOEDA
    cVal.alignment = aln('right')
    cVal.border    = brdT(last)

    for (let c = 3; c <= 8; c++) {
      const cell  = rTot.getCell(c)
      cell.fill   = cor(bgHex)
      cell.border = brdT(last)
    }
  }
}

export async function gerarExcel(clientes: Cliente[], nomeArquivo: string, totalFinal?: TotalFinal | null): Promise<void> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'DENSUL Conversor'

  const ws = wb.addWorksheet('Carteira de Clientes')
  ws.views = [{ showGridLines: false }]

  WIDTHS.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  // Título global
  const r1 = ws.addRow(['TÍTULOS A RECEBER  —  CARTEIRA DE CLIENTES', '', '', '', '', '', '', ''])
  ws.mergeCells(`A${r1.number}:H${r1.number}`)
  r1.height = 30
  const c1 = r1.getCell(1)
  c1.fill = cor('1F3864'); c1.font = fnt({ bold: true, size: 13, color: 'FFFFFF' }); c1.alignment = aln('center')

  escreverClientes(ws, clientes)

  // Total Final no fim da planilha
  if (totalFinal) {
    escreverTotalFinal(ws, totalFinal)
  }

  // Download
  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = nomeArquivo.replace(/\.csv$/i, '') + '.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
