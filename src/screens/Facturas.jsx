import { useRef, useState } from 'react'
import { Ban, FileSpreadsheet, Printer, Receipt } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import Recibo from '../components/Recibo'
import RangoFechas, { rangoInicial } from '../components/RangoFechas'
import { Buscar, Campo, Cifra, Modal, Segmentos, Vacio, imprimir, useAviso } from '../components/ui'
import { q, useConsulta } from '../lib/data'
import { exportarExcel } from '../lib/export'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { METODOS, fechaHora, lempiras, mensajeError } from '../lib/format'

export default function Facturas() {
  const { empleado, ajustes } = useSesion()
  const avisar = useAviso()
  const [rango, setRango] = useState(rangoInicial('hoy'))
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [abierta, setAbierta] = useState(null)
  const [anular, setAnular] = useState(null)
  const [motivo, setMotivo] = useState('')
  const reciboRef = useRef(null)

  const { datos, cargando } = useConsulta(
    () =>
      q(
        supabase
          .from('facturas')
          .select('*, factura_items(*)')
          .gte('fecha', rango.desde.toISOString())
          .lte('fecha', rango.hasta.toISOString())
          .order('fecha', { ascending: false }),
      ),
    [rango.desde.getTime(), rango.hasta.getTime()],
    ['facturas'],
  )
  const lista = (datos || []).filter(
    (f) =>
      (tipo === 'todos' || f.tipo === tipo || (tipo === 'anuladas' && f.anulada)) &&
      (!busca.trim() || [f.numero, f.cliente_nombre, f.cliente_rtn, f.referencia].join(' ').toLowerCase().includes(busca.trim().toLowerCase())),
  )
  const validas = lista.filter((f) => !f.anulada)
  const total = validas.reduce((s, f) => s + Number(f.total), 0)
  const isv = validas.reduce((s, f) => s + Number(f.isv), 0)

  const exportar = () =>
    exportarExcel(`facturas-${rango.etiquetaArchivo}.xlsx`, [
      {
        nombre: 'Facturas',
        filas: lista,
        columnas: [
          { titulo: 'Fecha', valor: (f) => f.fecha, tipo: 'fecha' },
          { titulo: 'Tipo', valor: (f) => (f.tipo === 'factura' ? 'Factura' : 'Recibo') },
          { titulo: 'Número', valor: (f) => f.numero, ancho: 22 },
          { titulo: 'Cliente', valor: (f) => f.cliente_nombre, ancho: 24 },
          { titulo: 'RTN', valor: (f) => f.cliente_rtn },
          { titulo: 'Referencia', valor: (f) => f.referencia, ancho: 22 },
          { titulo: 'Gravado', valor: (f) => f.subtotal, tipo: 'dinero' },
          { titulo: 'ISV', valor: (f) => f.isv, tipo: 'dinero' },
          { titulo: 'Descuento', valor: (f) => f.descuento, tipo: 'dinero' },
          { titulo: 'Total', valor: (f) => f.total, tipo: 'dinero' },
          { titulo: 'Pago', valor: (f) => METODOS[f.metodo_pago] },
          { titulo: 'Cajero', valor: (f) => f.empleado },
          { titulo: 'Estado', valor: (f) => (f.anulada ? 'Anulada: ' + (f.motivo_anulacion || '') : 'Válida'), ancho: 30 },
        ],
      },
    ])

  const confirmarAnular = async () => {
    try {
      await q(supabase.rpc('anular_factura', { p_id: anular.id, p_motivo: motivo, p_empleado: empleado.nombre }))
      avisar(`${anular.numero} anulada. Los pedidos quedaron por cobrar otra vez.`, 'ok')
      setAnular(null)
      setAbierta(null)
      setMotivo('')
    } catch (e) {
      avisar(mensajeError(e), 'error')
    }
  }

  return (
    <Pantalla
      titulo="Facturas y recibos"
      acciones={<button className="btn" onClick={exportar} disabled={!lista.length}><FileSpreadsheet size={18} /> Excel</button>}
    >
      <RangoFechas valor={rango} onCambio={setRango} />
      <div className="cifras">
        <Cifra etiqueta="Total vendido" valor={lempiras(total)} destacada />
        <Cifra etiqueta="ISV cobrado" valor={lempiras(isv)} />
        <Cifra etiqueta="Documentos" valor={validas.length} nota={`${lista.length - validas.length} anulados`} />
      </div>
      <section className="panel pila">
        <div className="fila">
          <div style={{ flex: '1 1 260px' }}><Buscar valor={busca} onCambio={setBusca} placeholder="Número, cliente o RTN" /></div>
          <Segmentos opciones={[['todos', 'Todos'], ['factura', 'Facturas'], ['recibo', 'Recibos'], ['anuladas', 'Anuladas']]} valor={tipo} onCambio={setTipo} />
        </div>
        {!lista.length && !cargando ? (
          <Vacio icono={Receipt} titulo="Sin documentos en estas fechas" />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th className="n">Total</th></tr></thead>
              <tbody>
                {lista.map((f) => (
                  <tr key={f.id} className={'clic' + (f.anulada ? ' tachada' : '')} onClick={() => setAbierta(f)}>
                    <td><strong>{f.numero}</strong> <span className="suave chico">{f.tipo === 'factura' ? 'Factura' : 'Recibo'}</span></td>
                    <td>{fechaHora(f.fecha)}</td>
                    <td>{f.cliente_nombre}<div className="suave chico">{f.referencia}</div></td>
                    <td>{METODOS[f.metodo_pago]}</td>
                    <td className="n fuerte">{lempiras(f.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {abierta && (
        <Modal
          titulo={`${abierta.tipo === 'factura' ? 'Factura' : 'Recibo'} ${abierta.numero}`}
          subtitulo={abierta.anulada ? `Anulada: ${abierta.motivo_anulacion}` : fechaHora(abierta.fecha)}
          onCerrar={() => setAbierta(null)}
          pie={
            <>
              {!abierta.anulada && (
                <button className="btn peligro" onClick={() => setAnular(abierta)}><Ban size={18} /> Anular</button>
              )}
              <button className="btn primario" onClick={() => imprimir(reciboRef.current, 'ticket')}><Printer size={18} /> Imprimir</button>
            </>
          }
        >
          <div className="recibo-vista">
            <Recibo ref={reciboRef} factura={abierta} items={abierta.factura_items} ajustes={ajustes} />
          </div>
        </Modal>
      )}

      {anular && (
        <Modal
          titulo={`Anular ${anular.numero}`}
          onCerrar={() => setAnular(null)}
          pie={<><button className="btn" onClick={() => setAnular(null)}>Volver</button><button className="btn peligro lleno" disabled={!motivo.trim()} onClick={confirmarAnular}>Anular documento</button></>}
        >
          <p>La venta deja de contar en los reportes y los pedidos vuelven a quedar por cobrar. El número no se reutiliza.</p>
          <Campo etiqueta="Motivo de la anulación">
            <input className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Cliente pidió factura con RTN" autoFocus />
          </Campo>
        </Modal>
      )}
    </Pantalla>
  )
}
