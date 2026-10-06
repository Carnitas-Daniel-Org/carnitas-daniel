import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useMenu, useOrdenes } from '../lib/useOrdenes'
import { ESTADOS, etiquetaOrden, hora, lempiras } from '../lib/format'
import Encabezado from './Encabezado'

export default function Admin({ onSalir }) {
  const [vista, setVista] = useState('ventas')
  const menu = useMenu()
  const ordenesHoy = useOrdenes()

  return (
    <div className="app">
      <Encabezado titulo="Administración" subtitulo="Carnitas Daniel" conectado={ordenesHoy.conectado} onSalir={onSalir} />
      <nav className="chips barra">
        {[
          ['ventas', 'Ventas de hoy'],
          ['menu', 'Menú y precios'],
          ['ajustes', 'Ajustes'],
        ].map(([id, t]) => (
          <button key={id} className={vista === id ? 'activo' : ''} onClick={() => setVista(id)}>{t}</button>
        ))}
      </nav>
      <main className="contenido">
        {vista === 'ventas' && <Ventas {...ordenesHoy} />}
        {vista === 'menu' && <Menu {...menu} />}
        {vista === 'ajustes' && <Ajustes key={menu.ajustes.num_mesas} {...menu} />}
      </main>
    </div>
  )
}

function Ventas({ ordenes, cambiarEstado }) {
  const validas = ordenes.filter((o) => o.estado !== 'cancelada')
  const total = validas.reduce((s, o) => s + Number(o.total), 0)
  const canceladas = ordenes.length - validas.length

  const porProducto = (() => {
    const m = {}
    validas.forEach((o) =>
      o.orden_items.forEach((it) => {
        m[it.nombre] = m[it.nombre] || { cantidad: 0, monto: 0 }
        m[it.nombre].cantidad += it.cantidad
        m[it.nombre].monto += it.cantidad * Number(it.precio)
      }),
    )
    return Object.entries(m).sort((a, b) => b[1].monto - a[1].monto)
  })()

  return (
    <>
      <section className="kpis">
        <div><span>Vendido hoy</span><strong>{lempiras(total)}</strong></div>
        <div><span>Órdenes</span><strong>{validas.length}</strong></div>
        <div><span>Promedio por orden</span><strong>{lempiras(validas.length ? total / validas.length : 0)}</strong></div>
        <div><span>Canceladas</span><strong>{canceladas}</strong></div>
      </section>

      <section className="bloque">
        <h2>Por producto</h2>
        {!porProducto.length && <p className="vacio">Sin ventas todavía.</p>}
        <table className="tabla">
          <tbody>
            {porProducto.map(([nombre, v]) => (
              <tr key={nombre}>
                <td>{nombre}</td>
                <td className="num">{v.cantidad}</td>
                <td className="num">{lempiras(v.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bloque">
        <h2>Órdenes de hoy</h2>
        <table className="tabla">
          <tbody>
            {[...ordenes].reverse().map((o) => (
              <tr key={o.id} className={o.estado === 'cancelada' ? 'tachado' : ''}>
                <td>#{o.id}<br /><span className="suave">{hora(o.created_at)}</span></td>
                <td>{etiquetaOrden(o)}<br /><span className="suave">{o.mesero}</span></td>
                <td><span className={`insignia ${o.estado}`}>{ESTADOS[o.estado]}</span></td>
                <td className="num">
                  {lempiras(o.total)}
                  {o.estado !== 'cancelada' && (
                    <button
                      className="btn texto peligro chico"
                      onClick={() => confirm(`¿Cancelar la orden #${o.id}?`) && cambiarEstado(o.id, 'cancelada')}
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}

function Menu({ categorias, productos, recargar }) {
  const [nuevaCat, setNuevaCat] = useState('')
  const [nuevo, setNuevo] = useState({ nombre: '', precio: '', categoria_id: '' })
  const [error, setError] = useState('')

  const ejecutar = async (promesa) => {
    setError('')
    const { error: err } = await promesa
    if (err) setError('No se pudo guardar: ' + err.message)
    recargar()
  }

  const agregarCategoria = (e) => {
    e.preventDefault()
    if (!nuevaCat.trim()) return
    ejecutar(supabase.from('categorias').insert({ nombre: nuevaCat.trim(), orden: categorias.length + 1 }))
    setNuevaCat('')
  }

  const agregarProducto = (e) => {
    e.preventDefault()
    if (!nuevo.nombre.trim() || nuevo.precio === '') return setError('Nombre y precio son obligatorios')
    ejecutar(
      supabase.from('productos').insert({
        nombre: nuevo.nombre.trim(),
        precio: Number(nuevo.precio),
        categoria_id: nuevo.categoria_id ? Number(nuevo.categoria_id) : null,
        orden: productos.length + 1,
      }),
    )
    setNuevo({ nombre: '', precio: '', categoria_id: nuevo.categoria_id })
  }

  const grupos = [...categorias.map((c) => ({ ...c })), { id: null, nombre: 'Sin categoría' }]

  return (
    <>
      {error && <p className="error">{error}</p>}

      <section className="bloque">
        <h2>Agregar producto</h2>
        <form className="form-fila" onSubmit={agregarProducto}>
          <input className="entrada" placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <input className="entrada corto" placeholder="Precio" inputMode="decimal" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value })} />
          <select className="entrada" value={nuevo.categoria_id} onChange={(e) => setNuevo({ ...nuevo, categoria_id: e.target.value })}>
            <option value="">Categoría…</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <button className="btn primario" type="submit">Agregar</button>
        </form>
      </section>

      {grupos.map((g) => {
        const items = productos.filter((p) => p.categoria_id === g.id)
        if (g.id === null && !items.length) return null
        return (
          <section className="bloque" key={g.id ?? 'sin'}>
            <div className="fila-titulo">
              <h2>{g.nombre}</h2>
              {g.id !== null && (
                <button
                  className="btn texto peligro chico"
                  onClick={() => confirm(`¿Borrar la categoría "${g.nombre}"? Los productos quedan sin categoría.`) &&
                    ejecutar(supabase.from('categorias').delete().eq('id', g.id))}
                >
                  Borrar categoría
                </button>
              )}
            </div>
            <ul className="editor">
              {items.map((p) => <FilaProducto key={p.id} p={p} categorias={categorias} ejecutar={ejecutar} />)}
              {!items.length && <li className="vacio">Sin productos</li>}
            </ul>
          </section>
        )
      })}

      <section className="bloque">
        <h2>Nueva categoría</h2>
        <form className="form-fila" onSubmit={agregarCategoria}>
          <input className="entrada" placeholder="Ej. Desayunos" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} />
          <button className="btn secundario" type="submit">Crear</button>
        </form>
      </section>
    </>
  )
}

function FilaProducto({ p, categorias, ejecutar }) {
  const [nombre, setNombre] = useState(p.nombre)
  const [precio, setPrecio] = useState(String(p.precio))
  const [cat, setCat] = useState(p.categoria_id ?? '')
  const cambio = nombre !== p.nombre || Number(precio) !== Number(p.precio) || String(cat) !== String(p.categoria_id ?? '')

  const guardar = () =>
    ejecutar(
      supabase.from('productos').update({
        nombre: nombre.trim(),
        precio: Number(precio),
        categoria_id: cat === '' ? null : Number(cat),
      }).eq('id', p.id),
    )

  return (
    <li className={p.activo ? '' : 'inactivo'}>
      <input className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre" />
      <input className="entrada corto" value={precio} inputMode="decimal" onChange={(e) => setPrecio(e.target.value)} aria-label="Precio" />
      <select className="entrada" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría">
        <option value="">Sin categoría</option>
        {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <div className="acciones-fila">
        {cambio && <button className="btn primario chico" onClick={guardar}>Guardar</button>}
        <button
          className="btn texto chico"
          onClick={() => ejecutar(supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id))}
        >
          {p.activo ? 'Ocultar' : 'Mostrar'}
        </button>
        <button
          className="btn texto peligro chico"
          onClick={() => confirm(`¿Borrar "${p.nombre}"?`) && ejecutar(supabase.from('productos').delete().eq('id', p.id))}
        >
          Borrar
        </button>
      </div>
    </li>
  )
}

function Ajustes({ ajustes, recargar }) {
  const [mesas, setMesas] = useState(ajustes.num_mesas)
  const [ok, setOk] = useState('')

  const guardar = async (e) => {
    e.preventDefault()
    const n = Math.max(1, Math.min(60, parseInt(mesas, 10) || 1))
    const { error } = await supabase.from('ajustes').upsert({ clave: 'num_mesas', valor: String(n) })
    setOk(error ? 'No se pudo guardar' : 'Guardado')
    recargar()
  }

  return (
    <section className="bloque">
      <h2>Ajustes</h2>
      <form className="form-fila" onSubmit={guardar}>
        <label className="campo">
          Número de mesas
          <input className="entrada corto" inputMode="numeric" value={mesas} onChange={(e) => setMesas(e.target.value)} />
        </label>
        <button className="btn primario" type="submit">Guardar</button>
      </form>
      {ok && <p className="suave">{ok}</p>}
      <p className="suave">
        Los PIN de acceso se cambian en Vercel (variables <code>VITE_PIN_STAFF</code> y <code>VITE_PIN_ADMIN</code>).
      </p>
    </section>
  )
}
