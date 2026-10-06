import { useState } from 'react'
import { AlertTriangle, FileSpreadsheet, History, PackagePlus, Plus, ShoppingCart, SlidersHorizontal } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import { Buscar, Campo, Cifra, Interruptor, Modal, Segmentos, Vacio, useAviso } from '../components/ui'
import { q, useConsulta } from '../lib/data'
import { exportarExcel } from '../lib/export'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { UNIDADES, fechaHora, lempiras, mensajeError, numero } from '../lib/format'

const TIPOS = { compra: 'Compra', venta: 'Venta', ajuste: 'Ajuste', merma: 'Merma', devolucion: 'Devolución' }

export default function Inventario() {
  const { empleado } = useSesion()
  const [vista, setVista] = useState('stock')
  const [busca, setBusca] = useState('')
  const [movimiento, setMovimiento] = useState(null) // { insumo, tipo }
  const [editar, setEditar] = useState(null)
  const [historial, setHistorial] = useState(null)
  const esDueno = empleado.rol === 'dueno'

  const { datos, recargar } = useConsulta(
    () => q(supabase.from('insumos').select('*').order('nombre')),
    [],
    ['insumos'],
  )
  const insumos = (datos || []).filter((i) => i.activo || esDueno)
  const lista = insumos.filter((i) => i.nombre.toLowerCase().includes(busca.trim().toLowerCase()))
  const bajos = insumos.filter((i) => i.activo && Number(i.stock) <= Number(i.minimo))
  const valor = insumos.reduce((s, i) => s + Math.max(0, Number(i.stock)) * Number(i.costo_unitario), 0)

  const exportar = () =>
    exportarExcel('inventario-carnitas-daniel.xlsx', [{
      nombre: 'Inventario',
      filas: insumos,
      columnas: [
        { titulo: 'Insumo', valor: (i) => i.nombre, ancho: 26 },
        { titulo: 'Unidad', valor: (i) => i.unidad },
        { titulo: 'Existencia', valor: (i) => i.stock, tipo: 'numero' },
        { titulo: 'Mínimo', valor: (i) => i.minimo, tipo: 'numero' },
        { titulo: 'Costo unitario', valor: (i) => i.costo_unitario, tipo: 'dinero' },
        { titulo: 'Valor', valor: (i) => Math.max(0, i.stock) * i.costo_unitario, tipo: 'dinero' },
        { titulo: 'Estado', valor: (i) => (Number(i.stock) <= Number(i.minimo) ? 'Comprar' : 'Bien') },
      ],
    }])

  return (
    <Pantalla
      titulo="Inventario"
      sub="Insumos, compras y lo que se gasta con cada venta"
      acciones={
        <>
          <button className="btn" onClick={exportar}><FileSpreadsheet size={18} /> Excel</button>
          {esDueno && (
            <button className="btn primario" onClick={() => setEditar({ nombre: '', unidad: 'lb', minimo: '', costo_unitario: '', activo: true })}>
              <Plus size={18} /> Insumo
            </button>
          )}
        </>
      }
    >
      <div className="cifras">
        <Cifra etiqueta="Valor del inventario" valor={lempiras(valor)} destacada />
        <Cifra etiqueta="Insumos" valor={insumos.length} />
        <Cifra etiqueta="Por comprar" valor={bajos.length} nota={bajos.length ? 'Debajo del mínimo' : 'Todo en orden'} />
      </div>

      {bajos.length > 0 && (
        <div className="aviso-banda alerta">
          <AlertTriangle size={20} />
          <span>Comprar pronto: {bajos.map((i) => `${i.nombre} (quedan ${numero(i.stock)} ${i.unidad})`).join(', ')}</span>
        </div>
      )}

      <Segmentos opciones={[['stock', 'Existencias'], ['movs', 'Movimientos']]} valor={vista} onCambio={setVista} />

      {vista === 'stock' ? (
        <section className="panel pila">
          <Buscar valor={busca} onCambio={setBusca} placeholder="Buscar insumo" />
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr><th>Insumo</th><th className="n">Existencia</th><th className="n">Mínimo</th><th className="n">Costo</th><th className="n">Valor</th><th /></tr>
              </thead>
              <tbody>
                {lista.map((i) => {
                  const bajo = Number(i.stock) <= Number(i.minimo)
                  return (
                    <tr key={i.id} style={{ opacity: i.activo ? 1 : 0.5 }}>
                      <td>
                        <button className="btn fantasma" style={{ padding: 0, minHeight: 0, color: 'inherit', fontWeight: 700 }}
                          onClick={() => (esDueno ? setEditar(i) : setHistorial(i))}>{i.nombre}</button>
                        {bajo && i.activo && <span className="estado alerta" style={{ marginLeft: 8 }}>Comprar</span>}
                      </td>
                      <td className="n fuerte" style={{ color: bajo ? 'var(--chile)' : undefined }}>{numero(i.stock)} {i.unidad}</td>
                      <td className="n suave">{numero(i.minimo)}</td>
                      <td className="n">{lempiras(i.costo_unitario)}</td>
                      <td className="n">{lempiras(Math.max(0, i.stock) * i.costo_unitario)}</td>
                      <td className="n">
                        <div className="fila fin" style={{ flexWrap: 'nowrap', gap: 4 }}>
                          <button className="btn compacto" onClick={() => setMovimiento({ insumo: i, tipo: 'compra' })}><ShoppingCart size={16} /> Compra</button>
                          <button className="btn compacto" onClick={() => setMovimiento({ insumo: i, tipo: 'merma' })} aria-label="Ajuste o merma"><SlidersHorizontal size={16} /></button>
                          <button className="btn compacto" onClick={() => setHistorial(i)} aria-label="Historial"><History size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!lista.length && <Vacio icono={PackagePlus} titulo="Sin insumos" texto="Agrega la carne, tortillas, bebidas y todo lo que compras." />}
        </section>
      ) : (
        <MovimientosLista />
      )}

      {movimiento && <RegistrarMovimiento {...movimiento} onCerrar={() => setMovimiento(null)} onListo={() => { setMovimiento(null); recargar() }} />}
      {editar && <EditarInsumo insumo={editar} onCerrar={() => setEditar(null)} onListo={() => { setEditar(null); recargar() }} />}
      {historial && <Historial insumo={historial} onCerrar={() => setHistorial(null)} />}
    </Pantalla>
  )
}

function MovimientosLista() {
  const { datos } = useConsulta(
    () => q(supabase.from('movimientos_inventario').select('*, insumos(nombre, unidad)').order('created_at', { ascending: false }).limit(150)),
    [],
    ['movimientos_inventario'],
  )
  return (
    <section className="panel">
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Insumo</th><th>Tipo</th><th className="n">Cantidad</th><th>Detalle</th></tr></thead>
          <tbody>
            {(datos || []).map((m) => (
              <tr key={m.id}>
                <td>{fechaHora(m.created_at)}</td>
                <td>{m.insumos?.nombre}</td>
                <td><span className={'estado ' + (m.cantidad < 0 ? 'neutro' : 'lista')}>{TIPOS[m.tipo]}</span></td>
                <td className="n fuerte" style={{ color: m.cantidad < 0 ? 'var(--chile)' : 'var(--verde)' }}>
                  {m.cantidad > 0 ? '+' : ''}{numero(m.cantidad)} {m.insumos?.unidad}
                </td>
                <td className="suave chico">{[m.nota, m.empleado, m.costo_unitario ? `a ${lempiras(m.costo_unitario)}` : null].filter(Boolean).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function RegistrarMovimiento({ insumo, tipo: tipoInicial, onCerrar, onListo }) {
  const { empleado } = useSesion()
  const avisar = useAviso()
  const [tipo, setTipo] = useState(tipoInicial)
  const [cantidad, setCantidad] = useState('')
  const [costo, setCosto] = useState(String(insumo.costo_unitario || ''))
  const [nota, setNota] = useState('')
  const [contado, setContado] = useState('')

  const guardar = async () => {
    let c = Number(cantidad)
    if (tipo === 'merma') c = -Math.abs(c)
    if (tipo === 'ajuste') c = Number(contado) - Number(insumo.stock)
    if (!c) return avisar('Escribe la cantidad', 'error')
    try {
      await q(supabase.from('movimientos_inventario').insert({
        insumo_id: insumo.id,
        tipo,
        cantidad: c,
        costo_unitario: tipo === 'compra' ? Number(costo) || null : null,
        nota: nota.trim() || (tipo === 'ajuste' ? 'Conteo físico' : null),
        empleado: empleado.nombre,
      }))
      avisar('Inventario actualizado', 'ok')
      onListo()
    } catch (e) {
      avisar(mensajeError(e), 'error')
    }
  }

  return (
    <Modal
      titulo={insumo.nombre}
      subtitulo={`Existencia actual: ${numero(insumo.stock)} ${insumo.unidad}`}
      onCerrar={onCerrar}
      pie={<button className="btn primario bloque" onClick={guardar}>Guardar</button>}
    >
      <Segmentos bloque opciones={[['compra', 'Compra'], ['merma', 'Merma o pérdida'], ['ajuste', 'Conteo físico']]} valor={tipo} onCambio={setTipo} />
      {tipo === 'ajuste' ? (
        <Campo etiqueta={`¿Cuánto hay en realidad? (${insumo.unidad})`} ayuda="El sistema ajusta la diferencia">
          <input className="entrada cifra" style={{ fontSize: '1.4rem' }} inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value)} autoFocus />
        </Campo>
      ) : (
        <div className="campos">
          <Campo etiqueta={`Cantidad (${insumo.unidad})`}>
            <input className="entrada cifra" style={{ fontSize: '1.4rem' }} inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus />
          </Campo>
          {tipo === 'compra' && (
            <Campo etiqueta={`Costo por ${insumo.unidad} (L)`} ayuda={cantidad && costo ? `Total de la compra: ${lempiras(Number(cantidad) * Number(costo))}` : 'Actualiza el costo de los platos'}>
              <input className="entrada" inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} />
            </Campo>
          )}
        </div>
      )}
      <Campo etiqueta="Nota">
        <input className="entrada" value={nota} onChange={(e) => setNota(e.target.value)}
          placeholder={tipo === 'compra' ? 'Proveedor o número de factura' : tipo === 'merma' ? 'Ej. Se quemó, se venció' : 'Opcional'} />
      </Campo>
      {tipo === 'compra' && <p className="suave chico">Si pagaste esta compra, regístrala también en Gastos para que cuente en la utilidad.</p>}
    </Modal>
  )
}

function EditarInsumo({ insumo, onCerrar, onListo }) {
  const avisar = useAviso()
  const [i, setI] = useState({ ...insumo, minimo: String(insumo.minimo ?? ''), costo_unitario: String(insumo.costo_unitario ?? ''), stock: '' })
  const nuevo = !insumo.id
  const guardar = async () => {
    if (!i.nombre.trim()) return avisar('Escribe el nombre', 'error')
    try {
      const datos = { nombre: i.nombre.trim(), unidad: i.unidad, minimo: Number(i.minimo) || 0, costo_unitario: Number(i.costo_unitario) || 0, activo: i.activo }
      if (nuevo) {
        const [fila] = await q(supabase.from('insumos').insert(datos).select())
        if (Number(i.stock) > 0) {
          await q(supabase.from('movimientos_inventario').insert({ insumo_id: fila.id, tipo: 'ajuste', cantidad: Number(i.stock), nota: 'Existencia inicial' }))
        }
      } else {
        await q(supabase.from('insumos').update(datos).eq('id', insumo.id))
      }
      avisar('Insumo guardado', 'ok')
      onListo()
    } catch (e) {
      avisar(mensajeError(e), 'error')
    }
  }
  return (
    <Modal titulo={nuevo ? 'Nuevo insumo' : i.nombre} onCerrar={onCerrar} pie={<button className="btn primario bloque" onClick={guardar}>Guardar</button>}>
      <Campo etiqueta="Nombre"><input className="entrada" value={i.nombre} onChange={(e) => setI({ ...i, nombre: e.target.value })} autoFocus={nuevo} placeholder="Ej. Cebolla" /></Campo>
      <div className="campos">
        <Campo etiqueta="Unidad">
          <select className="entrada" value={i.unidad} onChange={(e) => setI({ ...i, unidad: e.target.value })}>
            {UNIDADES.map((u) => <option key={u}>{u}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Mínimo para avisar"><input className="entrada" inputMode="decimal" value={i.minimo} onChange={(e) => setI({ ...i, minimo: e.target.value })} /></Campo>
        <Campo etiqueta="Costo por unidad (L)"><input className="entrada" inputMode="decimal" value={i.costo_unitario} onChange={(e) => setI({ ...i, costo_unitario: e.target.value })} /></Campo>
        {nuevo && <Campo etiqueta="Existencia inicial"><input className="entrada" inputMode="decimal" value={i.stock} onChange={(e) => setI({ ...i, stock: e.target.value })} /></Campo>}
      </div>
      {!nuevo && <Interruptor marcado={i.activo} onCambio={(v) => setI({ ...i, activo: v })}>Activo</Interruptor>}
    </Modal>
  )
}

function Historial({ insumo, onCerrar }) {
  const { datos } = useConsulta(
    () => q(supabase.from('movimientos_inventario').select('*').eq('insumo_id', insumo.id).order('created_at', { ascending: false }).limit(100)),
    [insumo.id],
  )
  return (
    <Modal ancho titulo={insumo.nombre} subtitulo={`Existencia: ${numero(insumo.stock)} ${insumo.unidad}`} onCerrar={onCerrar}>
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Tipo</th><th className="n">Cantidad</th><th>Detalle</th></tr></thead>
          <tbody>
            {(datos || []).map((m) => (
              <tr key={m.id}>
                <td>{fechaHora(m.created_at)}</td>
                <td>{TIPOS[m.tipo]}</td>
                <td className="n fuerte" style={{ color: m.cantidad < 0 ? 'var(--chile)' : 'var(--verde)' }}>{m.cantidad > 0 ? '+' : ''}{numero(m.cantidad)}</td>
                <td className="suave chico">{[m.nota, m.empleado].filter(Boolean).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
