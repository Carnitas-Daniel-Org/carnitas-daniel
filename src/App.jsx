import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { configurado } from './lib/supabase'
import { SesionContext, inicioDe, pantallasDe } from './lib/sesion'
import { useAjustes, useMenu } from './lib/data'
import { AvisosProvider, Cargando } from './components/ui'
import Shell from './components/Shell'
import Login from './screens/Login'
const Inicio = lazy(() => import('./screens/Inicio'))
const Mesas = lazy(() => import('./screens/Mesas'))
const Cocina = lazy(() => import('./screens/Cocina'))
const Caja = lazy(() => import('./screens/Caja'))
const Facturas = lazy(() => import('./screens/Facturas'))
const Menu = lazy(() => import('./screens/Menu'))
const Inventario = lazy(() => import('./screens/Inventario'))
const Gastos = lazy(() => import('./screens/Gastos'))
const Reportes = lazy(() => import('./screens/Reportes'))
const Clientes = lazy(() => import('./screens/Clientes'))
const Ajustes = lazy(() => import('./screens/Ajustes'))

const CLAVE = 'cd_sesion_v2'
const leer = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE)) } catch { return null }
}

const VISTAS = { inicio: Inicio, mesas: Mesas, cocina: Cocina, caja: Caja, facturas: Facturas, menu: Menu, inventario: Inventario, gastos: Gastos, reportes: Reportes, clientes: Clientes, ajustes: Ajustes }

function Sistema({ empleado, salir }) {
  const [pantalla, setPantalla] = useState(() => {
    const h = location.hash.slice(1)
    return pantallasDe(empleado.rol).includes(h) ? h : inicioDe(empleado.rol)
  })
  const { ajustes, recargar: recargarAjustes } = useAjustes()
  const menu = useMenu()

  const ir = (p) => {
    setPantalla(p)
    history.replaceState(null, '', '#' + p)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    const onHash = () => {
      const h = location.hash.slice(1)
      if (pantallasDe(empleado.rol).includes(h)) setPantalla(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [empleado.rol])

  const valor = useMemo(() => ({ empleado, salir, ajustes, recargarAjustes, menu, ir }), [empleado, salir, ajustes, recargarAjustes, menu])
  const Vista = VISTAS[pantalla] || Mesas

  return (
    <SesionContext.Provider value={valor}>
      <Shell pantalla={pantalla} ir={ir}>
        <Suspense fallback={<Cargando />}>
          <Vista />
        </Suspense>
      </Shell>
    </SesionContext.Provider>
  )
}

export default function App() {
  const [empleado, setEmpleado] = useState(leer)

  useEffect(() => {
    try {
      if (empleado) localStorage.setItem(CLAVE, JSON.stringify(empleado))
      else localStorage.removeItem(CLAVE)
    } catch { /* sin almacenamiento */ }
  }, [empleado])

  if (!configurado) {
    return (
      <div className="login-panel" style={{ minHeight: '100dvh' }}>
        <div className="panel"><h2>Falta configurar la base de datos</h2></div>
      </div>
    )
  }

  return (
    <AvisosProvider>
      {empleado ? (
        <Sistema key={empleado.id} empleado={empleado} salir={() => { setEmpleado(null); history.replaceState(null, '', '#') }} />
      ) : (
        <Login onEntrar={setEmpleado} />
      )}
    </AvisosProvider>
  )
}
