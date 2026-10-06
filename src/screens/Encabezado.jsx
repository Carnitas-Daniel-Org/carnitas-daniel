export default function Encabezado({ titulo, subtitulo, conectado = true, onSalir, children }) {
  return (
    <header className="encabezado">
      <div className="marca">
        <span className="marca-logo chico">CD</span>
        <div>
          <strong>{titulo}</strong>
          <span className="suave">
            {subtitulo}
            <span className={'punto ' + (conectado ? 'ok' : 'mal')} title={conectado ? 'Conectado' : 'Sin conexión'} />
            {!conectado && ' Sin conexión'}
          </span>
        </div>
      </div>
      <div className="acciones">
        {children}
        <button className="btn texto" onClick={onSalir}>Salir</button>
      </div>
    </header>
  )
}
