import { useRef, useState } from 'react'
import { Banknote, CreditCard, Landmark, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { q } from '../lib/data'
import { useSesion } from '../lib/sesion'
import { etiquetaOrden, lempiras, mensajeError } from '../lib/format'
import { Campo, Modal, Segmentos, imprimir, useAviso } from './ui'
import Recibo from './Recibo'

/** Cobrar una cuenta (una o varias órdenes) y emitir recibo o factura */
export default function Cobrar({ cuenta, cajaAbierta, onCerrar, onCobrado }) {
  const { empleado, ajustes } = useSesion()
  const avisar = useAviso()
  const [tipo, setTipo] = useState('recibo')
  const [metodo, setMetodo] = useState('efectivo')
  const [descTipo, setDescTipo] = useState('L')
  const [descValor, setDescValor] = useState('')
  const [recibido, setRecibido] = useState('')
  const [cliente, setCliente] = useState(cuenta.primera?.cliente || '')
  const [rtn, setRtn] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [hecha, setHecha] = useState(null)
  const reciboRef = useRef(null)

  const items = cuenta.ordenes.flatMap((o) => o.orden_items)
  const agrupados = Object.values(
    items.reduce((m, it) => {
      const k = it.nombre + '|' + it.precio
      m[k] = m[k] || { nombre: it.nombre, precio: Number(it.precio), cantidad: 0 }
      m[k].cantidad += it.cantidad
      return m
    }, {}),
  )
  const bruto = cuenta.total
  const dv = Number(descValor) || 0
  const descuento = Math.min(bruto, descTipo === '%' ? Math.round(bruto * dv) / 100 : dv)
  const incluye = (ajustes.precios_incluyen_isv || 'si') === 'si'
  const tasa = Number(ajustes.isv_tasa || 15)
  const total = incluye ? bruto - descuento : Math.round((bruto - descuento) * (1 + tasa / 100) * 100) / 100
  const rec = Number(recibido) || 0
  const cambio = metodo === 'efectivo' && rec >= total ? rec - total : 0
  const falta = metodo === 'efectivo' && recibido !== '' && rec < total
  const puedeFactura = Boolean(ajustes.cai)

  const rapidos = [...new Set([total, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, 500, 1000])]
    .filter((v) => v >= total)
    .slice(0, 5)

  const cobrar = async () => {
    if (falta) return
    if (tipo === 'factura' && !puedeFactura) return avisar('Configura el CAI en Ajustes para emitir facturas', 'error')
    setOcupado(true)
    try {
      const factura = await q(
        supabase.rpc('cobrar', {
          payload: {
            orden_ids: cuenta.ordenes.map((o) => o.id),
            tipo,
            metodo_pago: metodo,
            descuento,
            monto_recibido: metodo === 'efectivo' ? (recibido === '' ? total : rec) : null,
            cliente_nombre: cliente,
            cliente_rtn: tipo === 'factura' ? rtn : '',
            empleado: empleado.nombre,
          },
        }),
      )
      const filas = await q(supabase.from('factura_items').select('*').eq('factura_id', factura.id))
      setHecha({ factura, items: filas })
      avisar(`Cobrado ${lempiras(factura.total)}`, 'ok')
      onCobrado?.(factura)
    } catch (e) {
      avisar(mensajeError(e), 'error')
    } finally {
      setOcupado(false)
    }
  }

  if (hecha) {
    return (
      <Modal
        titulo={`${hecha.factura.tipo === 'factura' ? 'Factura' : 'Recibo'} ${hecha.factura.numero}`}
        subtitulo={Number(hecha.factura.cambio) > 0 ? `Cambio a entregar: ${lempiras(hecha.factura.cambio)}` : 'Cobro registrado'}
        onCerrar={onCerrar}
        pie={
          <>
            <button className="btn" onClick={() => imprimir(reciboRef.current, 'ticket')}><Printer size={18} /> Imprimir</button>
            <button className="btn primario" onClick={onCerrar}>Listo</button>
          </>
        }
      >
        {Number(hecha.factura.cambio) > 0 && (
          <div className="cambio"><span>Cambio</span><span className="cifra">{lempiras(hecha.factura.cambio)}</span></div>
        )}
        <div className="recibo-vista">
          <Recibo ref={reciboRef} factura={hecha.factura} items={hecha.items} ajustes={ajustes} />
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      titulo={`Cobrar ${cuenta.tipo === 'mesa' ? 'mesa ' + cuenta.mesa : etiquetaOrden(cuenta.primera)}`}
      subtitulo={`${cuenta.ordenes.length} ${cuenta.ordenes.length === 1 ? 'pedido' : 'pedidos'}`}
      onCerrar={onCerrar}
      pie={
        <button className="btn verde grande bloque" disabled={ocupado || falta} onClick={cobrar}>
          {ocupado ? 'Cobrando…' : `Cobrar ${lempiras(total)}`}
        </button>
      }
    >
      {!cajaAbierta && (
        <div className="aviso-banda maiz">La caja está cerrada. El cobro se registra igual, pero no entrará en un cierre de caja.</div>
      )}

      <ul className="lista-simple">
        {agrupados.map((it) => (
          <li key={it.nombre + it.precio}>
            <span>{it.cantidad} × {it.nombre}</span>
            <span className="num">{lempiras(it.cantidad * it.precio)}</span>
          </li>
        ))}
      </ul>

      <div className="campos">
        <Campo etiqueta="Descuento">
          <div className="fila" style={{ flexWrap: 'nowrap' }}>
            <input className="entrada" inputMode="decimal" value={descValor} onChange={(e) => setDescValor(e.target.value)} placeholder="0" />
            <div style={{ flex: 'none' }}><Segmentos opciones={[['L', 'L'], ['%', '%']]} valor={descTipo} onCambio={setDescTipo} /></div>
          </div>
        </Campo>
        <Campo etiqueta="Documento">
          <Segmentos bloque opciones={[['recibo', 'Recibo'], ['factura', 'Factura']]} valor={tipo} onCambio={setTipo} />
        </Campo>
      </div>

      {tipo === 'factura' && !puedeFactura && (
        <div className="aviso-banda alerta">Para emitir facturas fiscales, agrega el CAI y el rango autorizado en Ajustes.</div>
      )}

      <div className="campos">
        <Campo etiqueta="Nombre del cliente">
          <input className="entrada" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Consumidor final" />
        </Campo>
        {tipo === 'factura' && (
          <Campo etiqueta="RTN del cliente" ayuda="Solo si pide factura con RTN">
            <input className="entrada" inputMode="numeric" value={rtn} onChange={(e) => setRtn(e.target.value)} placeholder="0801-1990-123456" />
          </Campo>
        )}
      </div>

      <Campo etiqueta="Forma de pago">
        <div className="segmentos bloque">
          {[
            ['efectivo', 'Efectivo', Banknote],
            ['tarjeta', 'Tarjeta', CreditCard],
            ['transferencia', 'Transferencia', Landmark],
          ].map(([v, t, I]) => (
            <button key={v} className={metodo === v ? 'activo' : ''} onClick={() => setMetodo(v)}>
              <span className="fila" style={{ justifyContent: 'center', gap: 6 }}><I size={18} /> {t}</span>
            </button>
          ))}
        </div>
      </Campo>

      {metodo === 'efectivo' && (
        <>
          <Campo etiqueta="Efectivo recibido">
            <input className="entrada cifra" style={{ fontSize: '1.4rem' }} inputMode="decimal" value={recibido}
              onChange={(e) => setRecibido(e.target.value)} placeholder={String(total)} />
          </Campo>
          <div className="dinero-rapido">
            {rapidos.map((v) => (
              <button key={v} className="btn compacto" onClick={() => setRecibido(String(v))}>
                {v === total ? 'Exacto' : lempiras(v).replace('.00', '')}
              </button>
            ))}
          </div>
          {falta && <p className="error-texto">Faltan {lempiras(total - rec)}</p>}
          {cambio > 0 && (
            <div className="cambio"><span>Cambio</span><span className="cifra">{lempiras(cambio)}</span></div>
          )}
        </>
      )}

      <div className="pila" style={{ gap: 4 }}>
        {descuento > 0 && <div className="fila entre suave"><span>Descuento</span><span className="num">- {lempiras(descuento)}</span></div>}
        <div className="fila entre suave chico">
          <span>ISV {tasa}% {incluye ? 'incluido' : 'agregado'}</span>
          <span className="num">{lempiras(incluye ? total - total / (1 + tasa / 100) : total - (bruto - descuento))}</span>
        </div>
        <div className="total-grande"><span>Total a cobrar</span><span className="cifra">{lempiras(total)}</span></div>
      </div>
    </Modal>
  )
}
