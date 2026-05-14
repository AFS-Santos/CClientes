// src/utils/csv/sanitize.ts

/**
 * Sanitiza uma CÉLULA individual após o PapaParse já ter feito o split.
 * Remove caracteres de controle residuais, normaliza espaços.
 */
export function sanitizeCell(val: string): string {
  return val
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // controles exceto \t \n
    .trim()
}

/**
 * Decodifica ArrayBuffer como Windows-1252.
 * NÃO remove os null bytes aqui — o PapaParse precisa deles como delimiter.
 * Apenas normaliza quebras de linha.
 */
export function decodificarBuffer(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder('windows-1252')
  const text    = decoder.decode(buffer)
  return text
    .replace(/\r\n/g, '\n')  // normalizar CRLF → LF
    .replace(/\r/g, '\n')     // CR solto → LF
}
