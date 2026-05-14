import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir:  'dist',
    target:  'es2020',
    rollupOptions: {
      output: {
        // Separar ExcelJS em chunk próprio (evita warning de bundle grande)
        manualChunks: {
          exceljs:  ['exceljs'],
          papaparse:['papaparse'],
          zod:      ['zod'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
})
