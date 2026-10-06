import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

/**
 * Carga datos con una función y los recarga cuando cambian las tablas indicadas
 * (tiempo real), cuando el teléfono vuelve a estar activo o cada 60 s.
 */
export function useConsulta(fn, deps = [], tablas = []) {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const timer = useRef(null)
  const clave = tablas.join(',')

  const cargar = useCallback(async () => {
    try {
      const r = await fnRef.current()
      setDatos(r)
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setCargando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    cargar()
    const recargar = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(cargar, 200)
    }
    let canal
    if (clave) {
      canal = supabase.channel('rt-' + clave + '-' + Math.random().toString(36).slice(2))
      clave.split(',').forEach((t) => canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, recargar))
      canal.subscribe()
    }
    const alVolver = () => document.visibilityState === 'visible' && recargar()
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('online', recargar)
    const intervalo = setInterval(recargar, 60000)
    return () => {
      if (canal) supabase.removeChannel(canal)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('online', recargar)
      clearInterval(intervalo)
      clearTimeout(timer.current)
    }
  }, [cargar, clave])

  return { datos, error, cargando, recargar: cargar }
}

// Lanza el error de Supabase o devuelve los datos
export const q = async (promesa) => {
  const { data, error } = await promesa
  if (error) throw error
  return data
}

export function useAjustes() {
  const r = useConsulta(
    async () => {
      const filas = await q(supabase.from('ajustes').select('*'))
      return Object.fromEntries(filas.map((f) => [f.clave, f.valor]))
    },
    [],
    ['ajustes'],
  )
  return { ajustes: r.datos || {}, cargando: r.cargando, recargar: r.recargar }
}

export async function guardarAjustes(obj) {
  const filas = Object.entries(obj).map(([clave, valor]) => ({ clave, valor: String(valor ?? '') }))
  return q(supabase.from('ajustes').upsert(filas))
}

export function useMenu() {
  const r = useConsulta(
    async () => {
      const [categorias, productos] = await Promise.all([
        q(supabase.from('categorias').select('*').order('orden').order('id')),
        q(supabase.from('productos').select('*').order('orden').order('id')),
      ])
      return { categorias, productos }
    },
    [],
    ['productos', 'categorias'],
  )
  return {
    categorias: r.datos?.categorias || [],
    productos: r.datos?.productos || [],
    cargando: r.cargando,
    recargar: r.recargar,
  }
}

// Órdenes abiertas: sin cobrar o aún en proceso, más las de hoy
export function useOrdenesActivas() {
  const r = useConsulta(
    async () => {
      const desde = new Date()
      desde.setHours(0, 0, 0, 0)
      desde.setDate(desde.getDate() - 1)
      return q(
        supabase
          .from('ordenes')
          .select('*, orden_items(*)')
          .neq('estado', 'cancelada')
          .or(`factura_id.is.null,estado.in.(pendiente,preparando,lista),created_at.gte.${desde.toISOString()}`)
          .order('created_at', { ascending: true }),
      )
    },
    [],
    ['ordenes', 'orden_items'],
  )
  return { ordenes: r.datos || [], cargando: r.cargando, recargar: r.recargar }
}

export async function cambiarEstado(id, estado) {
  return q(supabase.from('ordenes').update({ estado }).eq('id', id))
}

export function useCajaAbierta() {
  const r = useConsulta(
    async () => {
      const filas = await q(
        supabase.from('caja_sesiones').select('*').is('cerrada_at', null).order('id', { ascending: false }).limit(1),
      )
      return filas[0] || null
    },
    [],
    ['caja_sesiones'],
  )
  return { caja: r.datos, cargando: r.cargando, recargar: r.recargar }
}

// Agrupa órdenes sin cobrar en cuentas: una por mesa, una por pedido para llevar
export function agruparCuentas(ordenes) {
  const cuentas = new Map()
  ordenes
    .filter((o) => !o.factura_id && o.estado !== 'cancelada')
    .forEach((o) => {
      const clave = o.tipo === 'mesa' ? 'mesa-' + o.mesa : 'orden-' + o.id
      if (!cuentas.has(clave)) cuentas.set(clave, { clave, tipo: o.tipo, mesa: o.mesa, ordenes: [] })
      cuentas.get(clave).ordenes.push(o)
    })
  return [...cuentas.values()].map((c) => ({
    ...c,
    total: c.ordenes.reduce((s, o) => s + Number(o.total), 0),
    desde: c.ordenes[0].created_at,
    primera: c.ordenes[0],
  }))
}
