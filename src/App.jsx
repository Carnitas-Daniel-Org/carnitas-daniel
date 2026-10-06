import { useEffect, useState } from 'react'
import { configurado } from './lib/supabase'
import Login from './screens/Login'
import Mesero from './screens/Mesero'
import Cocina from './screens/Cocina'
import Admin from './screens/Admin'

const CLAVE = 'cd_sesion'

function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || null
  } catch {
    return null
  }
}

export default function App() {
  const [sesion, setSesion] = useState(leerSesion)

  useEffect(() => {
    try {
      if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion))
      else localStorage.removeItem(CLAVE)
    } catch {
      /* almacenamiento no disponible */
    }
  }, [sesion])

  if (!configurado) {
    return (
      <div className="centro">
        <div className="tarjeta">
          <h1>Falta configurar la base de datos</h1>
          <p className="suave">
            Agrega <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en las variables de entorno.
          </p>
        </div>
      </div>
    )
  }

  const salir = () => setSesion(null)

  if (!sesion) return <Login onEntrar={setSesion} />
  if (sesion.rol === 'cocina') return <Cocina onSalir={salir} />
  if (sesion.rol === 'admin') return <Admin onSalir={salir} />
  return <Mesero mesero={sesion.nombre} onSalir={salir} />
}
