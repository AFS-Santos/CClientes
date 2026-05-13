// src/ui/preview.ts
import type { Cliente } from '../types'

const COLS = ['Título','Emissão','Vencimento','Valor','Saldo Bruto','Saldo','Nº Carteira','Anotação']
const NUM_COLS = new Set(['Valor','Saldo Bruto','Saldo'])
const CTR_COLS = new Set(['Emissão','Vencimento','Título','Nº Carteira'])

export function renderPreview(clientes: Cliente[], container: HTMLElement): void {
  container.innerHTML = ''

  const table  = document.createElement('table')
  const thead  = document.createElement('thead')
  const trh    = document.createElement('tr')
  trh.className = 'row-header'

  COLS.forEach(col => {
    const th = document.createElement('th')
    th.textContent = col
    trh.appendChild(th)
  })
  thead.appendChild(trh)
  table.appendChild(thead)

  const tbody = document.createElement('tbody')

  for (const cli of clientes) {
    // Linha cliente
    const trCli = document.createElement('tr')
    trCli.className = 'row-cliente'
    const tdCli = document.createElement('td')
    tdCli.colSpan = 8
    const empTag = cli.empresa ? `  |  ${cli.empresa}` : ''
    tdCli.textContent = `${cli.codigo}  —  ${cli.nome}${empTag}   |   CPF/CNPJ: ${cli.cpfcnpj}   |   ${cli.titulos.length} título(s)`
    trCli.appendChild(tdCli)
    tbody.appendChild(trCli)

    // Dados
    cli.titulos.forEach(rec => {
      const tr = document.createElement('tr')
      tr.className = 'row-data'
      const vals = [rec.titulo, rec.emissao, rec.vencimento, rec.valor, rec.saldoBruto, rec.saldo, rec.nrCarteira, rec.anotacao]
      COLS.forEach((col, i) => {
        const td = document.createElement('td')
        td.textContent = vals[i] ?? ''
        if (NUM_COLS.has(col)) td.className = 'num'
        else if (CTR_COLS.has(col)) td.className = 'ctr'
        tr.appendChild(td)
      })
      tbody.appendChild(tr)
    })

    // Totais
    const tots: [string, string, string, number][] = [
      ['row-tot1', 'Total Títulos (Valor Original):', cli.totalTitulos,  3],
      ['row-tot2', 'Saldo a Receber sem Juros/Multa:', cli.saldoSemJuros, 4],
      ['row-tot3', 'Saldo a Receber (c/ Juros/Multa):', cli.saldoComJuros, 5],
    ]
    for (const [cls, label, val, vc] of tots) {
      const tr = document.createElement('tr')
      tr.className = cls
      for (let i = 0; i < 8; i++) {
        const td = document.createElement('td')
        if (i === 0) td.textContent = label
        else if (i === vc) { td.textContent = val; td.style.textAlign = 'right' }
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }

    // Espaço
    const trSp = document.createElement('tr')
    trSp.className = 'row-spacer'
    const tdSp = document.createElement('td')
    tdSp.colSpan = 8
    trSp.appendChild(tdSp)
    tbody.appendChild(trSp)
  }

  table.appendChild(tbody)
  container.appendChild(table)
}
