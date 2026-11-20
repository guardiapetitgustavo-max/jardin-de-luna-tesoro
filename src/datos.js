// Textos y números de la aventura. Cambia aquí los mensajes sin tocar el resto del juego.
export const DESTINATARIA = 'Kimberly';
export const TITULO = 'El jardín de luna';
export const LUCIERNAGAS_NECESARIAS = 7;

export const PISTAS = [
  { titulo: 'Las tres puertas', texto: 'Cuando todo oscurezca, cruza la puerta que brilla como el sol.' },
  { titulo: 'El estanque', texto: 'La luna dejó escalones en el agua. Salta sobre ellos para seguir su reflejo.' },
  { titulo: 'Las luciérnagas', texto: 'Reúne siete luces del bosque. Ellas abren el camino al mirador, donde la luna guarda seis planes para dos.' },
];

export const BIENVENIDA = `Hice este jardín para ti. Lee las tres pistas, cruza el estanque y sigue a las luciérnagas para descubrir lo que dejé en el mirador.`;

export const CONTROLES = [
  ['W A S D / flechas', 'Caminar'],
  ['Shift', 'Correr'],
  ['Espacio', 'Saltar'],
  ['E', 'Leer, abrir'],
  ['Ratón', 'Mirar (haz clic en el jardín)'],
  ['Esc', 'Pausa'],
];
export const CONTROLES_TACTILES = [
  ['Círculo izquierdo', 'Caminar'],
  ['Arrastrar a la derecha', 'Mirar'],
  ['⤒', 'Saltar'],
  ['Botón central', 'Leer, abrir'],
];

export const CUPONES = [
  ['Helado para dos', 'Tú eliges el sabor'],
  ['Noche de cine', 'Tú eliges la película'],
  ['Postre sorpresa', 'Yo lo preparo'],
  ['Noche de juegos', 'Tú eliges qué jugamos'],
  ['Paseo juntos', 'Tú eliges el lugar'],
  ['Comodín', 'Un plan a tu elección'],
];

/** Zonas según la posición X (metros) del recorrido. */
export const ZONAS = [
  [11, 'La entrada'],
  [22, 'Las tres puertas'],
  [37, 'El estanque'],
  [51, 'El bosque de luciérnagas'],
  [Infinity, 'El mirador'],
];
