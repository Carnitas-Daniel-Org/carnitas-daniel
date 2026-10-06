import { forwardRef } from 'react'
import { METODOS, fechaHora, lempiras } from '../lib/format'

// Recibo/factura en formato de impresora térmica de 80 mm
const Recibo = forwardRef(function Recibo({ factura, items, ajustes }, ref) {
  const f = factura
  const tasa = ajustes.isv_tasa || '15'
  return (
    <div className="recibo" ref={ref}>
      <div className="centro">
        <h2>{ajustes.nombre_negocio || 'Carnitas Daniel'}</h2>
        {ajustes.rtn && <div>RTN {ajustes.rtn}</div>}
        {ajustes.direccion && <div>{ajustes.direccion}</div>}
        {ajustes.telefono && <div>Tel. {ajustes.telefono}</div>}
        {ajustes.correo && <div>{ajustes.correo}</div>}
      </div>
      <hr />
      <div className="centro">
        <strong>{f.tipo === 'factura' ? 'FACTURA' : 'RECIBO DE VENTA'}</strong>
        <div>No. {f.numero}</div>
        {f.tipo === 'factura' && f.cai && <div>CAI: {f.cai}</div>}
      </div>
      {f.anulada && <div className="centro"><strong>*** ANULADA ***</strong></div>}
      <hr />
      <div>Fecha: {fechaHora(f.fecha)}</div>
      <div>Cliente: {f.cliente_nombre || 'Consumidor final'}</div>
      {f.cliente_rtn && <div>RTN cliente: {f.cliente_rtn}</div>}
      {f.referencia && <div>{f.referencia}</div>}
      {f.empleado && <div>Atendió: {f.empleado}</div>}
      <hr />
      <table>
        <tbody>
          {items.map((it) => (
            <tr key={it.id || it.nombre + it.precio}>
              <td>{it.cantidad} x {it.nombre}</td>
              <td className="n">{lempiras(it.cantidad * it.precio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      <table>
        <tbody>
          {Number(f.descuento) > 0 && (
            <>
              <tr><td>Suma</td><td className="n">{lempiras(f.bruto)}</td></tr>
              <tr><td>Descuento</td><td className="n">- {lempiras(f.descuento)}</td></tr>
            </>
          )}
          <tr><td>Importe gravado {tasa}%</td><td className="n">{lempiras(f.subtotal)}</td></tr>
          <tr><td>Importe exento</td><td className="n">{lempiras(0)}</td></tr>
          <tr><td>ISV {tasa}%</td><td className="n">{lempiras(f.isv)}</td></tr>
          <tr className="total"><td>TOTAL</td><td className="n">{lempiras(f.total)}</td></tr>
          <tr><td>Pago: {METODOS[f.metodo_pago]}</td><td className="n">{lempiras(f.monto_recibido ?? f.total)}</td></tr>
          {Number(f.cambio) > 0 && <tr><td>Cambio</td><td className="n">{lempiras(f.cambio)}</td></tr>}
        </tbody>
      </table>
      <hr />
      {f.tipo === 'factura' ? (
        <div className="centro">
          {f.rango && <div>Rango autorizado: {f.rango}</div>}
          {f.fecha_limite && <div>Fecha límite de emisión: {f.fecha_limite}</div>}
          <div>Original: cliente. Copia: emisor</div>
        </div>
      ) : (
        <div className="centro">Comprobante interno. No es factura fiscal.</div>
      )}
      {ajustes.mensaje_pie && <div className="centro" style={{ marginTop: 6 }}>{ajustes.mensaje_pie}</div>}
    </div>
  )
})

export default Recibo
