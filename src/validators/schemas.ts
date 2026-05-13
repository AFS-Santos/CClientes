// src/validators/schemas.ts
import { z } from 'zod'

export const TituloSchema = z.object({
  titulo:     z.string().regex(/^\d+$/, 'Título deve ser numérico'),
  emissao:    z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Data inválida').or(z.literal('')),
  vencimento: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Data inválida').or(z.literal('')),
  valor:      z.string().regex(/^-?[\d.]+,\d{2}$/, 'Valor inválido').or(z.literal('')),
  saldoBruto: z.string().regex(/^-?[\d.]+,\d{2}$/, 'Valor inválido').or(z.literal('')),
  saldo:      z.string().regex(/^-?[\d.]+,\d{2}$/, 'Valor inválido').or(z.literal('')),
  nrCarteira: z.string(),
  anotacao:   z.string(),
})

export const ClienteSchema = z.object({
  empresa:       z.string(),
  codigo:        z.string(),
  nome:          z.string().min(1, 'Nome do cliente não pode ser vazio'),
  cpfcnpj:       z.string(),
  titulos:       z.array(TituloSchema).min(1, 'Cliente deve ter ao menos 1 título'),
  totalTitulos:  z.string(),
  saldoSemJuros: z.string(),
  saldoComJuros: z.string(),
})

export type TituloInput  = z.infer<typeof TituloSchema>
export type ClienteInput = z.infer<typeof ClienteSchema>

export function validarClientes(clientes: unknown[]): {
  validos: ClienteInput[]
  erros: string[]
} {
  const validos: ClienteInput[] = []
  const erros: string[] = []

  for (const cli of clientes) {
    const result = ClienteSchema.safeParse(cli)
    if (result.success) {
      validos.push(result.data)
    } else {
      const nome = (cli as { nome?: string }).nome ?? '?'
      const msgs = result.error.errors.map(e => `[${nome}] ${e.path.join('.')}: ${e.message}`)
      erros.push(...msgs)
    }
  }

  return { validos, erros }
}
