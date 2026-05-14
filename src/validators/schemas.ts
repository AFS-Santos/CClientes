// src/validators/schemas.ts
import { z } from 'zod'

const brDate = z.string().refine(
  s => s === '' || /^\d{2}\/\d{2}\/\d{4}$/.test(s),
  { message: 'Data inválida — esperado DD/MM/YYYY' }
)

export const TituloSchema = z.object({
  titulo:     z.string().regex(/^\d+$/, 'Título deve ser numérico'),
  emissao:    brDate.or(z.literal('')),
  vencimento: brDate.or(z.literal('')),
  valor:      z.string().regex(/^-?[\d.]+,\d{2}$/).or(z.literal('')),
  saldoBruto: z.string().regex(/^-?[\d.]+,\d{2}$/).or(z.literal('')),
  saldo:      z.string().regex(/^-?[\d.]+,\d{2}$/).or(z.literal('')),
  nrCarteira: z.string(),
  anotacao:   z.string().default(''),
})

export const ClienteSchema = z.object({
  empresa:       z.string().default(''),
  codigo:        z.string(),
  nome:          z.string().min(1, 'Nome obrigatório'),
  cpfcnpj:       z.string().default(''),
  titulos:       z.array(TituloSchema).min(1, 'Cliente deve ter ao menos 1 título'),
  totalTitulos:  z.string().default(''),
  saldoSemJuros: z.string().default(''),
  saldoComJuros: z.string().default(''),
})

export const TotalFinalSchema = z.object({
  label:         z.string(),
  totalTitulos:  z.string(),
  saldoSemJuros: z.string(),
  saldoComJuros: z.string(),
})

export const ParseResultSchema = z.object({
  clientes:   z.array(ClienteSchema),
  erros:      z.array(z.string()),
  avisos:     z.array(z.string()),
  totalFinal: TotalFinalSchema.nullable(),
})

export type Titulo      = z.infer<typeof TituloSchema>
export type Cliente     = z.infer<typeof ClienteSchema>
export type TotalFinal  = z.infer<typeof TotalFinalSchema>
export type ParseResult = z.infer<typeof ParseResultSchema>

export type ValidationResult = {
  validos: Cliente[]
  erros:   string[]
  avisos:  string[]
}

export function validarClientes(clientes: unknown[]): ValidationResult {
  const validos: Cliente[] = []
  const erros:   string[]  = []
  const avisos:  string[]  = []

  for (const cli of clientes) {
    const result = ClienteSchema.safeParse(cli)
    if (result.success) {
      const c = result.data
      if (!c.totalTitulos)  avisos.push(`[${c.codigo}] ${c.nome}: Total Títulos vazio`)
      if (!c.saldoSemJuros) avisos.push(`[${c.codigo}] ${c.nome}: Saldo Sem Juros vazio`)
      if (!c.saldoComJuros) avisos.push(`[${c.codigo}] ${c.nome}: Saldo Com Juros vazio`)
      c.titulos.flatMap(t =>
        (['emissao','vencimento','valor','saldoBruto','saldo'] as const)
          .filter(f => !t[f])
          .forEach(f => avisos.push(`[${c.codigo}] título ${t.titulo}: campo '${f}' vazio`))
      )
      validos.push(c)
    } else {
      const nome = (cli as { nome?: string }).nome ?? '?'
      const cod  = (cli as { codigo?: string }).codigo ?? '?'
      result.error.errors.forEach(e =>
        erros.push(`[${cod}] ${nome} — ${e.path.join('.')}: ${e.message}`)
      )
    }
  }

  return { validos, erros, avisos }
}
