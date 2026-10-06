import { useEffect, useState } from 'react'
import { Delete } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ROLES, desbloquearSonido, iniciales, mensajeError } from '../lib/format'
import { Cargando } from '../components/ui'

export default function Login({ onEntrar }) {
  const [personas, setPersonas] = useState(null)
  const [elegido, setElegido] = useState(null)
  const [pin, setPin] = useState('')
  const [mal, setMal] = useState(false)
  const [error, setError] = useState('')
  const [revisando, setRevisando] = useState(false)

  useEffect(() => {
    supabase.rpc('empleados_login').then(({ data, error: e }) => {
      if (e) setError(mensajeError(e))
      else setPersonas(data)
    })
  }, [])

  const verificar = async (valor) => {
    setRevisando(true)
    const { data, error: e } = await supabase.rpc('verificar_pin', { p_id: elegido.id, p_pin: valor })
    setRevisando(false)
    if (e) return setError(mensajeError(e))
    if (data?.length) {
      desbloquearSonido()
      onEntrar({ ...data[0], pin_ok_en: Date.now() })
    } else {
      setMal(true)
      setTimeout(() => { setMal(false); setPin('') }, 450)
    }
  }

  const tecla = (d) => {
    if (revisando || !elegido) return
    const nuevo = (pin + d).slice(0, 6)
    setPin(nuevo)
    if (nuevo.length >= 4 && nuevo.length === 4) verificar(nuevo)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) tecla(e.key)
      if (e.key === 'Backspace') setPin((p) => p.slice(0, -1))
      if (e.key === 'Enter' && pin.length >= 4) verificar(pin)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="login">
      <section className="login-portada">
        <div className="marca">
          <span className="sello">CD</span>
          <div><strong>Carnitas Daniel</strong><span>San Pedro Sula</span></div>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1>Buen turno.</h1>
          <p>Elige tu nombre y marca tu PIN para empezar.</p>
        </div>
        <div className="plato-grande" aria-hidden="true" />
      </section>

      <section className="login-panel">
        <div className="login-caja">
          {!personas && !error && <Cargando />}
          {error && <p className="error-texto">{error}</p>}

          {personas && !elegido && (
            <>
              <h2>¿Quién eres?</h2>
              <div className="personas">
                {personas.map((p) => (
                  <button key={p.id} className="persona" onClick={() => { setElegido(p); setPin('') }}>
                    <span className="avatar">{iniciales(p.nombre)}</span>
                    {p.nombre}
                    <small>{ROLES[p.rol]}</small>
                  </button>
                ))}
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
