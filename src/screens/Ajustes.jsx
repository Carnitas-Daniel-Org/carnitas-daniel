import { useEffect, useState } from 'react'
import { BookOpen, KeyRound, Plus, UserPlus } from 'lucide-react'
import { Pantalla } from '../components/Shell'
import { Campo, Interruptor, Modal, Segmentos, useAviso } from '../components/ui'
import { guardarAjustes, q, useConsulta } from '../lib/data'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { ROLES, mensajeError } from '../lib/format'
import { cargarPlantilla, PRODUCTOS } from '../lib/plantilla'

export default function Ajustes() {
  const [vista, setVista] = useState('negocio')
  return (
    <Pantalla titulo="Ajustes" angosto>
      <Segmentos opciones={[['negocio', 'Negocio'], ['facturacion', 'Facturación SAR'], ['empleados', 'Empleados']]} valor={vista} onCambio={setVista} />
      {vista === 'negocio' && <Negocio />}
      {vista === 'facturacion' && <Facturacion />}
      {vista === 'empleados' && <Empleados />}
    </Pantalla>
  )
}

function useFormulario(claves) {
  const { ajustes } = useSesion()
  const [f, setF] = useState(() => Object.fromEntries(claves.map((k) => [k, ajustes[k] ?? ''])))
  useEffect(() => {
    setF((prev) => Object.fromEntries(claves.map((k) => [k, prev[k] !== '' ? prev[k] : ajustes[k] ?? ''])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ajustes])
  return [f, (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e })]
}

function BotonGuardar({ datos }) {
  const avisar = useAviso()
  const { recargarAjustes } = useSesion()
  const [ocupado, setOcupado] = useState(false)
  return (
    <button className="btn primario" disabled={ocupado} onClick={async () => {
      setOcupado(true)
      try { await guardarAjustes(datos); recargarAjustes(); avisar('Cambios guardados', 'ok') } catch (e) { avisar(mensajeError(e), 'error') } finally { setOcupado(false) }
    }}>
      {ocupado ? 'Guardando…' : 'Guardar cambios'}
    </button>
  )
}

function Negocio() {
  const [f, set] = useFormulario(['nombre_negocio', 'rtn', 'direccion', 'telefono', 'correo', 'mensaje_pie', 'num_mesas'])
  return (
    <>
    <section className="panel pila">
      <h2>Datos del negocio</h2>
      <p className="suave chico">Aparecen en los recibos y facturas.</p>
      <Campo etiqueta="Nombre comercial"><input className="entrada" value={f.nombre_negocio} onChange={set('nombre_negocio')} /></Campo>
      <div className="campos">
        <Campo etiqueta="RTN del negocio"><input className="entrada" inputMode="numeric" value={f.rtn} onChange={set('rtn')} placeholder="0501-1990-000000" /></Campo>
        <Campo etiqueta="Teléfono"><input className="entrada" inputMode="tel" value={f.telefono} onChange={set('telefono')} /></Campo>
      </div>
      <Campo etiqueta="Dirección"><input className="entrada" value={f.direccion} onChange={set('direccion')} /></Campo>
      <Campo etiqueta="Correo"><input className="entrada" type="email" value={f.correo} onChange={set('correo')} /></Campo>
      <Campo etiqueta="Mensaje al pie del recibo"><input className="entrada" value={f.mensaje_pie} onChange={set('mensaje_pie')} /></Campo>
      <Campo etiqueta="Número de mesas"><input className="entrada" inputMode="numeric" value={f.num_mesas} onChange={set('num_mesas')} style={{ maxWidth: 140 }} /></Campo>
      <div className="fila fin"><BotonGuardar datos={f} /></div>
    </section>
    <Plantilla />
    </>
  )
}

function Plantilla() {
  const { menu } = useSesion()
  const avisar = useAviso()
  const [ocupado, setOcupado] = useState(false)
  const cargar = async () => {
    setOcupado(true)
    try {
      const r = await cargarPlantilla()
      menu.recargar()
      avisar(r.agregados ? `Menú de ejemplo cargado: ${r.agregados} cosas nuevas` : 'El menú de ejemplo ya estaba completo', 'ok')
    } catch (e) {
      avisar(mensajeError(e), 'error')
    } finally {
      setOcupado(false)
    }
  }
  return (
    <section className="panel pila">
      <div className="fila"><BookOpen size={20} /><h2>Menú de ejemplo</h2></div>
      <p className="suave chico">
        Agrega un menú típico hondureño con ilustraciones, recetas e insumos: {PRODUCTOS.length} productos entre platos, alitas,
        frescos naturales y gaseosas. Solo agrega lo que falta y no borra nada. Después cambia precios y nombres en Menú.
      </p>
      <div className="fila fin"><button className="btn primario" disabled={ocupado} onClick={cargar}>{ocupado ? 'Cargando…' : 'Cargar menú de ejemplo'}</button></div>
    </section>
  )
}

function Facturacion() {
  const [f, set] = useFormulario(['isv_tasa', 'precios_incluyen_isv', 'cai', 'prefijo_factura', 'rango_desde', 'rango_hasta', 'fecha_limite', 'siguiente_factura', 'siguiente_recibo'])
  const restantes = f.rango_hasta && f.siguiente_factura ? Number(f.rango_hasta) - Number(f.siguiente_factura) + 1 : null
  const diasVence = f.fecha_limite ? Math.ceil((new Date(f.fecha_limite + 'T23:59:59') - new Date()) / 86400000) : null
  return (
    <section className="panel pila">
      <h2>Facturación</h2>
      <div className="aviso-banda info chico">
        Para emitir facturas fiscales necesitas el CAI y el rango autorizado que te da el SAR, normalmente a través de una imprenta autorizada. Mientras no lo tengas, el sistema emite recibos internos.
      </div>
      <div className="campos">
        <Campo etiqueta="ISV (%)"><input className="entrada" inputMode="decimal" value={f.isv_tasa} onChange={set('isv_tasa')} /></Campo>
        <Campo etiqueta="Los precios del menú">
          <Segmentos bloque opciones={[['si', 'Ya incluyen ISV'], ['no', 'Más ISV']]} valor={f.precios_incluyen_isv || 'si'} onCambio={set('precios_incluyen_isv')} />
        </Campo>
      </div>
      <div className="separador" />
      <h3>Datos del SAR</h3>
      <Campo etiqueta="CAI"><input className="entrada" value={f.cai} onChange={set('cai')} placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XX" /></Campo>
      <div className="campos">
        <Campo etiqueta="Prefijo" ayuda="Establecimiento, punto de emisión y tipo"><input className="entrada" value={f.prefijo_factura} onChange={set('prefijo_factura')} placeholder="000-001-01-" /></Campo>
        <Campo etiqueta="Fecha límite de emisión"><input className="entrada" type="date" value={f.fecha_limite} onChange={set('fecha_limite')} /></Campo>
      </div>
      <div className="campos">
        <Campo etiqueta="Rango desde"><input className="entrada" inputMode="numeric" value={f.rango_desde} onChange={set('rango_desde')} placeholder="1" /></Campo>
        <Campo etiqueta="Rango hasta"><input className="entrada" inputMode="numeric" value={f.rango_hasta} onChange={set('rango_hasta')} placeholder="500" /></Campo>
        <Campo etiqueta="Siguiente factura"><input className="entrada" inputMode="numeric" value={f.siguiente_factura} onChange={set('siguiente_factura')} /></Campo>
      </div>
      {restantes !== null && (
        <div className={'aviso-banda ' + (restantes <= 50 ? 'alerta' : 'verde')}>
          Quedan {restantes} facturas en el rango{diasVence !== null ? ` y ${diasVence} días para la fecha límite` : ''}.
        </div>
      )}
      <Campo etiqueta="Siguiente recibo interno"><input className="entrada" inputMode="numeric" value={f.siguiente_recibo} onChange={set('siguiente_recibo')} style={{ maxWidth: 160 }} /></Campo>
      <div className="fila fin"><BotonGuardar datos={f} /></div>
    </section>
  )
}

function Empleados() {
  const { empleado, ajustes, recargarAjustes } = useSesion()
  const pedirPin = ajustes.pedir_pin === 'si'
  const avisar = useAviso()
  const [editar, setEditar] = useState(null)
  const [miPin, setMiPin] = useState('')
  const { datos, recargar } = useConsulta(() => q(supabase.rpc('empleados_login')), [])

  const guardar = async () => {
    try {
      await q(supabase.rpc('guardar_empleado', {
        p_auth_id: empleado.id,
        p_auth_pin: pedirPin ? miPin : '',
        p: { id: editar.id ?? null, nombre: editar.nombre, rol: editar.rol, pin: editar.pin || '', activo: editar.activo },
      }))
      avisar('Empleado guardado', 'ok')
      setEditar(null)
      setMiPin('')
      recargar()
    } catch (e) {
      avisar(mensajeError(e), 'error')
    }
  }

  return (
    <section className="panel pila">
      <div className="fila entre">
        <div>
          <h2>Empleados</h2>
          <p className="suave chico">Cada persona entra con su nombre. Así sabes quién tomó, cobró o anuló cada cosa.</p>
        </div>
        <button className="btn primario" onClick={() => setEditar({ nombre: '', rol: 'mesero', pin: '', activo: true })}><UserPlus size={18} /> Empleado</button>
      </div>
      <div className={'aviso-banda ' + (pedirPin ? 'verde' : 'maiz')}>
        <Interruptor marcado={pedirPin} onCambio={async (v) => {
          try { await guardarAjustes({ pedir_pin: v ? 'si' : 'no' }); recargarAjustes(); avisar(v ? 'Ahora se pide PIN al entrar' : 'Se entra sin PIN', 'ok') } catch (e) { avisar(mensajeError(e), 'error') }
        }}>Pedir PIN al entrar</Interruptor>
        <span className="chico" style={{ flex: 1 }}>
          {pedirPin ? 'Cada empleado marca su PIN de 4 números.' : 'Modo prueba: cualquiera entra tocando un nombre. Actívalo antes de usarlo en el negocio.'}
        </span>
      </div>
      <ul className="lista-simple">
        {(datos || []).map((e) => (
          <li key={e.id}>
            <span><strong>{e.nombre}</strong> <span className="suave">{ROLES[e.rol]}</span></span>
            <button className="btn compacto" onClick={() => setEditar({ ...e, pin: '', activo: true })}><KeyRound size={16} /> Editar o cambiar PIN</button>
          </li>
        ))}
      </ul>
      <p className="suave chico">Los empleados desactivados no aparecen en la pantalla de entrada.</p>
      {editar && (
        <Modal titulo={editar.id ? editar.nombre : 'Nuevo empleado'} onCerrar={() => setEditar(null)}
          pie={<button className="btn primario bloque" disabled={!editar.nombre.trim() || (pedirPin && (miPin.length < 4 || (!editar.id && editar.pin.length !== 4)))} onClick={guardar}>
            <Plus size={18} /> Guardar
          </button>}>
          <Campo etiqueta="Nombre"><input className="entrada" value={editar.nombre} onChange={(e) => setEditar({ ...editar, nombre: e.target.value })} autoFocus /></Campo>
          <Campo etiqueta="Puesto">
            <select className="entrada" value={editar.rol} onChange={(e) => setEditar({ ...editar, rol: e.target.value })}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Campo>
          <Campo etiqueta={editar.id ? 'PIN nuevo (déjalo vacío para no cambiarlo)' : 'PIN de 4 números'} ayuda={pedirPin ? null : 'Opcional mientras no se pida PIN. Si lo dejas vacío queda 0000.'}>
            <input className="entrada cifra" style={{ fontSize: '1.3rem', letterSpacing: '.3em' }} inputMode="numeric" maxLength={4}
              value={editar.pin} onChange={(e) => setEditar({ ...editar, pin: e.target.value.replace(/\D/g, '') })} />
          </Campo>
          {editar.id && editar.id !== empleado.id && (
            <Interruptor marcado={editar.activo} onCambio={(v) => setEditar({ ...editar, activo: v })}>Activo</Interruptor>
          )}
          {pedirPin && (
            <>
              <div className="separador" />
              <Campo etiqueta="Tu PIN de dueño para confirmar">
                <input className="entrada" type="password" inputMode="numeric" maxLength={4} value={miPin} onChange={(e) => setMiPin(e.target.value.replace(/\D/g, ''))} />
              </Campo>
            </>
          )}
        </Modal>
      )}
    </section>
  )
}
