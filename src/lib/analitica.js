import { inicioDia, isoDia, sumarDias } from './format'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const agrupar = (lista, clave, valor) => {
  const m = new Map()
  lista.forEach((x) => {
    const k = clave(x)
    if (k === undefined) return
    m.set(k, valor(m.get(k), x))
  })
  return m
}

const servicioDe = (ref = '') => (/^Mesa/.test(ref) ? 'En mesa' : /^Delivery/.test(ref) ? 'Delivery' : 'Para llevar')

/** Calcula todas las cifras del reporte a partir de los datos crudos */
export function analizar({ facturas = [], gastos = [], ordenes = [], rango }) {
  const validas = facturas.filter((f) => !f.anulada)
  const items = validas.flatMap((f) => (f.factura_items || []).map((it) => ({ ...it, fecha: f.fecha })))
  const suma = (l, k) => l.reduce((s, x) => s + Number(x[k] || 0), 0)

  const ventas = suma(validas, 'total')
  const bruto = suma(validas, 'bruto')
  const descuentos = suma(validas, 'descuento')
  const isv = suma(validas, 'isv')
  const neto = suma(validas, 'subtotal') // sin ISV
  const costo = suma(validas, 'costo')
  const gastosTotal = suma(gastos, 'monto')
  // Las compras de insumos ya están en el costo de lo vendido (recetas); no se restan dos veces
  const comprasInsumos = suma(gastos.filter((g) => g.categoria === 'Insumos y compras'), 'monto')
  const gastosOperativos = gastosTotal - comprasInsumos
  const utilidadBruta = neto - costo
  const utilidadNeta = utilidadBruta - gastosOperativos
  const documentos = validas.length
  const ticket = documentos ? ventas / documentos : 0
  const platos = items.reduce((s, it) => s + it.cantidad, 0)

  // Por día
  const porDiaMap = agrupar(validas, (f) => isoDia(f.fecha), (a = { ventas: 0, documentos: 0, costo: 0 }, f) => ({
    ventas: a.ventas + Number(f.total), documentos: a.documentos + 1, costo: a.costo + Number(f.costo),
  }))
  const gastoDiaMap = agrupar(gastos, (g) => g.fecha, (a = 0, g) => a + Number(g.monto))
  const porDia = []
  for (let d = inicioDia(rango.desde); d <= rango.hasta; d = sumarDias(d, 1)) {
    const k = isoDia(d)
    const v = porDiaMap.get(k) || { ventas: 0, documentos: 0, costo: 0 }
    porDia.push({
      dia: k,
      etiqueta: d.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' }),
      semana: DIAS[d.getDay()],
      ...v,
      gastos: gastoDiaMap.get(k) || 0,
    })
  }

  // Por hora del día
  const horaMap = agrupar(validas, (f) => new Date(f.fecha).getHours(), (a = { ventas: 0, documentos: 0 }, f) => ({
    ventas: a.ventas + Number(f.total), documentos: a.documentos + 1,
  }))
  const horas = [...horaMap.keys()]
  const hMin = Math.min(9, ...horas)
  const hMax = Math.max(21, ...horas)
  const porHora = []
  for (let h = hMin; h <= hMax; h++) {
    const v = horaMap.get(h) || { ventas: 0, documentos: 0 }
    porHora.push({ hora: h, etiqueta: `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`, ...v })
  }
  const horaPico = [...porHora].sort((a, b) => b.ventas - a.ventas)[0]

  // Por día de la semana (promedio)
  const semanaMap = agrupar(porDia, (d) => d.semana, (a = { ventas: 0, dias: 0 }, d) => ({ ventas: a.ventas + d.ventas, dias: a.dias + 1 }))
  const porSemana = [1, 2, 3, 4, 5, 6, 0].map((i) => {
    const v = semanaMap.get(DIAS[i]) || { ventas: 0, dias: 0 }
    return { dia: DIAS[i], promedio: v.dias ? v.ventas / v.dias : 0 }
  })

  // Productos
  const prodMap = agrupar(items, (it) => it.nombre, (a = { nombre: '', categoria: '', cantidad: 0, ventas: 0, costo: 0 }, it) => ({
    nombre: it.nombre,
    categoria: it.categoria || 'Sin categoría',
    cantidad: a.cantidad + it.cantidad,
    ventas: a.ventas + it.cantidad * Number(it.precio),
    costo: a.costo + it.cantidad * Number(it.costo),
  }))
  const productos = [...prodMap.values()]
    .map((p) => ({ ...p, ganancia: p.ventas - p.costo, margen: p.ventas ? ((p.ventas - p.costo) / p.ventas) * 100 : 0, participacion: bruto ? (p.ventas / bruto) * 100 : 0 }))
    .sort((a, b) => b.ventas - a.ventas)

  const catMap = agrupar(productos, (p) => p.categoria, (a = { categoria: '', cantidad: 0, ventas: 0, costo: 0 }, p) => ({
    categoria: p.categoria, cantidad: a.cantidad + p.cantidad, ventas: a.ventas + p.ventas, costo: a.costo + p.costo,
  }))
  const categorias = [...catMap.values()].sort((a, b) => b.ventas - a.ventas)

  // Meseros
  const meseroMap = agrupar(items, (it) => it.mesero || 'Sin asignar', (a = { mesero: '', ventas: 0, platos: 0, facturas: new Set() }, it) => {
    a.mesero = it.mesero || 'Sin asignar'
    a.ventas += it.cantidad * Number(it.precio)
    a.platos += it.cantidad
    a.facturas.add(it.factura_id)
    return a
  })
  const meseros = [...meseroMap.values()].map((m) => ({ mesero: m.mesero, ventas: m.ventas, platos: m.platos, atenciones: m.facturas.size, ticket: m.facturas.size ? m.ventas / m.facturas.size : 0 }))
    .sort((a, b) => b.ventas - a.ventas)

  // Métodos de pago y tipo de servicio
  const metodoMap = agrupar(validas, (f) => f.metodo_pago, (a = { ventas: 0, documentos: 0 }, f) => ({ ventas: a.ventas + Number(f.total), documentos: a.documentos + 1 }))
  const metodos = ['efectivo', 'tarjeta', 'transferencia'].map((m) => ({ metodo: m, ...(metodoMap.get(m) || { ventas: 0, documentos: 0 }) }))
  const servMap = agrupar(validas, (f) => servicioDe(f.referencia), (a = { ventas: 0, documentos: 0 }, f) => ({ ventas: a.ventas + Number(f.total), documentos: a.documentos + 1 }))
  const servicios = ['En mesa', 'Para llevar', 'Delivery'].map((s) => ({ servicio: s, ...(servMap.get(s) || { ventas: 0, documentos: 0 }) }))

  // Gastos por categoría
  const gastoCatMap = agrupar(gastos, (g) => g.categoria, (a = 0, g) => a + Number(g.monto))
  const gastosPorCategoria = [...gastoCatMap.entries()].map(([categoria, monto]) => ({ categoria, monto })).sort((a, b) => b.monto - a.monto)

  // Cocina
  const hechas = ordenes.filter((o) => o.lista_at)
  const tiempos = hechas.map((o) => (new Date(o.lista_at) - new Date(o.created_at)) / 60000)
  const cocinaPromedio = tiempos.length ? tiempos.reduce((s, t) => s + t, 0) / tiempos.length : null
  const cocinaTarde = tiempos.length ? (tiempos.filter((t) => t > 15).length / tiempos.length) * 100 : null
  const canceladas = ordenes.filter((o) => o.estado === 'cancelada')

  return {
    ventas, bruto, descuentos, isv, neto, costo, gastosTotal, gastosOperativos, comprasInsumos, utilidadBruta, utilidadNeta, documentos, ticket, platos,
    margenBruto: neto ? (utilidadBruta / neto) * 100 : 0,
    margenNeto: neto ? (utilidadNeta / neto) * 100 : 0,
    anuladas: facturas.length - validas.length,
    porDia, porHora, horaPico, porSemana, productos, categorias, meseros, metodos, servicios, gastosPorCategoria,
    cocinaPromedio, cocinaTarde, ordenesCocina: hechas.length,
    canceladas: canceladas.length, montoCancelado: canceladas.reduce((s, o) => s + Number(o.total), 0),
    validas,
  }
}
