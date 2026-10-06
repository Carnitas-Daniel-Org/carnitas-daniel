-- =========================================================
-- Carnitas Daniel · Sistema de pedidos
-- Esquema de base de datos (Supabase / Postgres)
-- Se puede correr completo en el SQL Editor de Supabase.
-- =========================================================

-- ---------- Tablas ----------

create table if not exists categorias (
  id         bigint generated always as identity primary key,
  nombre     text not null,
  orden      int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists productos (
  id           bigint generated always as identity primary key,
  categoria_id bigint references categorias(id) on delete set null,
  nombre       text not null,
  precio       numeric(10,2) not null default 0 check (precio >= 0),
  activo       boolean not null default true,
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists ordenes (
  id         bigint generated always as identity primary key,
  tipo       text not null default 'mesa' check (tipo in ('mesa','llevar')),
  mesa       text,
  cliente    text,
  mesero     text not null,
  nota       text,
  estado     text not null default 'pendiente'
             check (estado in ('pendiente','preparando','lista','entregada','cancelada')),
  total      numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orden_items (
  id          bigint generated always as identity primary key,
  orden_id    bigint not null references ordenes(id) on delete cascade,
  producto_id bigint references productos(id) on delete set null,
  nombre      text not null,          -- copia del nombre al momento de la venta
  precio      numeric(10,2) not null, -- copia del precio al momento de la venta
  cantidad    int not null check (cantidad > 0),
  nota        text
);

create table if not exists ajustes (
  clave text primary key,
  valor text not null
);

create index if not exists ordenes_created_idx on ordenes (created_at desc);
create index if not exists ordenes_estado_idx  on ordenes (estado);
create index if not exists items_orden_idx     on orden_items (orden_id);

-- ---------- updated_at automático ----------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ordenes_updated_at on ordenes;
create trigger ordenes_updated_at before update on ordenes
for each row execute function set_updated_at();

-- ---------- Crear orden completa en una sola llamada ----------
-- Recibe: { tipo, mesa, cliente, mesero, nota,
--           items: [{ producto_id, cantidad, nota }] }
-- El precio y el nombre se toman de la tabla productos (no del teléfono).

create or replace function crear_orden(payload jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  nueva_id bigint;
  it jsonb;
  p productos%rowtype;
  suma numeric(10,2) := 0;
begin
  if jsonb_array_length(coalesce(payload->'items','[]'::jsonb)) = 0 then
    raise exception 'La orden no tiene productos';
  end if;

  insert into ordenes (tipo, mesa, cliente, mesero, nota)
  values (
    coalesce(payload->>'tipo','mesa'),
    nullif(payload->>'mesa',''),
    nullif(payload->>'cliente',''),
    coalesce(nullif(payload->>'mesero',''),'Mesero'),
    nullif(payload->>'nota','')
  )
  returning id into nueva_id;

  for it in select * from jsonb_array_elements(payload->'items') loop
    select * into p from productos where id = (it->>'producto_id')::bigint;
    if not found then
      raise exception 'Producto % no existe', it->>'producto_id';
    end if;
    insert into orden_items (orden_id, producto_id, nombre, precio, cantidad, nota)
    values (nueva_id, p.id, p.nombre, p.precio,
            greatest(1,(it->>'cantidad')::int), nullif(it->>'nota',''));
    suma := suma + p.precio * greatest(1,(it->>'cantidad')::int);
  end loop;

  update ordenes set total = suma where id = nueva_id;
  return nueva_id;
end $$;

-- ---------- Seguridad (modo prueba) ----------
-- Para la fase de prueba, la app usa la llave pública (anon) y un PIN en la app.
-- Antes de usarlo en serio con dinero real, cambiar a usuarios con Supabase Auth.

alter table categorias  enable row level security;
alter table productos   enable row level security;
alter table ordenes     enable row level security;
alter table orden_items enable row level security;
alter table ajustes     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categorias','productos','ordenes','orden_items','ajustes'] loop
    execute format('drop policy if exists "acceso_prueba" on %I', t);
    execute format('create policy "acceso_prueba" on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant execute on function crear_orden(jsonb) to anon, authenticated;

-- ---------- Tiempo real (para que cocina reciba las órdenes al instante) ----------

do $$
begin
  begin
    alter publication supabase_realtime add table ordenes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table orden_items;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------- Datos de ejemplo (editar desde la pantalla Admin) ----------

insert into ajustes (clave, valor) values
  ('nombre_negocio', 'Carnitas Daniel'),
  ('num_mesas', '10')
on conflict (clave) do nothing;

do $$
declare c_platos bigint; c_tacos bigint; c_extras bigint; c_bebidas bigint;
begin
  if not exists (select 1 from categorias) then
    insert into categorias (nombre, orden) values ('Platos', 1) returning id into c_platos;
    insert into categorias (nombre, orden) values ('Tacos', 2)  returning id into c_tacos;
    insert into categorias (nombre, orden) values ('Extras', 3) returning id into c_extras;
    insert into categorias (nombre, orden) values ('Bebidas', 4) returning id into c_bebidas;

    insert into productos (categoria_id, nombre, precio, orden) values
      (c_platos,  'Plato de carnitas',         150, 1),
      (c_platos,  'Plato mixto',               180, 2),
      (c_platos,  'Libra de carnitas',         220, 3),
      (c_tacos,   'Orden de tacos (3)',         90, 1),
      (c_tacos,   'Taco individual',            35, 2),
      (c_extras,  'Tortillas extra',            15, 1),
      (c_extras,  'Chicharrón',                 40, 2),
      (c_extras,  'Frijoles',                   25, 3),
      (c_bebidas, 'Refresco',                   30, 1),
      (c_bebidas, 'Agua',                       20, 2),
      (c_bebidas, 'Fresco natural',             35, 3);
  end if;
end $$;
