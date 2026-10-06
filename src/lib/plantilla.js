import { supabase } from './supabase'
import { q } from './data'

// Menú de ejemplo para negocios de comida en Honduras.
// Se puede cargar desde Ajustes; solo agrega lo que falta y no borra nada.

const IMG = (n) => `/ilustraciones/${n}.svg`

export const CATEGORIAS = ['Platos', 'Alitas', 'Tacos', 'Extras', 'Frescos naturales', 'Gaseosas y agua']

export const PRODUCTOS = [
  // [categoría, nombre, descripción, precio, ilustración, costo manual]
  ['Platos', 'Plato de carnitas', 'Carnitas doradas con frijoles, cebolla, cilantro y tortillas', 150, 'plato-carnitas'],
  ['Platos', 'Plato mixto', 'Carnitas y chicharrón con frijoles y tortillas', 180, 'plato-mixto'],
  ['Platos', 'Libra de carnitas', 'Una libra de carnitas para compartir', 220, 'libra-carnitas'],
  ['Platos', 'Carnitas con tajadas', 'Carnitas sobre tajadas con repollo y chimol', 165, 'carnitas-tajadas'],
  ['Alitas', 'Alitas BBQ (6)', 'Seis alitas en salsa BBQ con aderezo', 150, 'alitas-bbq'],
  ['Alitas', 'Alitas búfalo (6)', 'Seis alitas picantes con apio y aderezo', 150, 'alitas-bufalo'],
  ['Alitas', 'Alitas BBQ (12)', 'Doce alitas en salsa BBQ', 280, 'alitas-12'],
  ['Alitas', 'Combo alitas con papas', 'Cinco alitas, papas fritas y aderezo', 185, 'alitas-papas'],
  ['Tacos', 'Orden de tacos (3)', null, 90, 'tacos-orden'],
  ['Tacos', 'Taco individual', null, 35, 'taco'],
  ['Extras', 'Tortillas extra', null, 15, 'tortillas'],
  ['Extras', 'Chicharrón', null, 40, 'chicharron'],
  ['Extras', 'Frijoles', 'Con queso seco', 25, 'frijoles'],
  ['Extras', 'Papas fritas', null, 45, 'papas'],
  ['Extras', 'Tajadas', null, 35, 'tajadas'],
  ['Extras', 'Chimol', null, 15, 'chimol', 4],
  ['Extras', 'Aguacate', 'Media unidad', 25, 'aguacate'],
  ['Frescos naturales', 'Fresco de maracuyá', 'Natural, botella 500 ml', 35, 'fresco-maracuya'],
  ['Frescos naturales', 'Fresco de tamarindo', 'Natural, botella 500 ml', 35, 'fresco-tamarindo'],
  ['Frescos naturales', 'Fresco de nance', 'Natural, botella 500 ml', 35, 'fresco-nance'],
  ['Frescos naturales', 'Pozol', 'Natural, botella 500 ml', 35, 'fresco-pozol'],
  ['Frescos naturales', 'Fresco de limón', 'Natural, botella 500 ml', 35, 'fresco-limon'],
  ['Frescos naturales', 'Fresco de jamaica', 'Natural, botella 500 ml', 35, 'fresco-jamaica'],
  ['Frescos naturales', 'Horchata', 'Natural, botella 500 ml', 35, 'fresco-horchata'],
  ['Frescos naturales', 'Fresco de piña', 'Natural, botella 500 ml', 35, 'fresco-pina'],
  ['Frescos naturales', 'Fresco de mora', 'Natural, botella 500 ml', 35, 'fresco-mora'],
  ['Gaseosas y agua', 'Coca-Cola', '12 oz', 30, 'gaseosa-cola'],
  ['Gaseosas y agua', 'Canada Dry', '12 oz', 30, 'gaseosa-ginger'],
  ['Gaseosas y agua', 'Banana', '12 oz', 30, 'gaseosa-banana'],
  ['Gaseosas y agua', 'Uva', '12 oz', 30, 'gaseosa-uva'],
  ['Gaseosas y agua', 'Naranja', '12 oz', 30, 'gaseosa-naranja'],
  ['Gaseosas y agua', 'Agua', 'Botella 600 ml', 20, 'agua'],
]

export const INSUMOS = [
  // [nombre, unidad, existencia, mínimo, costo]
  ['Carne de cerdo', 'lb', 40, 10, 55],
  ['Tortillas', 'unidad', 300, 60, 1.5],
  ['Chicharrón', 'lb', 10, 3, 60],
  ['Frijoles', 'lb', 15, 5, 18],
  ['Alitas de pollo', 'unidad', 120, 30, 9],
  ['Papas', 'lb', 25, 8, 14],
  ['Plátano verde', 'unidad', 40, 10, 5],
  ['Aguacate', 'unidad', 15, 5, 12],
  ['Fresco natural 500 ml', 'unidad', 40, 12, 14],
  ['Gaseosa 12 oz', 'unidad', 48, 12, 14],
  ['Agua botella', 'unidad', 36, 12, 8],
]

const FRESCOS = PRODUCTOS.filter((p) => p[0] === 'Frescos naturales').map((p) => [p[1], 'Fresco natural 500 ml', 1])
const GASEOSAS = PRODUCTOS.filter((p) => p[0] === 'Gaseosas y agua' && p[1] !== 'Agua').map((p) => [p[1], 'Gaseosa 12 oz', 1])

export const RECETAS = [
  ['Plato de carnitas', 'Carne de cerdo', 0.5], ['Plato de carnitas', 'Tortillas', 4], ['Plato de carnitas', 'Frijoles', 0.25],
  ['Plato mixto', 'Carne de cerdo', 0.4], ['Plato mixto', 'Chicharrón', 0.2], ['Plato mixto', 'Tortillas', 4], ['Plato mixto', 'Frijoles', 0.25],
  ['Libra de carnitas', 'Carne de cerdo', 1],
  ['Carnitas con tajadas', 'Carne de cerdo', 0.4], ['Carnitas con tajadas', 'Plátano verde', 1],
  ['Alitas BBQ (6)', 'Alitas de pollo', 6], ['Alitas búfalo (6)', 'Alitas de pollo', 6], ['Alitas BBQ (12)', 'Alitas de pollo', 12],
  ['Combo alitas con papas', 'Alitas de pollo', 5], ['Combo alitas con papas', 'Papas', 0.4],
  ['Orden de tacos (3)', 'Carne de cerdo', 0.3], ['Orden de tacos (3)', 'Tortillas', 3],
  ['Taco individual', 'Carne de cerdo', 0.1], ['Taco individual', 'Tortillas', 1],
  ['Tortillas extra', 'Tortillas', 5], ['Chicharrón', 'Chicharrón', 0.25], ['Frijoles', 'Frijoles', 0.3],
  ['Papas fritas', 'Papas', 0.5], ['Tajadas', 'Plátano verde', 1], ['Aguacate', 'Aguacate', 0.5],
  ['Agua', 'Agua botella', 1],
  ...FRESCOS, ...GASEOSAS,
]

// Nombres viejos del menú de prueba que pasan a su versión nueva
const RENOMBRAR = {
  categorias: [['Bebidas', 'Gaseosas y agua']],
  productos: [['Refresco', 'Coca-Cola'], ['Fresco natural', 'Fresco de maracuyá']],
  insumos: [['Refresco lata', 'Gaseosa 12 oz']],
}

export async function cargarPlantilla() {
  const leer = async () => {
    const [categorias, productos, insumos] = await Promise.all([
      q(supabase.from('categorias').select('*')),
      q(supabase.from('productos').select('*')),
      q(supabase.from('insumos').select('*')),
    ])
    return { categorias, productos, insumos }
  }
  let d = await leer()
  const conNombre = (lista, n) => lista.find((x) => x.nombre.toLowerCase() === n.toLowerCase())
  let agregados = 0

  // 1. Renombrar lo del menú de prueba
  for (const [tabla, pares] of Object.entries(RENOMBRAR)) {
    for (const [viejo, nuevo] of pares) {
      const fila = conNombre(d[tabla], viejo)
      if (fila && !conNombre(d[tabla], nuevo)) await q(supabase.from(tabla).update({ nombre: nuevo }).eq('id', fila.id))
    }
  }
  d = await leer()

  // 2. Categorías
  const faltan = CATEGORIAS.filter((c) => !conNombre(d.categorias, c))
  if (faltan.length) {
    await q(supabase.from('categorias').insert(faltan.map((nombre) => ({ nombre, orden: 0 }))))
    agregados += faltan.length
  }
  d = await leer()
  for (const [i, c] of CATEGORIAS.entries()) {
    const fila = conNombre(d.categorias, c)
    if (fila && fila.orden !== i + 1) await q(supabase.from('categorias').update({ orden: i + 1 }).eq('id', fila.id))
  }
  const catId = (n) => conNombre(d.categorias, n)?.id ?? null

  // 3. Productos: agrega los que faltan y pone ilustración a los que no tienen foto
  const ordenEn = {}
  const nuevos = []
  for (const [cat, nombre, descripcion, precio, img, costo] of PRODUCTOS) {
    ordenEn[cat] = (ordenEn[cat] || 0) + 1
    const existe = conNombre(d.productos, nombre)
    if (!existe) {
      nuevos.push({ categoria_id: catId(cat), nombre, descripcion, precio, imagen_url: IMG(img), costo: costo || 0, orden: ordenEn[cat] })
    } else {
      const cambios = {}
      if (!existe.imagen_url) cambios.imagen_url = IMG(img)
      if (existe.categoria_id !== catId(cat) && ['Coca-Cola', 'Fresco de maracuyá', 'Agua'].includes(nombre)) cambios.categoria_id = catId(cat)
      if (!existe.descripcion && descripcion) cambios.descripcion = descripcion
      if (existe.orden !== ordenEn[cat]) cambios.orden = ordenEn[cat]
      if (Object.keys(cambios).length) await q(supabase.from('productos').update(cambios).eq('id', existe.id))
    }
  }
  if (nuevos.length) {
    await q(supabase.from('productos').insert(nuevos))
    agregados += nuevos.length
  }

  // 4. Insumos (con su existencia inicial registrada como movimiento)
  const insumosNuevos = INSUMOS.filter(([n]) => !conNombre(d.insumos, n))
  for (const [nombre, unidad, stock, minimo, costo_unitario] of insumosNuevos) {
    const [fila] = await q(supabase.from('insumos').insert({ nombre, unidad, minimo, costo_unitario }).select())
    await q(supabase.from('movimientos_inventario').insert({ insumo_id: fila.id, tipo: 'ajuste', cantidad: stock, nota: 'Existencia inicial' }))
    agregados += 1
  }

  // 5. Recetas que falten
  d = await leer()
  const actuales = await q(supabase.from('recetas').select('producto_id, insumo_id'))
  const filas = RECETAS.map(([prod, ins, cantidad]) => ({
    producto_id: conNombre(d.productos, prod)?.id,
    insumo_id: conNombre(d.insumos, ins)?.id,
    cantidad,
  })).filter((r) => r.producto_id && r.insumo_id && !actuales.some((a) => a.producto_id === r.producto_id && a.insumo_id === r.insumo_id))
  if (filas.length) await q(supabase.from('recetas').insert(filas))

  return { agregados, recetas: filas.length }
}
