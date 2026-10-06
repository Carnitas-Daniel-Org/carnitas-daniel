import { useRef, useState } from 'react'
import { Camera, FileSpreadsheet, Images, Plus, Trash2 } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import { Buscar, Campo, Confirmar, Foto, Interruptor, Modal, useAviso } from '../components/ui'
import { q, useConsulta } from '../lib/data'
import { exportarExcel } from '../lib/export'
import { subirFotoProducto } from '../lib/imagen'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { lempiras, mensajeError, numero, porcentaje } from '../lib/format'
import { ILUSTRACIONES } from '../lib/marca'

export default function Menu() {
  const { menu } = useSesion()
  const avisar = useAviso()
  const [busca, setBusca] = useState('')
  const [editar, setEditar] = useState(null)
  const [categorias, setCategorias] = useState(false)
  const { datos: extra, recargar: recargarExtra } = useConsulta(
    async () => {
      const [recetas, insumos] = await Promise.all([
        q(supabase.from('recetas').select('*')),
        q(supabase.from('insumos').select('*').order('nombre')),
      ])
      return { recetas, insumos }
    },
    [],
    ['insumos'],
  )
  const recetas = extra?.recetas || []
  const insumos = extra?.insumos || []

  const costoDe = (p) => {
    const r = recetas.filter((x) => x.producto_id === p.id)
    if (!r.length) return Number(p.costo || 0)
    return r.reduce((s, x) => s + Number(x.cantidad) * Number(insumos.find((i) => i.id === x.insumo_id)?.costo_unitario || 0), 0)
  }

  const disponible = async (p, v) => {
    try {
      await q(supabase.from('productos').update({ disponible: v }).eq('id', p.id))
      avisar(v ? `${p.nombre} disponible` : `${p.nombre} marcado como agotado`)
      menu.recargar()
    } catch (e) { avisar(mensajeError(e), 'error') }
  }

  const filtrados = menu.productos.filter((p) => p.nombre.toLowerCase().includes(busca.trim().toLowerCase()))
  const grupos = [...menu.categorias, { id: null, nombre: 'Sin categoría' }]

  const exportar = () =>
    exportarExcel('menu-carnitas-daniel.xlsx', [{
      nombre: 'Menú',
      filas: menu.productos,
      columnas: [
        { titulo: 'Producto', valor: (p) => p.nombre, ancho: 28 },
        { titulo: 'Categoría', valor: (p) => menu.categorias.find((c) => c.id === p.categoria_id)?.nombre },
        { titulo: 'Precio', valor: (p) => p.precio, tipo: 'dinero' },
        { titulo: 'Costo', valor: (p) => costoDe(p), tipo: 'dinero' },
        { titulo: 'Margen', valor: (p) => (p.precio > 0 ? ((p.precio - costoDe(p)) / p.precio) * 100 : 0), tipo: 'porcentaje' },
        { titulo: 'Disponible', valor: (p) => (p.disponible ? 'Sí' : 'Agotado') },
        { titulo: 'Visible', valor: (p) => (p.activo ? 'Sí' : 'No') },
      ],
    }])

  return (
    <Pantalla
      titulo="Menú y precios"
      sub={`${menu.productos.filter((p) => p.activo).length} productos a la venta`}
      acciones={
        <>
          <button className="btn" onClick={exportar}><FileSpreadsheet size={18} /> Excel</button>
          <button className="btn" onClick={() => setCategorias(true)}>Categorías</button>
          <button className="btn primario" onClick={() => setEditar({ nombre: '', precio: '', costo: '', descripcion: '', categoria_id: menu.categorias[0]?.id ?? null, activo: true, disponible: true })}>
            <Plus size={18} /> Producto
          </button>
        </>
      }
    >
      <Buscar valor={busca} onCambio={setBusca} placeholder="Buscar producto" />
      {grupos.map((g) => {
        const items = filtrados.filter((p) => (p.categoria_id ?? null) === g.id)
        if (!items.length) return null
        return (
          <section className="panel" key={g.id ?? 'sin'}>
            <div className="panel-cabeza"><h2>{g.nombre}</h2><p>{items.length} productos</p></div>
            <div className="tabla-envoltura">
              <table className="tabla fija">
                <colgroup><col /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 90 }} /><col style={{ width: 140 }} /></colgroup>
                <thead>
                  <tr><th>Producto</th><th className="n">Precio</th><th className="n">Costo</th><th className="n">Margen</th><th>Disponible</th></tr>
                </thead>
                <tbody>
                  {items.map((p) => {
                    const c = costoDe(p)
                    const m = p.precio > 0 ? ((p.precio - c) / p.precio) * 100 : 0
                    return (
                      <tr key={p.id} className="clic" onClick={() => setEditar(p)} style={{ opacity: p.activo ? 1 : 0.5 }}>
                        <td>
                          <div className="fila" style={{ flexWrap: 'nowrap' }}>
                            <Foto producto={p} tam={52} />
                            <div>
                              <strong>{p.nombre}</strong>
                              {!p.activo && <span className="estado neutro" style={{ marginLeft: 8 }}>Oculto</span>}
                              {p.descripcion && <div className="suave chico">{p.descripcion}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="n fuerte">{lempiras(p.precio)}</td>
                        <td className="n">{c ? lempiras(c) : <span className="tenue">Sin costo</span>}</td>
                        <td className="n" style={{ color: m < 40 ? 'var(--chile)' : m < 55 ? 'var(--maiz)' : 'var(--verde)', fontWeight: 700 }}>
                          {c ? porcentaje(m) : '—'}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Interruptor marcado={p.disponible} onCambio={(v) => disponible(p, v)}>{p.disponible ? 'Sí' : 'Agotado'}</Interruptor>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      {editar && (
        <EditarProducto
          producto={editar}
          recetas={recetas.filter((r) => r.producto_id === editar.id)}
          insumos={insumos}
          onCerrar={() => setEditar(null)}
          onGuardado={() => { menu.recargar(); recargarExtra(); setEditar(null) }}
        />
      )}
      {categorias && <Categorias onCerrar={() => setCategorias(false)} />}
    </Pantalla>
  )
}

function EditarProducto({ producto, recetas, insumos, onCerrar, onGuardado }) {
  const { menu } = useSesion()
  const avisar = useAviso()
  const [p, setP] = useState({ ...producto, precio: String(producto.precio ?? ''), costo: String(producto.costo ?? '') })
  const [receta, setReceta] = useState(recetas.map((r) => ({ insumo_id: r.insumo_id, cantidad: String(r.cantidad) })))
  const [foto, setFoto] = useState(null) // { archivo, vista }
  const [ocupado, setOcupado] = useState(false)
  const [borrar, setBorrar] = useState(false)
  const [galeria, setGaleria] = useState(false)
  const archivoRef = useRef(null)
  const nuevo = !producto.id

  const costoReceta = receta.reduce(
    (s, r) => s + (Number(r.cantidad) || 0) * Number(insumos.find((i) => i.id === Number(r.insumo_id))?.costo_unitario || 0), 0,
  )
  const costo = receta.length ? costoReceta : Number(p.costo) || 0
  const margen = Number(p.precio) > 0 ? ((Number(p.precio) - costo) / Number(p.precio)) * 100 : 0

  const guardar = async () => {
    if (!p.nombre.trim() || p.precio === '') return avisar('Nombre y precio son obligatorios', 'error')
    setOcupado(true)
    try {
      const datos = {
        nombre: p.nombre.trim(),
        descripcion: p.descripcion?.trim() || null,
        precio: Number(p.precio),
        costo: Number(p.costo) || 0,
        categoria_id: p.categoria_id ? Number(p.categoria_id) : null,
        activo: p.activo,
        disponible: p.disponible,
        imagen_url: p.imagen_url || null,
      }
      let id = producto.id
      if (nuevo) {
        const [fila] = await q(supabase.from('productos').insert({ ...datos, orden: menu.productos.length + 1 }).select())
        id = fila.id
      } else {
        await q(supabase.from('productos').update(datos).eq('id', id))
      }
      if (foto) {
        const url = await subirFotoProducto(id, foto.archivo)
        await q(supabase.from('productos').update({ imagen_url: url }).eq('id', id))
      }
      // Receta: reemplazar las filas
      const validas = receta.filter((r) => r.insumo_id && Number(r.cantidad) > 0)
      const quitar = recetas.filter((r) => !validas.some((v) => Number(v.insumo_id) === r.insumo_id))
      for (const r of quitar) await q(supabase.from('recetas').delete().eq('producto_id', id).eq('insumo_id', r.insumo_id))
      if (validas.length) {
        await q(supabase.from('recetas').upsert(validas.map((r) => ({ producto_id: id, insumo_id: Number(r.insumo_id), cantidad: Number(r.cantidad) }))))
      }
      avisar('Producto guardado', 'ok')
      onGuardado()
    } catch (e) {
      avisar(mensajeError(e), 'error')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal
      ancho
      titulo={nuevo ? 'Nuevo producto' : p.nombre}
      onCerrar={onCerrar}
      pie={
        <>
          {!nuevo && <button className="btn peligro" onClick={() => setBorrar(true)}><Trash2 size={18} /> Quitar del menú</button>}
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={onCerrar}>Cancelar</button>
          <button className="btn primario" disabled={ocupado} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar'}</button>
        </>
      }
    >
      <div className="subir-foto">
        <Foto producto={foto ? { ...p, imagen_url: foto.vista } : p} tam={110} />
        <div className="pila" style={{ gap: 6 }}>
          <div className="fila">
            <button className="btn" onClick={() => archivoRef.current.click()}><Camera size={18} /> Tomar o subir foto</button>
            <button className="btn" onClick={() => setGaleria(true)}><Images size={18} /> Elegir ilustración</button>
          </div>
          <span className="suave chico">Una foto real de tu plato vende más. Tómala desde arriba, con buena luz y el plato centrado.</span>
          <input ref={archivoRef} type="file" accept="image/*" className="oculto"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFoto({ archivo: f, vista: URL.createObjectURL(f) }) }} />
        </div>
      </div>

      <div className="campos">
        <Campo etiqueta="Nombre"><input className="entrada" value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} /></Campo>
        <Campo etiqueta="Categoría">
          <select className="entrada" value={p.categoria_id ?? ''} onChange={(e) => setP({ ...p, categoria_id: e.target.value || null })}>
            <option value="">Sin categoría</option>
            {menu.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Precio de venta (L)"><input className="entrada" inputMode="decimal" value={p.precio} onChange={(e) => setP({ ...p, precio: e.target.value })} /></Campo>
      </div>
      <Campo etiqueta="Descripción" ayuda="Opcional. Ayuda a los meseros a explicar el plato.">
        <input className="entrada" value={p.descripcion || ''} onChange={(e) => setP({ ...p, descripcion: e.target.value })} />
      </Campo>
      <div className="fila" style={{ gap: 24 }}>
        <Interruptor marcado={p.activo} onCambio={(v) => setP({ ...p, activo: v })}>Visible en el menú</Interruptor>
        <Interruptor marcado={p.disponible} onCambio={(v) => setP({ ...p, disponible: v })}>Disponible hoy</Interruptor>
      </div>

      <div className="separador" />
      <div className="fila entre">
        <div>
          <h3>Receta y costo</h3>
          <p className="suave chico">Con la receta, el inventario baja solo con cada venta y el costo se calcula automático.</p>
        </div>
        <button className="btn compacto" onClick={() => setReceta([...receta, { insumo_id: '', cantidad: '' }])}><Plus size={16} /> Insumo</button>
      </div>
      {receta.length === 0 ? (
        <Campo etiqueta="Costo manual por unidad (L)" ayuda="Úsalo si no quieres definir receta">
          <input className="entrada" inputMode="decimal" value={p.costo} onChange={(e) => setP({ ...p, costo: e.target.value })} style={{ maxWidth: 200 }} />
        </Campo>
      ) : (
        <div className="pila">
          {receta.map((r, i) => {
            const ins = insumos.find((x) => x.id === Number(r.insumo_id))
            return (
              <div key={i} className="fila" style={{ flexWrap: 'nowrap' }}>
                <select className="entrada" value={r.insumo_id} onChange={(e) => setReceta(receta.map((x, j) => (j === i ? { ...x, insumo_id: e.target.value } : x)))}>
                  <option value="">Elige un insumo</option>
                  {insumos.map((x) => <option key={x.id} value={x.id}>{x.nombre} ({x.unidad})</option>)}
                </select>
                <input className="entrada" style={{ maxWidth: 110 }} inputMode="decimal" placeholder="Cantidad" value={r.cantidad}
                  onChange={(e) => setReceta(receta.map((x, j) => (j === i ? { ...x, cantidad: e.target.value } : x)))} />
                <span className="suave chico" style={{ minWidth: 80, textAlign: 'right' }}>
                  {ins ? lempiras((Number(r.cantidad) || 0) * ins.costo_unitario) : ''}
                </span>
                <button className="btn fantasma btn-icono" aria-label="Quitar" onClick={() => setReceta(receta.filter((_, j) => j !== i))}><Trash2 size={18} /></button>
              </div>
            )
          })}
        </div>
      )}
      <div className="cifras">
        <div className="cifra-caja"><span className="etiqueta">Costo por plato</span><span className="valor cifra">{lempiras(costo)}</span></div>
        <div className="cifra-caja"><span className="etiqueta">Ganancia por plato</span><span className="valor cifra">{lempiras((Number(p.precio) || 0) - costo)}</span></div>
        <div className="cifra-caja"><span className="etiqueta">Margen</span><span className="valor cifra" style={{ color: margen < 40 ? 'var(--chile)' : 'var(--verde)' }}>{porcentaje(margen)}</span>
          <span className="nota">{margen < 40 && costo > 0 ? 'Bajo para comida: revisa precio o porciones' : `Por cada L 100 vendidos quedan L ${numero(margen)}`}</span></div>
      </div>

      {galeria && (
        <Modal ancho titulo="Elegir ilustración" onCerrar={() => setGaleria(false)}>
          <div className="galeria">
            {ILUSTRACIONES.map((il) => (
              <button key={il.url} className={'galeria-item' + (p.imagen_url === il.url && !foto ? ' activo' : '')}
                onClick={() => { setP({ ...p, imagen_url: il.url }); setFoto(null); setGaleria(false) }}>
                <Foto producto={{ imagen_url: il.url }} tam={84} />
                <span>{il.nombre}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {borrar && (
        <Confirmar
          titulo={`¿Quitar ${p.nombre} del menú?`}
          texto="Deja de aparecer para los meseros. Las ventas anteriores se conservan en los reportes."
          accion="Quitar"
          peligro
          onNo={() => setBorrar(false)}
          onSi={async () => {
            try { await q(supabase.from('productos').update({ activo: false }).eq('id', producto.id)); onGuardado() } catch (e) { avisar(mensajeError(e), 'error') }
          }}
        />
      )}
    </Modal>
  )
}

function Categorias({ onCerrar }) {
  const { menu } = useSesion()
  const avisar = useAviso()
  const [nueva, setNueva] = useState('')
  const [nombres, setNombres] = useState(Object.fromEntries(menu.categorias.map((c) => [c.id, c.nombre])))
  const ejecutar = async (promesa, ok) => {
    try { await q(promesa); if (ok) avisar(ok); menu.recargar() } catch (e) { avisar(mensajeError(e), 'error') }
  }
  return (
    <Modal titulo="Categorías del menú" onCerrar={onCerrar}>
      <ul className="lista-simple">
        {menu.categorias.map((c, i) => (
          <li key={c.id}>
            <input className="entrada" value={nombres[c.id] ?? c.nombre} onChange={(e) => setNombres({ ...nombres, [c.id]: e.target.value })}
              onBlur={() => nombres[c.id] !== c.nombre && ejecutar(supabase.from('categorias').update({ nombre: nombres[c.id] }).eq('id', c.id), 'Categoría renombrada')} />
            <div className="fila" style={{ flexWrap: 'nowrap', gap: 4 }}>
              <button className="btn compacto" disabled={i === 0} aria-label="Subir"
                onClick={() => ejecutar(Promise.all([
                  supabase.from('categorias').update({ orden: i }).eq('id', c.id),
                  supabase.from('categorias').update({ orden: i + 1 }).eq('id', menu.categorias[i - 1].id),
                ]).then((r) => r[0]))}>↑</button>
              <button className="btn compacto peligro" aria-label="Borrar"
                onClick={() => ejecutar(supabase.from('categorias').delete().eq('id', c.id), 'Categoría borrada. Sus productos quedan sin categoría.')}><Trash2 size={16} /></button>
            </div>
          </li>
        ))}
      </ul>
      <div className="fila" style={{ flexWrap: 'nowrap' }}>
        <input className="entrada" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva categoría, ej. Desayunos" />
        <button className="btn primario" disabled={!nueva.trim()}
          onClick={() => { ejecutar(supabase.from('categorias').insert({ nombre: nueva.trim(), orden: menu.categorias.length + 1 }), 'Categoría creada'); setNueva('') }}>
          Crear
        </button>
      </div>
    </Modal>
  )
}
