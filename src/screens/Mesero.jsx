import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useMenu, useOrdenes } from '../lib/useOrdenes'
import { ESTADOS, beep, etiquetaOrden, hora, lempiras } from '../lib/format'
import Encabezado from './Encabezado'

export default function Mesero({ mesero, onSalir }) {
  const [vista, setVista] = useState('nueva')
  const { categorias, productos, ajustes } = useMenu()
  const { ordenes, conectado, cambiarEstado } = useOrdenes()
  const [aviso, setAviso] = useState('')

  // Avisar cuando una orden de este mesero queda lista
  const previos = useRef(null)
  useEffect(() => {
    const actual = Object.fromEntries(ordenes.map((o) => [o.id, o.estado]))
    if (previos.current) {
      const listas = ordenes.filter(
        (o) => o.mesero === mesero && o.estado === 'lista' && previos.current[o.id] && previos.current[o.id] !== 'lista',
      )
      if (listas.length) {
        beep(3)
        setAviso(`Lista: ${listas.map(etiquetaOrden).join(', ')}`)
      }
    }
    previos.current = actual
  }, [ordenes, mesero])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(t)
  }, [aviso])

  const misListas = ordenes.filter((o) => o.mesero === mesero && o.estado === 'lista').length

  return (
    <div className="app">
      <Encabezado titulo={mesero} subtitulo="Mesero" conectado={conectado} onSalir={onSalir} />

      {aviso && (
        <button className="aviso" onClick={() => { setAviso(''); setVista('ordenes') }}>
          {aviso}
        </button>
      )}

      <main className="contenido">
        {vista === 'nueva' ? (
          <NuevaOrden
            mesero={mesero}
            categorias={categorias}
            productos={productos.filter((p) => p.activo)}
            numMesas={parseInt(ajustes.num_mesas, 10) || 10}
            ordenes={ordenes}
            onEnviada={(texto) => { setAviso(texto); setVista('ordenes') }}
          />
        ) : (
          <MisOrdenes mesero={mesero} ordenes={ordenes} cambiarEstado={cambiarEstado} />
        )}
      </main>

      <nav className="pestanas">
        <button className={vista === 'nueva' ? 'activo' : ''} onClick={() => setVista('nueva')}>
          Nueva orden
        </button>
        <button className={vista === 'ordenes' ? 'activo' : ''} onClick={() => setVista('ordenes')}>
          Órdenes {misListas > 0 && <span className="contador">{misListas}</span>}
        </button>
      </nav>
    </div>
  )
}

function NuevaOrden({ mesero, categorias, productos, numMesas, ordenes, onEnviada }) {
  const [tipo, setTipo] = useState('mesa')
  const [mesa, setMesa] = useState('')
  const [cliente, setCliente] = useState('')
  const [cat, setCat] = useState('todo')
  const [busca, setBusca] = useState('')
  const [carrito, setCarrito] = useState({}) // producto_id -> { cantidad, nota }
  const [nota, setNota] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const mesasOcupadas = useMemo(
    () => new Set(ordenes.filter((o) => o.tipo === 'mesa' && !['entregada', 'cancelada'].includes(o.estado)).map((o) => o.mesa)),
    [ordenes],
  )

  const visibles = productos.filter(
    (p) => (cat === 'todo' || p.categoria_id === cat) && p.nombre.toLowerCase().includes(busca.toLowerCase()),
  )

  const lineas = Object.entries(carrito)
    .map(([id, l]) => ({ ...l, producto: productos.find((p) => p.id === Number(id)) }))
    .filter((l) => l.producto && l.cantidad > 0)
  const cantidadTotal = lineas.reduce((s, l) => s + l.cantidad, 0)
  const total = lineas.reduce((s, l) => s + l.cantidad * Number(l.producto.precio), 0)

  const cambiar = (id, delta) =>
    setCarrito((c) => {
      const actual = c[id] || { cantidad: 0, nota: '' }
      const cantidad = Math.max(0, actual.cantidad + delta)
      const nuevo = { ...c, [id]: { ...actual, cantidad } }
      if (cantidad === 0) delete nuevo[id]
      return nuevo
    })

  const notaItem = (id, texto) => setCarrito((c) => ({ ...c, [id]: { ...c[id], nota: texto } }))

  const destinoListo = tipo === 'mesa' ? Boolean(mesa) : Boolean(cliente.trim())

  const enviar = async () => {
    setError('')
    if (!destinoListo) return setError(tipo === 'mesa' ? 'Elige la mesa' : 'Escribe el nombre del cliente')
    if (!lineas.length) return setError('Agrega productos')
    setEnviando(true)
    const { error: err } = await supabase.rpc('crear_orden', {
      payload: {
        tipo,
        mesa: tipo === 'mesa' ? mesa : null,
        cliente: tipo === 'llevar' ? cliente.trim() : null,
        mesero,
        nota,
        items: lineas.map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad, nota: l.nota })),
      },
    })
    setEnviando(false)
    if (err) return setError('No se pudo enviar. Revisa la conexión e intenta de nuevo.')
    const texto = `Enviada a cocina: ${tipo === 'mesa' ? 'Mesa ' + mesa : 'Llevar · ' + cliente.trim()}`
    setCarrito({}); setNota(''); setMesa(''); setCliente(''); setAbierto(false)
    onEnviada(texto)
  }

  return (
    <>
      <section className="bloque">
        <div className="segmentado">
          <button className={tipo === 'mesa' ? 'activo' : ''} onClick={() => setTipo('mesa')}>Mesa</button>
          <button className={tipo === 'llevar' ? 'activo' : ''} onClick={() => setTipo('llevar')}>Para llevar</button>
        </div>

        {tipo === 'mesa' ? (
          <div className="mesas">
            {Array.from({ length: numMesas }, (_, i) => String(i + 1)).map((n) => (
              <button
                key={n}
                className={'mesa' + (mesa === n ? ' activo' : '') + (mesasOcupadas.has(n) ? ' ocupada' : '')}
                onClick={() => setMesa(n)}
                aria-label={`Mesa ${n}${mesasOcupadas.has(n) ? ', con orden abierta' : ''}`}
              >
                {n}
              </button>
            ))}
          </div>
        ) : (
          <input className="entrada" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" />
        )}
      </section>

      <section className="bloque">
        <input className="entrada" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar producto" />
        <div className="chips">
          <button className={cat === 'todo' ? 'activo' : ''} onClick={() => setCat('todo')}>Todo</button>
          {categorias.map((c) => (
            <button key={c.id} className={cat === c.id ? 'activo' : ''} onClick={() => setCat(c.id)}>{c.nombre}</button>
          ))}
        </div>

        <ul className="productos">
          {visibles.map((p) => {
            const cant = carrito[p.id]?.cantidad || 0
            return (
              <li key={p.id} className={cant ? 'con-cantidad' : ''}>
                <button className="producto-info" onClick={() => cambiar(p.id, 1)}>
                  <span className="nombre">{p.nombre}</span>
                  <span className="precio">{lempiras(p.precio)}</span>
                </button>
                <div className="stepper">
                  {cant > 0 && <button onClick={() => cambiar(p.id, -1)} aria-label="Quitar uno">−</button>}
                  {cant > 0 && <span>{cant}</span>}
                  <button onClick={() => cambiar(p.id, 1)} aria-label="Agregar uno">+</button>
                </div>
              </li>
            )
          })}
          {!visibles.length && <li className="vacio">No hay productos</li>}
        </ul>
      </section>

      {cantidadTotal > 0 && (
        <button className="barra-carrito" onClick={() => setAbierto(true)}>
          <span>Ver orden · {cantidadTotal} {cantidadTotal === 1 ? 'producto' : 'productos'}</span>
          <strong>{lempiras(total)}</strong>
        </button>
      )}

      {abierto && (
        <div className="hoja-fondo" onClick={() => setAbierto(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Resumen de la orden">
            <div className="hoja-titulo">
              <h2>{tipo === 'mesa' ? (mesa ? `Mesa ${mesa}` : 'Elige la mesa') : cliente.trim() ? `Llevar · ${cliente.trim()}` : 'Para llevar'}</h2>
              <button className="btn texto" onClick={() => setAbierto(false)}>Cerrar</button>
            </div>

            <ul className="lineas">
              {lineas.map((l) => (
                <li key={l.producto.id}>
                  <div className="linea-fila">
                    <span className="nombre">{l.producto.nombre}</span>
                    <div className="stepper">
                      <button onClick={() => cambiar(l.producto.id, -1)} aria-label="Quitar uno">−</button>
                      <span>{l.cantidad}</span>
                      <button onClick={() => cambiar(l.producto.id, 1)} aria-label="Agregar uno">+</button>
                    </div>
                    <span className="precio">{lempiras(l.cantidad * l.producto.precio)}</span>
                  </div>
                  <input
                    className="entrada chica"
                    value={l.nota || ''}
                    onChange={(e) => notaItem(l.producto.id, e.target.value)}
                    placeholder="Nota (ej. sin cebolla)"
                  />
                </li>
              ))}
            </ul>

            <textarea className="entrada" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota general para cocina" />

            <div className="total-fila">
              <span>Total</span>
              <strong>{lempiras(total)}</strong>
            </div>

            {error && <p className="error">{error}</p>}

            <button className="btn primario grande" onClick={enviar} disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar a cocina'}
            </button>
          </div>
        </div>
      )}
      {error && !abierto && <p className="error flotante">{error}</p>}
    </>
  )
}

function MisOrdenes({ mesero, ordenes, cambiarEstado }) {
  const [soloMias, setSoloMias] = useState(true)
  const lista = ordenes
    .filter((o) => !soloMias || o.mesero === mesero)
    .filter((o) => o.estado !== 'cancelada')
    .sort((a, b) => {
      const peso = { lista: 0, pendiente: 1, preparando: 1, entregada: 2 }
      return peso[a.estado] - peso[b.estado] || new Date(b.created_at) - new Date(a.created_at)
    })

  return (
    <section className="bloque">
      <label className="interruptor">
        <input type="checkbox" checked={soloMias} onChange={(e) => setSoloMias(e.target.checked)} />
        Solo mis órdenes
      </label>

      {!lista.length && <p className="vacio">Todavía no hay órdenes hoy.</p>}

      <ul className="ordenes">
        {lista.map((o) => (
          <li key={o.id} className={`orden estado-${o.estado}`}>
            <div className="orden-cabeza">
              <strong>{etiquetaOrden(o)}</strong>
              <span className={`insignia ${o.estado}`}>{ESTADOS[o.estado]}</span>
            </div>
            <p className="suave">#{o.id} · {hora(o.created_at)} · {o.mesero} · {lempiras(o.total)}</p>
            <ul className="items">
              {o.orden_items.map((it) => (
                <li key={it.id}>
                  {it.cantidad}× {it.nombre}
                  {it.nota && <em> — {it.nota}</em>}
                </li>
              ))}
            </ul>
            {o.estado === 'lista' && (
              <button className="btn exito" onClick={() => cambiarEstado(o.id, 'entregada')}>Marcar entregada</button>
            )}
            {o.estado === 'pendiente' && (
              <button
                className="btn texto peligro"
                onClick={() => confirm('¿Cancelar esta orden?') && cambiarEstado(o.id, 'cancelada')}
              >
                Cancelar orden
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
