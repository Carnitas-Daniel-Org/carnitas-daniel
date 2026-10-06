import { useMemo } from 'react'
import { AlertTriangle, ChefHat, PackageX, ReceiptText, Wallet } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import { GraficaSimple } from '../components/Graficas'
import { Cifra } from '../components/ui'
import { agruparCuentas, q, useCajaAbierta, useConsulta, useOrdenesActivas } from '../lib/data'
import { analizar } from '../lib/analitica'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { fechaLarga, finDia, inicioDia, lempiras, numero, porcentaje, sumarDias } from '../lib/format'

export default function Inicio() {
  const { empleado, ajustes, menu, ir } = useSesion()
  const { ordenes } = useOrdenesActivas()
  const { caja } = useCajaAbierta()

  const hoy = { desde: inicioDia(), hasta: finDia(), dias: 1 }
  const ayer = { desde: inicioDia(sumarDias(new Date(), -1)), hasta: finDia(sumarDias(new Date(), -1)), dias: 1 }

  const { datos } = useConsulta(
    async () => {
      const [facturas, insumos, gastos] = await Promise.all([
        q(supabase.from('facturas').select('*, factura_items(*)').gte('fecha', ayer.desde.toISOString()).order('fecha')),
        q(supabase.from('insumos').select('*').eq('activo', true)),
        q(supabase.from('gastos').select('*').eq('fecha', new Date().toLocaleDateString('en-CA'))),
      ])
      return { facturas, insumos, gastos }
    },
    [],
    ['facturas', 'insumos', 'gastos'],
  )

  const rHoy = useMemo(() => {
    if (!datos) return null
    const f = datos.facturas.filter((x) => new Date(x.fecha) >= hoy.desde)
    return analizar({ facturas: f, gastos: datos.gastos, ordenes: [], rango: hoy })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos])
  const ventasAyer = useMemo(() => {
    if (!datos) return 0
    // Ayer hasta la misma hora, para comparar parejo
    const corte = sumarDias(new Date(), -1).getTime()
    return datos.facturas
      .filter((x) => !x.anulada && new Date(x.fecha) < hoy.desde && new Date(x.fecha).getTime() <= corte)
      .reduce((s, x) => s + Number(x.total), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos])

  const cuentas = agruparCuentas(ordenes)
  const mesasOcupadas = cuentas.filter((c) => c.tipo === 'mesa').length
  const enCocina = ordenes.filter((o) => ['pendiente', 'preparando'].includes(o.estado)).length
  const porCobrar = cuentas.reduce((s, c) => s + c.total, 0)
  const bajos = (datos?.insumos || []).filter((i) => Number(i.stock) <= Number(i.minimo))
  const agotados = menu.productos.filter((p) => p.activo && !p.disponible)

  const alertas = []
  if (!caja) alertas.push({ t: 'La caja está cerrada. Ábrela para empezar a cobrar.', ir: 'caja', icono: Wallet, tipo: 'maiz' })
  if (bajos.length) alertas.push({ t: `Comprar: ${bajos.map((i) => i.nombre).join(', ')}`, ir: 'inventario', icono: AlertTriangle, tipo: 'alerta' })
  if (agotados.length) alertas.push({ t: `Agotado hoy: ${agotados.map((p) => p.nombre).join(', ')}`, ir: 'menu', icono: PackageX, tipo: 'maiz' })
  if (ajustes.cai) {
    const restantes = ajustes.rango_hasta ? Number(ajustes.rango_hasta) - Number(ajustes.siguiente_factura) + 1 : null
    const dias = ajustes.fecha_limite ? Math.ceil((new Date(ajustes.fecha_limite + 'T23:59:59') - new Date()) / 86400000) : null
    if ((restantes !== null && restantes <= 50) || (dias !== null && dias <= 30)) {
      alertas.push({ t: `Facturación SAR: ${restantes !== null ? `quedan ${restantes} facturas` : ''}${restantes !== null && dias !== null ? ' y ' : ''}${dias !== null ? `${dias} días para la fecha límite` : ''}. Pide un rango nuevo a tiempo.`, ir: 'ajustes', icono: ReceiptText, tipo: 'alerta' })
    }
  }

  const cambio = ventasAyer ? ((rHoy?.ventas || 0) - ventasAyer) / ventasAyer * 100 : null
  const saludo = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <Pantalla titulo={`${saludo}, ${empleado.nombre}`} sub={fechaLarga(new Date())}>
      {alertas.map((a, i) => (
        <button key={i} className={'aviso-banda ' + a.tipo} style={{ border: 0, textAlign: 'left', width: '100%' }} onClick={() => ir(a.ir)}>
          <a.icono size={20} /><span style={{ flex: 1 }}>{a.t}</span>
        </button>
      ))}

      <div className="cifras">
        <Cifra
          destacada
          etiqueta="Vendido hoy"
          valor={lempiras(rHoy?.ventas || 0)}
          nota={cambio === null ? `${rHoy?.documentos || 0} ventas` : `${cambio >= 0 ? '+' : ''}${porcentaje(cambio)} vs. ayer a esta hora`}
        />
        <Cifra etiqueta="Utilidad bruta hoy" valor={lempiras(rHoy?.utilidadBruta || 0)} nota={`Margen ${porcentaje(rHoy?.margenBruto || 0)}`} />
        <Cifra etiqueta="Ticket promedio" valor={lempiras(rHoy?.ticket || 0)} nota={`${numero(rHoy?.platos || 0)} platos vendidos`} />
        <Cifra etiqueta="Por cobrar ahora" valor={lempiras(porCobrar)} nota={`${mesasOcupadas} mesas ocupadas, ${enCocina} en cocina`} />
      </div>

      <div className="rejilla dos">
        <section className="panel">
          <div className="panel-cabeza"><div><h2>Ventas de hoy por hora</h2><p>{rHoy?.horaPico?.ventas ? `Hora más fuerte: ${rHoy.horaPico.etiqueta}` : 'Aún sin ventas'}</p></div>
            <button className="btn compacto" onClick={() => ir('reportes')}>Ver reportes</button></div>
          <GraficaSimple datos={rHoy?.porHora || []} x="etiqueta" y="ventas" />
        </section>
        <section className="panel">
          <div className="panel-cabeza"><h2>Lo más vendido hoy</h2></div>
          {rHoy?.productos.length ? (
            <ul className="lista-simple">
              {rHoy.productos.slice(0, 6).map((p, i) => (
                <li key={p.nombre}>
                  <span className="fila" style={{ flexWrap: 'nowrap' }}>
                    <span className="cifra suave" style={{ width: 22 }}>{i + 1}</span>
                    <span><strong>{p.nombre}</strong><span className="suave chico" style={{ display: 'block' }}>{numero(p.cantidad)} vendidos</span></span>
                  </span>
                  <strong className="num">{lempiras(p.ventas)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="suave">Cuando se cobre la primera cuenta del día, aparece aquí.</p>
          )}
        </section>
      </div>

      <div className="cifras">
        <button className="cifra-caja" style={{ border: 0, textAlign: 'left' }} onClick={() => ir('caja')}>
          <span className="etiqueta">Caja</span>
          <span className="valor cifra" style={{ fontSize: '1.3rem' }}>{caja ? 'Abierta' : 'Cerrada'}</span>
          <span className="nota">{caja ? `Fondo ${lempiras(caja.fondo_inicial)}, abrió ${caja.abierta_por}` : 'Toca para abrir'}</span>
        </button>
        <button className="cifra-caja" style={{ border: 0, textAlign: 'left' }} onClick={() => ir('cocina')}>
          <span className="etiqueta"><ChefHat size={14} /> Cocina</span>
          <span className="valor cifra" style={{ fontSize: '1.3rem' }}>{enCocina} pedidos</span>
          <span className="nota">En cola o preparándose</span>
        </button>
        <div className="cifra-caja">
          <span className="etiqueta">Gastos de hoy</span>
          <span className="valor cifra" style={{ fontSize: '1.3rem' }}>{lempiras(rHoy?.gastosTotal || 0)}</span>
          <span className="nota">Registrados en Gastos</span>
        </div>
      </div>
    </Pantalla>
  )
}
