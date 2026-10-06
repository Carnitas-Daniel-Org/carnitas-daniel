import { useMemo, useRef, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Bike, Lock, Printer, ShoppingBag, Unlock, Wallet } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import Cobrar from '../components/Cobrar'
import { Campo, Cifra, Modal, Segmentos, Vacio, imprimir, useAviso } from '../components/ui'
import { agruparCuentas, q, useCajaAbierta, useConsulta, useOrdenesActivas } from '../lib/data'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { ESTADOS, duracion, etiquetaOrden, fechaHora, hora, lempiras, mensajeError, minutosDesde } from '../lib/format'

export default function Caja() {
  const { caja, cargando, recargar } = useCajaAbierta()
  const [vista, setVista] = useState('cobrar')

  if (cargando) return <Pantalla titulo="Caja" />
  if (!caja) return <AbrirCaja onAbierta={recargar} />

  return (
    <Pantalla titulo="Caja" sub={`Abierta desde ${fechaHora(caja.abierta_at)} por ${caja.abierta_por || 'caja'}`}>
      <Segmentos
        opciones={[['cobrar', 'Por cobrar'], ['movimientos', 'Entradas y salidas'], ['cierre', 'Cierre de caja']]}
        valor={vista}
        onCambio={setVista}
      />
      {vista === 'cobrar' && <PorCobrar caja={caja} />}
      {vista === 'movimientos' && <Movimientos caja={caja} />}
      {vista === 'cierre' && <Cierre caja={caja} onCerrada={recargar} />}
    </Pantalla>
  )
}

function AbrirCaja({ onAbierta }) {
  const { empleado } = useSesion()
  const avisar = useAviso()
  const [fondo, setFondo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const { datos: ultimas } = useConsulta(
    () => q(supabase.from('caja_sesiones').select('*').not('cerrada_at', 'is', null).order('id', { ascending: false }).limit(10)),
    [],
  )
  const abrir = async () => {
    setOcupado(true)
    try {
      await q(supabase.from('caja_sesiones').insert({ fondo_inicial: Number(fondo) || 0, abierta_por: empleado.nombre }))
      avisar('Caja abierta', 'ok')
      onAbierta()
    } catch (e) {
      avisar(mensajeError(e), 'error')
    } finally {
      setOcupado(false)
    }
  }
  return (
    <Pantalla titulo="Caja" sub="La caja está cerrada" angosto>
      <section className="panel pila">
        <div className="fila"><Unlock size={22} /><h2>Abrir caja</h2></div>
        <p className="suave">Cuenta el efectivo con el que empiezas el turno (el fondo para dar cambio).</p>
        <Campo etiqueta="Fondo inicial en efectivo">
          <input className="entrada cifra" style={{ fontSize: '1.5rem' }} inputMode="decimal" value={fondo}
            onChange={(e) => setFondo(e.target.value)} placeholder="0.00" autoFocus />
        </Campo>
        <button className="btn primario grande" disabled={ocupado} onClick={abrir}>Abrir caja</button>
      </section>
      {ultimas?.length > 0 && (
        <section className="panel">
          <div className="panel-cabeza"><h2>Cierres anteriores</h2></div>
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead><tr><th>Cerrada</th><th>Por</th><th className="n">Esperado</th><th className="n">Contado</th><th className="n">Diferencia</th></tr></thead>
              <tbody>
                {ultimas.map((s) => (
                  <tr key={s.id}>
                    <td>{fechaHora(s.cerrada_at)}</td>
                    <td>{s.cerrada_por}</td>
                    <td className="n">{lempiras(s.efectivo_esperado)}</td>
                    <td className="n">{lempiras(s.efectivo_contado)}</td>
                    <td className="n" style={{ color: Number(s.diferencia) < 0 ? 'var(--chile)' : Number(s.diferencia) > 0 ? 'var(--verde)' : undefined, fontWeight: 700 }}>
                      {lempiras(s.diferencia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </Pantalla>
  )
}

function PorCobrar({ caja }) {
  const { ordenes } = useOrdenesActivas()
  const [cobrar, setCobrar] = useState(null)
  const cuentas = useMemo(() => agruparCuentas(ordenes), [ordenes])
  const total = cuentas.reduce((s, c) => s + c.total, 0)

  return (
    <>
      <div className="cifras">
        <Cifra etiqueta="Cuentas abiertas" valor={cuentas.length} />
        <Cifra etiqueta="Por cobrar" valor={lempiras(total)} destacada />
      </div>
      <section className="panel">
        {!cuentas.length ? (
          <Vacio icono={Wallet} titulo="No hay cuentas por cobrar" texto="Cuando un mesero envía un pedido, la cuenta aparece aquí." />
        ) : (
          <div className="pila">
            {cuentas.map((c) => {
              const o = c.primera
              const estados = [...new Set(c.ordenes.map((x) => x.estado))]
              return (
                <button key={c.clave} className="cuenta-fila" onClick={() => setCobrar(c)}>
                  <span className="icono-mesa">
                    {c.tipo === 'mesa' ? c.mesa : o.es_delivery ? <Bike size={22} /> : <ShoppingBag size={22} />}
                  </span>
                  <span className="medio">
                    <strong>{c.tipo === 'mesa' ? `Mesa ${c.mesa}` : etiquetaOrden(o)}</strong>
                    <span className="fila suave chico" style={{ gap: 6, marginTop: 2 }}>
                      {c.ordenes.length} {c.ordenes.length === 1 ? 'pedido' : 'pedidos'}, hace {duracion(minutosDesde(c.desde))}
                      {estados.map((e) => <span key={e} className={'estado ' + e}>{ESTADOS[e]}</span>)}
                    </span>
                  </span>
                  <span className="cifra">{lempiras(c.total)}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>
      {cobrar && <Cobrar cuenta={cobrar} cajaAbierta={Boolean(caja)} onCerrar={() => setCobrar(null)} />}
    </>
  )
}

function Movimientos({ caja }) {
  const { empleado } = useSesion()
  const avisar = useAviso()
  const [nuevo, setNuevo] = useState(null)
  const { datos, recargar } = useConsulta(
    () => q(supabase.from('movimientos_caja').select('*').eq('caja_id', caja.id).order('created_at', { ascending: false })),
    [caja.id],
    ['movimientos_caja'],
  )
  const guardar = async () => {
    try {
      await q(supabase.from('movimientos_caja').insert({ caja_id: caja.id, tipo: nuevo.tipo, monto: Number(nuevo.monto), motivo: nuevo.motivo.trim(), empleado: empleado.nombre }))
      avisar(nuevo.tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada', 'ok')
      setNuevo(null)
      recargar()
    } catch (e) {
      avisar(mensajeError(e), 'error')
    }
  }
  return (
    <section className="panel">
      <div className="panel-cabeza">
        <div>
          <h2>Entradas y salidas de efectivo</h2>
          <p>Pagos a proveedores desde la caja, compras pequeñas, depósitos o efectivo que se agrega.</p>
        </div>
        <div className="fila">
          <button className="btn" onClick={() => setNuevo({ tipo: 'salida', monto: '', motivo: '' })}><ArrowUpCircle size={18} /> Salida</button>
          <button className="btn" onClick={() => setNuevo({ tipo: 'entrada', monto: '', motivo: '' })}><ArrowDownCircle size={18} /> Entrada</button>
        </div>
      </div>
      {!datos?.length ? (
        <p className="suave">Sin movimientos en este turno.</p>
      ) : (
        <ul className="lista-simple">
          {datos.map((m) => (
            <li key={m.id}>
              <span>
                <strong>{m.motivo}</strong>
                <span className="suave chico" style={{ display: 'block' }}>{hora(m.created_at)}, {m.empleado}</span>
              </span>
              <strong className="num" style={{ color: m.tipo === 'salida' ? 'var(--chile)' : 'var(--verde)' }}>
                {m.tipo === 'salida' ? '−' : '+'} {lempiras(m.monto)}
              </strong>
            </li>
          ))}
        </ul>
      )}
      {nuevo && (
        <Modal
          titulo={nuevo.tipo === 'entrada' ? 'Entrada de efectivo' : 'Salida de efectivo'}
          onCerrar={() => setNuevo(null)}
          pie={<button className="btn primario bloque" disabled={!(Number(nuevo.monto) > 0) || !nuevo.motivo.trim()} onClick={guardar}>Guardar</button>}
        >
          <Campo etiqueta="Monto">
            <input className="entrada cifra" style={{ fontSize: '1.4rem' }} inputMode="decimal" autoFocus value={nuevo.monto} onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })} />
          </Campo>
          <Campo etiqueta="Motivo">
            <input className="entrada" value={nuevo.motivo} onChange={(e) => setNuevo({ ...nuevo, motivo: e.target.value })}
              placeholder={nuevo.tipo === 'salida' ? 'Ej. Pago de hielo' : 'Ej. Cambio adicional'} />
          </Campo>
          {nuevo.tipo === 'salida' && <p className="suave chico">Si es un gasto del negocio, regístralo también en Gastos para que cuente en la utilidad.</p>}
        </Modal>
      )}
    </section>
  )
}

function Cierre({ caja, onCerrada }) {
  const { empleado, ajustes } = useSesion()
  const avisar = useAviso()
  const [contado, setContado] = useState('')
  const [notas, setNotas] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [resultado, setResultado] = useState(null)
  const hojaRef = useRef(null)
  const { datos: r } = useConsulta(
    () => q(supabase.rpc('resumen_caja', { p_caja: caja.id })),
    [caja.id],
    ['facturas', 'movimientos_caja'],
  )
  if (!r) return null
  const esperado = Number(r.fondo) + Number(r.ventas_efectivo) + Number(r.entradas) - Number(r.salidas)
  const dif = contado === '' ? null : Number(contado) - esperado
  const ventas = Number(r.ventas_efectivo) + Number(r.ventas_tarjeta) + Number(r.ventas_transferencia)

  const cerrar = async () => {
    try {
      const res = await q(supabase.rpc('cerrar_caja', { p_caja: caja.id, p_contado: Number(contado), p_empleado: empleado.nombre, p_notas: notas }))
      setResultado(res)
      setConfirmar(false)
      avisar('Caja cerrada', 'ok')
    } catch (e) {
      avisar(mensajeError(e), 'error')
    }
  }

  const filas = [
    ['Fondo inicial', r.fondo],
    ['Ventas en efectivo', r.ventas_efectivo],
    ['Entradas de efectivo', r.entradas],
    ['Salidas de efectivo', -r.salidas],
  ]

  const hoja = (
    <div className="recibo" ref={hojaRef}>
      <div className="centro"><h2>{ajustes.nombre_negocio || 'Carnitas Daniel'}</h2><strong>CIERRE DE CAJA</strong></div>
      <hr />
      <div>Apertura: {fechaHora(caja.abierta_at)} ({caja.abierta_por})</div>
      <div>Cierre: {fechaHora(new Date())} ({empleado.nombre})</div>
      <hr />
      <table><tbody>
        <tr><td>Efectivo</td><td className="n">{lempiras(r.ventas_efectivo)}</td></tr>
        <tr><td>Tarjeta</td><td className="n">{lempiras(r.ventas_tarjeta)}</td></tr>
        <tr><td>Transferencia</td><td className="n">{lempiras(r.ventas_transferencia)}</td></tr>
        <tr className="total"><td>Ventas</td><td className="n">{lempiras(ventas)}</td></tr>
        <tr><td>Documentos</td><td className="n">{r.documentos}</td></tr>
        <tr><td>Anulados</td><td className="n">{r.anuladas}</td></tr>
      </tbody></table>
      <hr />
      <table><tbody>
        {filas.map(([t, v]) => <tr key={t}><td>{t}</td><td className="n">{lempiras(v)}</td></tr>)}
        <tr className="total"><td>Esperado</td><td className="n">{lempiras(resultado?.esperado ?? esperado)}</td></tr>
        <tr><td>Contado</td><td className="n">{lempiras(resultado?.contado ?? contado)}</td></tr>
        <tr className="total"><td>Diferencia</td><td className="n">{lempiras(resultado?.diferencia ?? dif ?? 0)}</td></tr>
      </tbody></table>
      {notas && <><hr /><div>Notas: {notas}</div></>}
    </div>
  )

  if (resultado) {
    return (
      <section className="panel pila" style={{ maxWidth: 520 }}>
        <div className={'aviso-banda ' + (Number(resultado.diferencia) === 0 ? 'verde' : 'maiz')}>
          Caja cerrada. Diferencia: {lempiras(resultado.diferencia)}
        </div>
        <div className="recibo-vista">{hoja}</div>
        <div className="fila">
          <button className="btn" onClick={() => imprimir(hojaRef.current, 'ticket')}><Printer size={18} /> Imprimir cierre</button>
          <button className="btn primario" onClick={onCerrada}>Terminar</button>
        </div>
      </section>
    )
  }

  return (
    <div className="rejilla dos">
      <section className="panel pila">
        <h2>Resumen del turno</h2>
        <div className="cifras">
          <Cifra etiqueta="Ventas del turno" valor={lempiras(ventas)} nota={`${r.documentos} documentos`} destacada />
          <Cifra etiqueta="Tarjeta" valor={lempiras(r.ventas_tarjeta)} />
          <Cifra etiqueta="Transferencia" valor={lempiras(r.ventas_transferencia)} />
        </div>
        <ul className="lista-simple">
          {filas.map(([t, v]) => (
            <li key={t}><span>{t}</span><span className="num fuerte">{lempiras(v)}</span></li>
          ))}
          <li><strong>Efectivo que debe haber</strong><strong className="cifra" style={{ fontSize: '1.4rem' }}>{lempiras(esperado)}</strong></li>
        </ul>
      </section>
      <section className="panel pila">
        <div className="fila"><Lock size={20} /><h2>Contar y cerrar</h2></div>
        <Campo etiqueta="Efectivo contado en la gaveta">
          <input className="entrada cifra" style={{ fontSize: '1.5rem' }} inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value)} placeholder="0.00" />
        </Campo>
        {dif !== null && (
          <div className={'aviso-banda ' + (Math.abs(dif) < 0.01 ? 'verde' : dif < 0 ? 'alerta' : 'maiz')}>
            {Math.abs(dif) < 0.01 ? 'Cuadra exacto' : dif < 0 ? `Faltan ${lempiras(-dif)}` : `Sobran ${lempiras(dif)}`}
          </div>
        )}
        <Campo etiqueta="Notas del cierre">
          <textarea className="entrada" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />
        </Campo>
        <button className="btn primario grande" disabled={contado === ''} onClick={() => setConfirmar(true)}>Cerrar caja</button>
      </section>
      {confirmar && (
        <Modal titulo="¿Cerrar la caja?" onCerrar={() => setConfirmar(false)}
          pie={<><button className="btn" onClick={() => setConfirmar(false)}>Volver</button><button className="btn primario" onClick={cerrar}>Cerrar caja</button></>}>
          <p>Contado: <strong>{lempiras(contado)}</strong>. Diferencia: <strong>{lempiras(dif)}</strong>.</p>
          <p className="suave chico">Después de cerrar, la siguiente persona debe abrir caja con su fondo.</p>
        </Modal>
      )}
    </div>
  )
}
