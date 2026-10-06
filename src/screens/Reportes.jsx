import { forwardRef, useMemo, useRef, useState } from 'react'
import { FileDown, FileSpreadsheet, Lightbulb } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import RangoFechas, { rangoInicial } from '../components/RangoFechas'
import { BarrasH, GraficaSimple, GraficaVentas } from '../components/Graficas'
import { Cifra, Segmentos, imprimir } from '../components/ui'
import { q, useConsulta } from '../lib/data'
import { analizar } from '../lib/analitica'
import { exportarExcel } from '../lib/export'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { METODOS, fechaHora, isoDia, lempiras, numero, porcentaje } from '../lib/format'

export default function Reportes() {
  const { ajustes } = useSesion()
  const [rango, setRango] = useState(rangoInicial('7d'))
  const [orden, setOrden] = useState('ventas')
  const impresoRef = useRef(null)

  const { datos, cargando } = useConsulta(
    async () => {
      const [facturas, gastos, ordenes] = await Promise.all([
        q(supabase.from('facturas').select('*, factura_items(*)').gte('fecha', rango.desde.toISOString()).lte('fecha', rango.hasta.toISOString()).order('fecha')),
        q(supabase.from('gastos').select('*').gte('fecha', isoDia(rango.desde)).lte('fecha', isoDia(rango.hasta))),
        q(supabase.from('ordenes').select('id, created_at, lista_at, estado, total, mesero, tipo').gte('created_at', rango.desde.toISOString()).lte('created_at', rango.hasta.toISOString())),
      ])
      return { facturas, gastos, ordenes }
    },
    [rango.desde.getTime(), rango.hasta.getTime()],
    ['facturas', 'gastos'],
  )

  const r = useMemo(() => (datos ? analizar({ ...datos, rango }) : null), [datos, rango])
  if (!r) return <Pantalla titulo="Reportes"><RangoFechas valor={rango} onCambio={setRango} /><p className="suave">{cargando ? 'Calculando…' : ''}</p></Pantalla>

  const unDia = rango.dias === 1
  const productos = [...r.productos].sort((a, b) => b[orden] - a[orden])
  const ideas = sugerencias(r)

  const exportar = () =>
    exportarExcel(`reporte-${rango.etiquetaArchivo}.xlsx`, [
      {
        nombre: 'Resumen',
        filas: [
          ['Periodo', rango.etiqueta], ['Ventas totales (con ISV)', r.ventas], ['Descuentos', r.descuentos], ['ISV cobrado', r.isv],
          ['Ventas sin ISV', r.neto], ['Costo de lo vendido', r.costo], ['Utilidad bruta', r.utilidadBruta], ['Margen bruto %', r.margenBruto],
          ['Gastos de operación', r.gastosOperativos], ['Compras de insumos (informativo)', r.comprasInsumos], ['Utilidad neta', r.utilidadNeta], ['Documentos', r.documentos], ['Ticket promedio', r.ticket],
          ['Platos vendidos', r.platos], ['Anulados', r.anuladas], ['Pedidos cancelados', r.canceladas],
          ['Tiempo promedio de cocina (min)', r.cocinaPromedio ?? ''],
        ],
        columnas: [
          { titulo: 'Concepto', valor: (f) => f[0], ancho: 34 },
          { titulo: 'Valor', valor: (f) => (typeof f[1] === 'number' ? Math.round(f[1] * 100) / 100 : f[1]), ancho: 20 },
        ],
      },
      { nombre: 'Ventas por día', filas: r.porDia, columnas: [
        { titulo: 'Fecha', valor: (d) => d.dia, tipo: 'dia' }, { titulo: 'Día', valor: (d) => d.semana },
        { titulo: 'Ventas', valor: (d) => d.ventas, tipo: 'dinero' }, { titulo: 'Documentos', valor: (d) => d.documentos, tipo: 'numero' },
        { titulo: 'Costo', valor: (d) => d.costo, tipo: 'dinero' }, { titulo: 'Gastos', valor: (d) => d.gastos, tipo: 'dinero' },
      ] },
      { nombre: 'Por hora', filas: r.porHora, columnas: [
        { titulo: 'Hora', valor: (h) => h.etiqueta }, { titulo: 'Ventas', valor: (h) => h.ventas, tipo: 'dinero' }, { titulo: 'Documentos', valor: (h) => h.documentos, tipo: 'numero' },
      ] },
      { nombre: 'Productos', filas: r.productos, columnas: [
        { titulo: 'Producto', valor: (p) => p.nombre, ancho: 28 }, { titulo: 'Categoría', valor: (p) => p.categoria },
        { titulo: 'Cantidad', valor: (p) => p.cantidad, tipo: 'numero' }, { titulo: 'Ventas', valor: (p) => p.ventas, tipo: 'dinero' },
        { titulo: 'Costo', valor: (p) => p.costo, tipo: 'dinero' }, { titulo: 'Ganancia', valor: (p) => p.ganancia, tipo: 'dinero' },
        { titulo: 'Margen', valor: (p) => p.margen, tipo: 'porcentaje' }, { titulo: 'Participación', valor: (p) => p.participacion, tipo: 'porcentaje' },
      ] },
      { nombre: 'Categorías', filas: r.categorias, columnas: [
        { titulo: 'Categoría', valor: (c) => c.categoria, ancho: 22 }, { titulo: 'Cantidad', valor: (c) => c.cantidad, tipo: 'numero' },
        { titulo: 'Ventas', valor: (c) => c.ventas, tipo: 'dinero' }, { titulo: 'Costo', valor: (c) => c.costo, tipo: 'dinero' },
      ] },
      { nombre: 'Meseros', filas: r.meseros, columnas: [
        { titulo: 'Mesero', valor: (m) => m.mesero, ancho: 22 }, { titulo: 'Ventas', valor: (m) => m.ventas, tipo: 'dinero' },
        { titulo: 'Atenciones', valor: (m) => m.atenciones, tipo: 'numero' }, { titulo: 'Platos', valor: (m) => m.platos, tipo: 'numero' },
        { titulo: 'Ticket promedio', valor: (m) => m.ticket, tipo: 'dinero' },
      ] },
      { nombre: 'Formas de pago', filas: [...r.metodos, ...r.servicios.map((s) => ({ metodo: s.servicio, ...s }))], columnas: [
        { titulo: 'Concepto', valor: (m) => METODOS[m.metodo] || m.metodo, ancho: 22 }, { titulo: 'Ventas', valor: (m) => m.ventas, tipo: 'dinero' },
        { titulo: 'Documentos', valor: (m) => m.documentos, tipo: 'numero' },
      ] },
      { nombre: 'Gastos', filas: r.gastosPorCategoria, columnas: [
        { titulo: 'Categoría', valor: (g) => g.categoria, ancho: 24 }, { titulo: 'Monto', valor: (g) => g.monto, tipo: 'dinero' },
      ] },
      { nombre: 'Facturas', filas: r.validas, columnas: [
        { titulo: 'Fecha', valor: (f) => f.fecha, tipo: 'fecha' }, { titulo: 'Número', valor: (f) => f.numero, ancho: 22 },
        { titulo: 'Cliente', valor: (f) => f.cliente_nombre, ancho: 22 }, { titulo: 'Referencia', valor: (f) => f.referencia, ancho: 20 },
        { titulo: 'Gravado', valor: (f) => f.subtotal, tipo: 'dinero' }, { titulo: 'ISV', valor: (f) => f.isv, tipo: 'dinero' },
        { titulo: 'Total', valor: (f) => f.total, tipo: 'dinero' }, { titulo: 'Pago', valor: (f) => METODOS[f.metodo_pago] },
      ] },
    ])

  return (
    <Pantalla
      titulo="Reportes"
      sub={rango.etiqueta}
      acciones={
        <>
          <button className="btn" onClick={() => imprimir(impresoRef.current, 'reporte')}><FileDown size={18} /> PDF</button>
          <button className="btn primario" onClick={exportar}><FileSpreadsheet size={18} /> Excel</button>
        </>
      }
    >
      <RangoFechas valor={rango} onCambio={setRango} />

      <div className="cifras">
        <Cifra etiqueta="Ventas" valor={lempiras(r.ventas)} nota={`${r.documentos} ventas, ${numero(r.platos)} platos`} destacada />
        <Cifra etiqueta="Utilidad bruta" valor={lempiras(r.utilidadBruta)} nota={`Margen ${porcentaje(r.margenBruto)} sin ISV`} />
        <Cifra etiqueta="Gastos de operación" valor={lempiras(r.gastosOperativos)} nota={r.comprasInsumos ? `Más ${lempiras(r.comprasInsumos)} en compras de insumos` : 'Sueldos, gas, alquiler y demás'} />
        <Cifra etiqueta="Utilidad neta" valor={lempiras(r.utilidadNeta)} nota={r.utilidadNeta < 0 ? 'Pérdida en el periodo' : `Margen ${porcentaje(r.margenNeto)}`} />
        <Cifra etiqueta="Ticket promedio" valor={lempiras(r.ticket)} />
        <Cifra etiqueta="Cocina" valor={r.cocinaPromedio !== null ? `${Math.round(r.cocinaPromedio)} min` : '—'} nota={r.cocinaTarde !== null ? `${porcentaje(r.cocinaTarde)} tardó más de 15 min` : 'Promedio de pedido a listo'} />
      </div>

      {ideas.length > 0 && (
        <section className="panel">
          <div className="fila" style={{ marginBottom: 10 }}><Lightbulb size={20} /><h2>Lo que dicen los números</h2></div>
          <ul className="lista-simple">{ideas.map((t, i) => <li key={i}><span>{t}</span></li>)}</ul>
        </section>
      )}

      <section className="panel">
        <div className="panel-cabeza">
          <div><h2>{unDia ? 'Ventas por hora' : 'Ventas por día'}</h2>{!unDia && <p>Barras: ventas. Línea: gastos registrados.</p>}</div>
        </div>
        {unDia ? <GraficaSimple datos={r.porHora} x="etiqueta" y="ventas" /> : <GraficaVentas datos={r.porDia} conGastos alta />}
      </section>

      <div className="rejilla dos">
        {!unDia && (
          <section className="panel">
            <div className="panel-cabeza"><div><h2>Horas de más venta</h2><p>{r.horaPico?.ventas ? `La hora pico es ${r.horaPico.etiqueta}` : 'Sin ventas aún'}</p></div></div>
            <GraficaSimple datos={r.porHora} x="etiqueta" y="ventas" />
          </section>
        )}
        {rango.dias >= 7 && (
          <section className="panel">
            <div className="panel-cabeza"><div><h2>Promedio por día de la semana</h2><p>Útil para decidir turnos y compras</p></div></div>
            <GraficaSimple datos={r.porSemana.map((d) => ({ ...d, dia: d.dia.slice(0, 3) }))} x="dia" y="promedio" nombre="Promedio" />
          </section>
        )}
        <section className="panel">
          <div className="panel-cabeza"><h2>Formas de pago</h2></div>
          <BarrasH filas={r.metodos} etiqueta={(m) => METODOS[m.metodo]} valor={(m) => m.ventas} extra={(m) => `(${m.documentos})`} />
          <div className="separador" style={{ margin: '16px 0' }} />
          <BarrasH filas={r.servicios} etiqueta={(s) => s.servicio} valor={(s) => s.ventas} extra={(s) => `(${s.documentos})`} />
        </section>
        <section className="panel">
          <div className="panel-cabeza"><h2>Ventas por mesero</h2></div>
          {r.meseros.length ? (
            <BarrasH filas={r.meseros} etiqueta={(m) => m.mesero} valor={(m) => m.ventas} extra={(m) => `${m.atenciones} atenciones, ticket ${lempiras(m.ticket)}`} />
          ) : <p className="suave">Sin ventas en el periodo.</p>}
        </section>
        <section className="panel">
          <div className="panel-cabeza"><h2>Categorías</h2></div>
          <BarrasH filas={r.categorias} etiqueta={(c) => c.categoria} valor={(c) => c.ventas} extra={(c) => `${numero(c.cantidad)} vendidos`} />
        </section>
        <section className="panel">
          <div className="panel-cabeza"><h2>Gastos por categoría</h2></div>
          {r.gastosPorCategoria.length ? (
            <BarrasH filas={r.gastosPorCategoria} etiqueta={(g) => g.categoria} valor={(g) => g.monto} />
          ) : <p className="suave">Sin gastos registrados en el periodo.</p>}
        </section>
      </div>

      <section className="panel">
        <div className="panel-cabeza">
          <div><h2>Productos</h2><p>Qué se vende más y cuál deja más ganancia</p></div>
          <Segmentos opciones={[['ventas', 'Ventas'], ['cantidad', 'Cantidad'], ['ganancia', 'Ganancia'], ['margen', 'Margen']]} valor={orden} onCambio={setOrden} />
        </div>
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead><tr><th>Producto</th><th className="n">Vendidos</th><th className="n">Ventas</th><th className="n">Costo</th><th className="n">Ganancia</th><th className="n">Margen</th><th className="n">Del total</th></tr></thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.nombre}>
                  <td><strong>{p.nombre}</strong><div className="suave chico">{p.categoria}</div></td>
                  <td className="n">{numero(p.cantidad)}</td>
                  <td className="n fuerte">{lempiras(p.ventas)}</td>
                  <td className="n">{lempiras(p.costo)}</td>
                  <td className="n">{lempiras(p.ganancia)}</td>
                  <td className="n" style={{ color: p.costo ? (p.margen < 40 ? 'var(--chile)' : 'var(--verde)') : undefined, fontWeight: 700 }}>{p.costo ? porcentaje(p.margen) : '—'}</td>
                  <td className="n">{porcentaje(p.participacion)}</td>
                </tr>
              ))}
            </tbody>
            {productos.length > 0 && (
              <tfoot><tr><td>Total</td><td className="n">{numero(r.platos)}</td><td className="n">{lempiras(r.bruto)}</td><td className="n">{lempiras(r.costo)}</td><td className="n">{lempiras(r.bruto - r.costo)}</td><td /><td /></tr></tfoot>
            )}
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-cabeza"><h2>Estado de resultados</h2><p>{rango.etiqueta}</p></div>
        <ul className="lista-simple">
          <li><span>Ventas cobradas (con ISV)</span><strong className="num">{lempiras(r.ventas)}</strong></li>
          <li><span className="suave">Menos ISV a pagar al SAR</span><span className="num">− {lempiras(r.isv)}</span></li>
          <li><span>Ventas netas</span><strong className="num">{lempiras(r.neto)}</strong></li>
          <li><span className="suave">Menos costo de lo vendido (recetas)</span><span className="num">− {lempiras(r.costo)}</span></li>
          <li><span>Utilidad bruta</span><strong className="num">{lempiras(r.utilidadBruta)}</strong></li>
          <li><span className="suave">Menos gastos de operación</span><span className="num">− {lempiras(r.gastosOperativos)}</span></li>
          <li><strong>Utilidad neta</strong><strong className="cifra" style={{ fontSize: '1.4rem', color: r.utilidadNeta < 0 ? 'var(--chile)' : 'var(--verde)' }}>{lempiras(r.utilidadNeta)}</strong></li>
        </ul>
        <p className="suave chico" style={{ marginTop: 8 }}>
          Las compras de insumos ({lempiras(r.comprasInsumos)}) no se restan otra vez, porque lo que se usó ya está en el costo de lo vendido. Para que el costo sea real, mantén las recetas y los costos de los insumos al día.
        </p>
      </section>

      <div style={{ display: 'none' }}>
        <ReporteImpreso ref={impresoRef} r={r} rango={rango} negocio={ajustes.nombre_negocio || 'Carnitas Daniel'} />
      </div>
    </Pantalla>
  )
}

function sugerencias(r) {
  const s = []
  if (!r.documentos) return s
  const top = r.productos[0]
  if (top) s.push(`${top.nombre} es el producto que más vende: ${porcentaje(top.participacion)} de las ventas.`)
  const conCosto = r.productos.filter((p) => p.costo > 0 && p.cantidad >= 3)
  const mejorMargen = [...conCosto].sort((a, b) => b.margen - a.margen)[0]
  if (mejorMargen && mejorMargen.nombre !== top?.nombre) s.push(`${mejorMargen.nombre} deja el mejor margen (${porcentaje(mejorMargen.margen)}). Vale la pena recomendarlo más.`)
  const bajo = conCosto.filter((p) => p.margen < 40)
  if (bajo.length) s.push(`Margen bajo en ${bajo.map((p) => p.nombre).join(', ')}. Revisa precio o porción.`)
  if (r.horaPico?.ventas) s.push(`La hora de más venta es a las ${r.horaPico.etiqueta}. Ten la carne lista y personal completo antes de esa hora.`)
  if (r.cocinaTarde !== null && r.cocinaTarde > 20) s.push(`${porcentaje(r.cocinaTarde)} de los pedidos tardó más de 15 minutos en cocina.`)
  if (r.descuentos > r.bruto * 0.05) s.push(`Los descuentos suman ${lempiras(r.descuentos)} (${porcentaje((r.descuentos / r.bruto) * 100)} de las ventas).`)
  if (r.anuladas > 0) s.push(`Hubo ${r.anuladas} documentos anulados. Revisa los motivos en Facturas.`)
  if (r.gastosOperativos === 0) s.push('No hay gastos registrados en este periodo, así que la utilidad neta se ve más alta de lo real.')
  return s.slice(0, 6)
}

const ReporteImpreso = forwardRef(function ReporteImpreso({ r, rango, negocio }, ref) {
  return (
    <div className="reporte-impreso" ref={ref}>
      <h1>{negocio}: reporte de ventas</h1>
      <div>{rango.etiqueta}. Generado el {fechaHora(new Date())}</div>
      <div className="resumen">
        <div>Ventas<strong>{lempiras(r.ventas)}</strong></div>
        <div>Utilidad bruta<strong>{lempiras(r.utilidadBruta)}</strong></div>
        <div>Gastos de operación<strong>{lempiras(r.gastosOperativos)}</strong></div>
        <div>Utilidad neta<strong>{lempiras(r.utilidadNeta)}</strong></div>
        <div>Documentos<strong>{r.documentos}</strong></div>
        <div>Ticket promedio<strong>{lempiras(r.ticket)}</strong></div>
        <div>ISV cobrado<strong>{lempiras(r.isv)}</strong></div>
        <div>Descuentos<strong>{lempiras(r.descuentos)}</strong></div>
      </div>
      <h2>Ventas por día</h2>
      <table><thead><tr><th>Fecha</th><th>Día</th><th className="n">Ventas</th><th className="n">Documentos</th><th className="n">Gastos</th></tr></thead>
        <tbody>{r.porDia.map((d) => <tr key={d.dia}><td>{d.dia}</td><td>{d.semana}</td><td className="n">{lempiras(d.ventas)}</td><td className="n">{d.documentos}</td><td className="n">{lempiras(d.gastos)}</td></tr>)}</tbody></table>
      <h2>Productos</h2>
      <table><thead><tr><th>Producto</th><th className="n">Cant.</th><th className="n">Ventas</th><th className="n">Costo</th><th className="n">Margen</th></tr></thead>
        <tbody>{r.productos.map((p) => <tr key={p.nombre}><td>{p.nombre}</td><td className="n">{numero(p.cantidad)}</td><td className="n">{lempiras(p.ventas)}</td><td className="n">{lempiras(p.costo)}</td><td className="n">{p.costo ? porcentaje(p.margen) : '—'}</td></tr>)}</tbody></table>
      <h2>Meseros</h2>
      <table><thead><tr><th>Mesero</th><th className="n">Ventas</th><th className="n">Atenciones</th><th className="n">Ticket</th></tr></thead>
        <tbody>{r.meseros.map((m) => <tr key={m.mesero}><td>{m.mesero}</td><td className="n">{lempiras(m.ventas)}</td><td className="n">{m.atenciones}</td><td className="n">{lempiras(m.ticket)}</td></tr>)}</tbody></table>
      <h2>Formas de pago</h2>
      <table><tbody>{r.metodos.map((m) => <tr key={m.metodo}><td>{METODOS[m.metodo]}</td><td className="n">{lempiras(m.ventas)}</td><td className="n">{m.documentos}</td></tr>)}</tbody></table>
      <h2>Gastos</h2>
      <table><tbody>{r.gastosPorCategoria.map((g) => <tr key={g.categoria}><td>{g.categoria}</td><td className="n">{lempiras(g.monto)}</td></tr>)}</tbody></table>
    </div>
  )
})
