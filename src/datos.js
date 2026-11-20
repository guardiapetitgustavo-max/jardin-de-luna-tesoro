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
];

/** Niveles según la posición X (metros) del recorrido. */
export const NIVELES = [
  { desde: -99, numero: 1, nombre: 'La entrada y las tres puertas' },
  { desde: 22, numero: 2, nombre: 'El estanque de la luna' },
  { desde: 39, numero: 3, nombre: 'El laberinto de rosas' },
  { desde: 70.5, numero: 4, nombre: 'Los cuatro faroles' },
  { desde: 92, numero: 5, nombre: 'El bosque de luciérnagas' },
  { desde: 110.5, numero: 6, nombre: 'El mirador', final: true },
];
export const nivelEn = (x) => [...NIVELES].reverse().find((n) => x >= n.desde);

export const BIENVENIDA = `Hice este jardín para ti. Son cinco niveles: lee las pistas, cruza el estanque, encuentra las rosas del laberinto, enciende los faroles en orden y sigue a las luciérnagas hasta el mirador. Allí te espera algo.`;

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

