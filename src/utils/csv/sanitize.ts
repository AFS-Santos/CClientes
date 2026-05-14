// src/utils/csv/sanitize.ts
// Etapa 1 do pipeline: estabilizar o buffer antes do parse

/**
 * Sanitiza o CSV bruto antes de passar para o PapaParse.
 * Remove null bytes, normaliza quebras de linha, corta espaços extras.
 */
export function sanitizeCsv(raw: string): string {
  return raw
    .replace(/\u0000/g, '')          // null bytes (separador \x00 do ERP)
    .replace(/\r\n/g, '\n')          // normalizar CRLF → LF
    .replace(/\r/g, '\n')            // CR solto → LF
    .replace(/[^\x09\x0A\x20-\xFF]/g, '') // remover outros chars de controle (exceto tab/newline)
    .trim()
}

/**
 * Decodifica ArrayBuffer como Windows-1252 e sanitiza.
 */
export function decodificarBuffer(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('windows-1252')
  return sanitizeCsv(decoder.decode(buffer))
}
