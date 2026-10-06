export const lempiras = (n) =>
  'L ' + Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const hora = (iso) =>
  new Date(iso).toLocaleTimeString('es-HN', { hour: 'numeric', minute: '2-digit' })

export const minutosDesde = (iso, ahora = Date.now()) =>
  Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000))

export const inicioDelDia = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export const etiquetaOrden = (o) =>
  o.tipo === 'llevar' ? `Llevar · ${o.cliente || 'Cliente'}` : `Mesa ${o.mesa}`

export const ESTADOS = {
  pendiente: 'Nueva',
  preparando: 'En preparación',
  lista: 'Lista',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

// Sonido corto sin archivos externos
let ctx
export function beep(veces = 2) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    for (let i = 0; i < veces; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      const t = ctx.currentTime + i * 0.25
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.22)
    }
  } catch {
    /* sin sonido disponible */
  }
  if (navigator.vibrate) navigator.vibrate([150, 80, 150])
}

// El navegador solo permite sonido después de un toque del usuario
export function desbloquearSonido() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    /* nada */
  }
}
