import { useState } from 'react'
import { desdeIsoDia, fecha, finDia, inicioDia, isoDia, sumarDias } from '../lib/format'

const PRESETS = [
  ['hoy', 'Hoy'],
  ['ayer', 'Ayer'],
  ['7d', '7 días'],
  ['mes', 'Este mes'],
  ['mes_pasado', 'Mes pasado'],
  ['30d', '30 días'],
  ['otro', 'Otras fechas'],
]

export function rangoInicial(clave, desdeTxt, hastaTxt) {
  const hoy = new Date()
  let desde, hasta
  switch (clave) {
    case 'ayer': desde = inicioDia(sumarDias(hoy, -1)); hasta = finDia(sumarDias(hoy, -1)); break
    case '7d': desde = inicioDia(sumarDias(hoy, -6)); hasta = finDia(hoy); break
    case '30d': desde = inicioDia(sumarDias(hoy, -29)); hasta = finDia(hoy); break
    case 'mes': desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1); hasta = finDia(hoy); break
    case 'mes_pasado':
      desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      hasta = finDia(new Date(hoy.getFullYear(), hoy.getMonth(), 0))
      break
    case 'otro':
      desde = inicioDia(desdeIsoDia(desdeTxt || isoDia(sumarDias(hoy, -6))))
      hasta = finDia(desdeIsoDia(hastaTxt || isoDia(hoy)))
      break
    default: desde = inicioDia(hoy); hasta = finDia(hoy)
  }
  const mismoDia = isoDia(desde) === isoDia(hasta)
  return {
    clave,
    desde,
    hasta,
    dias: Math.round((inicioDia(hasta) - inicioDia(desde)) / 86400000) + 1,
    etiqueta: mismoDia ? fecha(desde) : `${fecha(desde)} al ${fecha(hasta)}`,
    etiquetaArchivo: mismoDia ? isoDia(desde) : `${isoDia(desde)}_a_${isoDia(hasta)}`,
  }
}

export default function RangoFechas({ valor, onCambio }) {
  const [d, setD] = useState(isoDia(valor.desde))
  const [h, setH] = useState(isoDia(valor.hasta))
  return (
    <div className="pila" style={{ gap: 8 }}>
      <div className="chips">
        {PRESETS.map(([k, t]) => (
          <button key={k} className={'chip' + (valor.clave === k ? ' activo' : '')} onClick={() => onCambio(rangoInicial(k, d, h))}>
            {t}
          </button>
        ))}
      </div>
      {valor.clave === 'otro' ? (
        <div className="fila">
          <input className="entrada" type="date" value={d} max={h} style={{ maxWidth: 190 }}
            onChange={(e) => { setD(e.target.value); if (e.target.value) onCambio(rangoInicial('otro', e.target.value, h)) }} />
          <span className="suave">al</span>
          <input className="entrada" type="date" value={h} min={d} style={{ maxWidth: 190 }}
            onChange={(e) => { setH(e.target.value); if (e.target.value) onCambio(rangoInicial('otro', d, e.target.value)) }} />
        </div>
      ) : (
        <p className="suave chico">{valor.etiqueta}</p>
      )}
    </div>
  )
}
