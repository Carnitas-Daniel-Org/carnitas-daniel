
/**
 * Exporta a Excel con varias hojas.
 * hojas: [{ nombre, columnas: [{ titulo, valor: (fila) => any, tipo?: 'dinero'|'numero'|'fecha'|'texto', ancho? }], filas }]
 */
export async function exportarExcel(nombreArchivo, hojas) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const libro = hojas.map((h) => {
    const encabezado = h.columnas.map((c) => ({
      value: c.titulo,
      fontWeight: 'bold',
      backgroundColor: '#1F3F94',
      color: '#FFFFFF',
    }))
    const filas = h.filas.map((f) =>
      h.columnas.map((c) => {
        const v = c.valor(f)
        if (v === null || v === undefined || v === '') return null
        if (c.tipo === 'dinero') return { value: Number(v), type: Number, format: '"L" #,##0.00' }
        if (c.tipo === 'numero') return { value: Number(v), type: Number, format: '#,##0.##' }
        if (c.tipo === 'porcentaje') return { value: Number(v) / 100, type: Number, format: '0.0%' }
        if (c.tipo === 'fecha') return { value: new Date(v), type: Date, format: 'dd/mm/yyyy hh:mm' }
        if (c.tipo === 'dia') return { value: String(v), type: String }
        if (typeof v === 'number') return { value: v, type: Number, format: '#,##0.##' }
        return { value: String(v), type: String }
      }),
    )
    return {
      data: [encabezado, ...filas],
      sheet: h.nombre.slice(0, 31),
      columns: h.columnas.map((c) => ({ width: c.ancho || (c.tipo === 'dinero' ? 14 : 18) })),
      stickyRowsCount: 1,
    }
  })
  await writeXlsxFile(libro, { fontFamily: 'Calibri', fontSize: 11 }).toFile(nombreArchivo)
}

// CSV simple (abre bien en Excel en español gracias al BOM y el punto y coma)
export function exportarCSV(nombreArchivo, columnas, filas) {
  const esc = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const texto = [columnas.map((c) => esc(c.titulo)).join(';'), ...filas.map((f) => columnas.map((c) => esc(c.valor(f))).join(';'))].join(
    '\n',
  )
  const blob = new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombreArchivo
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
