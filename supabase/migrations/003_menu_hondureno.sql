-- =========================================================
-- Peltre v3: menú hondureño con ilustraciones, entrada sin PIN (modo prueba)
-- =========================================================

-- Entrar sin PIN mientras se prueba (se activa en Ajustes → Empleados)
insert into ajustes (clave, valor) values ('pedir_pin', 'no') on conflict (clave) do nothing;

create or replace function guardar_empleado(p_auth_id bigint, p_auth_pin text, p jsonb)
returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare nuevo bigint; sin_pin boolean;
begin
  select coalesce((select valor from ajustes where clave = 'pedir_pin'), 'si') = 'no' into sin_pin;
  if not sin_pin and not exists (select 1 from empleados where id = p_auth_id and rol = 'dueno' and activo
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
    insert into empleados (nombre, rol, pin_hash)
    values (p->>'nombre', p->>'rol', crypt(coalesce(nullif(p->>'pin',''), '0000'), gen_salt('bf')))
    returning id into nuevo;
  end if;
  return nuevo;
end $$;

-- ---------- Categorías ----------
update categorias set nombre = 'Gaseosas y agua' where nombre = 'Bebidas';
insert into categorias (nombre, orden)
select v.nombre, 0 from (values ('Alitas'), ('Frescos naturales')) v(nombre)
where not exists (select 1 from categorias c where c.nombre = v.nombre);
update categorias set orden = case nombre
  when 'Platos' then 1 when 'Alitas' then 2 when 'Tacos' then 3 when 'Extras' then 4
  when 'Frescos naturales' then 5 when 'Gaseosas y agua' then 6 else orden end;

-- ---------- Productos existentes: nombre e ilustración ----------
update productos set nombre = 'Coca-Cola', descripcion = '12 oz' where nombre = 'Refresco';
update productos set nombre = 'Fresco de maracuyá', descripcion = 'Natural, botella 500 ml',
  categoria_id = (select id from categorias where nombre = 'Frescos naturales') where nombre = 'Fresco natural';
update productos set descripcion = 'Botella 600 ml' where nombre = 'Agua' and descripcion is null;

-- ---------- Productos nuevos ----------
insert into productos (categoria_id, nombre, descripcion, precio, orden)
select (select id from categorias where nombre = v.cat), v.nombre, v.descr, v.precio, v.orden
from (values
  ('Platos', 'Carnitas con tajadas', 'Carnitas sobre tajadas con repollo y chimol', 165, 4),
  ('Alitas', 'Alitas BBQ (6)', 'Seis alitas en salsa BBQ con aderezo', 150, 1),
  ('Alitas', 'Alitas búfalo (6)', 'Seis alitas picantes con apio y aderezo', 150, 2),
  ('Alitas', 'Alitas BBQ (12)', 'Doce alitas en salsa BBQ', 280, 3),
  ('Alitas', 'Combo alitas con papas', 'Cinco alitas, papas fritas y aderezo', 185, 4),
  ('Extras', 'Papas fritas', null, 45, 4),
  ('Extras', 'Tajadas', null, 35, 5),
  ('Extras', 'Chimol', null, 15, 6),
  ('Extras', 'Aguacate', 'Media unidad', 25, 7),
  ('Frescos naturales', 'Fresco de tamarindo', 'Natural, botella 500 ml', 35, 2),
  ('Frescos naturales', 'Fresco de nance', 'Natural, botella 500 ml', 35, 3),
  ('Frescos naturales', 'Pozol', 'Natural, botella 500 ml', 35, 4),
  ('Frescos naturales', 'Fresco de limón', 'Natural, botella 500 ml', 35, 5),
  ('Frescos naturales', 'Fresco de jamaica', 'Natural, botella 500 ml', 35, 6),
  ('Frescos naturales', 'Horchata', 'Natural, botella 500 ml', 35, 7),
  ('Frescos naturales', 'Fresco de piña', 'Natural, botella 500 ml', 35, 8),
  ('Frescos naturales', 'Fresco de mora', 'Natural, botella 500 ml', 35, 9),
  ('Gaseosas y agua', 'Canada Dry', '12 oz', 30, 2),
  ('Gaseosas y agua', 'Banana', '12 oz', 30, 3),
  ('Gaseosas y agua', 'Uva', '12 oz', 30, 4),
  ('Gaseosas y agua', 'Naranja', '12 oz', 30, 5)
) v(cat, nombre, descr, precio, orden)
where not exists (select 1 from productos p where p.nombre = v.nombre);

update productos set orden = 1 where nombre = 'Coca-Cola';
update productos set orden = 1 where nombre = 'Fresco de maracuyá';
update productos set orden = 9 where nombre = 'Agua';

-- Ilustraciones (solo si el producto aún no tiene foto)
update productos p set imagen_url = '/ilustraciones/' || v.img || '.svg'
from (values
  ('Plato de carnitas', 'plato-carnitas'), ('Plato mixto', 'plato-mixto'), ('Libra de carnitas', 'libra-carnitas'),
  ('Carnitas con tajadas', 'carnitas-tajadas'), ('Orden de tacos (3)', 'tacos-orden'), ('Taco individual', 'taco'),
  ('Alitas BBQ (6)', 'alitas-bbq'), ('Alitas búfalo (6)', 'alitas-bufalo'), ('Alitas BBQ (12)', 'alitas-12'),
  ('Combo alitas con papas', 'alitas-papas'), ('Tortillas extra', 'tortillas'), ('Chicharrón', 'chicharron'),
  ('Frijoles', 'frijoles'), ('Papas fritas', 'papas'), ('Tajadas', 'tajadas'), ('Chimol', 'chimol'), ('Aguacate', 'aguacate'),
  ('Fresco de maracuyá', 'fresco-maracuya'), ('Fresco de tamarindo', 'fresco-tamarindo'), ('Fresco de nance', 'fresco-nance'),
  ('Pozol', 'fresco-pozol'), ('Fresco de limón', 'fresco-limon'), ('Fresco de jamaica', 'fresco-jamaica'),
  ('Horchata', 'fresco-horchata'), ('Fresco de piña', 'fresco-pina'), ('Fresco de mora', 'fresco-mora'),
  ('Coca-Cola', 'gaseosa-cola'), ('Canada Dry', 'gaseosa-ginger'), ('Banana', 'gaseosa-banana'), ('Uva', 'gaseosa-uva'),
  ('Naranja', 'gaseosa-naranja'), ('Agua', 'agua')
) v(nombre, img)
where p.nombre = v.nombre and p.imagen_url is null;

update productos set costo = 4 where nombre = 'Chimol' and costo = 0;

-- ---------- Insumos y recetas ----------
update insumos set nombre = 'Gaseosa 12 oz' where nombre = 'Refresco lata';
insert into insumos (nombre, unidad, stock, minimo, costo_unitario)
select * from (values
  ('Alitas de pollo', 'unidad', 120::numeric, 30::numeric, 9::numeric),
  ('Papas', 'lb', 25, 8, 14),
  ('Plátano verde', 'unidad', 40, 10, 5),
  ('Aguacate', 'unidad', 15, 5, 12),
  ('Fresco natural 500 ml', 'unidad', 40, 12, 14)
) v(nombre, unidad, stock, minimo, costo)
where not exists (select 1 from insumos i where i.nombre = v.nombre);

insert into recetas (producto_id, insumo_id, cantidad)
select p.id, i.id, v.cant
from (values
  ('Carnitas con tajadas', 'Carne de cerdo', 0.4), ('Carnitas con tajadas', 'Plátano verde', 1),
  ('Alitas BBQ (6)', 'Alitas de pollo', 6), ('Alitas búfalo (6)', 'Alitas de pollo', 6),
  ('Alitas BBQ (12)', 'Alitas de pollo', 12),
  ('Combo alitas con papas', 'Alitas de pollo', 5), ('Combo alitas con papas', 'Papas', 0.4),
  ('Papas fritas', 'Papas', 0.5), ('Tajadas', 'Plátano verde', 1), ('Aguacate', 'Aguacate', 0.5),
  ('Fresco de maracuyá', 'Fresco natural 500 ml', 1), ('Fresco de tamarindo', 'Fresco natural 500 ml', 1),
  ('Fresco de nance', 'Fresco natural 500 ml', 1), ('Pozol', 'Fresco natural 500 ml', 1),
  ('Fresco de limón', 'Fresco natural 500 ml', 1), ('Fresco de jamaica', 'Fresco natural 500 ml', 1),
  ('Horchata', 'Fresco natural 500 ml', 1), ('Fresco de piña', 'Fresco natural 500 ml', 1),
  ('Fresco de mora', 'Fresco natural 500 ml', 1),
  ('Canada Dry', 'Gaseosa 12 oz', 1), ('Banana', 'Gaseosa 12 oz', 1), ('Uva', 'Gaseosa 12 oz', 1), ('Naranja', 'Gaseosa 12 oz', 1)
) v(prod, ins, cant)
join productos p on p.nombre = v.prod
join insumos i on i.nombre = v.ins
on conflict do nothing;
