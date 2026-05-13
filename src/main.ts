// src/main.ts
import type { Cliente } from './types'
import { parsearVarios }   from './parsers'
import { validarClientes } from './validators/schemas'
import { gerarExcel }      from './converters/excel.converter'
import { renderPreview }   from './ui/preview'
import { atualizarStats }  from './ui/stats'

// ── Estado ──────────────────────────────────────────────────────────────────
let dadosProcessados: Cliente[] = []
let nomeArquivo = 'carteira_consolidado'

// ── Helpers de UI ────────────────────────────────────────────────────────────
type StatusTipo = 'info' | 'success' | 'error'

function setStatus(msg: string, tipo: StatusTipo): void {
  const el = document.getElementById('status')
  if (!el) return
  el.textContent = msg
  el.className   = tipo
}

function mostrar(id: string, visivel: boolean): void {
  const el = document.getElementById(id)
  if (!el) return
  if (visivel) el.classList.add('visible')
  else         el.classList.remove('visible')
}

// ── Processar arquivos ───────────────────────────────────────────────────────
async function processarArquivos(files: FileList): Promise<void> {
  if (!files.length) return

  const fileArr = Array.from(files)
  nomeArquivo = fileArr.length === 1
    ? fileArr[0].name.replace(/\.csv$/i, '')
    : 'carteira_consolidado'

  setStatus(`⏳ Processando ${fileArr.length} arquivo(s)...`, 'info')
  mostrar('stats', false)
  mostrar('preview-section', false)
  mostrar('btn-download', false)

  const footer = document.getElementById('footer-note')
  if (footer) footer.style.display = 'none'

  try {
    // Ler todos como ArrayBuffer
    const buffers = await Promise.all(
      fileArr.map(f => f.arrayBuffer())
    )

    const { clientes, erros } = parsearVarios(buffers)
    const { validos, erros: errosZod } = validarClientes(clientes)

    const todosErros = [...erros, ...errosZod]
    if (todosErros.length) {
      console.warn('Avisos de validação:', todosErros)
    }

    dadosProcessados = validos as Cliente[]

    // Atualizar UI
    atualizarStats(dadosProcessados)
    mostrar('stats', true)

    const previewContainer = document.getElementById('preview-table-wrapper')
    if (previewContainer) renderPreview(dadosProcessados, previewContainer)

    const previewInfo = document.getElementById('preview-info')
    if (previewInfo) {
      previewInfo.textContent = `${dadosProcessados.length} clientes · ${dadosProcessados.reduce((s,c)=>s+c.titulos.length,0)} títulos · ${fileArr.length} arquivo(s)`
    }
    mostrar('preview-section', true)

    const btnFilename = document.getElementById('btn-filename')
    if (btnFilename) btnFilename.textContent = nomeArquivo + '.xlsx'
    mostrar('btn-download', true)

    if (footer) footer.style.display = 'block'

    const totalT  = dadosProcessados.reduce((s, c) => s + c.titulos.length, 0)
    const warnTxt = todosErros.length ? ` · ${todosErros.length} aviso(s) no console` : ''
    setStatus(`✓ ${dadosProcessados.length} clientes e ${totalT} títulos carregados${warnTxt}`, 'success')

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    setStatus(`✗ Erro ao processar: ${msg}`, 'error')
    console.error(err)
  }
}

// ── Eventos ──────────────────────────────────────────────────────────────────
const fileInput = document.getElementById('fileInput') as HTMLInputElement | null
const dropZone  = document.getElementById('dropZone')
const btnDown   = document.getElementById('btn-download')

fileInput?.addEventListener('change', e => {
  const files = (e.target as HTMLInputElement).files
  if (files?.length) processarArquivos(files)
})

dropZone?.addEventListener('dragover', e => {
  e.preventDefault()
  dropZone.classList.add('drag-over')
})
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
    await gerarExcel(dadosProcessados, nomeArquivo)
    setStatus('✓ Excel gerado e download iniciado!', 'success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    setStatus(`✗ Erro ao gerar Excel: ${msg}`, 'error')
  }
})
