import { useMemo, useState } from 'react'
import { Minus, Plus, Send, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { lempiras, mensajeError } from '../lib/format'
import { Buscar, Foto, Modal, useAviso } from './ui'

/**
 * Armar un pedido: menú con fotos + resumen de la orden.
 * destino: { tipo: 'mesa'|'llevar'|'delivery', mesa?, cliente?, telefono?, direccion? }
 */
export default function Comanda({ destino, etiqueta, onEnviada, onCancelar }) {
  const { empleado, menu } = useSesion()
  const avisar = useAviso()
  const [cat, setCat] = useState('todo')
  const [busca, setBusca] = useState('')
  const [lineas, setLineas] = useState({}) // id -> { cantidad, nota }
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [verOrden, setVerOrden] = useState(false)

  const productos = menu.productos.filter((p) => p.activo)
  const visibles = productos.filter(
    (p) => (cat === 'todo' || p.categoria_id === cat) && p.nombre.toLowerCase().includes(busca.trim().toLowerCase()),
  )

  const items = useMemo(
    () =>
      Object.entries(lineas)
        .map(([id, l]) => ({ ...l, p: productos.find((x) => x.id === Number(id)) }))
        .filter((l) => l.p && l.cantidad > 0),
    [lineas, productos],
  )
  const cantidad = items.reduce((s, l) => s + l.cantidad, 0)
  const total = items.reduce((s, l) => s + l.cantidad * Number(l.p.precio), 0)

  const cambiar = (id, d) =>
    setLineas((c) => {
      const a = c[id] || { cantidad: 0, nota: '' }
      const n = Math.max(0, a.cantidad + d)
      const x = { ...c, [id]: { ...a, cantidad: n } }
      if (!n) delete x[id]
      return x
    })

  const enviar = async () => {
    if (!items.length) return avisar('Agrega al menos un plato', 'error')
    setEnviando(true)
    const { data, error } = await supabase.rpc('crear_orden', {
      payload: {
        ...destino,
        mesero: empleado.nombre,
        empleado_id: empleado.id,
        nota,
        items: items.map((l) => ({ producto_id: l.p.id, cantidad: l.cantidad, nota: l.nota })),
      },
    })
    setEnviando(false)
    if (error) return avisar(mensajeError(error), 'error')
    avisar(`Enviado a cocina: ${etiqueta}`, 'ok')
    setLineas({})
    setNota('')
    setVerOrden(false)
    onEnviada?.(data)
  }

  const resumen = (
    <>
      {!items.length ? (
        <p className="suave">Toca un plato para agregarlo.</p>
      ) : (
        <ul className="lineas">
          {items.map((l) => (
            <li key={l.p.id} className="linea">
              <div>
                <div className="nombre">{l.p.nombre}</div>
                <div className="suave chico num">{lempiras(l.p.precio)} c/u</div>
              </div>
              <div className="stepper">
                <button onClick={() => cambiar(l.p.id, -1)} aria-label="Quitar uno">
                  {l.cantidad === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                </button>
                <span>{l.cantidad}</span>
                <button onClick={() => cambiar(l.p.id, 1)} aria-label="Agregar uno"><Plus size={16} /></button>
              </div>
              <input
                className="entrada nota-in"
                style={{ minHeight: 38, padding: '7px 10px' }}
                value={l.nota || ''}
                onChange={(e) => setLineas((c) => ({ ...c, [l.p.id]: { ...c[l.p.id], nota: e.target.value } }))}
                placeholder="Nota para cocina (sin cebolla, bien dorado…)"
              />
            </li>
          ))}
        </ul>
      )}
      <textarea className="entrada" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota general del pedido" />
      <div className="total-grande">
        <span>Total</span>
        <span className="cifra">{lempiras(total)}</span>
      </div>
      <button className="btn primario grande bloque" disabled={enviando || !items.length} onClick={enviar}>
        <Send size={20} /> {enviando ? 'Enviando…' : 'Enviar a cocina'}
      </button>
      {onCancelar && <button className="btn fantasma bloque" onClick={onCancelar}>Cancelar</button>}
    </>
  )

  return (
    <div className="comanda">
      <section className="pila" style={{ gap: 14 }}>
        <div className="pila">
          <Buscar valor={busca} onCambio={setBusca} placeholder="Buscar plato o bebida" />
          <div className="chips">
            <button className={'chip' + (cat === 'todo' ? ' activo' : '')} onClick={() => setCat('todo')}>Todo</button>
            {menu.categorias.map((c) => (
              <button key={c.id} className={'chip' + (cat === c.id ? ' activo' : '')} onClick={() => setCat(c.id)}>{c.nombre}</button>
            ))}
          </div>
        </div>
        <div className="menu-rejilla">
          {visibles.map((p) => {
            const n = lineas[p.id]?.cantidad || 0
            return (
              <button
                key={p.id}
                className={'producto' + (n ? ' en-orden' : '') + (p.disponible ? '' : ' agotado')}
                disabled={!p.disponible}
                onClick={() => cambiar(p.id, 1)}
              >
                {n > 0 && <span className="cantidad">{n}</span>}
                <Foto producto={p} />
                <span className="nombre">{p.nombre}</span>
                <span className="precio">{lempiras(p.precio)}</span>
              </button>
            )
          })}
        </div>
        {!visibles.length && <p className="suave">No hay productos con ese nombre.</p>}
      </section>

      <aside className="panel comanda-orden pila">
        <h2>{etiqueta}</h2>
        {resumen}
      </aside>

      {cantidad > 0 && (
        <button className="barra-orden" onClick={() => setVerOrden(true)}>
          <span>Ver pedido, {cantidad} {cantidad === 1 ? 'producto' : 'productos'}</span>
          <span className="cifra">{lempiras(total)}</span>
        </button>
      )}

      {verOrden && (
        <Modal titulo={etiqueta} onCerrar={() => setVerOrden(false)}>
          {resumen}
        </Modal>
      )}
    </div>
  )
}
