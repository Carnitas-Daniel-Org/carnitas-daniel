# Carnitas Daniel · Pedidos

App web instalable para tomar órdenes desde el teléfono y enviarlas a cocina en tiempo real.

- **Mesero:** elige mesa o "para llevar", agrega productos con notas y envía a cocina. Recibe aviso cuando la orden está lista.
- **Cocina:** ve las órdenes al instante, con sonido y minutos de espera. Marca "Empezar" y "Lista".
- **Administración:** ventas del día, menú y precios, número de mesas.

## Instalar en el teléfono
- **Android (Chrome):** abrir el link → menú ⋮ → *Agregar a pantalla principal*.
- **iPhone (Safari):** abrir el link → botón Compartir → *Agregar a inicio*.

## Desarrollo
Ver `CLAUDE.md` para el contexto completo, y `.env.example` para las variables.

```
npm install
npm run dev
```

La base de datos se crea con `supabase/schema.sql`.
