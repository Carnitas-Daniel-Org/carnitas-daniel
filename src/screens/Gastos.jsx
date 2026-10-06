import { useState } from 'react'
import { FileSpreadsheet, HandCoins, Plus, Trash2 } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import RangoFechas, { rangoInicial } from '../components/RangoFechas'
import { Campo, Cifra, Confirmar, Modal, Segmentos, Vacio, useAviso } from '../components/ui'
import { q, useConsulta } from '../lib/data'
import { exportarExcel } from '../lib/export'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { CATEGORIAS_GASTO, METODOS, desdeIsoDia, fecha, isoDia, lempiras, mensajeError } from '../lib/format'

export default function Gastos() {
  const { empleado } = useSesion()
  const avisar = useAviso()
  const [rango, setRango] = useState(rangoInicial('mes'))
  const [nuevo, setNuevo] = useState(null)
  const [borrar, setBorrar] = useState(null)

  const { datos, recargar } = useConsulta(
    () =>
      q(supabase.from('gastos').select('*').gte('fecha', isoDia(rango.desde)).lte('fecha', isoDia(rango.hasta)).order('fecha', { ascending: false }).order('id', { ascending: false })),
    [rango.desde.getTime(), rango.hasta.getTime()],
    ['gastos'],
  )
  const gastos = datos || []
  const total = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const porCat = Object.entries(gastos.reduce((m, g) => ({ ...m, [g.categoria]: (m[g.categoria] || 0) + Number(g.monto) }), {})).sort((a, b) => b[1] - a[1])
  const mayor = porCat[0]?.[1] || 1

  const guardar = async () => {
    try {
      await q(supabase.from('gastos').insert({
        fecha: nuevo.fecha, categoria: nuevo.categoria, descripcion: nuevo.descripcion.trim() || null,
        monto: Number(nuevo.monto), metodo_pago: nuevo.metodo, empleado: empleado.nombre,
      }))
      avisar('Gasto registrado', 'ok')
      setNuevo(null)
      recargar()
    } catch (e) {
      avisar(mensajeError(e), 'error')
    }
  }

  const exportar = () =>
    exportarExcel(`gastos-${rango.etiquetaArchivo}.xlsx`, [{
      nombre: 'Gastos',
      filas: gastos,
      columnas: [
        { titulo: 'Fecha', valor: (g) => g.fecha, tipo: 'dia' },
        { titulo: 'Categoría', valor: (g) => g.categoria, ancho: 22 },
        { titulo: 'Descripción', valor: (g) => g.descripcion, ancho: 32 },
        { titulo: 'Monto', valor: (g) => g.monto, tipo: 'dinero' },
        { titulo: 'Pago', valor: (g) => METODOS[g.metodo_pago] || g.metodo_pago },
        { titulo: 'Registró', valor: (g) => g.empleado },
      ],
    }])

  return (
    <Pantalla
      titulo="Gastos"
      sub="Todo lo que sale del negocio, para saber la ganancia real"
      acciones={
        <>
          <button className="btn" onClick={exportar} disabled={!gastos.length}><FileSpreadsheet size={18} /> Excel</button>
          <button className="btn primario" onClick={() => setNuevo({ fecha: isoDia(), categoria: CATEGORIAS_GASTO[0], descripcion: '', monto: '', metodo: 'efectivo' })}>
            <Plus size={18} /> Gasto
          </button>
        </>
      }
    >
      <RangoFechas valor={rango} onCambio={setRango} />
      <div className="rejilla dos">
        <section className="panel pila">
          <Cifra etiqueta="Total de gastos" valor={lempiras(total)} nota={`${gastos.length} registros`} destacada />
          <div className="barras-h">
            {porCat.map(([c, v]) => (
              <div key={c} className="barra-h">
                <div className="fila"><span>{c}</span><strong className="num">{lempiras(v)}</strong></div>
                <div className="pista"><div className="relleno" style={{ width: `${(v / mayor) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          {!gastos.length ? (
            <Vacio icono={HandCoins} titulo="Sin gastos en estas fechas" texto="Registra compras, sueldos, gas, alquiler y demás." />
          ) : (
            <ul className="lista-simple">
              {gastos.map((g) => (
                <li key={g.id}>
                  <span>
                    <strong>{g.descripcion || g.categoria}</strong>
                    <span className="suave chico" style={{ display: 'block' }}>
                      {fecha(desdeIsoDia(g.fecha))}, {g.categoria}, {METODOS[g.metodo_pago] || g.metodo_pago}
                    </span>
                  </span>
                  <span className="fila" style={{ flexWrap: 'nowrap' }}>
                    <strong className="num">{lempiras(g.monto)}</strong>
                    {empleado.rol === 'dueno' && (
                      <button className="btn fantasma btn-icono" aria-label="Borrar gasto" onClick={() => setBorrar(g)}><Trash2 size={18} /></button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {nuevo && (
        <Modal titulo="Registrar gasto" onCerrar={() => setNuevo(null)}
          pie={<button className="btn primario bloque" disabled={!(Number(nuevo.monto) > 0)} onClick={guardar}>Guardar gasto</button>}>
          <div className="campos">
            <Campo etiqueta="Monto (L)">
              <input className="entrada cifra" style={{ fontSize: '1.4rem' }} inputMode="decimal" value={nuevo.monto} onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })} autoFocus />
            </Campo>
            <Campo etiqueta="Fecha"><input className="entrada" type="date" value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} /></Campo>
          </div>
          <Campo etiqueta="Categoría">
            <select className="entrada" value={nuevo.categoria} onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}>
              {CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Descripción">
            <input className="entrada" value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} placeholder="Ej. 2 tambos de gas" />
          </Campo>
          <Campo etiqueta="Cómo se pagó">
            <Segmentos bloque opciones={Object.entries(METODOS)} valor={nuevo.metodo} onCambio={(v) => setNuevo({ ...nuevo, metodo: v })} />
          </Campo>
        </Modal>
      )}
      {borrar && (
        <Confirmar titulo="¿Borrar este gasto?" texto={`${borrar.descripcion || borrar.categoria}: ${lempiras(borrar.monto)}`} accion="Borrar" peligro
          onNo={() => setBorrar(null)}
          onSi={async () => { try { await q(supabase.from('gastos').delete().eq('id', borrar.id)); recargar() } catch (e) { avisar(mensajeError(e), 'error') } setBorrar(null) }} />
      )}
    </Pantalla>
  )
}
