// src/types/index.ts

export interface Titulo {
  titulo: string
  emissao: string
  vencimento: string
  valor: string
  saldoBruto: string
  saldo: string
  nrCarteira: string
  anotacao: string
}

export interface Cliente {
  empresa: string
  codigo: string
  nome: string
  cpfcnpj: string
  titulos: Titulo[]
  totalTitulos: string
  saldoSemJuros: string
  saldoComJuros: string
}

export type ParseResult = {
  clientes: Cliente[]
  erros: string[]
}
