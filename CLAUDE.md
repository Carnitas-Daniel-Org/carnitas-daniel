# Carnitas Daniel · Sistema de pedidos — contexto para Claude

Este archivo lo lee Claude Code automáticamente al abrir el proyecto. Mantenerlo al día cuando cambie algo importante.

## Qué es
PWA (app web instalable en el teléfono) para que los meseros de **Carnitas Daniel** (negocio de comida en San Pedro Sula, Honduras) manden órdenes a cocina en tiempo real. Es el **primer cliente piloto** de una idea más grande de Eduardo: un SaaS/POS para negocios de comida en Honduras (ver "Visión" abajo).

Dueño del proyecto: Eduardo (freelancer, SPS). Idioma de la app y de la comunicación con Eduardo: **español**. Respuestas concisas y directas.

## Stack (todo en plan gratuito)
- **Frontend:** React 19 + Vite, JavaScript (sin TypeScript), CSS plano en `src/index.css`. Sin router: la pantalla depende del rol en sesión.
- **Base de datos y tiempo real:** Supabase (org "novawebstudio-HN's Org", proyecto `carnitas-daniel`, ref `ggapikqvutrzgkgnevcc`, región us-east-1).
- **Hosting:** Vercel (cuenta Hobby de Eduardo), deploy automático desde GitHub.
- **Repo:** GitHub, cuenta personal `novawebstudio-HN`, repo `carnitas-daniel`.

## Estructura
```
src/
  App.jsx              sesión (localStorage) → Login / Mesero / Cocina / Admin
  lib/supabase.js      cliente Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  lib/useOrdenes.js    useOrdenes(): órdenes del día + realtime; useMenu(): categorías, productos, ajustes
  lib/format.js        lempiras(), hora(), beep(), etiquetas de estado
  screens/Login.jsx    elegir rol + PIN (VITE_PIN_STAFF, VITE_PIN_ADMIN; defaults 1234 / 0000)
  screens/Mesero.jsx   nueva orden (mesa o para llevar, productos, notas) + "mis órdenes" con aviso cuando está lista
  screens/Cocina.jsx   tablero de comandas, Empezar → Lista, sonido en órdenes nuevas, minutos de espera, wake lock
  screens/Admin.jsx    ventas del día, editar menú y precios, número de mesas
public/                manifest, sw.js (service worker mínimo), íconos
supabase/schema.sql    esquema completo (fuente de verdad de la base de datos)
```

## Modelo de datos
- `categorias`, `productos` (precio en Lempiras, `activo` para ocultar)
- `ordenes` (tipo mesa|llevar, mesa, cliente, mesero, nota, estado, total)
- `orden_items` (copia nombre y precio al momento de la venta)
- `ajustes` (clave/valor: `num_mesas`, `nombre_negocio`)
- Función `crear_orden(payload jsonb)`: crea orden + items en una transacción y calcula el total con precios de la BD.
- Estados: `pendiente` → `preparando` → `lista` → `entregada` (o `cancelada`).
- Realtime activado en `ordenes` y `orden_items`.

## Decisiones tomadas
- PWA en vez de app nativa: sin App Store, se instala desde el navegador.
- Cero costo mientras se prueba.
- Diseño sobrio (fondo claro, un color de acento terracota), botones grandes, pocos clics. Lección del análisis de Kryo: nada de neón ni pantallas cargadas.
- El menú cargado es **de ejemplo**; los precios reales se editan desde Admin.

## Limitaciones conocidas (modo prueba)
- **Seguridad:** el acceso es por PIN dentro de la app y las políticas RLS permiten todo a `anon`. Suficiente para probar; antes de uso real con varios negocios, pasar a Supabase Auth y RLS por negocio.
- Sin modo offline real: si el WiFi del local falla, las órdenes no llegan.
- Supabase gratis pausa el proyecto tras ~1 semana sin uso; se reactiva desde el dashboard.
- Sin cobro/método de pago, sin facturación SAR, sin impresora de comandas.

## Pendientes / ideas siguientes
1. Probar un día real con Carnitas Daniel en paralelo al cuaderno.
2. Conseguir menú y precios reales, número de mesas.
3. Cierre de caja (efectivo vs. transferencia).
4. Pedidos por WhatsApp / para llevar con teléfono del cliente.
5. Usuarios reales (Supabase Auth) y multi-negocio → base del SaaS.

## Visión (SaaS para negocios de comida en Honduras)
- Competencia real: Loyverse (gratis). Diferenciarse en lo local: cierre de caja claro, pedidos de WhatsApp, costo por plato, Android barato, facturación SAR como plan de pago.
- Validar con negocios reales antes de construir de más.

## Comandos
```
npm install
npm run dev      # local en http://localhost:5173 (requiere .env.local)
npm run build
```
