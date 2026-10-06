import { useState } from 'react'
import {
  BarChart3, BookOpen, ChefHat, HandCoins, LayoutDashboard, LogOut, Menu as MenuIcon,
  Package, Receipt, Settings, Users, UtensilsCrossed, Wallet,
} from 'lucide-react'
import { PANTALLAS, pantallasDe, useSesion } from '../lib/sesion'
import { MARCA } from '../lib/marca'
import { ROLES } from '../lib/format'
import { Modal } from './ui'

export const ICONOS = {
  inicio: LayoutDashboard,
  mesas: UtensilsCrossed,
  cocina: ChefHat,
  caja: Wallet,
  facturas: Receipt,
  menu: BookOpen,
  inventario: Package,
  gastos: HandCoins,
  reportes: BarChart3,
  clientes: Users,
  ajustes: Settings,
}

export function Marca({ negocio = 'Mi negocio', sub }) {
  return (
    <div className="marca">
      <img className="logo" src={MARCA.logoClaro} alt="" width="40" height="40" />
      <div>
        <strong>{negocio}</strong>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  )
}

export default function Shell({ pantalla, ir, alertas = {}, children }) {
  const { empleado, salir, ajustes } = useSesion()
  const [mas, setMas] = useState(false)
  const lista = pantallasDe(empleado.rol)
  const principales = lista.length > 5 ? lista.slice(0, 4) : lista
  const resto = lista.length > 5 ? lista.slice(4) : []

  return (
    <div className="marco">
      <aside className="lateral">
        <Marca negocio={ajustes.nombre_negocio || 'Mi negocio'} sub={`${empleado.nombre}, ${ROLES[empleado.rol].toLowerCase()}`} />
        <nav aria-label="Secciones">
          {lista.map((k) => {
            const Icono = ICONOS[k]
            return (
              <button key={k} className={'nav' + (pantalla === k ? ' activo' : '')} onClick={() => ir(k)}>
                <Icono size={20} />
                <span style={{ flex: 1 }}>{PANTALLAS[k].titulo}</span>
                {alertas[k] > 0 && <span className="estado alerta" style={{ padding: '0 8px' }}>{alertas[k]}</span>}
              </button>
            )
          })}
        </nav>
        <div className="pie">
          <span className="firma"><img src={MARCA.logoClaro} alt="" width="16" height="16" /> {MARCA.nombre.toLowerCase()}</span>
          <button className="btn compacto" onClick={salir}>
            <LogOut size={16} /> Cambiar de usuario
          </button>
        </div>
      </aside>

      <div className="principal">{children}</div>

      <nav className="nav-movil" aria-label="Secciones">
        {principales.map((k) => {
          const Icono = ICONOS[k]
          return (
            <button key={k} className={pantalla === k ? 'activo' : ''} onClick={() => ir(k)}>
              <Icono size={22} />
              {PANTALLAS[k].titulo}
            </button>
          )
        })}
        {resto.length > 0 ? (
          <button className={resto.includes(pantalla) ? 'activo' : ''} onClick={() => setMas(true)}>
            <MenuIcon size={22} />
            Más
          </button>
        ) : (
          <button onClick={salir}>
            <LogOut size={22} />
            Salir
          </button>
        )}
      </nav>

      {mas && (
        <Modal titulo={empleado.nombre} subtitulo={ROLES[empleado.rol]} onCerrar={() => setMas(false)}>
          <div className="pila">
            {resto.map((k) => {
              const Icono = ICONOS[k]
              return (
                <button key={k} className="btn bloque" style={{ justifyContent: 'flex-start' }} onClick={() => { ir(k); setMas(false) }}>
                  <Icono size={20} /> {PANTALLAS[k].titulo}
                </button>
              )
            })}
            <button className="btn bloque peligro" style={{ justifyContent: 'flex-start' }} onClick={salir}>
              <LogOut size={20} /> Cambiar de usuario
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function Pantalla({ titulo, sub, acciones, angosto = false, children }) {
  return (
    <>
      <header className="barra-sup">
        <div>
          <h1>{titulo}</h1>
          {sub && <p className="suave chico">{sub}</p>}
        </div>
        {acciones && <div className="fila">{acciones}</div>}
      </header>
      <main className={'contenido' + (angosto ? ' angosto' : '')}>{children}</main>
    </>
  )
}
