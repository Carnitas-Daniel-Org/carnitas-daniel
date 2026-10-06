import { useEffect, useRef, useState } from 'react'
import { Bike, ChefHat, ShoppingBag, Volume2 } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import { Vacio, useAviso } from '../components/ui'
import { cambiarEstado, useOrdenesActivas } from '../lib/data'
import { beep, desbloquearSonido, etiquetaOrden, hora, mensajeError, minutosDesde } from '../lib/format'

export default function Cocina() {
  const { ordenes, cargando } = useOrdenesActivas()
  const avisar = useAviso()
  const [sonido, setSonido] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])

  // Pantalla siempre encendida
  useEffect(() => {
    let lock
    const pedir = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen')
      } catch { /* no soportado */ }
    }
    pedir()
    document.addEventListener('visibilitychange', pedir)
    return () => { document.removeEventListener('visibilitychange', pedir); lock?.release?.() }
  }, [])

  const activas = ordenes.filter((o) => o.estado === 'pendiente' || o.estado === 'preparando')
  const nuevas = activas.filter((o) => o.estado === 'pendiente').length
  const listas = ordenes
    .filter((o) => o.estado === 'lista')
    .sort((a, b) => new Date(b.lista_at || b.updated_at) - new Date(a.lista_at || a.updated_at))
    .slice(0, 8)

  const vistos = useRef(null)
  useEffect(() => {
    if (cargando) return
    const ids = new Set(activas.filter((o) => o.estado === 'pendiente').map((o) => o.id))
    if (vistos.current && [...ids].some((id) => !vistos.current.has(id)) && sonido) beep(2)
    vistos.current = new Set([...(vistos.current || []), ...ids])
  }, [activas, cargando, sonido])

  const mover = async (o, estado) => {
    try { await cambiarEstado(o.id, estado) } catch (e) { avisar(mensajeError(e), 'error') }
  }

  // Tiempo promedio de hoy (de pedido a lista)
  const hechasHoy = ordenes.filter((o) => o.lista_at && new Date(o.created_at).toDateString() === new Date().toDateString())
  const promedio = hechasHoy.length
    ? Math.round(hechasHoy.reduce((s, o) => s + (new Date(o.lista_at) - new Date(o.created_at)), 0) / hechasHoy.length / 60000)
    : null

  return (
    <Pantalla
      titulo="Cocina"
      sub={`${nuevas} nuevas, ${activas.length - nuevas} en preparación${promedio !== null ? `. Promedio hoy: ${promedio} min` : ''}`}
      acciones={
        !sonido && (
          <button className="btn primario" onClick={() => { desbloquearSonido(); setSonido(true); beep(1) }}>
            <Volume2 size={18} /> Activar sonido
          </button>
        )
      }
    >
      {!activas.length && !cargando && (
        <div className="panel">
          <Vacio icono={ChefHat} titulo="Todo despachado" texto="Las órdenes nuevas aparecen aquí al instante." />
        </div>
      )}

      <div className="cocina-tablero">
        {activas.map((o) => {
          const min = minutosDesde(o.created_at, ahora)
          return (
            <article key={o.id} className={'ticket ' + o.estado + (min >= 15 ? ' tarde' : '')}>
              <div className="ticket-cabeza">
                <strong>{o.tipo === 'mesa' ? `Mesa ${o.mesa}` : o.cliente || 'Cliente'}</strong>
                <span className="cifra">{min}′</span>
              </div>
              <div className="ticket-meta">
                {o.tipo !== 'mesa' && (
                  <span className="estado neutro">
                    {o.es_delivery ? <Bike size={14} /> : <ShoppingBag size={14} />} {o.es_delivery ? 'Delivery' : 'Para llevar'}
                  </span>
                )}
                <span>#{o.id}, {hora(o.created_at)}, {o.mesero}</span>
              </div>
              <ul className="ticket-items">
                {o.orden_items.map((it) => (
                  <li key={it.id}>
                    <span className="cant">{it.cantidad}</span>{it.nombre}
                    {it.nota && <div><span className="nota">{it.nota}</span></div>}
                  </li>
                ))}
              </ul>
              {o.nota && <div className="aviso-banda maiz nota-general">{o.nota}</div>}
              <div className="acciones">
                {o.estado === 'pendiente' ? (
                  <button className="btn grande bloque" onClick={() => mover(o, 'preparando')}>Empezar</button>
                ) : (
                  <button className="btn verde grande bloque" onClick={() => mover(o, 'lista')}>Listo para servir</button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {listas.length > 0 && (
        <section className="panel">
          <div className="panel-cabeza"><h2>Listas, esperando mesero</h2></div>
          <ul className="lista-simple">
            {listas.map((o) => (
              <li key={o.id}>
                <span>{etiquetaOrden(o)} <span className="suave">#{o.id}</span></span>
                <button className="btn compacto fantasma" onClick={() => mover(o, 'preparando')}>Regresar a preparación</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Pantalla>
  )
}
