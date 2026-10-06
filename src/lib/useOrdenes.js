import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { inicioDelDia } from './format'

// Órdenes del día con sus productos, actualizadas en tiempo real
export function useOrdenes() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [conectado, setConectado] = useState(true)
  const timer = useRef(null)

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('ordenes')
      .select('*, orden_items(*)')
      .gte('created_at', inicioDelDia())
      .order('created_at', { ascending: true })
    if (!error) setOrdenes(data || [])
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
    const recargar = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(cargar, 150)
    }
    const canal = supabase
      .channel('ordenes-hoy')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes' }, recargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orden_items' }, recargar)
      .subscribe((status) => setConectado(status === 'SUBSCRIBED'))

    // Por si el teléfono se durmió o perdió señal
    const alVolver = () => document.visibilityState === 'visible' && cargar()
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('online', cargar)
    const intervalo = setInterval(cargar, 30000)

    return () => {
      supabase.removeChannel(canal)
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('online', cargar)
      clearInterval(intervalo)
      clearTimeout(timer.current)
    }
  }, [cargar])

  const cambiarEstado = useCallback(
    async (id, estado) => {
      setOrdenes((prev) => prev.map((o) => (o.id === id ? { ...o, estado } : o)))
      const { error } = await supabase.from('ordenes').update({ estado }).eq('id', id)
      if (error) cargar()
      return !error
    },
    [cargar],
  )

  return { ordenes, cargando, conectado, cambiarEstado, recargar: cargar }
}

// Menú (categorías + productos) y ajustes
export function useMenu() {
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [ajustes, setAjustes] = useState({ num_mesas: '10', nombre_negocio: 'Carnitas Daniel' })
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    const [c, p, a] = await Promise.all([
      supabase.from('categorias').select('*').order('orden').order('id'),
      supabase.from('productos').select('*').order('orden').order('id'),
      supabase.from('ajustes').select('*'),
    ])
    if (!c.error) setCategorias(c.data)
    if (!p.error) setProductos(p.data)
    if (!a.error) setAjustes((prev) => ({ ...prev, ...Object.fromEntries(a.data.map((r) => [r.clave, r.valor])) }))
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return { categorias, productos, ajustes, cargando, recargar: cargar }
}
