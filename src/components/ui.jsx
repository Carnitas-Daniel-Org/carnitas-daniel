import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { iniciales } from '../lib/format'

/* ---------- Avisos (toasts) ---------- */
const AvisoContext = createContext(() => {})
export const useAviso = () => useContext(AvisoContext)

export function AvisosProvider({ children }) {
  const [lista, setLista] = useState([])
  const avisar = useCallback((texto, tipo = 'info') => {
    const id = Math.random()
    setLista((l) => [...l, { id, texto, tipo }])
    setTimeout(() => setLista((l) => l.filter((a) => a.id !== id)), tipo === 'error' ? 6000 : 3500)
  }, [])
  return (
    <AvisoContext.Provider value={avisar}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {lista.map((a) => (
          <div key={a.id} className={'toast ' + a.tipo}>{a.texto}</div>
        ))}
      </div>
    </AvisoContext.Provider>
  )
}

/* ---------- Modal ---------- */
export function Modal({ titulo, subtitulo, onCerrar, children, pie, ancho = false }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCerrar?.()
    window.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [onCerrar])
  return createPortal(
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar?.()}>
      <div className={'modal' + (ancho ? ' ancho' : '')} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-cabeza">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p className="suave chico">{subtitulo}</p>}
          </div>
          {onCerrar && (
            <button className="btn fantasma btn-icono" onClick={onCerrar} aria-label="Cerrar">
              <X size={22} />
            </button>
          )}
        </div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ---------- Confirmación ---------- */
export function Confirmar({ titulo, texto, accion = 'Confirmar', peligro = false, onSi, onNo }) {
  const [ocupado, setOcupado] = useState(false)
  return (
    <Modal
      titulo={titulo}
      onCerrar={onNo}
      pie={
        <>
          <button className="btn" onClick={onNo}>Volver</button>
          <button
            className={'btn ' + (peligro ? 'peligro lleno' : 'primario')}
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true)
              try { await onSi() } finally { setOcupado(false) }
            }}
          >
            {accion}
          </button>
        </>
      }
    >
      <p>{texto}</p>
    </Modal>
  )
}

/* ---------- Campos ---------- */
export function Campo({ etiqueta, ayuda, children }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
      {ayuda && <span className="ayuda">{ayuda}</span>}
    </label>
  )
}

export function Buscar({ valor, onCambio, placeholder = 'Buscar' }) {
  return (
    <div className="buscar">
      <Search size={18} />
      <input className="entrada" type="search" value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function Segmentos({ opciones, valor, onCambio, bloque = false }) {
  return (
    <div className={'segmentos' + (bloque ? ' bloque' : '')} role="tablist">
      {opciones.map(([v, t]) => (
        <button key={v} role="tab" aria-selected={valor === v} className={valor === v ? 'activo' : ''} onClick={() => onCambio(v)}>
          {t}
        </button>
      ))}
    </div>
  )
}

export function Interruptor({ marcado, onCambio, children }) {
  return (
    <label className="interruptor">
      <input type="checkbox" checked={marcado} onChange={(e) => onCambio(e.target.checked)} />
      {children}
    </label>
  )
}

export function Cifra({ etiqueta, valor, nota, destacada = false }) {
  return (
    <div className={'cifra-caja' + (destacada ? ' destacada' : '')}>
      <span className="etiqueta">{etiqueta}</span>
      <span className="valor cifra">{valor}</span>
      {nota && <span className="nota">{nota}</span>}
    </div>
  )
}

export function Vacio({ icono: Icono, titulo, texto, children }) {
  return (
    <div className="vacio">
      {Icono && <Icono size={44} strokeWidth={1.5} />}
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return <div className="cargando">{texto}</div>
}

export function Foto({ producto, tam, cuadrada = false }) {
  const [rota, setRota] = useState(false)
  return (
    <div className={'foto' + (cuadrada ? ' cuadrada' : '')} style={tam ? { width: tam } : undefined}>
      {producto?.imagen_url && !rota ? (
        <img src={producto.imagen_url} alt="" loading="lazy" onError={() => setRota(true)} />
      ) : (
        <span className="ini">{iniciales(producto?.nombre)}</span>
      )}
    </div>
  )
}

/* ---------- Impresión ---------- */
export function imprimir(nodo, modo = 'ticket') {
  return new Promise((resolve) => {
    const destino = document.getElementById('impresion')
    destino.innerHTML = ''
    destino.appendChild(nodo.cloneNode(true))
    document.body.classList.toggle('imprime-ticket', modo === 'ticket')
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        document.body.classList.remove('imprime-ticket')
        resolve()
      }, 300)
    }, 60)
  })
}
