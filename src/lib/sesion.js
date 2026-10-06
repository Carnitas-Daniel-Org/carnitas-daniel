import { createContext, useContext } from 'react'

export const SesionContext = createContext(null)
export const useSesion = () => useContext(SesionContext)

// Qué pantallas ve cada rol
export const PANTALLAS = {
  inicio: { titulo: 'Inicio', roles: ['dueno'] },
  mesas: { titulo: 'Pedidos', roles: ['dueno', 'cajero', 'mesero'] },
  cocina: { titulo: 'Cocina', roles: ['dueno', 'cocina'] },
  caja: { titulo: 'Caja', roles: ['dueno', 'cajero'] },
  facturas: { titulo: 'Facturas', roles: ['dueno', 'cajero'] },
  menu: { titulo: 'Menú', roles: ['dueno'] },
  inventario: { titulo: 'Inventario', roles: ['dueno', 'cocina'] },
  gastos: { titulo: 'Gastos', roles: ['dueno', 'cajero'] },
  reportes: { titulo: 'Reportes', roles: ['dueno'] },
  clientes: { titulo: 'Clientes', roles: ['dueno', 'cajero'] },
  ajustes: { titulo: 'Ajustes', roles: ['dueno'] },
}

export const pantallasDe = (rol) => Object.keys(PANTALLAS).filter((k) => PANTALLAS[k].roles.includes(rol))

export const inicioDe = (rol) => ({ dueno: 'inicio', cajero: 'caja', mesero: 'mesas', cocina: 'cocina' })[rol] || 'mesas'
