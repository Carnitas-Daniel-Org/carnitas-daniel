import { useState } from 'react'
import { FileSpreadsheet, MessageCircle, Plus, Users } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import { Buscar, Campo, Cifra, Modal, Vacio, useAviso } from '../components/ui'
import { q, useConsulta } from '../lib/data'
import { exportarExcel } from '../lib/export'
import { supabase } from '../lib/supabase'
import { fecha, lempiras, mensajeError } from '../lib/format'

export default function Clientes() {
  const avisar = useAviso()
  const [busca, setBusca] = useState('')
  const [editar, setEditar] = useState(null)
  const { datos, recargar } = useConsulta(
    async () => {
      const [clientes, facturas] = await Promise.all([
        q(supabase.from('clientes').select('*').order('nombre')),
        q(supabase.from('facturas').select('cliente_id, total, fecha').eq('anulada', false).not('cliente_id', 'is', null)),
      ])
      const stats = {}
      facturas.forEach((f) => {
        const s = (stats[f.cliente_id] ||= { compras: 0, total: 0, ultima: null })
        s.compras += 1
        s.total += Number(f.total)
        if (!s.ultima || f.fecha > s.ultima) s.ultima = f.fecha
      })
      return clientes.map((c) => ({ ...c, ...(stats[c.id] || { compras: 0, total: 0, ultima: null }) }))
    },
    [],
    ['clientes'],
  )
  const clientes = (datos || []).filter((c) =>
    [c.nombre, c.telefono, c.rtn].join(' ').toLowerCase().includes(busca.trim().toLowerCase()),
  )
  const frecuentes = [...(datos || [])].sort((a, b) => b.total - a.total).slice(0, 3)

  const guardar = async () => {
    try {
      const d = { nombre: editar.nombre.trim(), telefono: editar.telefono?.trim() || null, direccion: editar.direccion?.trim() || null, rtn: editar.rtn?.trim() || null, notas: editar.notas?.trim() || null }
      if (editar.id) await q(supabase.from('clientes').update(d).eq('id', editar.id))
      else await q(supabase.from('clientes').insert(d))
      avisar('Cliente guardado', 'ok')
      setEditar(null)
      recargar()
    } catch (e) {
      avisar(mensajeError(e), 'error')
    }
  }

  const exportar = () =>
    exportarExcel('clientes-carnitas-daniel.xlsx', [{
      nombre: 'Clientes',
      filas: datos || [],
      columnas: [
        { titulo: 'Nombre', valor: (c) => c.nombre, ancho: 24 },
        { titulo: 'Teléfono', valor: (c) => c.telefono },
        { titulo: 'Dirección', valor: (c) => c.direccion, ancho: 30 },
        { titulo: 'RTN', valor: (c) => c.rtn },
        { titulo: 'Compras', valor: (c) => c.compras, tipo: 'numero' },
        { titulo: 'Total comprado', valor: (c) => c.total, tipo: 'dinero' },
        { titulo: 'Última compra', valor: (c) => c.ultima, tipo: 'fecha' },
      ],
    }])

  const wa = (tel) => 'https://wa.me/504' + String(tel).replace(/\D/g, '').replace(/^504/, '')

  return (
    <Pantalla
      titulo="Clientes"
      sub="Se guardan solos al tomar pedidos para llevar o delivery con teléfono"
      acciones={
        <>
          <button className="btn" onClick={exportar}><FileSpreadsheet size={18} /> Excel</button>
          <button className="btn primario" onClick={() => setEditar({ nombre: '', telefono: '', direccion: '', rtn: '', notas: '' })}><Plus size={18} /> Cliente</button>
        </>
      }
    >
      {frecuentes.some((c) => c.total > 0) && (
        <div className="cifras">
          {frecuentes.filter((c) => c.total > 0).map((c, i) => (
            <Cifra key={c.id} etiqueta={i === 0 ? 'Mejor cliente' : `Cliente frecuente`} valor={lempiras(c.total)} nota={`${c.nombre}, ${c.compras} compras`} destacada={i === 0} />
          ))}
        </div>
      )}
      <section className="panel pila">
        <Buscar valor={busca} onCambio={setBusca} placeholder="Nombre, teléfono o RTN" />
        {!clientes.length ? (
          <Vacio icono={Users} titulo="Sin clientes todavía" />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead><tr><th>Cliente</th><th>Teléfono</th><th className="n">Compras</th><th className="n">Total</th><th>Última</th></tr></thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="clic" onClick={() => setEditar(c)}>
                    <td><strong>{c.nombre}</strong>{c.direccion && <div className="suave chico">{c.direccion}</div>}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {c.telefono ? (
                        <a className="btn compacto fantasma" href={wa(c.telefono)} target="_blank" rel="noreferrer"><MessageCircle size={16} /> {c.telefono}</a>
                      ) : <span className="tenue">—</span>}
                    </td>
                    <td className="n">{c.compras}</td>
                    <td className="n fuerte">{lempiras(c.total)}</td>
                    <td>{c.ultima ? fecha(c.ultima) : <span className="tenue">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editar && (
        <Modal titulo={editar.id ? editar.nombre : 'Nuevo cliente'} onCerrar={() => setEditar(null)}
          pie={<button className="btn primario bloque" disabled={!editar.nombre?.trim()} onClick={guardar}>Guardar</button>}>
          <Campo etiqueta="Nombre"><input className="entrada" value={editar.nombre} onChange={(e) => setEditar({ ...editar, nombre: e.target.value })} /></Campo>
          <div className="campos">
            <Campo etiqueta="Teléfono"><input className="entrada" inputMode="tel" value={editar.telefono || ''} onChange={(e) => setEditar({ ...editar, telefono: e.target.value })} /></Campo>
            <Campo etiqueta="RTN"><input className="entrada" inputMode="numeric" value={editar.rtn || ''} onChange={(e) => setEditar({ ...editar, rtn: e.target.value })} /></Campo>
          </div>
          <Campo etiqueta="Dirección"><input className="entrada" value={editar.direccion || ''} onChange={(e) => setEditar({ ...editar, direccion: e.target.value })} /></Campo>
          <Campo etiqueta="Notas" ayuda="Gustos, alergias, cómo llegar"><textarea className="entrada" rows={2} value={editar.notas || ''} onChange={(e) => setEditar({ ...editar, notas: e.target.value })} /></Campo>
        </Modal>
      )}
    </Pantalla>
  )
}
