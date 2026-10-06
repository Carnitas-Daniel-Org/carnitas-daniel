import { useEffect, useState } from 'react'
import { ChefHat, Delete, HandPlatter, Store, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { MARCA } from '../lib/marca'
import { ROLES, desbloquearSonido, mensajeError } from '../lib/format'
import { Cargando } from '../components/ui'

export const ICONO_ROL = { mesero: HandPlatter, cocina: ChefHat, cajero: Wallet, dueno: Store }

export default function Login({ onEntrar }) {
  const [personas, setPersonas] = useState(null)
  const [negocio, setNegocio] = useState({ nombre: '', pedirPin: false, direccion: '' })
  const [elegido, setElegido] = useState(null)
  const [pin, setPin] = useState('')
  const [mal, setMal] = useState(false)
  const [error, setError] = useState('')
  const [revisando, setRevisando] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.rpc('empleados_login'),
      supabase.from('ajustes').select('clave, valor').in('clave', ['nombre_negocio', 'pedir_pin', 'direccion']),
    ]).then(([emp, aj]) => {
      if (emp.error) return setError(mensajeError(emp.error))
      setPersonas(emp.data)
      const a = Object.fromEntries((aj.data || []).map((f) => [f.clave, f.valor]))
      setNegocio({ nombre: a.nombre_negocio || 'Mi negocio', pedirPin: a.pedir_pin === 'si', direccion: a.direccion || '' })
    })
  }, [])

  const entrar = (p) => {
    desbloquearSonido()
    onEntrar({ id: p.id, nombre: p.nombre, rol: p.rol })
  }

  const elegir = (p) => {
    if (!negocio.pedirPin) return entrar(p)
    setElegido(p)
    setPin('')
  }

  const verificar = async (valor) => {
    setRevisando(true)
    const { data, error: e } = await supabase.rpc('verificar_pin', { p_id: elegido.id, p_pin: valor })
    setRevisando(false)
    if (e) return setError(mensajeError(e))
    if (data?.length) entrar(data[0])
    else {
      setMal(true)
      setTimeout(() => { setMal(false); setPin('') }, 450)
    }
  }

  const tecla = (d) => {
    if (revisando || !elegido) return
    const nuevo = (pin + d).slice(0, 4)
    setPin(nuevo)
    if (nuevo.length === 4) verificar(nuevo)
  }

  useEffect(() => {
    if (!elegido) return
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) tecla(e.key)
      if (e.key === 'Backspace') setPin((p) => p.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="login">
      <section className="login-portada">
        <div className="marca">
          <img className="logo" src={MARCA.logoClaro} alt="" width="40" height="40" />
          <div>
            <strong>{negocio.nombre || ' '}</strong>
            <span>{negocio.direccion}</span>
          </div>
        </div>
        <div className="plato-grande" aria-hidden="true">
          <img src="/ilustraciones/plato-carnitas.svg" alt="" />
        </div>
        <div className="portada-texto">
          <h1>Buen turno.</h1>
          <p>{negocio.pedirPin ? 'Elige tu nombre y marca tu PIN para empezar.' : 'Toca tu nombre para empezar.'}</p>
        </div>
        <div className="firma">
          <img src={MARCA.logoClaro} alt="" width="18" height="18" />
          <span>Funciona con <strong>{MARCA.nombre.toLowerCase()}</strong></span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-caja">
          {!personas && !error && <Cargando />}
          {error && <p className="error-texto">{error}</p>}

          {personas && !elegido && (
            <>
              <h2>¿Quién eres?</h2>
              <div className="personas">
                {personas.map((p) => {
                  const Icono = ICONO_ROL[p.rol] || HandPlatter
                  return (
                    <button key={p.id} className={'persona rol-' + p.rol} onClick={() => elegir(p)}>
                      <span className="avatar"><Icono size={24} strokeWidth={1.8} /></span>
                      {p.nombre}
                      <small>{ROLES[p.rol]}</small>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {elegido && (
            <>
              <div className="fila entre">
                <div>
                  <h2>Hola, {elegido.nombre}</h2>
                  <p className="suave chico">Marca tu PIN de 4 números</p>
                </div>
                <button className="btn fantasma" onClick={() => setElegido(null)}>Cambiar</button>
              </div>
              <div className={'pin-puntos' + (mal ? ' mal' : '')} aria-label={`${pin.length} de 4 números`}>
                {[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? 'lleno' : ''} />)}
              </div>
              {mal && <p className="error-texto" style={{ textAlign: 'center' }}>PIN incorrecto</p>}
              <div className="teclado">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <button key={d} onClick={() => tecla(d)}>{d}</button>
                ))}
                <button className="accion" onClick={() => setPin('')}>Borrar</button>
                <button onClick={() => tecla('0')}>0</button>
                <button className="accion" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Borrar último número">
                  <Delete size={22} />
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
