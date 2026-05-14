// src/main.ts
import type { Cliente, TotalFinal, ParseResult } from './types'
import { validarClientes }  from './validators/schemas'
import { parsearVarios }    from './parsers'
import { gerarExcel }       from './converters/excel.converter'
import { renderPreview }    from './ui/preview'
import { atualizarStats }   from './ui/stats'
import type { WorkerInput, WorkerOutput } from './workers/csv.worker'

// ── Estado ───────────────────────────────────────────────────────────────────
let dadosProcessados: Cliente[]     = []
let totalFinalGlobal: TotalFinal | null = null
let nomeArquivo = 'carteira_consolidado'

// ── Helpers UI ────────────────────────────────────────────────────────────────
type StatusTipo = 'info' | 'success' | 'error' | 'warning'

function setStatus(msg: string, tipo: StatusTipo): void {
  const el = document.getElementById('status')
  if (!el) return
  el.textContent = msg
  el.className   = tipo
}

function mostrar(id: string, visivel: boolean): void {
  const el = document.getElementById(id)
  if (!el) return
  visivel ? el.classList.add('visible') : el.classList.remove('visible')
}

function esconderResultados(): void {
  mostrar('stats', false)
  mostrar('preview-section', false)
  mostrar('btn-download', false)
  const footer = document.getElementById('footer-note')
  if (footer) footer.style.display = 'none'
}

function exibirResultados(resultado: ParseResult, nomeArq: string): void {
  const { clientes, erros, avisos } = resultado

  // Validar com Zod
  const { validos, erros: errosZod, avisos: avisosZod } = validarClientes(clientes)
  const todosErros  = [...erros,  ...errosZod]
  const todosAvisos = [...avisos, ...avisosZod]

  if (todosErros.length)  console.error('Erros de validação:', todosErros)
  if (todosAvisos.length) console.warn('Avisos:', todosAvisos)

  dadosProcessados = validos
  totalFinalGlobal = resultado.totalFinal

  // Stats
  atualizarStats(dadosProcessados)
  mostrar('stats', true)

  // Preview
  const container = document.getElementById('preview-table-wrapper')
  if (container) renderPreview(dadosProcessados, container)

  const info = document.getElementById('preview-info')
  const totalT = dadosProcessados.reduce((s, c) => s + c.titulos.length, 0)
  if (info) info.textContent = `${dadosProcessados.length} clientes · ${totalT} títulos · ${nomeArq}`
  mostrar('preview-section', true)

  const btnFn = document.getElementById('btn-filename')
  if (btnFn) btnFn.textContent = nomeArq.replace(/\.csv$/i, '') + '.xlsx'
  mostrar('btn-download', true)

  const footer = document.getElementById('footer-note')
  if (footer) footer.style.display = 'block'

  // Status final
  const warnInfo = todosAvisos.length > 0 ? ` · ${todosAvisos.length} aviso(s) — ver console` : ''
  const errInfo  = todosErros.length  > 0 ? ` · ${todosErros.length} erro(s) — ver console`   : ''
  const tipo: StatusTipo = todosErros.length > 0 ? 'error' : todosAvisos.length > 0 ? 'warning' : 'success'
  setStatus(`✓ ${dadosProcessados.length} clientes · ${totalT} títulos carregados${warnInfo}${errInfo}`, tipo)
}

// ── Processamento com Web Worker (fallback síncrono) ─────────────────────────

async function processarArquivos(files: FileList): Promise<void> {
  if (!files.length) return

  const fileArr = Array.from(files)
  nomeArquivo   = fileArr.length === 1
    ? fileArr[0].name.replace(/\.csv$/i, '')
    : 'carteira_consolidado'

  setStatus(`⏳ Processando ${fileArr.length} arquivo(s)...`, 'info')
  esconderResultados()

  try {
    const buffers = await Promise.all(fileArr.map(f => f.arrayBuffer()))

    // Usar Worker se disponível (arquivos grandes não travam a UI)
    const usarWorker = typeof Worker !== 'undefined' && buffers.some(b => b.byteLength > 500_000)

    if (usarWorker) {
      const worker = new Worker(new URL('./workers/csv.worker.ts', import.meta.url), { type: 'module' })

      worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
        if (e.data.type === 'RESULT') {
          exibirResultados(e.data.payload, nomeArquivo)
          worker.terminate()
        } else if (e.data.type === 'ERROR') {
          setStatus(`✗ Erro no worker: ${e.data.payload}`, 'error')
          worker.terminate()
        }
      }

      worker.onerror = (err) => {
        setStatus(`✗ Worker falhou: ${err.message}`, 'error')
        worker.terminate()
      }

      const input: WorkerInput = { type: 'PARSE', buffers }
      worker.postMessage(input, buffers.map(b => b))
    } else {
      // Fallback síncrono (arquivos pequenos ou sem suporte a Worker)
      const resultado = parsearVarios(buffers)
      exibirResultados(resultado, nomeArquivo)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    setStatus(`✗ Erro ao processar: ${msg}`, 'error')
    console.error(err)
  }
}

// ── Eventos ───────────────────────────────────────────────────────────────────
const fileInput = document.getElementById('fileInput') as HTMLInputElement | null
const dropZone  = document.getElementById('dropZone')
const btnDown   = document.getElementById('btn-download')

fileInput?.addEventListener('change', e => {
  const files = (e.target as HTMLInputElement).files
  if (files?.length) processarArquivos(files)
})

dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over') })
dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
dropZone?.addEventListener('drop', e => {
  e.preventDefault()
  dropZone.classList.remove('drag-over')
  const files = e.dataTransfer?.files
  if (files?.length) processarArquivos(files)
})

btnDown?.addEventListener('click', async () => {
  if (!dadosProcessados.length) return
  setStatus('⏳ Gerando Excel formatado...', 'info')
  try {
    await gerarExcel(dadosProcessados, nomeArquivo, totalFinalGlobal)
    setStatus('✓ Excel gerado e download iniciado!', 'success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    setStatus(`✗ Erro ao gerar Excel: ${msg}`, 'error')
  }
})
