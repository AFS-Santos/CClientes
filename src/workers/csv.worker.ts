// src/workers/csv.worker.ts
// Move o parsing para um thread separado — UI nunca trava

import { parsearVarios } from '../parsers'
import type { ParseResult } from '../types'

export type WorkerInput = {
  type:    'PARSE'
  buffers: ArrayBuffer[]
}

export type WorkerOutput =
  | { type: 'RESULT';   payload: ParseResult }
  | { type: 'PROGRESS'; payload: { atual: number; total: number; arquivo: string } }
  | { type: 'ERROR';    payload: string }

self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const { type, buffers } = event.data

  if (type !== 'PARSE') return

  try {

    // Processar arquivo por arquivo e emitir progresso
    const consolidado = parsearVarios(buffers)

    // Resultado final
    const output: WorkerOutput = { type: 'RESULT', payload: consolidado }
    self.postMessage(output)

  } catch (err) {
    const output: WorkerOutput = {
      type:    'ERROR',
      payload: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(output)
  }
}
