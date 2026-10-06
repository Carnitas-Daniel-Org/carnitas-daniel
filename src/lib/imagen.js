import { supabase } from './supabase'

// Reduce la foto en el teléfono antes de subirla (más rápida y liviana)
async function comprimir(archivo, maximo = 900, calidad = 0.82) {
  const bitmap = await createImageBitmap(archivo).catch(() => null)
  if (!bitmap) return archivo
  const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * escala)
  const h = Math.round(bitmap.height * escala)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', calidad))
  return blob || archivo
}

export async function subirFotoProducto(productoId, archivo) {
  const blob = await comprimir(archivo)
  const ruta = `p${productoId}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('productos').upload(ruta, blob, {
    contentType: 'image/jpeg',
    upsert: true,
    cacheControl: '31536000',
  })
  if (error) throw error
  return supabase.storage.from('productos').getPublicUrl(ruta).data.publicUrl
}
