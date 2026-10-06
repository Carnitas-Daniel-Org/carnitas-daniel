-- =========================================================
-- Carnitas Daniel · v2: sistema completo
-- Empleados, clientes, caja, facturación, inventario, gastos, fotos
-- =========================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Ajustes nuevos ----------
insert into ajustes (clave, valor) values
  ('rtn', ''),
  ('direccion', 'San Pedro Sula, Cortés'),
  ('telefono', ''),
  ('correo', ''),
  ('isv_tasa', '15'),
  ('precios_incluyen_isv', 'si'),
  ('cai', ''),
  ('prefijo_factura', '000-001-01-'),
  ('rango_desde', ''),
  ('rango_hasta', ''),
  ('fecha_limite', ''),
  ('siguiente_factura', '1'),
  ('siguiente_recibo', '1'),
  ('mensaje_pie', 'Gracias por su compra')
on conflict (clave) do nothing;

-- ---------- Empleados (PIN guardado con hash) ----------
create table if not exists empleados (
  id         bigint generated always as identity primary key,
  nombre     text not null,
  rol        text not null check (rol in ('dueno','cajero','mesero','cocina')),
  pin_hash   text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table empleados enable row level security;
-- Sin políticas para anon: el PIN nunca sale de la base de datos. Todo pasa por funciones.

create or replace function empleados_login()
returns table (id bigint, nombre text, rol text)
language sql security definer set search_path = public as $$
  select id, nombre, rol from empleados where activo order by
    case rol when 'mesero' then 1 when 'cocina' then 2 when 'cajero' then 3 else 4 end, nombre;
$$;

create or replace function verificar_pin(p_id bigint, p_pin text)
returns table (id bigint, nombre text, rol text)
language sql security definer set search_path = public, extensions as $$
  select id, nombre, rol from empleados
  where id = p_id and activo and pin_hash = crypt(p_pin, pin_hash);
$$;

-- Crear o editar empleado. Solo un dueño (con su PIN) puede hacerlo.
create or replace function guardar_empleado(p_auth_id bigint, p_auth_pin text, p jsonb)
returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare nuevo bigint;
begin
  if not exists (select 1 from empleados where id = p_auth_id and rol = 'dueno' and activo
                 and pin_hash = crypt(p_auth_pin, pin_hash)) then
    raise exception 'Solo el dueño puede administrar empleados';
  end if;
  if coalesce(p->>'pin','') <> '' and (p->>'pin') !~ '^[0-9]{4,6}$' then
    raise exception 'El PIN debe tener de 4 a 6 números';
  end if;
  if p ? 'id' and (p->>'id') is not null then
    update empleados set
      nombre = coalesce(nullif(p->>'nombre',''), nombre),
      rol    = coalesce(nullif(p->>'rol',''), rol),
      activo = coalesce((p->>'activo')::boolean, activo),
      pin_hash = case when coalesce(p->>'pin','') <> '' then crypt(p->>'pin', gen_salt('bf')) else pin_hash end
    where id = (p->>'id')::bigint
    returning id into nuevo;
  else
    if coalesce(p->>'pin','') = '' then raise exception 'Falta el PIN'; end if;
    insert into empleados (nombre, rol, pin_hash)
    values (p->>'nombre', p->>'rol', crypt(p->>'pin', gen_salt('bf')))
    returning id into nuevo;
  end if;
  return nuevo;
end $$;

grant execute on function empleados_login() to anon, authenticated;
grant execute on function verificar_pin(bigint, text) to anon, authenticated;
grant execute on function guardar_empleado(bigint, text, jsonb) to anon, authenticated;

-- Empleados iniciales (cambiar los PIN desde Ajustes → Empleados)
insert into empleados (nombre, rol, pin_hash)
select * from (values
  ('Daniel',  'dueno',  extensions.crypt('0000', extensions.gen_salt('bf'))),
  ('Caja',    'cajero', extensions.crypt('2222', extensions.gen_salt('bf'))),
  ('Mesero 1','mesero', extensions.crypt('1234', extensions.gen_salt('bf'))),
  ('Cocina',  'cocina', extensions.crypt('3333', extensions.gen_salt('bf')))
) v(nombre, rol, pin_hash)
where not exists (select 1 from empleados);

-- ---------- Clientes ----------
create table if not exists clientes (
  id         bigint generated always as identity primary key,
  nombre     text not null,
  telefono   text unique,
  direccion  text,
  rtn        text,
  notas      text,
  created_at timestamptz not null default now()
);

-- ---------- Productos: foto, descripción, costo, disponibilidad ----------
alter table productos add column if not exists imagen_url  text;
alter table productos add column if not exists descripcion text;
alter table productos add column if not exists costo       numeric(10,2) not null default 0;
alter table productos add column if not exists disponible  boolean not null default true;

-- ---------- Órdenes: delivery, cliente, tiempos, pago ----------
alter table ordenes add column if not exists es_delivery boolean not null default false;
alter table ordenes add column if not exists telefono     text;
alter table ordenes add column if not exists direccion    text;
alter table ordenes add column if not exists cliente_id   bigint references clientes(id) on delete set null;
alter table ordenes add column if not exists empleado_id  bigint references empleados(id) on delete set null;
alter table ordenes add column if not exists preparando_at timestamptz;
alter table ordenes add column if not exists lista_at      timestamptz;
alter table ordenes add column if not exists entregada_at  timestamptz;
create index if not exists ordenes_cliente_idx on ordenes (cliente_id);

alter table orden_items add column if not exists costo     numeric(10,2) not null default 0;
alter table orden_items add column if not exists categoria text;

-- Marcar tiempos al cambiar de estado
create or replace function marcar_tiempos() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.estado is distinct from old.estado then
    if new.estado = 'preparando' and new.preparando_at is null then new.preparando_at := now(); end if;
    if new.estado = 'lista'      and new.lista_at      is null then new.lista_at      := now(); end if;
    if new.estado = 'entregada'  and new.entregada_at  is null then new.entregada_at  := now(); end if;
  end if;
  return new;
end $$;
create or replace trigger ordenes_tiempos before update on ordenes
for each row execute function marcar_tiempos();

-- ---------- Inventario ----------
create table if not exists insumos (
  id             bigint generated always as identity primary key,
  nombre         text not null,
  unidad         text not null default 'unidad',
  stock          numeric(12,3) not null default 0,
  minimo         numeric(12,3) not null default 0,
  costo_unitario numeric(10,2) not null default 0,
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists recetas (
  producto_id bigint not null references productos(id) on delete cascade,
  insumo_id   bigint not null references insumos(id) on delete cascade,
  cantidad    numeric(12,3) not null check (cantidad > 0),
  primary key (producto_id, insumo_id)
);
create index if not exists recetas_insumo_idx on recetas (insumo_id);

create table if not exists movimientos_inventario (
  id             bigint generated always as identity primary key,
  insumo_id      bigint not null references insumos(id) on delete cascade,
  tipo           text not null check (tipo in ('compra','venta','ajuste','merma','devolucion')),
  cantidad       numeric(12,3) not null,          -- positivo entra, negativo sale
  costo_unitario numeric(10,2),
  nota           text,
  orden_id       bigint references ordenes(id) on delete set null,
  empleado       text,
  created_at     timestamptz not null default now()
);
create index if not exists mov_inv_insumo_idx on movimientos_inventario (insumo_id, created_at desc);
create index if not exists mov_inv_orden_idx on movimientos_inventario (orden_id);

-- Cada movimiento actualiza el stock (y el costo en compras)
create or replace function aplicar_movimiento_inventario() returns trigger
language plpgsql set search_path = public as $$
begin
  update insumos set
    stock = stock + new.cantidad,
    costo_unitario = case when new.tipo = 'compra' and new.costo_unitario is not null and new.costo_unitario > 0
                          then new.costo_unitario else costo_unitario end
  where id = new.insumo_id;
  return new;
end $$;
create or replace trigger mov_inv_aplicar after insert on movimientos_inventario
for each row execute function aplicar_movimiento_inventario();

-- Al vender: descontar insumos según la receta
create or replace function descontar_por_venta() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.producto_id is not null then
    insert into movimientos_inventario (insumo_id, tipo, cantidad, orden_id, nota)
    select r.insumo_id, 'venta', -(r.cantidad * new.cantidad), new.orden_id, new.nombre
    from recetas r where r.producto_id = new.producto_id;
  end if;
  return new;
end $$;
create or replace trigger items_descontar after insert on orden_items
for each row execute function descontar_por_venta();

-- Al cancelar una orden: devolver insumos
create or replace function devolver_por_cancelacion() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.estado = 'cancelada' and old.estado <> 'cancelada' then
    insert into movimientos_inventario (insumo_id, tipo, cantidad, orden_id, nota)
    select insumo_id, 'devolucion', -sum(cantidad), new.id, 'Orden cancelada #' || new.id
    from movimientos_inventario
    where orden_id = new.id and tipo = 'venta'
    group by insumo_id;
  end if;
  return new;
end $$;
create or replace trigger ordenes_devolver after update on ordenes
for each row execute function devolver_por_cancelacion();

-- Costo de un producto: receta si existe, si no el costo manual
create or replace function costo_producto(p_id bigint) returns numeric
language sql stable set search_path = public as $$
  select coalesce(
    (select sum(r.cantidad * i.costo_unitario) from recetas r join insumos i on i.id = r.insumo_id
     where r.producto_id = p_id having count(*) > 0),
    (select costo from productos where id = p_id), 0);
$$;

-- ---------- Crear orden (v2) ----------
create or replace function crear_orden(payload jsonb) returns bigint
language plpgsql set search_path = public as $$
declare
  nueva_id bigint;
  it jsonb;
  p productos%rowtype;
  cat text;
  suma numeric(10,2) := 0;
  cli bigint;
  tel text := nullif(trim(payload->>'telefono'),'');
begin
  if jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) = 0 then
    raise exception 'La orden no tiene productos';
  end if;

  if tel is not null then
    insert into clientes (nombre, telefono, direccion)
    values (coalesce(nullif(payload->>'cliente',''),'Cliente'), tel, nullif(payload->>'direccion',''))
    on conflict (telefono) do update set
      nombre = coalesce(nullif(excluded.nombre,'Cliente'), clientes.nombre),
      direccion = coalesce(excluded.direccion, clientes.direccion)
    returning id into cli;
  end if;

  insert into ordenes (tipo, es_delivery, mesa, cliente, telefono, direccion, cliente_id, mesero, empleado_id, nota)
  values (
    case when payload->>'tipo' = 'mesa' then 'mesa' else 'llevar' end,
    payload->>'tipo' = 'delivery',
    nullif(payload->>'mesa',''),
    nullif(payload->>'cliente',''),
    tel,
    nullif(payload->>'direccion',''),
    cli,
    coalesce(nullif(payload->>'mesero',''),'Mesero'),
    nullif(payload->>'empleado_id','')::bigint,
    nullif(payload->>'nota','')
  )
  returning id into nueva_id;

  for it in select * from jsonb_array_elements(payload->'items') loop
    select * into p from productos where id = (it->>'producto_id')::bigint;
    if not found then raise exception 'Producto % no existe', it->>'producto_id'; end if;
    if not p.disponible then raise exception '% está agotado', p.nombre; end if;
    select nombre into cat from categorias where id = p.categoria_id;
    insert into orden_items (orden_id, producto_id, nombre, precio, costo, categoria, cantidad, nota)
    values (nueva_id, p.id, p.nombre, p.precio, costo_producto(p.id), cat,
            greatest(1,(it->>'cantidad')::int), nullif(it->>'nota',''));
    suma := suma + p.precio * greatest(1,(it->>'cantidad')::int);
  end loop;

  update ordenes set total = suma where id = nueva_id;
  return nueva_id;
end $$;
grant execute on function crear_orden(jsonb) to anon, authenticated;

-- ---------- Caja ----------
create table if not exists caja_sesiones (
  id                bigint generated always as identity primary key,
  abierta_at        timestamptz not null default now(),
  cerrada_at        timestamptz,
  abierta_por       text,
  cerrada_por       text,
  fondo_inicial     numeric(10,2) not null default 0,
  efectivo_esperado numeric(10,2),
  efectivo_contado  numeric(10,2),
  diferencia        numeric(10,2),
  notas             text
);
create unique index if not exists una_caja_abierta on caja_sesiones ((cerrada_at is null)) where cerrada_at is null;

create table if not exists movimientos_caja (
  id         bigint generated always as identity primary key,
  caja_id    bigint not null references caja_sesiones(id) on delete cascade,
  tipo       text not null check (tipo in ('entrada','salida')),
  monto      numeric(10,2) not null check (monto > 0),
  motivo     text not null,
  empleado   text,
  created_at timestamptz not null default now()
);
create index if not exists mov_caja_idx on movimientos_caja (caja_id);

-- ---------- Facturas ----------
create table if not exists facturas (
  id              bigint generated always as identity primary key,
  tipo            text not null check (tipo in ('factura','recibo')),
  numero          text not null unique,
  correlativo     bigint not null,
  cai             text,
  fecha_limite    text,
  rango           text,
  fecha           timestamptz not null default now(),
  caja_id         bigint references caja_sesiones(id) on delete set null,
  cliente_id      bigint references clientes(id) on delete set null,
  cliente_nombre  text,
  cliente_rtn     text,
  referencia      text,           -- "Mesa 4" o "Llevar: Ana"
  bruto           numeric(10,2) not null,
  descuento       numeric(10,2) not null default 0,
  subtotal        numeric(10,2) not null,   -- gravado sin ISV
  isv             numeric(10,2) not null,
  total           numeric(10,2) not null,
  costo           numeric(10,2) not null default 0,
  metodo_pago     text not null check (metodo_pago in ('efectivo','tarjeta','transferencia')),
  monto_recibido  numeric(10,2),
  cambio          numeric(10,2),
  empleado        text,
  anulada         boolean not null default false,
  motivo_anulacion text,
  anulada_at      timestamptz
);
create index if not exists facturas_fecha_idx on facturas (fecha desc);
create index if not exists facturas_caja_idx on facturas (caja_id);
create index if not exists facturas_cliente_idx on facturas (cliente_id);

create table if not exists factura_items (
  id          bigint generated always as identity primary key,
  factura_id  bigint not null references facturas(id) on delete cascade,
  producto_id bigint references productos(id) on delete set null,
  nombre      text not null,
  categoria   text,
  mesero      text,
  cantidad    int not null,
  precio      numeric(10,2) not null,
  costo       numeric(10,2) not null default 0
);
create index if not exists factura_items_idx on factura_items (factura_id);
create index if not exists factura_items_prod_idx on factura_items (producto_id);

alter table ordenes add column if not exists factura_id bigint references facturas(id) on delete set null;
create index if not exists ordenes_factura_idx on ordenes (factura_id);

-- Cobrar una o varias órdenes y emitir factura/recibo con correlativo
create or replace function cobrar(payload jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare
  ids bigint[] := array(select jsonb_array_elements_text(payload->'orden_ids')::bigint);
  tipo_doc text := coalesce(payload->>'tipo','recibo');
  metodo text := coalesce(payload->>'metodo_pago','efectivo');
  aj jsonb;
  bruto numeric(10,2);
  costo_total numeric(10,2);
  desc_monto numeric(10,2) := greatest(0, coalesce((payload->>'descuento')::numeric, 0));
  total numeric(10,2);
  tasa numeric := 15;
  incl boolean := true;
  sub numeric(10,2);
  imp numeric(10,2);
  corr bigint;
  num text;
  caja bigint;
  recibido numeric(10,2) := nullif(payload->>'monto_recibido','')::numeric;
  fid bigint;
  cli bigint;
  ref text;
begin
  if coalesce(array_length(ids,1),0) = 0 then raise exception 'No hay órdenes para cobrar'; end if;

  -- Bloquea los correlativos para que dos cajas no saquen el mismo número
  perform 1 from ajustes where clave in ('siguiente_factura','siguiente_recibo') for update;
  select jsonb_object_agg(clave, valor) into aj from ajustes;
  tasa := coalesce(nullif(aj->>'isv_tasa','')::numeric, 15);
  incl := coalesce(aj->>'precios_incluyen_isv','si') = 'si';

  if exists (select 1 from ordenes where id = any(ids) and (factura_id is not null or estado = 'cancelada')) then
    raise exception 'Alguna de estas órdenes ya fue cobrada o cancelada';
  end if;

  select coalesce(sum(i.precio * i.cantidad),0), coalesce(sum(i.costo * i.cantidad),0)
    into bruto, costo_total
  from orden_items i where i.orden_id = any(ids);

  if bruto <= 0 then raise exception 'La cuenta está vacía'; end if;
  desc_monto := least(desc_monto, bruto);
  total := bruto - desc_monto;

  if incl then
    sub := round(total / (1 + tasa/100), 2);
    imp := total - sub;
  else
    sub := total;
    imp := round(total * tasa/100, 2);
    total := sub + imp;
  end if;

  if metodo = 'efectivo' and recibido is not null and recibido < total then
    raise exception 'El efectivo recibido es menor al total';
  end if;

  if tipo_doc = 'factura' then
    if coalesce(aj->>'cai','') = '' then raise exception 'Configura el CAI en Ajustes para emitir facturas'; end if;
    if coalesce(aj->>'fecha_limite','') <> '' and (aj->>'fecha_limite')::date < current_date then
      raise exception 'El CAI venció el %, solicita uno nuevo al SAR', aj->>'fecha_limite';
    end if;
    corr := (aj->>'siguiente_factura')::bigint;
    if coalesce(aj->>'rango_hasta','') <> '' and corr > (aj->>'rango_hasta')::bigint then
      raise exception 'Se terminó el rango autorizado de facturas';
    end if;
    num := coalesce(aj->>'prefijo_factura','') || lpad(corr::text, 8, '0');
    update ajustes set valor = (corr + 1)::text where clave = 'siguiente_factura';
  else
    corr := (aj->>'siguiente_recibo')::bigint;
    num := 'R-' || lpad(corr::text, 6, '0');
    update ajustes set valor = (corr + 1)::text where clave = 'siguiente_recibo';
  end if;

  select id into caja from caja_sesiones where cerrada_at is null order by id desc limit 1;
  select max(cliente_id) into cli from ordenes where id = any(ids);
  select string_agg(distinct case when tipo = 'mesa' then 'Mesa ' || mesa
                                  when es_delivery then 'Delivery: ' || coalesce(cliente,'Cliente')
                                  else 'Llevar: ' || coalesce(cliente,'Cliente') end, ', ')
    into ref from ordenes where id = any(ids);

  insert into facturas (tipo, numero, correlativo, cai, fecha_limite, rango, caja_id, cliente_id,
                        cliente_nombre, cliente_rtn, referencia, bruto, descuento, subtotal, isv, total, costo,
                        metodo_pago, monto_recibido, cambio, empleado)
  values (tipo_doc, num, corr,
          case when tipo_doc = 'factura' then aj->>'cai' end,
          case when tipo_doc = 'factura' then nullif(aj->>'fecha_limite','') end,
          case when tipo_doc = 'factura' and coalesce(aj->>'rango_desde','') <> '' and coalesce(aj->>'rango_hasta','') <> ''
               then coalesce(aj->>'prefijo_factura','') || lpad(aj->>'rango_desde', 8, '0') || ' al '
                 || coalesce(aj->>'prefijo_factura','') || lpad(aj->>'rango_hasta', 8, '0') end,
          caja, cli,
          coalesce(nullif(payload->>'cliente_nombre',''), 'Consumidor final'),
          nullif(payload->>'cliente_rtn',''),
          ref, bruto, desc_monto, sub, imp, total, costo_total, metodo,
          case when metodo = 'efectivo' then coalesce(recibido, total) else total end,
          case when metodo = 'efectivo' then coalesce(recibido, total) - total else 0 end,
          nullif(payload->>'empleado',''))
  returning id into fid;

  insert into factura_items (factura_id, producto_id, nombre, categoria, mesero, cantidad, precio, costo)
  select fid, i.producto_id, i.nombre, i.categoria, o.mesero, sum(i.cantidad), i.precio, i.costo
  from orden_items i join ordenes o on o.id = i.orden_id
  where i.orden_id = any(ids)
  group by i.producto_id, i.nombre, i.categoria, o.mesero, i.precio, i.costo;

  update ordenes set factura_id = fid where id = any(ids);

  return (select to_jsonb(f) from facturas f where id = fid);
end $$;
grant execute on function cobrar(jsonb) to anon, authenticated;

-- Anular: la venta deja de contar y las órdenes vuelven a quedar por cobrar
create or replace function anular_factura(p_id bigint, p_motivo text, p_empleado text) returns void
language plpgsql set search_path = public as $$
begin
  if coalesce(trim(p_motivo),'') = '' then raise exception 'Escribe el motivo de la anulación'; end if;
  update facturas set anulada = true, motivo_anulacion = p_motivo || ' (' || coalesce(p_empleado,'') || ')',
         anulada_at = now()
  where id = p_id and not anulada;
  update ordenes set factura_id = null where factura_id = p_id;
end $$;
grant execute on function anular_factura(bigint, text, text) to anon, authenticated;

-- Cerrar caja con arqueo
create or replace function resumen_caja(p_caja bigint) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'fondo', s.fondo_inicial,
    'ventas_efectivo', coalesce((select sum(total) from facturas where caja_id = s.id and not anulada and metodo_pago='efectivo'),0),
    'ventas_tarjeta', coalesce((select sum(total) from facturas where caja_id = s.id and not anulada and metodo_pago='tarjeta'),0),
    'ventas_transferencia', coalesce((select sum(total) from facturas where caja_id = s.id and not anulada and metodo_pago='transferencia'),0),
    'entradas', coalesce((select sum(monto) from movimientos_caja where caja_id = s.id and tipo='entrada'),0),
    'salidas', coalesce((select sum(monto) from movimientos_caja where caja_id = s.id and tipo='salida'),0),
    'documentos', (select count(*) from facturas where caja_id = s.id and not anulada),
    'anuladas', (select count(*) from facturas where caja_id = s.id and anulada)
  ) from caja_sesiones s where s.id = p_caja;
$$;
grant execute on function resumen_caja(bigint) to anon, authenticated;

create or replace function cerrar_caja(p_caja bigint, p_contado numeric, p_empleado text, p_notas text) returns jsonb
language plpgsql set search_path = public as $$
declare r jsonb; esperado numeric(10,2);
begin
  r := resumen_caja(p_caja);
  esperado := (r->>'fondo')::numeric + (r->>'ventas_efectivo')::numeric + (r->>'entradas')::numeric - (r->>'salidas')::numeric;
  update caja_sesiones set cerrada_at = now(), cerrada_por = p_empleado, efectivo_esperado = esperado,
    efectivo_contado = p_contado, diferencia = p_contado - esperado, notas = nullif(p_notas,'')
  where id = p_caja and cerrada_at is null;
  return r || jsonb_build_object('esperado', esperado, 'contado', p_contado, 'diferencia', p_contado - esperado);
end $$;
grant execute on function cerrar_caja(bigint, numeric, text, text) to anon, authenticated;

-- ---------- Gastos ----------
create table if not exists gastos (
  id          bigint generated always as identity primary key,
  fecha       date not null default current_date,
  categoria   text not null default 'Otros',
  descripcion text,
  monto       numeric(10,2) not null check (monto > 0),
  metodo_pago text not null default 'efectivo',
  empleado    text,
  created_at  timestamptz not null default now()
);
create index if not exists gastos_fecha_idx on gastos (fecha desc);

-- ---------- Seguridad (modo prueba) ----------
alter table clientes               enable row level security;
alter table insumos                enable row level security;
alter table recetas                enable row level security;
alter table movimientos_inventario enable row level security;
alter table caja_sesiones          enable row level security;
alter table movimientos_caja       enable row level security;
alter table facturas               enable row level security;
alter table factura_items          enable row level security;
alter table gastos                 enable row level security;

do $$
declare t text;
begin
  foreach t in array array['clientes','insumos','recetas','movimientos_inventario','caja_sesiones',
                           'movimientos_caja','facturas','factura_items','gastos'] loop
    execute format('create policy "acceso_prueba" on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Tiempo real
do $$
begin
  begin alter publication supabase_realtime add table facturas; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table productos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table caja_sesiones; exception when duplicate_object then null; end;
end $$;

-- ---------- Fotos de productos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "fotos_productos_leer"    on storage.objects for select to anon, authenticated using (bucket_id = 'productos');
create policy "fotos_productos_subir"   on storage.objects for insert to anon, authenticated with check (bucket_id = 'productos');
create policy "fotos_productos_cambiar" on storage.objects for update to anon, authenticated using (bucket_id = 'productos');

-- ---------- Insumos y recetas de ejemplo ----------
do $$
declare carne bigint; tort bigint; chich bigint; frij bigint; refr bigint; agua bigint;
begin
  if not exists (select 1 from insumos) then
    insert into insumos (nombre, unidad, stock, minimo, costo_unitario) values ('Carne de cerdo', 'lb', 40, 10, 55) returning id into carne;
    insert into insumos (nombre, unidad, stock, minimo, costo_unitario) values ('Tortillas', 'unidad', 300, 60, 1.5) returning id into tort;
    insert into insumos (nombre, unidad, stock, minimo, costo_unitario) values ('Chicharrón', 'lb', 10, 3, 60) returning id into chich;
    insert into insumos (nombre, unidad, stock, minimo, costo_unitario) values ('Frijoles', 'lb', 15, 5, 18) returning id into frij;
    insert into insumos (nombre, unidad, stock, minimo, costo_unitario) values ('Refresco lata', 'unidad', 48, 12, 14) returning id into refr;
    insert into insumos (nombre, unidad, stock, minimo, costo_unitario) values ('Agua botella', 'unidad', 36, 12, 8) returning id into agua;

    insert into recetas (producto_id, insumo_id, cantidad)
    select p.id, x.insumo, x.cant from productos p join (values
      ('Plato de carnitas', carne, 0.5), ('Plato de carnitas', tort, 4), ('Plato de carnitas', frij, 0.25),
      ('Plato mixto', carne, 0.4), ('Plato mixto', chich, 0.2), ('Plato mixto', tort, 4), ('Plato mixto', frij, 0.25),
      ('Libra de carnitas', carne, 1),
      ('Orden de tacos (3)', carne, 0.3), ('Orden de tacos (3)', tort, 3),
      ('Taco individual', carne, 0.1), ('Taco individual', tort, 1),
      ('Tortillas extra', tort, 5),
      ('Chicharrón', chich, 0.25),
      ('Frijoles', frij, 0.3),
      ('Refresco', refr, 1),
      ('Agua', agua, 1)
    ) as x(nombre, insumo, cant) on x.nombre = p.nombre
    on conflict do nothing;
  end if;
end $$;

update productos set descripcion = 'Carnitas doradas con frijoles, cebolla, cilantro y tortillas' where nombre = 'Plato de carnitas' and descripcion is null;
update productos set descripcion = 'Carnitas y chicharrón con frijoles y tortillas' where nombre = 'Plato mixto' and descripcion is null;

-- La orden de prueba del primer día no cuenta
update ordenes set estado = 'cancelada' where mesero = 'Prueba' and estado <> 'cancelada';
