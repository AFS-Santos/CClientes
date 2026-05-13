// src/ui/stats.ts
import type { Cliente } from '../types'
import { parseMoney, formatMoney } from '../utils/money'

export function atualizarStats(clientes: Cliente[]): void {
  const totalClientes = clientes.length
  const totalTitulos  = clientes.reduce((s, c) => s + c.titulos.length, 0)
  const saldoTotal    = clientes.reduce((s, c) => {
    const v = parseMoney(c.saldoComJuros)
    return s + (v ?? 0)
  }, 0)

  const elClientes = document.getElementById('stat-clientes')
  const elTitulos  = document.getElementById('stat-titulos')
  const elSaldo    = document.getElementById('stat-saldo')

  if (elClientes) elClientes.textContent = String(totalClientes)
  if (elTitulos)  elTitulos.textContent  = String(totalTitulos)
  if (elSaldo)    elSaldo.textContent    = 'R$ ' + formatMoney(saldoTotal)
}
