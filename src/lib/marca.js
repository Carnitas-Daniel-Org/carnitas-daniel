// Marca del sistema (independiente del negocio que lo usa)
export const MARCA = {
  nombre: 'Peltre',
  lema: 'Sistema para negocios de comida',
  logo: '/marca/logo.svg',
  logoClaro: '/marca/logo-claro.svg',
}

// Ilustraciones incluidas, para elegir sin tomar foto
export const ILUSTRACIONES = [
  ['plato-carnitas', 'Plato de carnitas'], ['plato-mixto', 'Plato mixto'], ['libra-carnitas', 'Libra de carnitas'],
  ['carnitas-tajadas', 'Carnitas con tajadas'], ['tacos-orden', 'Orden de tacos'], ['taco', 'Taco'],
  ['alitas-bbq', 'Alitas BBQ'], ['alitas-bufalo', 'Alitas búfalo'], ['alitas-12', 'Alitas, porción grande'],
  ['alitas-papas', 'Alitas con papas'], ['tortillas', 'Tortillas'], ['chicharron', 'Chicharrón'], ['frijoles', 'Frijoles'],
  ['papas', 'Papas fritas'], ['tajadas', 'Tajadas'], ['chimol', 'Chimol'], ['aguacate', 'Aguacate'],
  ['fresco-maracuya', 'Maracuyá'], ['fresco-tamarindo', 'Tamarindo'], ['fresco-nance', 'Nance'], ['fresco-pozol', 'Pozol'],
  ['fresco-limon', 'Limón'], ['fresco-jamaica', 'Jamaica'], ['fresco-horchata', 'Horchata'], ['fresco-pina', 'Piña'],
  ['fresco-mora', 'Mora'], ['gaseosa-cola', 'Cola'], ['gaseosa-ginger', 'Ginger ale'], ['gaseosa-banana', 'Banana'],
  ['gaseosa-uva', 'Uva'], ['gaseosa-naranja', 'Naranja'], ['agua', 'Agua'], ['generico', 'Genérico'],
].map(([archivo, nombre]) => ({ url: `/ilustraciones/${archivo}.svg`, nombre }))

export const ILUSTRACION_GENERICA = '/ilustraciones/generico.svg'
