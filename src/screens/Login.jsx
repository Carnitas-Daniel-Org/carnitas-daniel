import { useState } from 'react'
import { desbloquearSonido } from '../lib/format'

const PIN_STAFF = import.meta.env.VITE_PIN_STAFF || '1234'
const PIN_ADMIN = import.meta.env.VITE_PIN_ADMIN || '0000'

const ROLES = [
  { id: 'mesero', titulo: 'Mesero', desc: 'Tomar órdenes y enviarlas a cocina' },
  { id: 'cocina', titulo: 'Cocina', desc: 'Ver órdenes y marcarlas listas' },
  { id: 'admin', titulo: 'Administración', desc: 'Menú, precios y ventas del día' },
]

export default function Login({ onEntrar }) {
  const [rol, setRol] = useState('mesero')
  const [nombre, setNombre] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const entrar = (e) => {
    e.preventDefault()
    desbloquearSonido()
    const esperado = rol === 'admin' ? PIN_ADMIN : PIN_STAFF
    if (pin !== esperado) return setError('PIN incorrecto')
    if (rol === 'mesero' && !nombre.trim()) return setError('Escribe tu nombre')
    onEntrar({ rol, nombre: nombre.trim() })
  }

  return (
    <div className="centro">
      <form className="tarjeta login" onSubmit={entrar}>
        <div className="marca">
          <span className="marca-logo">CD</span>
          <div>
            <h1>Carnitas Daniel</h1>
            <p className="suave">Sistema de pedidos</p>
          </div>
        </div>

        <fieldset className="roles">
          <legend>¿Quién eres?</legend>
          {ROLES.map((r) => (
            <label key={r.id} className={'rol' + (rol === r.id ? ' activo' : '')}>
              <input type="radio" name="rol" value={r.id} checked={rol === r.id} onChange={() => setRol(r.id)} />
              <strong>{r.titulo}</strong>
              <span>{r.desc}</span>
            </label>
          ))}
        </fieldset>

        {rol === 'mesero' && (
          <label className="campo">
            Tu nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Carlos" autoComplete="name" />
          </label>
        )}

        <label className="campo">
          PIN
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            inputMode="numeric"
            type="password"
            placeholder="••••"
            autoComplete="off"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn primario grande" type="submit">
          Entrar
        </button>
      </form>
    </div>
  )
}
