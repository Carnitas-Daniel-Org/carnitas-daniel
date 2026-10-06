import { useEffect, useRef, useState } from 'react'
import { useOrdenes } from '../lib/useOrdenes'
import { beep, desbloquearSonido, etiquetaOrden, hora, minutosDesde } from '../lib/format'
import Encabezado from './Encabezado'

export default function Cocina({ onSalir }) {
  const { ordenes, conectado, cambiarEstado, cargando } = useOrdenes()
  const [sonido, setSonido] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())

  // Reloj para los minutos de espera
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 20000)
    return () => clearInterval(t)
  }, [])

  // Mantener la pantalla encendida (si el navegador lo permite)
  useEffect(() => {
    let lock
    const pedir = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen')
      } catch {
        /* no soportado */
      }
    }
    pedir()
    document.addEventListener('visibilitychange', pedir)
    return () => {
      document.removeEventListener('visibilitychange', pedir)
      lock?.release?.()
    }
  }, [])

  // Sonar cuando entra una orden nueva
  const vistos = useRef(null)
  useEffect(() => {
    if (cargando) return
    const ids = new Set(ordenes.filter((o) => o.estado === 'pendiente').map((o) => o.id))
    if (vistos.current) {
      const nuevas = [...ids].some((id) => !vistos.current.has(id))
      if (nuevas && sonido) beep(2)
    }
    vistos.current = new Set([...(vistos.current || []), ...ids])
  }, [ordenes, cargando, sonido])

  const activas = ordenes.filter((o) => o.estado === 'pendiente' || o.estado === 'preparando')
  const listas = ordenes
    .filter((o) => o.estado === 'lista')
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 6)

  return (
    <div className="app cocina">
      <Encabezado titulo="Cocina" subtitulo={`${activas.length} en cola`} conectado={conectado} onSalir={onSalir} />

      {!sonido && (
        <button className="aviso" onClick={() => { desbloquearSonido(); setSonido(true); beep(1) }}>
          Toca aquí para activar el sonido de órdenes nuevas
        </button>
      )}

      <main className="contenido ancho">
        {!activas.length && !cargando && <p className="vacio grande">Sin órdenes pendientes</p>}

        <ul className="tablero">
          {activas.map((o) => {
            const min = minutosDesde(o.created_at, ahora)
            return (
              <li key={o.id} className={`comanda estado-${o.estado}` + (min >= 15 ? ' tarde' : '')}>
                <div className="comanda-cabeza">
                  <strong>{etiquetaOrden(o)}</strong>
                  <span className="espera">{min} min</span>
                </div>
                <p className="suave">#{o.id} · {hora(o.created_at)} · {o.mesero}</p>
                <ul className="items grandes">
                  {o.orden_items.map((it) => (
                    <li key={it.id}>
                      <span className="cant">{it.cantidad}</span> {it.nombre}
                      {it.nota && <div className="nota">{it.nota}</div>}
                    </li>
                  ))}
                </ul>
                {o.nota && <div className="nota general">{o.nota}</div>}
                {o.estado === 'pendiente' ? (
                  <button className="btn secundario grande" onClick={() => cambiarEstado(o.id, 'preparando')}>
                    Empezar
                  </button>
                ) : (
                  <button className="btn exito grande" onClick={() => cambiarEstado(o.id, 'lista')}>
                    Lista
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        {listas.length > 0 && (
          <section className="recientes">
            <h2>Listas recientes</h2>
            <ul>
              {listas.map((o) => (
                <li key={o.id}>
                  <span>{etiquetaOrden(o)} · #{o.id}</span>
                  <button className="btn texto" onClick={() => cambiarEstado(o.id, 'preparando')}>Deshacer</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
