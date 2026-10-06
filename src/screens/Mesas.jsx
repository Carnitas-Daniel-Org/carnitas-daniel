import { useEffect, useMemo, useRef, useState } from 'react'
import { Bike, Check, Plus, ShoppingBag, UtensilsCrossed, Wallet, X } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import Comanda from '../components/Comanda'
import Cobrar from '../components/Cobrar'
import { Campo, Confirmar, Modal, Segmentos, Vacio, useAviso } from '../components/ui'
import { agruparCuentas, cambiarEstado, useCajaAbierta, useOrdenesActivas } from '../lib/data'
import { useSesion } from '../lib/sesion'
import { ESTADOS, beep, duracion, etiquetaOrden, hora, lempiras, mensajeError, minutosDesde } from '../lib/format'

export default function Mesas() {
  const { empleado, ajustes } = useSesion()
  const avisar = useAviso()
  const { ordenes, cargando } = useOrdenesActivas()
  const { caja } = useCajaAbierta()
  const [vista, setVista] = useState('mesas')
  const [comanda, setComanda] = useState(null) // { destino, etiqueta }
  const [mesaAbierta, setMesaAbierta] = useState(null)
  const [nuevoLlevar, setNuevoLlevar] = useState(false)
  const [cobrar, setCobrar] = useState(null)
  const [cancelar, setCancelar] = useState(null)
  const [, setTic] = useState(0)
  const puedeCobrar = ['dueno', 'cajero'].includes(empleado.rol)

  useEffect(() => {
    const t = setInterval(() => setTic((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const cuentas = useMemo(() => agruparCuentas(ordenes), [ordenes])
  const numMesas = Math.max(1, parseInt(ajustes.num_mesas, 10) || 10)
  const porMesa = Object.fromEntries(cuentas.filter((c) => c.tipo === 'mesa').map((c) => [c.mesa, c]))

  // Para llevar: sin cobrar, o cobrados que aún no se entregan
  const llevar = ordenes.filter(
    (o) => o.tipo !== 'mesa' && (!o.factura_id || !['entregada', 'cancelada'].includes(o.estado)),
  )
  const listasMias = ordenes.filter((o) => o.estado === 'lista' && (empleado.rol !== 'mesero' || o.mesero === empleado.nombre))

  // Avisar cuando algo queda listo
  const previo = useRef(null)
  useEffect(() => {
    if (cargando) return
    const ids = new Set(listasMias.map((o) => o.id))
    if (previo.current && [...ids].some((id) => !previo.current.has(id))) {
      beep(3)
      avisar('Hay un pedido listo para servir', 'ok')
    }
    previo.current = ids
  }, [listasMias, avisar, cargando])

  const entregar = async (o) => {
    try { await cambiarEstado(o.id, 'entregada') } catch (e) { avisar(mensajeError(e), 'error') }
  }

  if (comanda) {
    return (
      <Pantalla
        titulo={comanda.etiqueta}
        sub="Nuevo pedido"
        acciones={<button className="btn" onClick={() => setComanda(null)}><X size={18} /> Salir</button>}
      >
        <Comanda
          destino={comanda.destino}
          etiqueta={comanda.etiqueta}
          onEnviada={() => setComanda(null)}
        />
      </Pantalla>
    )
  }

  const mesa = mesaAbierta ? porMesa[mesaAbierta] : null

  return (
    <Pantalla
      titulo="Pedidos"
      sub={`${cuentas.filter((c) => c.tipo === 'mesa').length} de ${numMesas} mesas ocupadas`}
      acciones={
        <button className="btn primario" onClick={() => setNuevoLlevar(true)}>
          <ShoppingBag size={18} /> Para llevar
        </button>
      }
    >
      {listasMias.length > 0 && (
        <div className="aviso-banda verde">
          <Check size={20} />
          <span style={{ flex: 1 }}>
            Listo para servir: {listasMias.map(etiquetaOrden).join(', ')}
          </span>
        </div>
      )}

      <Segmentos
        opciones={[['mesas', 'Mesas'], ['llevar', `Para llevar y delivery (${llevar.length})`]]}
        valor={vista}
        onCambio={setVista}
      />

      {vista === 'mesas' ? (
        <div className="mesas">
          {Array.from({ length: numMesas }, (_, i) => String(i + 1)).map((n) => {
            const c = porMesa[n]
            const lista = c?.ordenes.some((o) => o.estado === 'lista')
            const cocina = c?.ordenes.some((o) => ['pendiente', 'preparando'].includes(o.estado))
            return (
              <button
                key={n}
                className={'mesa ' + (c ? 'ocupada' : 'libre')}
                onClick={() =>
                  c ? setMesaAbierta(n) : setComanda({ destino: { tipo: 'mesa', mesa: n }, etiqueta: `Mesa ${n}` })
                }
              >
                <span className="n cifra">{n}</span>
                {c ? (
                  <>
                    <span className="fuerte num">{lempiras(c.total)}</span>
                    <span className="detalle">{duracion(minutosDesde(c.desde))}</span>
                    {lista ? (
                      <span className="esquina estado lista">Lista</span>
                    ) : cocina ? (
                      <span className="esquina estado preparando">Cocina</span>
                    ) : null}
                  </>
                ) : (
                  <span className="detalle">Libre</span>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <section className="panel">
          {!llevar.length ? (
            <Vacio icono={ShoppingBag} titulo="Sin pedidos para llevar" texto="Los pedidos para llevar y delivery aparecen aquí.">
              <button className="btn primario" onClick={() => setNuevoLlevar(true)}><Plus size={18} /> Nuevo pedido</button>
            </Vacio>
          ) : (
            <div className="pila">
              {llevar.map((o) => (
                <div key={o.id} className="ronda">
                  <div className="fila entre">
                    <div className="fila">
                      {o.es_delivery ? <Bike size={20} /> : <ShoppingBag size={20} />}
                      <strong>{etiquetaOrden(o)}</strong>
                      <span className={'estado ' + o.estado}>{ESTADOS[o.estado]}</span>
                      {o.factura_id && <span className="estado cobrada">Cobrado</span>}
                    </div>
                    <strong className="num">{lempiras(o.total)}</strong>
                  </div>
                  {(o.telefono || o.direccion) && (
                    <p className="suave chico">{[o.telefono, o.direccion].filter(Boolean).join(', ')}</p>
                  )}
                  <ul>
                    {o.orden_items.map((it) => (
                      <li key={it.id}><span>{it.cantidad} × {it.nombre}{it.nota && <em> ({it.nota})</em>}</span></li>
                    ))}
                  </ul>
                  <div className="fila">
                    <span className="suave chico">Pedido #{o.id} a las {hora(o.created_at)}, {o.mesero}</span>
                    <span style={{ flex: 1 }} />
                    {o.estado === 'pendiente' && !o.factura_id && (
                      <button className="btn compacto peligro" onClick={() => setCancelar(o)}>Cancelar</button>
                    )}
                    {o.estado === 'lista' && (
                      <button className="btn compacto verde" onClick={() => entregar(o)}><Check size={16} /> Entregado</button>
                    )}
                    {!o.factura_id && puedeCobrar && (
                      <button className="btn compacto primario" onClick={() => setCobrar(agruparCuentas([o])[0])}>
                        <Wallet size={16} /> Cobrar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {mesa && (
        <Modal
          titulo={`Mesa ${mesa.mesa}`}
          subtitulo={`Abierta hace ${duracion(minutosDesde(mesa.desde))}, ${mesa.ordenes.length} ${mesa.ordenes.length === 1 ? 'ronda' : 'rondas'}`}
          onCerrar={() => setMesaAbierta(null)}
          pie={
            <>
              <button
                className="btn"
                onClick={() => {
                  setMesaAbierta(null)
                  setComanda({ destino: { tipo: 'mesa', mesa: mesa.mesa }, etiqueta: `Mesa ${mesa.mesa}` })
                }}
              >
                <Plus size={18} /> Agregar platos
              </button>
              {puedeCobrar && (
                <button className="btn verde" onClick={() => { setCobrar(mesa); setMesaAbierta(null) }}>
                  <Wallet size={18} /> Cobrar {lempiras(mesa.total)}
                </button>
              )}
            </>
          }
        >
          {mesa.ordenes.map((o, i) => (
            <div key={o.id} className="ronda">
              <div className="fila entre">
                <strong>Ronda {i + 1}</strong>
                <span className={'estado ' + o.estado}>{ESTADOS[o.estado]}</span>
              </div>
              <ul>
                {o.orden_items.map((it) => (
                  <li key={it.id}>
                    <span>{it.cantidad} × {it.nombre}{it.nota && <em> ({it.nota})</em>}</span>
                    <span className="num">{lempiras(it.cantidad * it.precio)}</span>
                  </li>
                ))}
              </ul>
              <div className="fila">
                <span className="suave chico">{hora(o.created_at)}, {o.mesero}</span>
                <span style={{ flex: 1 }} />
                {o.estado === 'pendiente' && (
                  <button className="btn compacto peligro" onClick={() => setCancelar(o)}>Cancelar ronda</button>
                )}
                {o.estado === 'lista' && (
                  <button className="btn compacto verde" onClick={() => entregar(o)}><Check size={16} /> Servida</button>
                )}
              </div>
            </div>
          ))}
          <div className="total-grande"><span>Total de la mesa</span><span className="cifra">{lempiras(mesa.total)}</span></div>
          {!puedeCobrar && <p className="suave chico">Para cobrar, avisa a caja.</p>}
        </Modal>
      )}

      {nuevoLlevar && (
        <NuevoLlevar
          onCerrar={() => setNuevoLlevar(false)}
          onSeguir={(destino) => {
            setNuevoLlevar(false)
            setComanda({
              destino,
              etiqueta: `${destino.tipo === 'delivery' ? 'Delivery' : 'Para llevar'}: ${destino.cliente || 'Cliente'}`,
            })
          }}
        />
      )}

      {cobrar && <Cobrar cuenta={cobrar} cajaAbierta={Boolean(caja)} onCerrar={() => setCobrar(null)} />}

      {cancelar && (
        <Confirmar
          titulo="¿Cancelar este pedido?"
          texto="Se quita de cocina y los insumos vuelven al inventario. No se puede deshacer."
          accion="Cancelar pedido"
          peligro
          onNo={() => setCancelar(null)}
          onSi={async () => {
            try { await cambiarEstado(cancelar.id, 'cancelada'); avisar('Pedido cancelado') } catch (e) { avisar(mensajeError(e), 'error') }
            setCancelar(null)
          }}
        />
      )}
    </Pantalla>
  )
}

function NuevoLlevar({ onCerrar, onSeguir }) {
  const [tipo, setTipo] = useState('llevar')
  const [cliente, setCliente] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const listo = cliente.trim() && (tipo === 'llevar' || direccion.trim())
  return (
    <Modal
      titulo="Pedido para llevar"
      onCerrar={onCerrar}
      pie={
        <button className="btn primario bloque" disabled={!listo}
          onClick={() => onSeguir({ tipo, cliente: cliente.trim(), telefono: telefono.trim(), direccion: direccion.trim() })}>
          <UtensilsCrossed size={18} /> Elegir platos
        </button>
      }
    >
      <Segmentos bloque opciones={[['llevar', 'Para llevar'], ['delivery', 'Delivery']]} valor={tipo} onCambio={setTipo} />
      <Campo etiqueta="Nombre del cliente">
        <input className="entrada" value={cliente} onChange={(e) => setCliente(e.target.value)} autoFocus />
      </Campo>
      <Campo etiqueta="Teléfono" ayuda="Con el teléfono se guarda el cliente para la próxima vez">
        <input className="entrada" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="9999-9999" />
      </Campo>
      {tipo === 'delivery' && (
        <Campo etiqueta="Dirección de entrega">
          <textarea className="entrada" rows={2} value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Colonia, calle, referencia" />
        </Campo>
      )}
    </Modal>
  )
}
