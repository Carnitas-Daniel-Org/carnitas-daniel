// Formatos y utilidades compartidas

const fmtL = new Intl.NumberFormat('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 2 })

export const lempiras = (n) => 'L ' + fmtL.format(Number(n || 0))
export const lempirasCorto = (n) => {
  const v = Number(n || 0)
  if (Math.abs(v) >= 1000) return 'L ' + fmtN.format(Math.round(v / 100) / 10) + 'k'
  return 'L ' + fmtN.format(Math.round(v))
}
export const numero = (n) => fmtN.format(Number(n || 0))
export const porcentaje = (n) => (Number.isFinite(n) ? fmtN.format(Math.round(n * 10) / 10) + '%' : '—')

export const hora = (iso) => new Date(iso).toLocaleTimeString('es-HN', { hour: 'numeric', minute: '2-digit' })
export const fecha = (iso) =>
  new Date(iso).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' })
export const fechaHora = (iso) =>
  new Date(iso).toLocaleString('es-HN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
export const fechaLarga = (d) =>
  new Date(d).toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })

export const minutosDesde = (iso, ahora = Date.now()) =>
  Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000))

export const duracion = (min) => {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  return `${h} h ${min % 60} min`
}

// Fechas locales (Honduras, UTC-6) como yyyy-mm-dd
export const isoDia = (d = new Date()) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
export const inicioDia = (d = new Date()) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export const finDia = (d = new Date()) => {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
export const sumarDias = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const desdeIsoDia = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const etiquetaOrden = (o) => {
  if (o.tipo === 'mesa') return `Mesa ${o.mesa}`
  return `${o.es_delivery ? 'Delivery' : 'Para llevar'}: ${o.cliente || 'Cliente'}`
}

export const ESTADOS = {
  pendiente: 'Nueva',
  preparando: 'En preparación',
  lista: 'Lista',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

export const ROLES = {
  dueno: 'Dueño',
  cajero: 'Caja',
  mesero: 'Mesero',
  cocina: 'Cocina',
}

export const METODOS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

export const CATEGORIAS_GASTO = [
  'Insumos y compras',
  'Sueldos',
  'Alquiler',
  'Luz y agua',
  'Gas',
  'Internet y teléfono',
  'Transporte y delivery',
  'Mantenimiento',
  'Impuestos y permisos',
  'Publicidad',
  'Otros',
]

export const UNIDADES = ['lb', 'kg', 'oz', 'unidad', 'docena', 'paquete', 'litro', 'galón', 'botella', 'bolsa']

export const iniciales = (texto = '') =>
  texto
    .split(/\s+/)
    .filter((p) => p && !/^(de|del|la|el|y|con)$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

// Sonido corto sin archivos externos
let ctx
export function beep(veces = 2) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    for (let i = 0; i < veces; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'triangle'
      o.frequency.value = i % 2 ? 660 : 880
      const t = ctx.currentTime + i * 0.22
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.2)
    }
  } catch {
    /* sin sonido disponible */
  }
  if (navigator.vibrate) navigator.vibrate([150, 80, 150])
}

export function desbloquearSonido() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    /* nada */
  }
}

export const mensajeError = (e) => {
  const m = e?.message || String(e || '')
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Sin conexión. Revisa el internet e intenta otra vez.'
  return m.replace(/^.*?ERROR:\s*/, '')
}
