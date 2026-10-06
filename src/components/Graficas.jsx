import { Bar, BarChart, CartesianGrid, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { lempiras, lempirasCorto } from '../lib/format'

const COBALTO = '#1f3f94'
const COBRE = '#a85a1f'
const LINEA = '#d3dce7'
const SUAVE = '#56667f'

function Etiqueta({ active, payload, label, serieNombre = {} }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: `1px solid ${LINEA}`, borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 24px -12px rgba(19,32,59,.4)', fontSize: 13 }}>
      <strong>{label}</strong>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, fontVariantNumeric: 'tabular-nums' }}>
          {serieNombre[p.dataKey] || p.dataKey}: {p.dataKey === 'documentos' ? p.value : lempiras(p.value)}
        </div>
      ))}
    </div>
  )
}

const ejes = {
  tick: { fill: SUAVE, fontSize: 12 },
  axisLine: false,
  tickLine: false,
}

export function GraficaVentas({ datos, x = 'etiqueta', alta = false, conGastos = false }) {
  return (
    <div className={'grafica' + (alta ? ' alta' : '')}>
      <ResponsiveContainer>
        <ComposedChart data={datos} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={LINEA} strokeDasharray="3 3" />
          <XAxis dataKey={x} {...ejes} interval="preserveStartEnd" minTickGap={12} />
          <YAxis {...ejes} tickFormatter={lempirasCorto} width={64} />
          <Tooltip cursor={{ fill: 'rgba(31,63,148,.06)' }} content={<Etiqueta serieNombre={{ ventas: 'Ventas', gastos: 'Gastos' }} />} />
          <Bar dataKey="ventas" fill={COBALTO} radius={[6, 6, 0, 0]} maxBarSize={44} />
          {conGastos && <Line type="monotone" dataKey="gastos" stroke={COBRE} strokeWidth={2} dot={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraficaSimple({ datos, x, y, nombre = 'Ventas' }) {
  return (
    <div className="grafica">
      <ResponsiveContainer>
        <BarChart data={datos} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={LINEA} strokeDasharray="3 3" />
          <XAxis dataKey={x} {...ejes} />
          <YAxis {...ejes} tickFormatter={lempirasCorto} width={64} />
          <Tooltip cursor={{ fill: 'rgba(31,63,148,.06)' }} content={<Etiqueta serieNombre={{ [y]: nombre }} />} />
          <Bar dataKey={y} fill={COBALTO} radius={[6, 6, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarrasH({ filas, etiqueta, valor, formato = lempiras, extra }) {
  const max = Math.max(1, ...filas.map(valor))
  return (
    <div className="barras-h">
      {filas.map((f, i) => (
        <div key={i} className="barra-h">
          <div className="fila">
            <span>{etiqueta(f)}{extra && <span className="suave chico"> {extra(f)}</span>}</span>
            <strong className="num">{formato(valor(f))}</strong>
          </div>
          <div className="pista"><div className="relleno" style={{ width: `${(valor(f) / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}
