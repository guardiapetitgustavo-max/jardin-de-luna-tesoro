// Textos y números de la aventura. Cambia aquí los mensajes sin tocar el resto del juego.
export const DESTINATARIA = 'Kimberly';
export const AUTOR = 'Gustavo';
export const TITULO = 'El jardín de luna';
export const LUCIERNAGAS_NECESARIAS = 7;

export const ROSAS_NECESARIAS = 3;
export const ORDEN_FAROLES = ['menta', 'sol', 'rosa', 'lila'];

export const PISTAS = [
  { titulo: 'Las tres puertas', texto: 'Cuando todo oscurezca, cruza la puerta que brilla como el sol.' },
  { titulo: 'El estanque', texto: 'La luna dejó escalones en el agua. Salta sobre ellos, pero no te quedes quieta en los nenúfares grandes: se hunden.' },
  { titulo: 'El laberinto de rosas', texto: 'Tres rosas de luz se esconden en los rincones del laberinto. Llévalas a la reja del otro lado y se abrirá.' },
  { titulo: 'Los cuatro faroles', texto: 'Pisa las losas para encender los faroles: primero el color del mar en calma, luego el del sol, después el de las rosas y al final el de la noche. Así aparecerá el puente.' },
  { titulo: 'El río de las linternas', texto: 'Las balsas van y vienen con la corriente. Espera a que se acerquen y salta: el río no tiene prisa.' },
  { titulo: 'Las campanas de viento', texto: 'Toca las campanas como sube la luna: de la más grande a la más pequeña. Si olvidas la canción, la piedra del centro te la canta.' },
  { titulo: 'Las estatuas', texto: 'Las tres estatuas perdieron de vista a la luna. Gíralas hasta que las tres la miren y sus linternas se enciendan.' },
];

/** Niveles según la posición X (metros) del recorrido. */
export const NIVELES = [
  { desde: -99, numero: 1, nombre: 'La entrada y las tres puertas' },
  { desde: 22, numero: 2, nombre: 'El estanque de la luna' },
  { desde: 39, numero: 3, nombre: 'El laberinto de rosas' },
  { desde: 70.5, numero: 4, nombre: 'Los cuatro faroles' },
  { desde: 92, numero: 5, nombre: 'El bosque de luciérnagas' },
  { desde: 110.5, numero: 6, nombre: 'El río de las linternas' },
  { desde: 126, numero: 7, nombre: 'Las campanas de viento' },
  { desde: 143, numero: 8, nombre: 'El jardín de las estatuas' },
  { desde: 158.2, numero: 9, nombre: 'El invernadero de mariposas' },
  { desde: 174.8, numero: 10, nombre: 'La escalera de estrellas' },
  { desde: 190.7, numero: 11, nombre: 'El mirador', final: true },
];
export const MARIPOSAS_NECESARIAS = 5;

// Un recuerdo escondido en cada nivel. Se ven todos juntos al abrir el cofre.
export const RECUERDOS = [
  { nombre: 'Pluma de búho', icono: '🪶', texto: 'Del búho que te cuidó desde la entrada.' },
  { nombre: 'Perla del estanque', icono: '🦪', texto: 'La luna la dejó sobre una piedra.' },
  { nombre: 'Rosa de luz', icono: '🌹', texto: 'La cuarta rosa, la que nadie encuentra.' },
  { nombre: 'Llave de farol', icono: '🗝️', texto: 'Abre cualquier noche oscura.' },
  { nombre: 'Frasco de luz', icono: '✨', texto: 'Luz de luciérnaga para los días grises.' },
  { nombre: 'Linterna de papel', icono: '🏮', texto: 'Para pedir un deseo junto al río.' },
  { nombre: 'Campanita', icono: '🔔', texto: 'Suena cuando alguien piensa en ti.' },
  { nombre: 'Moneda de luna', icono: '🌕', texto: 'Para pagar una sonrisa.' },
  { nombre: 'Ala de mariposa', icono: '🦋', texto: 'Para que nunca te falte vuelo.' },
  { nombre: 'Polvo de estrellas', icono: '⭐', texto: 'El último escalón antes del cielo.' },
];
export const nivelEn = (x) => [...NIVELES].reverse().find((n) => x >= n.desde);

export const BIENVENIDA = `Hice este jardín para ti. Son diez niveles: puertas, un estanque, un laberinto, faroles, luciérnagas, un río, campanas, estatuas, un invernadero de mariposas y una escalera de estrellas. En cada nivel hay un recuerdo escondido que brilla; guárdalos todos. Al final, en el mirador, te espera un cofre.`;

export const CONTROLES = [
  ['W A S D / flechas', 'Caminar'],
  ['Shift', 'Correr'],
  ['Espacio', 'Saltar'],
  ['E', 'Leer, abrir'],
  ['Ratón', 'Mirar (haz clic en el jardín)'],
  ['F', 'Modo foto'],
  ['Esc', 'Pausa'],
];
export const CONTROLES_TACTILES = [
  ['Círculo izquierdo', 'Caminar'],
  ['Arrastrar a la derecha', 'Mirar'],
  ['⤒', 'Saltar'],
  ['Botón central', 'Leer, abrir'],
];

// Carta del final (se escribe letra por letra). Cámbiala por tus propias palabras.
export const CARTA = [
  'Kimberly:',
  'Si estás leyendo esto, cruzaste puertas, piedras, un laberinto, un barranco, un río y una escalera de estrellas solo para llegar hasta aquí.',
  'Este jardín lo hice pensando en ti: en lo bonito que es compartir una noche tranquila, una risa o un paseo sin prisa.',
  'Dentro del cofre están los recuerdos que fuiste juntando y diez planes para los dos, uno por cada nivel. Elige el que quieras primero, que yo me encargo del resto.',
  'Gracias por jugar hasta el final.',
];
export const FIRMA = 'Con cariño, Gustavo';

export const CUPONES = [
  ['Helado para dos', 'Tú eliges el sabor'],
  ['Noche de cine', 'Tú eliges la película'],
  ['Postre sorpresa', 'Yo lo preparo'],
  ['Noche de juegos', 'Tú eliges qué jugamos'],
  ['Paseo juntos', 'Tú eliges el lugar'],
  ['Desayuno sorpresa', 'Yo lo llevo'],
  ['Picnic bajo las estrellas', 'Yo llevo la manta'],
  ['Una canción para ti', 'Tú eliges cuál'],
  ['Día de fotos', 'Tú eres la protagonista'],
  ['Comodín', 'Un plan a tu elección'],
];
