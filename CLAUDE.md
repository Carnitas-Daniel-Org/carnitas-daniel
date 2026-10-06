# Peltre (cliente piloto: Carnitas Daniel) — contexto para Claude

Claude Code lee este archivo automáticamente al abrir el proyecto. Mantenerlo al día con cada cambio importante.

## Qué es
Sistema completo para **Carnitas Daniel** (negocio de comida en San Pedro Sula, Honduras): pedidos por mesa y para llevar, cocina en tiempo real, caja con cobro y cierre, facturación (recibo interno o factura SAR), inventario con recetas, gastos, clientes y reportes. Es una PWA: se instala desde el navegador y se usa en teléfonos, tablets y computadoras.

Es el **cliente piloto** de **Peltre**, el SaaS de Eduardo para negocios de comida en Honduras. Eduardo lo va a vender a otros negocios: la marca del sistema (Peltre) es independiente del negocio que lo usa. El nombre del negocio sale de `ajustes.nombre_negocio`, nunca va fijo en el código.

## Marca Peltre
- Nombre y rutas en `src/lib/marca.js` (cambiar el nombre ahí). Logo: plato de peltre blanco con filete cobalto y una despostilladura.
- `scripts/marca.py` genera `public/marca/*.svg`, `public/favicon.svg` y los íconos PNG de la app (usa playwright).
- `scripts/ilustraciones.py` genera las ilustraciones propias de productos en `public/ilustraciones/*.svg` (comida vista desde arriba en plato; frescos naturales en botella de 500 ml estilo hondureño; gaseosas por sabor **sin logos de marcas**). Para agregar una: escribir la función, llamarla en `__main__`, correr el script y agregarla a `ILUSTRACIONES` en `marca.js`.
- Productos sin foto muestran `generico.svg`. En Menú se puede tomar foto o elegir ilustración.

- Dueño del proyecto: Eduardo (freelancer, SPS). Hablarle en **español**, conciso y directo.
- En producción: https://carnitas-daniel.vercel.app

## Stack (todo en plan gratuito)
- **Frontend:** React 19 + Vite, JavaScript, CSS plano (`src/index.css`). Sin router: la pantalla vive en el hash (`#caja`, `#reportes`) y depende del rol.
- **Librerías:** `@supabase/supabase-js`, `lucide-react` (íconos), `recharts` (gráficas, solo en Inicio/Reportes), `write-excel-file` (Excel, se carga solo al exportar). Pantallas con `React.lazy`.
- **Base de datos:** Supabase. Org "novawebstudio-HN's Org", proyecto `carnitas-daniel`, ref `ggapikqvutrzgkgnevcc`, us-east-1. Storage: bucket público `productos` para fotos.
- **Hosting:** Vercel (cuenta Hobby de Eduardo, proyecto `carnitas-daniel`). Deploy automático con cada push a `main`.
- **Repo:** GitHub `Carnitas-Daniel-Org/carnitas-daniel` (público; Vercel Hobby no publica repos privados de organizaciones). No hay secretos en el código: la llave de Supabase es pública por diseño y los PIN viven en la base de datos con hash.

## Estructura
```
src/
  App.jsx                 sesión (localStorage cd_sesion_v2) → Login o Sistema; contexto con empleado, ajustes, menú, ir()
  lib/supabase.js         cliente (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  lib/data.js             useConsulta (carga + tiempo real + recarga), useAjustes, useMenu, useOrdenesActivas, useCajaAbierta, agruparCuentas
  lib/sesion.js           PANTALLAS y qué rol ve cada una
  lib/analitica.js        todas las cifras de reportes (ventas, utilidad, por día/hora/producto/mesero...)
  lib/export.js           Excel multi-hoja y CSV
  lib/imagen.js           comprime y sube fotos de productos
  lib/format.js           lempiras, fechas, beep, textos de estados/roles/métodos
  components/             Shell (barra lateral / navegación móvil), ui (Modal, Campo, Cifra, imprimir...), Comanda (armar pedido),
                          Cobrar (cobro + recibo), Recibo (ticket 80 mm), RangoFechas, Graficas
  screens/                Login, Inicio, Mesas, Cocina, Caja, Facturas, Menu, Inventario, Gastos, Reportes, Clientes, Ajustes
supabase/schema.sql       esquema v1
supabase/migrations/002_sistema_completo.sql   esquema v2 (referencia; se aplicó en 3 partes sin DROP)
```

## Roles (cada empleado toca su nombre; PIN de 4 dígitos opcional)
- `ajustes.pedir_pin` = `no` (modo prueba, actual: se entra tocando el nombre) o `si`. Se cambia en Ajustes → Empleados. Si falta el ajuste, se entra sin PIN. Con `pedir_pin = no`, `guardar_empleado` no exige el PIN del dueño.
- **Dueño:** todo.
- **Caja:** pedidos, caja, facturas, gastos, clientes.
- **Mesero:** pedidos.
- **Cocina:** cocina e inventario.
Empleados iniciales (cambiar PIN en Ajustes → Empleados): Daniel/dueño 0000, Caja 2222, Mesero 1 1234, Cocina 3333.

## Modelo de datos (resumen)
- `empleados` (pin_hash con pgcrypto; sin acceso directo de anon). Funciones: `empleados_login()`, `verificar_pin(id, pin)`, `guardar_empleado(auth_id, auth_pin, jsonb)`.
- `categorias`, `productos` (imagen_url, descripcion, costo, disponible, activo).
- `ordenes` (tipo mesa|llevar, es_delivery, mesa, cliente, telefono, direccion, cliente_id, mesero, empleado_id, estado, total, preparando_at, lista_at, entregada_at, factura_id) + `orden_items` (snapshot de nombre, precio, costo, categoria).
- `crear_orden(jsonb)`: crea orden + items, guarda cliente si hay teléfono, toma precio y costo de la BD.
- `insumos`, `recetas` (producto → insumo, cantidad), `movimientos_inventario` (compra, venta, ajuste, merma, devolucion). Triggers: cada movimiento ajusta stock; vender descuenta por receta; cancelar devuelve.
- `caja_sesiones` (una abierta a la vez), `movimientos_caja`. Funciones `resumen_caja`, `cerrar_caja` (arqueo).
- `facturas` + `factura_items`. `cobrar(jsonb)`: correlativo con bloqueo, descuento, ISV (incluido o agregado), recibo `R-000001` o factura `prefijo + 8 dígitos` con CAI/rango/fecha límite. `anular_factura` (motivo; las órdenes vuelven a quedar por cobrar).
- `gastos`, `clientes`, `ajustes` (clave/valor: datos del negocio, ISV, CAI, rangos, correlativos, num_mesas, pedir_pin).
- Menú de ejemplo hondureño en `src/lib/plantilla.js` (platos, alitas, tacos, extras, frescos naturales, gaseosas y agua, con insumos y recetas). Ajustes → Negocio → "Cargar menú de ejemplo" agrega solo lo que falta. Pensado para dar de alta negocios nuevos.
- RLS: modo prueba (`acceso_prueba` permite todo a anon) excepto `empleados`.

## Decisiones tomadas
- Diseño "Peltre": vajilla de peltre (blanco + borde azul cobalto). Una familia tipográfica (Archivo, eje de ancho: títulos anchos, cifras condensadas). Evitar: crema + terracota, mayúsculas en etiquetas, separadores con punto medio.
- Utilidad neta = ventas sin ISV − costo por recetas − gastos de operación. Los gastos en "Insumos y compras" NO se restan otra vez (ya están en el costo).
- Cobrar no cambia el estado de cocina; la mesa se libera cuando todas sus órdenes están cobradas.
- Migraciones sin `DROP` (la aprobación automática los rechaza): usar `create or replace`, `add column if not exists`. Las herramientas de Supabase a veces cancelan SQL con varias instrucciones: mandar una instrucción por llamada.
- Imágenes: ilustraciones propias (SVG) en vez de fotos de internet; nada de logos o diseños de marcas reales (Coca-Cola, etc.). Lo ideal es que cada negocio suba fotos reales de sus platos.

## Limitaciones conocidas / pendientes
- Seguridad de prueba: RLS abierta a anon. Antes de vender a otros negocios: Supabase Auth + RLS por negocio (`negocio_id` en todas las tablas).
- Sin modo offline: si cae el internet no se pueden enviar pedidos.
- Supabase gratis pausa el proyecto tras ~1 semana sin uso.
- Facturación SAR: el sistema arma el documento con CAI y rango, pero Eduardo debe confirmar con un contador/imprenta autorizada que el formato cumple. Sin CAI solo emite recibos internos.
- Ideas siguientes: impresora térmica Bluetooth para comandas, dividir cuenta, propinas, pedidos por WhatsApp, modificadores (extra queso, sin cebolla como botones), reportes por correo, multi-sucursal, modo offline.

## Comandos
```
npm install
npm run dev      # http://localhost:5173 (requiere .env.local con las variables de .env.example)
npm run build
```
