// Construye el jardín completo: diez niveles y el mirador final.
// Ejes: +X es hacia adelante en el recorrido, +Y arriba, Z a los lados. Unidades en metros.
//
//  Nivel 1   x   0–22   La entrada y las tres puertas
//  Nivel 2   x  22–38   El estanque (piedras que se mueven y nenúfares que se hunden)
//  Nivel 3   x  38–70   El laberinto de rosas (tres rosas abren la reja)
//  Nivel 4   x  70–92   Los cuatro faroles (acertijo de orden) y el puente sobre el barranco
//  Nivel 5   x  92–110  El bosque de luciérnagas (siete luces abren la cortina)
//  Nivel 6   x 110–126  El río de las linternas (balsas que van y vienen)
//  Nivel 7   x 126–143  Las campanas de viento (tocarlas de la más grande a la más pequeña)
//  Nivel 8   x 143–158  El jardín de las estatuas (girarlas hasta que miren a la luna)
//  Nivel 9   x 158–175  El invernadero de mariposas (cinco mariposas abren la puerta)
//  Nivel 10  x 175–191  La escalera de estrellas (subir hasta la meseta)
//  Final     x 191–204  El mirador y el cofre, en lo alto de la meseta
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { construirNiveles2 } from './niveles2.js';

export const NIVEL_AGUA = -0.35;
export const LIMITE = { xMin: -3, xMax: 204, z: 9 };
export const DIR_LUNA = new THREE.Vector3(0.85, 0.36, 0.42).normalize();

// ------------------------------------------------------------------ Diseño del recorrido
const LAB = { x0: 41, z0: -8, columnas: 14, filas: 8, celda: 2, filaEntrada: 3, filaSalida: 4 };
export const DISENO = {
  inicio: { x: 0.5, z: 0, giro: 0 },
  arco: 5,
  atriles: [{ x: 8, z: -2.4 }, { x: 20, z: 2.5 }, { x: 38.4, z: -2.6 }, { x: 72.6, z: -2.5 }, { x: 111.8, z: -2.7 }, { x: 129.4, z: 2.8 }, { x: 145.6, z: -2.4 }],
  puertas: { x: 15, lugares: [{ z: -5.5, color: 0x55d6b4, nombre: 'menta' }, { z: 0, color: 0xe57aa6, nombre: 'rosa' }, { z: 5.5, color: 0xf2b252, nombre: 'sol', correcta: true }] },
  // [x, z, desplazamiento lateral (piedra móvil), tipo] — tipo 'n' = nenúfar que se hunde
  piedras: [[23.3, 0], [24.7, 0.35], [26.1, -0.3, 0, 'n'], [27.5, 0.3, 0.55], [28.9, -0.3], [30.3, 0.3], [31.7, -0.2, 0, 'n'], [33.1, 0.2, 0.5], [34.5, -0.2], [35.9, 0]],
  laberinto: LAB,
  plaza: { x: 78, z: 0 },
  // placas del acertijo: color y posición (rombo alrededor de la fuente)
  placas: [
    { nombre: 'rosa', color: 0xf07aae, x: 75.2, z: 0 },
    { nombre: 'menta', color: 0x55d6b4, x: 78, z: -2.9 },
    { nombre: 'lila', color: 0xa98cf0, x: 80.8, z: 0 },
    { nombre: 'sol', color: 0xf2b252, x: 78, z: 2.9 },
  ],
  barranco: { x0: 84.5, x1: 91, centro: 87.75 },
  // plataformas del puente: [x, z, mov. lateral, mov. vertical]
  puente: [[85.6, 0, 0, 0], [87.4, 0, 0.7, 0], [89.3, 0, 0, 0.3], [90.6, 0, 0, 0]],
  luciernagas: [[94.5, -4.2, 1.1], [96.4, 3.6, 1.4], [98.2, -6.4, 1.0], [100.3, 6.2, 1.3], [102.4, -1.8, 1.6], [104.6, 5.1, 0.9], [106.8, -5.6, 1.2]],
  barrera: 109.4,
  // ---- niveles 6 a 10
  rio: { x: 119 },
  // balsas con linterna: [x, z, cuánto van y vienen de lado]
  balsas: [[116.5, 0, 0], [118.4, 0, 1.4], [120.3, 0, -1.4], [122.1, 0, 0]],
  campanas: {
    piedra: { x: 135.5, z: 0 },
    // tam: tamaño de la campana (la más grande suena más grave)
    lista: [{ x: 132.6, z: -3.1, tam: 0.8 }, { x: 134.6, z: 3.2, tam: 1.0 }, { x: 136.6, z: -3.2, tam: 0.55 }, { x: 138.4, z: 3.0, tam: 0.68 }],
    puerta: 142.2,
  },
  // estatuas: [x, z, cuartos de vuelta que les faltan para mirar a la luna]
  estatuas: { lista: [[147, -3.3, 1], [150.5, 3.3, 2], [154, -3.3, 3]], puerta: 157.4 },
  invernadero: { x0: 160, x1: 172, z: 5.2, alto: 3.4, cumbre: 4.9, puerta: 173.6 },
  mariposas: [[162.4, -2.1, 1.5], [164.6, 2.3, 1.2], [166.8, -1.4, 1.9], [168.9, 1.9, 1.4], [170.7, -0.7, 1.7]],
  // escalera de estrellas: [x, z, altura de la estrella]
  escalera: [[178.8, 0.3, 0.6], [181.1, -0.6, 1.2], [183.4, 0.5, 1.8], [185.6, -0.5, 2.4], [187.7, 0.4, 3.0], [189.6, 0, 3.6]],
  meseta: { x: 190.6, alto: 4.2 },
  mirador: { x: 197.5, z: 0 },
  // un recuerdo escondido en cada nivel (se ven en el cofre al final)
  recuerdos: [
    { id: 0, tipo: 'pluma', x: 3.2, z: -3.6 },
    { id: 1, tipo: 'perla', x: 30.3, z: 0.3, sobrePiedra: true },
    { id: 2, tipo: 'rosa', laberinto: true },
    { id: 3, tipo: 'llave', x: 78, z: -4.4 },
    { id: 4, tipo: 'frasco', x: 101.2, z: 4.6 },
    { id: 5, tipo: 'linterna', x: 124.2, z: -3.4 },
    { id: 6, tipo: 'campanita', x: 140.6, z: 3.4 },
    { id: 7, tipo: 'moneda', x: 155.6, z: 3.2 },
    { id: 8, tipo: 'ala', x: 166, z: -2.2 },
    { id: 9, tipo: 'estrellas', x: 189.6, z: 0, alto: 3.6 },
  ],
  faroles: [2.5, 8.6, 12.4, 18.6, 21.4, 37.4, 71.3, 83.4, 92.3, 96.8, 101.2, 105.6, 108.6, 113.3, 124.6, 127.6, 141.4, 144.2, 157.0, 176.2],
  controles: {
    puertas: 10.5, estanqueAntes: 21.2, estanqueDespues: 37.2, laberintoSalida: 70.6, barrancoAntes: 83.2, barrancoDespues: 92,
    rioAntes: 113.8, rioDespues: 123.6, campanas: 127.2, estatuas: 143.4, invernadero: 158.4, escalera: 176.6, mirador: 191.4,
  },
};
// zonas donde no se ponen árboles ni arbustos (para que no tapen los niveles): [x0, x1, |z| máximo]
const ZONAS_LIBRES = [[113.5, 125, 14], [128, 141.5, 6.5], [144, 156.5, 6.2], [158.5, 173.8, 7.2], [176, 192, 4], [190, 206, 7.5]];
const enZonaLibre = (x, z) => ZONAS_LIBRES.some(([a, b, m]) => x > a && x < b && Math.abs(z) < m);

// ------------------------------------------------------------------ Terreno
const suave = (t) => t * t * (3 - 2 * t);
const paso = (a, b, x) => suave(Math.min(1, Math.max(0, (x - a) / (b - a))));
function anchoValle(x) {
  return 5.5 + 4.4 * (paso(36.5, 40.5, x) - paso(69.5, 72, x)) + 3 * (paso(70, 73, x) - paso(83, 85, x));
}
export function alturaTerreno(x, z) {
  const az = Math.abs(z);
  const lado = Math.max(0, az - anchoValle(x));
  let h = Math.pow(Math.min(lado, 12), 1.35) * 0.09 * (1 + 0.35 * Math.sin(x * 0.31) * Math.cos(z * 0.23));
  h += 0.12 * Math.sin(x * 0.9 + z * 0.6) * Math.min(1, lado / 2);
  h += Math.pow(Math.max(0, az - 14), 1.45) * 0.08 * (0.8 + 0.2 * Math.sin(x * 0.07 + z * 0.05));
  h += Math.pow(Math.max(0, -5 - x), 1.4) * 0.12 + Math.pow(Math.max(0, x - 206), 1.4) * 0.14;
  // río de las linternas: un cauce que cruza todo el valle
  const enRio = 1 - paso(3.2, 4.0, Math.abs(x - DISENO.rio.x));
  h -= 1.6 * enRio;
  // meseta del mirador con un acantilado que solo se sube por la escalera de estrellas
  h += DISENO.meseta.alto * paso(189.9, 190.6, x);
  const dx = Math.max(0, Math.abs(x - 29.6) - 5.6), dz = Math.max(0, az - 9.5);
  const hondo = Math.max(0, 1 - Math.hypot(dx, dz) / 2.2);
  h -= 0.95 * suave(hondo);
  const dr = Math.abs(x - DISENO.barranco.centro);
  const corte = 1 - paso(2.6, 3.3, dr);
  h -= 5.5 * corte + 0.25 * Math.sin(z * 1.7 + x) * corte;
  h += 0.035 * Math.sin(x * 0.55) * Math.cos(z * 0.7) * (1 - hondo) * (1 - corte);
  return h;
}
const enLaberinto = (x, z) => x > LAB.x0 - 0.5 && x < LAB.x0 + LAB.columnas * LAB.celda + 0.5 && Math.abs(z) < 8.6;

const SENDERO = [
  [-4, 0, 11, 0], [11, 0, 15, -5.5], [11, 0, 15, 0], [11, 0, 15, 5.5],
  [15, -5.5, 19, 0], [15, 0, 19, 0], [15, 5.5, 19, 0], [19, 0, 22.6, 0],
  [36.4, 0, 41, -1], [69, 1, 84.4, 0], [91.2, 0, 115.2, 0], [122.8, 0, 177.5, 0], [190.6, 0, 193, 0],
];
export function distSendero(x, z) {
  let m = Infinity;
  for (const [ax, az, bx, bz] of SENDERO) {
    const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    m = Math.min(m, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  const dm = Math.hypot(x - DISENO.mirador.x, z - DISENO.mirador.z) - 5.2;
  const dp = Math.hypot(x - DISENO.plaza.x, z - DISENO.plaza.z) - 4.6;
  return Math.min(m, Math.max(0, dm), Math.max(0, dp), enLaberinto(x, z) ? 0 : Infinity);
}

function azar(semilla) {
  let a = semilla >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const lineal = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

// ------------------------------------------------------------------ Laberinto (generado siempre igual)
function generarLaberinto() {
  const { columnas: C, filas: R } = LAB, r = azar(1234);
  const id = (i, j) => j * C + i, abierto = new Set(), clave = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
  const visto = new Array(C * R).fill(false), pila = [[0, LAB.filaEntrada]];
  visto[id(0, LAB.filaEntrada)] = true;
  while (pila.length) {
    const [i, j] = pila[pila.length - 1];
    const vec = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [i + a, j + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < C && b < R && !visto[id(a, b)]);
    if (!vec.length) { pila.pop(); continue; }
    const [a, b] = vec[Math.floor(r() * vec.length)];
    abierto.add(clave(id(i, j), id(a, b))); visto[id(a, b)] = true; pila.push([a, b]);
  }
  for (let n = 0; n < 4; n++) {
    const i = 1 + Math.floor(r() * (C - 2)), j = Math.floor(r() * (R - 1));
    if (r() < 0.5) abierto.add(clave(id(i, j), id(i + 1, j))); else abierto.add(clave(id(i, j), id(i, j + 1)));
  }
  const pasa = (a, b) => abierto.has(clave(a, b));
  const dist = new Array(C * R).fill(-1), cola = [id(0, LAB.filaEntrada)]; dist[cola[0]] = 0;
  while (cola.length) {
    const c = cola.shift(), i = c % C, j = Math.floor(c / C);
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      if (a < 0 || b < 0 || a >= C || b >= R) continue;
      const n = id(a, b);
      if (dist[n] < 0 && pasa(c, n)) { dist[n] = dist[c] + 1; cola.push(n); }
    }
  }
  const salidas = (i, j) => [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < C && b < R && pasa(id(i, j), id(a, b))).length;
  const callejones = [];
  for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
    if ((i === 0 && j === LAB.filaEntrada) || (i === C - 1 && j === LAB.filaSalida)) continue;
    if (salidas(i, j) === 1) callejones.push({ i, j, d: dist[id(i, j)] });
  }
  callejones.sort((a, b) => b.d - a.d);
  const rosas = [];
  for (const c of callejones) {
    if (rosas.every((o) => Math.abs(o.i - c.i) + Math.abs(o.j - c.j) > 5)) rosas.push(c);
    if (rosas.length === 3) break;
  }
  // un rincón más, lejos de las rosas, para el recuerdo del laberinto
  const recuerdo = callejones.find((c) => rosas.every((o) => Math.abs(o.i - c.i) + Math.abs(o.j - c.j) > 3)) || callejones[callejones.length - 1];
  return { pasa, id, rosas, dist, recuerdo };
}

// ------------------------------------------------------------------ Texturas realistas (triplanar: no necesitan UV)
function triplanar(material, mapa, escala = 0.6, fuerza = 1.6) {
  material.onBeforeCompile = (s) => {
    s.uniforms.mapaTri = { value: mapa };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTriPos; varying vec3 vTriNor;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 triW = vec4(transformed, 1.);
        #ifdef USE_INSTANCING
          triW = instanceMatrix * triW;
        #endif
        triW = modelMatrix * triW;
        vTriPos = triW.xyz;
        vTriNor = normalize(mat3(modelMatrix) * objectNormal);`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D mapaTri; varying vec3 vTriPos; varying vec3 vTriNor;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 tw = pow(abs(normalize(vTriNor)), vec3(4.)); tw /= (tw.x + tw.y + tw.z);
        vec3 tp = vTriPos * ${escala.toFixed(3)};
        vec3 tc = texture2D(mapaTri, tp.yz).rgb * tw.x + texture2D(mapaTri, tp.xz).rgb * tw.y + texture2D(mapaTri, tp.xy).rgb * tw.z;
        diffuseColor.rgb *= tc * ${fuerza.toFixed(2)};`);
  };
  material.customProgramCacheKey = () => 'tri' + escala + mapa.uuid;
  return material;
}

// ------------------------------------------------------------------ Materiales
function crearPaleta(tex) {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
  const brillo = (color, fuerza) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: fuerza, roughness: 1 });
  return {
    M_Piedra: std(0x8f877c, { roughness: 0.92 }),
    M_PiedraOscura: std(0x5d564f, { roughness: 0.95 }),
    M_PiedraMusgo: std(0x6b7560, { roughness: 0.95 }),
    M_Hojas: std(0x2e5b40, { roughness: 0.8 }),
    M_HojasClaras: std(0x47784c, { roughness: 0.8 }),
    M_Corteza: std(0x4a3728, { roughness: 1 }),
    M_Madera: std(0x8c5c3b, { roughness: 0.65 }),
    M_Hierro: std(0x2d2a27, { metalness: 0.65, roughness: 0.45 }),
    M_Oro: std(0xe0ad52, { metalness: 1, roughness: 0.28 }),
    M_Papel: new THREE.MeshStandardMaterial({ color: 0xf3e6c8, emissive: 0x6b5a3a, emissiveIntensity: 0.18, roughness: 0.9 }),
    M_LuzFarol: brillo(0xffb060, 1.15),
    M_PuertaColor: std(0xffffff, { roughness: 0.55 }),
    M_PuertaBrillo: brillo(0xffffff, 4),
    M_FlorRosa: new THREE.MeshStandardMaterial({ color: 0xf08fbc, emissive: 0xf08fbc, emissiveIntensity: 0.18, roughness: 0.7 }),
    M_FlorLila: new THREE.MeshStandardMaterial({ color: 0xb99cf0, emissive: 0xb99cf0, emissiveIntensity: 0.18, roughness: 0.7 }),
    M_FlorBlanca: new THREE.MeshStandardMaterial({ color: 0xf6f1e4, emissive: 0xf6f1e4, emissiveIntensity: 0.22, roughness: 0.7 }),
    M_Nenufar: std(0x3d7547, { roughness: 0.5 }),
    M_Junco: std(0x5b7848, { roughness: 0.9 }),
    M_Brillo: brillo(0xffcf6a, 3.5),
    ...(tex ? {
      M_Piedra: triplanar(std(0xb8afa4, { roughness: 0.95 }), tex.piedra, 0.7),
      M_PiedraOscura: triplanar(std(0x8a827a, { roughness: 0.95 }), tex.piedra, 0.9),
      M_PiedraMusgo: triplanar(std(0xa8b29c, { roughness: 0.95 }), tex.rocaMusgo, 0.9),
      M_Madera: triplanar(std(0xb88a64, { roughness: 0.7 }), tex.madera, 0.9),
      M_Corteza: triplanar(std(0x9a8a7a, { roughness: 1 }), tex.corteza, 1.2),
      M_HojaCarta: new THREE.MeshStandardMaterial({ map: tex.hoja, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.75, color: 0xb9d4a8 }),
      M_SetoBase: std(0x10240f, { roughness: 1 }),
      street_lamp_01_glass: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb466, emissiveIntensity: 1.4, roughness: 0.2 }),
      street_lamp_01_bulb: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd9a0, emissiveIntensity: 4, roughness: 0.2 }),
      wooden_lantern_01_glass: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb466, emissiveIntensity: 1.6 }),
      Lantern_01_glass: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc27a, emissiveIntensity: 2.2 }),
    } : {}),
  };
}
const SUAVIZAR = new Set(['M_Hojas', 'M_HojasClaras', 'M_PiedraMusgo', 'M_Nenufar']);

function texturaHalo() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.55)'); r.addColorStop(0.5, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function texturaLuna() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const base = g.createRadialGradient(108, 100, 10, 128, 128, 120);
  base.addColorStop(0, '#fffdf4'); base.addColorStop(0.75, '#e9e6dc'); base.addColorStop(1, '#c9cbd1');
  g.fillStyle = base; g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.fill();
  const r = azar(11);
  g.save(); g.clip();
  for (let i = 0; i < 26; i++) {
    const x = 30 + r() * 196, y = 30 + r() * 196, rad = 6 + r() * 26;
    g.fillStyle = `rgba(150,155,170,${0.08 + r() * 0.14})`;
    g.beginPath(); g.ellipse(x, y, rad, rad * (0.7 + r() * 0.3), r() * 3, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ------------------------------------------------------------------ Mundo
export function construirMundo(escena, gltf, calidad, real = null, tex = null) {
  const alta = calidad === 'alta';
  const paleta = crearPaleta(tex);
  const REAL = !!real;
  const halo = texturaHalo();
  const actualizables = [];
  const colisiones = [];
  const superficies = [];
  const candidatasLuz = [];
  const laberinto = generarLaberinto();
  const ayuda = { estanque: false, puente: false, rio: false, escalera: false };

  const piezasCache = new Map();
  function piezas(nombre) {
    if (piezasCache.has(nombre)) return piezasCache.get(nombre);
    const nodo = gltf.scene.getObjectByName(nombre) || real?.scene.getObjectByName(nombre);
    if (!nodo) throw new Error('Falta el modelo ' + nombre);
    nodo.updateMatrixWorld(true);
    const lista = [];
    nodo.traverse((o) => {
      if (!o.isMesh) return;
      let g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      if (SUAVIZAR.has(o.material.name)) { g.deleteAttribute('normal'); g = mergeVertices(g, 1e-3); g.computeVertexNormals(); }
      lista.push({ geometria: g, material: o.material.name, original: o.material });
    });
    piezasCache.set(nombre, lista);
    return lista;
  }
  const mat = (nombre, cambios, original) => (cambios && cambios[nombre]) || paleta[nombre] || original || paleta.M_Piedra;
  // Pieza con su pivote propio (tapa del cofre, hojas de la reja): geometría local y posición del nodo.
  function piezaPivote(nombre) {
    const nodo = real.scene.getObjectByName(nombre);
    const g = new THREE.Group();
    nodo.traverse((o) => { if (o.isMesh) { const m = new THREE.Mesh(o.geometry, mat(o.material.name, null, o.material)); m.castShadow = m.receiveShadow = true; g.add(m); } });
    return { grupo: g, pivote: nodo.getWorldPosition(new THREE.Vector3()) };
  }

  function colocar(nombre, x, y, z, giro = 0, escala = 1, opc = {}) {
    const g = new THREE.Group();
    for (const p of piezas(nombre)) {
      const m = new THREE.Mesh(p.geometria, mat(p.material, opc.mats, p.original));
      m.castShadow = opc.sombra !== false; m.receiveShadow = true;
      g.add(m);
    }
    g.name = nombre;
    g.position.set(x, y, z); g.rotation.y = giro;
    if (typeof escala === 'number') g.scale.setScalar(escala); else g.scale.copy(escala);
    if (opc.padre !== null) (opc.padre || escena).add(g);
    return g;
  }

  // Instancias repartidas en tramos de 24 m para que la cámara y la sombra descarten lo que no ven.
  const tmpV = new THREE.Vector3();
  function porTramos(matrices, tam = 30) {
    const tramos = new Map();
    for (const m of matrices) {
      tmpV.setFromMatrixPosition(m);
      const k = Math.floor(tmpV.x / tam) + ',' + Math.floor(tmpV.z / tam);
      if (!tramos.has(k)) tramos.set(k, []);
      tramos.get(k).push(m);
    }
    return [...tramos.values()];
  }
  // Nivel de detalle: los modelos realistas solo se dibujan cerca; lejos (entre la niebla) van versiones livianas.
  const lods = [], DIST_LOD = 30;
  const TRAMO_LOD = 12;
  function centroTramo(lista) {
    tmpV.setFromMatrixPosition(lista[0]);
    return new THREE.Vector2((Math.floor(tmpV.x / TRAMO_LOD) + 0.5) * TRAMO_LOD, (Math.floor(tmpV.z / TRAMO_LOD) + 0.5) * TRAMO_LOD);
  }
  function instanciar(nombre, matrices, opc = {}) {
    const g = new THREE.Group();
    for (const grupo of porTramos(matrices, opc.lod ? TRAMO_LOD : 30)) {
      for (const p of piezas(nombre)) {
        const im = new THREE.InstancedMesh(p.geometria, mat(p.material, opc.mats, p.original), grupo.length);
        grupo.forEach((m, i) => im.setMatrixAt(i, m));
        im.castShadow = opc.sombra !== false; im.receiveShadow = true;
        im.name = nombre;
        if (opc.reflejo === false) im.layers.set(1); // detalles pequeños: el reflejo del estanque no los dibuja
        if (opc.soloReflejo) im.layers.set(2); // versión liviana que solo aparece reflejada en el agua
        if (opc.lod) { im.userData.lod = opc.lod; im.userData.centro = centroTramo(grupo); lods.push(im); }
        im.computeBoundingSphere();
        g.add(im);
      }
    }
    escena.add(g);
    return g;
  }
  const matriz = (x, y, z, giro = 0, e = 1, ex, ez) => new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro),
    new THREE.Vector3(ex ?? e, e, ez ?? e));
  const sprite = (color, escala, pos) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.setScalar(escala); if (pos) s.position.copy(pos); return s;
  };

  // ================================================================ Cielo
  const uCielo = { tiempo: { value: 0 }, dirLuna: { value: DIR_LUNA } };
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.ShaderMaterial({
    uniforms: uCielo, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      varying vec3 vDir; uniform float tiempo; uniform vec3 dirLuna;
      float h1(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float onda(float a, float f, float s){ return sin(a*f+s)*.5+.5; }
      void main(){
        vec3 d = normalize(vDir); float h = d.y; float az = atan(d.z, d.x);
        vec3 cenit = vec3(.006,.013,.04), medio = vec3(.018,.038,.09), horiz = vec3(.06,.085,.14);
        vec3 c = mix(horiz, medio, smoothstep(.0,.22,h)); c = mix(c, cenit, smoothstep(.22,.85,h));
        float m = max(dot(d, dirLuna), 0.);
        c += vec3(.30,.36,.52)*pow(m,90.)*.9 + vec3(.16,.2,.32)*pow(m,10.)*.35 + vec3(.06,.07,.1)*pow(m,3.)*.4;
        float banda = exp(-pow(dot(d, normalize(vec3(.2,.5,-.85))), 2.) * 18.);
        c += vec3(.05,.05,.08) * banda * (.6 + .4*h1(floor(d*60.))) * smoothstep(.05,.4,h);
        vec3 q = d*140.; vec3 id = floor(q); float r = h1(id); vec3 f = fract(q)-.5;
        float e = step(.965 - banda*.02, r) * smoothstep(.16, .0, length(f)) * smoothstep(.04,.3,h) * (1.-smoothstep(.85,.99,m));
        c += e * (.55+.45*sin(tiempo*1.7+r*90.)) * mix(vec3(1.,.92,.8), vec3(.8,.88,1.), fract(r*13.)) * (1.2+3.*step(.993,r));
        float m1 = .045 + .035*onda(az,3.,1.) + .022*onda(az,7.,2.) + .01*onda(az,17.,4.);
        float m2 = .02 + .03*onda(az,5.,3.) + .015*onda(az,11.,.5) + .008*onda(az,29.,1.);
        vec3 monte1 = mix(horiz*.75, horiz*.95, smoothstep(.0,.08,h));
        c = mix(c, monte1, step(h, m1));
        c = mix(c, horiz*.55, step(h, m2));
        c = mix(c, horiz*.5, smoothstep(.0,-.05,h));
        gl_FragColor = vec4(c, 1.);
      }`,
  }));
  cielo.renderOrder = -10; cielo.frustumCulled = false;
  escena.add(cielo);
  escena.fog = new THREE.FogExp2(lineal(0.045, 0.065, 0.11), alta ? 0.022 : 0.026);
  escena.background = lineal(0.045, 0.065, 0.11);

  const luna = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaLuna(), color: lineal(2.6, 2.6, 2.5), fog: false, depthWrite: false }));
  luna.scale.setScalar(26 * 76 / 330); luna.renderOrder = -9; // misma luna, pero dentro de la distancia de dibujo (82–92 m)
  const haloLuna = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: lineal(0.35, 0.42, 0.62), fog: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true }));
  haloLuna.scale.setScalar(150 * 76 / 330); haloLuna.renderOrder = -8;
  escena.add(luna, haloLuna);

  // ================================================================ Luces
  escena.add(new THREE.HemisphereLight(lineal(0.32, 0.42, 0.7), lineal(0.05, 0.07, 0.05), 1.1));
  const luzLuna = new THREE.DirectionalLight(lineal(0.62, 0.72, 1.0), 2.4);
  luzLuna.castShadow = true;
  luzLuna.shadow.mapSize.set(alta ? 2048 : 1024, alta ? 2048 : 1024);
  const sc = luzLuna.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 160;
  luzLuna.shadow.bias = -0.0004; luzLuna.shadow.normalBias = 0.04;
  escena.add(luzLuna, luzLuna.target);
  const POOL = alta ? 6 : 4;
  const luces = [];
  for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight(0xffb870, 0, 11, 2); escena.add(l); luces.push(l); }

  // ================================================================ Terreno
  {
    const ancho = 236, largo = 120, sx = alta ? 380 : 260, sz = alta ? 190 : 135;
    const g = new THREE.PlaneGeometry(ancho, largo, sx, sz);
    g.rotateX(-Math.PI / 2);
    g.translate(100, 0, 0);
    const pos = g.attributes.position, colores = new Float32Array(pos.count * 3), mezcla = new Float32Array(pos.count * 3), r = azar(3);
    const cPasto = new THREE.Color(0x23402b), cPasto2 = new THREE.Color(0x2f4f2c), cTierra = new THREE.Color(0x5a4a3a), cGrava = new THREE.Color(0x6a6052),
      cLodo = new THREE.Color(0x1b2723), cColina = new THREE.Color(0x1f3a35), cRoca = new THREE.Color(0x3b3a3c);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = alturaTerreno(x, z);
      pos.setY(i, y);
      const n = 0.5 + 0.5 * Math.sin(x * 0.7 + Math.sin(z * 0.9) * 2) * Math.cos(z * 0.5 + x * 0.13);
      let senda = 0, grava = 0, lodo = 0;
      c.copy(cPasto).lerp(cPasto2, n * 0.8 + r() * 0.2);
      c.lerp(cColina, Math.min(1, Math.max(0, (Math.abs(z) - 12) / 20)));
      if (enLaberinto(x, z)) { c.lerp(cGrava, 0.55 + r() * 0.15); grava = 1; }
      else {
        const ds = distSendero(x, z), anchoS = 1.15 + 0.18 * Math.sin(x * 1.3 + z);
        senda = 1 - suave(Math.min(1, Math.max(0, (ds - anchoS) / 0.7)));
        c.lerp(cTierra, senda);
      }
      if (y < -0.12 && y > -1.2) { c.lerp(cLodo, Math.min(1, (-0.12 - y) / 0.4)); lodo = Math.min(1, (-0.12 - y) / 0.4); }
      if (y <= -1.2) { c.copy(cRoca).lerp(cLodo, r() * 0.3); lodo = 1; }
      if (REAL) {
        // con texturas, el color del vértice solo matiza (variación suave de brillo y tono)
        const v = 0.75 + 0.25 * n + r() * 0.06, colina = Math.min(1, Math.max(0, (Math.abs(z) - 12) / 20));
        c.setRGB(v * (0.92 - colina * 0.15), v, v * (0.9 + colina * 0.1));
      }
      colores.set([c.r, c.g, c.b], i * 3);
      mezcla.set([senda, grava, lodo], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    g.setAttribute('mezcla', new THREE.BufferAttribute(mezcla, 3));
    g.computeVertexNormals();
    const matSuelo = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    if (REAL) {
      matSuelo.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, { tPasto: { value: tex.pasto }, tSenda: { value: tex.senda }, tGrava: { value: tex.grava }, tLodo: { value: tex.lodo } });
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 mezcla; varying vec3 vMezcla; varying vec2 vSueloUv;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMezcla = mezcla; vSueloUv = position.xz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tPasto, tSenda, tGrava, tLodo; varying vec3 vMezcla; varying vec2 vSueloUv;')
          .replace('#include <map_fragment>', `#include <map_fragment>
            vec2 uvA = vSueloUv * .32, uvB = vSueloUv * .081 + .37;
            vec3 pasto = mix(texture2D(tPasto, uvA).rgb, texture2D(tPasto, uvB).rgb, .45);
            vec3 senda = texture2D(tSenda, vSueloUv * .38).rgb;
            vec3 grava = texture2D(tGrava, vSueloUv * .45).rgb;
            vec3 lodo = texture2D(tLodo, vSueloUv * .3).rgb;
            vec3 suelo = mix(pasto, senda, vMezcla.x);
            suelo = mix(suelo, grava, vMezcla.y);
            suelo = mix(suelo, lodo * .7, vMezcla.z);
            diffuseColor.rgb *= suelo * 1.25;`);
      };
    }
    const suelo = new THREE.Mesh(g, matSuelo);
    suelo.receiveShadow = true;
    escena.add(suelo);
  }

  // ================================================================ Agua del estanque
  const uAgua = { tiempo: { value: 0 } };
  const agua = new Reflector(new THREE.PlaneGeometry(18, 26), {
    clipBias: 0.003,
    textureWidth: Math.round(innerWidth * (alta ? 0.33 : 0.22)), textureHeight: Math.round(innerHeight * (alta ? 0.33 : 0.22)),
    color: 0x8899aa,
    shader: {
      name: 'AguaLuna',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tiempo: uAgua.tiempo },
      vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vMundo;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main(){ vUv = textureMatrix * vec4(position,1.); vMundo = (modelMatrix*vec4(position,1.)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float tiempo; varying vec4 vUv; varying vec3 vMundo;
        #include <logdepthbuf_pars_fragment>
        void main(){
          #include <logdepthbuf_fragment>
          vec2 p = vMundo.xz;
          vec2 d = vec2(sin(p.x*1.9+tiempo*1.2)+sin(p.y*2.7-tiempo*.8)*.7+sin((p.x+p.y)*4.1+tiempo*2.1)*.3,
                        cos(p.y*2.2+tiempo*.9)+sin(p.x*3.1-p.y*1.4+tiempo*1.4)*.6+cos((p.x-p.y)*5.3-tiempo*1.7)*.3);
          vec4 uv = vUv; uv.xy += d * .018 * uv.w;
          vec3 refl = texture2DProj(tDiffuse, uv).rgb;
          vec3 c = vec3(.004,.016,.03) + refl * color * .85;
          gl_FragColor = vec4(c, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  agua.rotation.x = -Math.PI / 2;
  agua.position.set(29.6, NIVEL_AGUA, 0);
  escena.add(agua);

  // ================================================================ Sendero de losas
  {
    const r = azar(5), m = [];
    for (const [ax, az, bx, bz] of SENDERO) {
      const largo = Math.hypot(bx - ax, bz - az), n = Math.floor(largo / 0.95);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        if (x < -2.5 || Math.abs(x - DISENO.barranco.centro) < 3.6 || Math.abs(x - DISENO.rio.x) < 3.9) continue;
        if (x > DISENO.invernadero.x0 - 0.3 && x < DISENO.invernadero.x1 + 0.3) continue;
        if (Math.hypot(x - DISENO.plaza.x, z - DISENO.plaza.z) < 4.4) continue;
        const ang = Math.atan2(bz - az, bx - ax), lado = (i % 2 ? 1 : -1) * 0.38;
        const px = x + Math.sin(ang) * lado, pz = z + Math.cos(ang) * lado;
        m.push(matriz(px, alturaTerreno(px, pz) - 0.07, pz, -ang + r() * 0.5, 0.85 + r() * 0.25));
      }
    }
    instanciar('SM_Losa', m, { sombra: false });
  }

  // ================================================================ Faroles y guirnaldas
  const faroles = [], ALTO_FAROL = REAL ? 2.62 : 1.66;
  for (const x of DISENO.faroles) for (const s of [-1, 1]) {
    const z = s * (2.45 + (x > 21 && x < 38 ? 0.4 : 0) + (x > 70 && x < 84 ? 0.6 : 0) + (x > 140 && x < 145 ? 1.2 : 0)), y = alturaTerreno(x, z);
    faroles.push(matriz(x, y, z, s * 0.4));
    colisiones.push({ tipo: 'c', x, z, r: 0.22, tope: 9 });
    candidatasLuz.push({ pos: new THREE.Vector3(x, y + ALTO_FAROL, z), color: new THREE.Color(0xffb36a), fuerza: REAL ? 8 : 5.5 });
  }
  instanciar(REAL ? 'SM_FarolReal' : 'SM_Farol', faroles, REAL ? { lod: 'cerca' } : {});
  if (REAL) { instanciar('SM_Farol', faroles, { sombra: false, soloReflejo: true }); instanciar('SM_Farol', faroles, { sombra: false, lod: 'lejos', reflejo: false }); }
  {
    const matHalo = new THREE.SpriteMaterial({ map: halo, color: lineal(0.55, 0.32, 0.14), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const p = new THREE.Vector3();
    for (const m of faroles) {
      p.setFromMatrixPosition(m);
      const h = new THREE.Sprite(matHalo); h.position.set(p.x, p.y + ALTO_FAROL, p.z); h.scale.setScalar(REAL ? 1.4 : 1.1);
      escena.add(h);
    }
    const bombillas = [];
    for (let k = 0; k < DISENO.faroles.length - 1; k++) {
      const a = DISENO.faroles[k], b = DISENO.faroles[k + 1];
      if (a < 92 || b > 109) continue;
      for (const s of [-1, 1]) {
        const z = s * 2.45, ya = alturaTerreno(a, z) + 2.0, yb = alturaTerreno(b, z) + 2.0;
        for (let i = 1; i < 12; i++) {
          const t = i / 12;
          bombillas.push(new THREE.Vector3(a + (b - a) * t, ya + (yb - ya) * t - Math.sin(t * Math.PI) * 0.55, z));
        }
      }
    }
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: lineal(2.6, 1.7, 0.7) }), bombillas.length);
    bombillas.forEach((q, i) => im.setMatrixAt(i, matriz(q.x, q.y, q.z)));
    im.userData.refleja = true;
    im.computeBoundingSphere();
    escena.add(im);
  }

  // Rocas escaneadas en lugar de las rocas simples (mismas posiciones, escala ajustada a cada modelo).
  function rocasReales(matrices, extra = 1) {
    const tipos = [['SM_RocaMusgo0', 0.45], ['SM_RocaMusgo1', 0.45], ['SM_RocaMusgo2', 0.5], ['SM_RocaMusgo3', 0.45], ['SM_Roca7', 3.4], ['SM_Roca9', 6]];
    tipos.forEach(([n, e], k) => instanciar(n, matrices.filter((_, i) => i % tipos.length === k).map((m) => m.clone().multiply(new THREE.Matrix4().makeScale(e * extra, e * extra, e * extra))), { reflejo: false }));
  }

  // ================================================================ Nivel 1: entrada y puertas
  colocar('SM_ArcoEntrada', DISENO.arco, 0, 0);
  for (const s of [-1, 1]) colisiones.push({ tipo: 'c', x: DISENO.arco, z: s * 2.35, r: 0.5, tope: 9 });
  for (const s of [-1, 1]) {
    for (const [zc, l] of [[4.6, 3.6], [8.2, 3.6]]) {
      if (REAL) colocar('SM_SetoReal', DISENO.arco, alturaTerreno(DISENO.arco, s * zc) - 0.05, s * zc, Math.PI / 2, new THREE.Vector3(l / 2.75, 0.36, 1.1));
      else colocar('SM_Seto', DISENO.arco, alturaTerreno(DISENO.arco, s * zc) - 0.05, s * zc, Math.PI / 2, new THREE.Vector3(l / 4.1, 0.5, 0.8));
      colisiones.push({ tipo: 'b', x: DISENO.arco, z: s * zc, hx: 0.45, hz: l / 2, tope: 9 });
    }
  }

  const atriles = DISENO.atriles.map((a, i) => {
    const y = alturaTerreno(a.x, a.z);
    colocar('SM_Atril', a.x, y, a.z, 0);
    colisiones.push({ tipo: 'c', x: a.x, z: a.z, r: 0.35, tope: 9 });
    const orbe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: lineal(4, 2.6, 0.9) }));
    const brilloOrbe = sprite(lineal(1.6, 1.0, 0.4), 0.9);
    orbe.add(brilloOrbe);
    orbe.position.set(a.x, y + 1.95, a.z);
    escena.add(orbe);
    const luz = { pos: orbe.position, color: new THREE.Color(0xffc070), fuerza: 1.4 };
    candidatasLuz.push(luz);
    const estado = { indice: i, x: a.x, z: a.z, orbe, leida: false };
    estado.marcarLeida = (si) => {
      estado.leida = si;
      orbe.material.color.copy(si ? lineal(0.8, 2.6, 1.6) : lineal(4, 2.6, 0.9));
      brilloOrbe.material.color.copy(si ? lineal(0.3, 1.0, 0.6) : lineal(1.6, 1.0, 0.4));
      luz.color.set(si ? 0x8fe0b8 : 0xffc070);
    };
    actualizables.push(({ t }) => { orbe.position.y = y + 1.95 + Math.sin(t * 2 + i) * 0.06; });
    return estado;
  });

  DISENO.puertas.lugares.forEach((p) => {
    const col = new THREE.Color(p.color);
    const mats = {
      M_PuertaColor: new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, emissive: col, emissiveIntensity: p.correcta ? 0.22 : 0.06 }),
      M_PuertaBrillo: new THREE.MeshStandardMaterial({ color: 0, emissive: col, emissiveIntensity: p.correcta ? 7 : 2.5 }),
    };
    const x = DISENO.puertas.x;
    colocar('SM_PuertaArco', x, alturaTerreno(x, p.z), p.z, 0, 1, { mats });
    for (const s of [-1, 1]) colisiones.push({ tipo: 'c', x, z: p.z + s * 1.45, r: 0.33, tope: 9 });
    candidatasLuz.push({ pos: new THREE.Vector3(x - 0.6, 3.6, p.z), color: col.clone(), fuerza: p.correcta ? 9 : 4 });
    if (p.correcta) {
      const sol = sprite(lineal(2.2, 1.4, 0.45), 2.6, new THREE.Vector3(x - 0.3, 4.12, p.z));
      escena.add(sol);
      actualizables.push(({ t }) => sol.scale.setScalar(2.4 + Math.sin(t * 2.2) * 0.35));
    }
  });
  {
    const x = DISENO.puertas.x;
    for (const [z0, z1] of [[-12, -7.2], [-3.8, -1.7], [1.7, 3.8], [7.2, 12]]) {
      const zc = (z0 + z1) / 2, l = z1 - z0;
      if (REAL) colocar('SM_SetoReal', x, alturaTerreno(x, zc) - 0.05, zc, Math.PI / 2, new THREE.Vector3(l / 2.75, 0.72, 1.4));
      else colocar('SM_Seto', x, alturaTerreno(x, zc) - 0.05, zc, Math.PI / 2, new THREE.Vector3(l / 4.0, 1, 1));
      colisiones.push({ tipo: 'b', x, z: zc, hx: 0.55, hz: l / 2, tope: 9, camara: 2.2 });
    }
  }

  // ================================================================ Nivel 2: estanque
  const geoNenufarGrande = new THREE.CylinderGeometry(0.95, 0.95, 0.07, 28, 1, false, 0.25, Math.PI * 2 - 0.5).translate(0, -0.035, 0);
  const matNenufar = new THREE.MeshStandardMaterial({ color: 0x3f8a4c, roughness: 0.55, side: THREE.DoubleSide });
  const piedras = DISENO.piedras.map(([x, z, mov, tipo], i) => {
    if (tipo === 'n') {
      const g = new THREE.Group();
      const hoja = new THREE.Mesh(geoNenufarGrande, matNenufar); hoja.receiveShadow = true; g.add(hoja);
      colocar('SM_Nenufar', 0.35, 0.02, -0.3, 0, 2.2, { padre: g });
      g.position.set(x, NIVEL_AGUA + 0.02, z); g.rotation.y = i;
      escena.add(g);
      const sup = { tipo: 'c', x, z, r: 1.0, tope: NIVEL_AGUA + 0.04, nenufar: true, carga: 0, ultimo: -9 };
      sup.pisada = (t) => { sup.ultimo = t; };
      superficies.push(sup);
      actualizables.push(({ t, dt }) => {
        const pisado = t - sup.ultimo < 0.1;
        sup.carga = pisado ? sup.carga + dt : Math.max(0, sup.carga - dt * 0.6);
        const hundido = ayuda.estanque ? 0 : Math.max(0, sup.carga - 1.8) * 0.35;
        g.position.y = NIVEL_AGUA + 0.02 - hundido + Math.sin(t * 1.3 + i) * 0.01;
        g.rotation.z = Math.sin(t * 9) * Math.min(0.06, hundido * 0.4);
        sup.tope = NIVEL_AGUA + 0.04 - hundido;
      });
      return { grupo: g, sup };
    }
    const g = colocar('SM_PiedraEstanque', x, NIVEL_AGUA - 0.02, z, i * 1.3, new THREE.Vector3(1.2, 0.95, 1.2));
    const sup = { tipo: 'c', x, z, r: 0.8, tope: NIVEL_AGUA - 0.02 + 0.37, piedra: true };
    superficies.push(sup);
    if (mov) {
      const z0 = z;
      actualizables.push(({ t }) => {
        const nz = z0 + Math.sin(t * (Math.PI * 2 / 5) + i) * mov * (ayuda.estanque ? 0 : 1);
        sup.dz = nz - sup.z; sup.z = nz; g.position.z = nz;
      });
    }
    return { grupo: g, sup };
  });
  {
    const r = azar(9), nen = [], jun = [], roc = [];
    for (let i = 0; i < (alta ? 44 : 26); i++) {
      const x = 23 + r() * 13, z = (r() < 0.5 ? -1 : 1) * (2.2 + r() * 8);
      if (alturaTerreno(x, z) > NIVEL_AGUA - 0.1) continue;
      nen.push(matriz(x, NIVEL_AGUA + 0.005, z, r() * 6, 0.9 + r() * 0.7));
    }
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, x = 29.6 + Math.cos(a) * (7.1 + r() * 0.8), z = Math.sin(a) * (11 + r() * 1.2);
      if (Math.abs(z) < 2.6) continue;
      jun.push(matriz(x, alturaTerreno(x, z) - 0.05, z, r() * 6, 0.8 + r() * 0.7));
    }
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, x = 29.6 + Math.cos(a) * (7.6 + r() * 1.2), z = Math.sin(a) * (11.6 + r());
      if (Math.abs(z) < 2.8) continue;
      roc.push(matriz(x, alturaTerreno(x, z) - 0.05, z, r() * 6, 0.5 + r() * 0.9));
    }
    instanciar('SM_Nenufar', nen, { sombra: false });
    instanciar('SM_Juncos', jun, { sombra: false });
    if (REAL) rocasReales(roc); else instanciar('SM_Roca', roc);
  }

  // ================================================================ Cortinas de luz (reja del laberinto y barrera del bosque)
  function crearCortina(x, zc, ancho, alto, color, fuerza = 0.42) {
    const u = { tiempo: uCielo.tiempo, abierto: { value: 0 }, color: { value: color } };
    const malla = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), new THREE.ShaderMaterial({
      uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float tiempo; uniform float abierto; uniform vec3 color; varying vec2 vUv;
        void main(){
          float x = vUv.x*${(ancho * 3.2).toFixed(1)};
          float rayas = pow(abs(sin(x + sin(x*.37+tiempo)*1.5)), 18.) + pow(abs(sin(x*.53 - tiempo*.7)), 30.)*.7;
          float sube = fract(vUv.y*1.5 - tiempo*.25 + sin(x*.11)*.3);
          float borde = smoothstep(0., .12, vUv.y) * (1.-smoothstep(.55, 1., vUv.y)) * smoothstep(0.,.05,vUv.x)*smoothstep(1.,.95,vUv.x);
          float a = (rayas*.5 + smoothstep(.97, 1., sube)*.55 + .08) * borde * (1.-abierto) * ${fuerza.toFixed(2)};
          gl_FragColor = vec4(color*a, 1.);
        }`,
    }));
    malla.rotation.y = Math.PI / 2;
    malla.position.set(x, alturaTerreno(x, zc) + alto / 2 - 0.1, zc);
    escena.add(malla);
    const col = { tipo: 'b', x, z: zc, hx: 0.3, hz: ancho / 2, tope: 99 };
    colisiones.push(col);
    const c = {
      abierta: false, progreso: 0,
      abrir(inmediato = false) { if (this.abierta) return; this.abierta = true; col.tope = -99; if (inmediato) this.progreso = 1; },
    };
    candidatasLuz.push({ pos: new THREE.Vector3(x - 0.5, 1.5, zc), color: new THREE.Color().setRGB(color.r, color.g, color.b).multiplyScalar(0.5), fuerza: 3, cortina: c });
    actualizables.push(({ dt }) => {
      if (c.abierta && c.progreso < 1) c.progreso = Math.min(1, c.progreso + dt / 1.6);
      u.abierto.value = c.progreso;
      malla.visible = c.progreso < 1;
      malla.scale.y = 1 - c.progreso * 0.6;
    });
    return c;
  }

  // Reja de hierro forjado (modelo escaneado) que se abre con las tres rosas.
  function crearRejaHierro(x, zc) {
    const g = new THREE.Group();
    g.position.set(x, alturaTerreno(x, zc), zc); g.rotation.y = Math.PI / 2; g.scale.setScalar(0.74);
    for (const p of piezas('SM_RejaMarco')) { const m = new THREE.Mesh(p.geometria, mat(p.material, null, p.original)); m.castShadow = true; g.add(m); }
    const izq = piezaPivote('SM_RejaIzq'), der = piezaPivote('SM_RejaDer');
    izq.grupo.position.copy(izq.pivote); der.grupo.position.copy(der.pivote);
    g.add(izq.grupo, der.grupo);
    escena.add(g);
    const brillo = sprite(lineal(1.2, 0.3, 0.6), 3.2, new THREE.Vector3(x - 0.3, g.position.y + 1.4, zc));
    escena.add(brillo);
    const col = { tipo: 'b', x, z: zc, hx: 0.3, hz: 1.15, tope: 99 };
    colisiones.push(col);
    const c = { abierta: false, progreso: 0, abrir(inmediato = false) { if (this.abierta) return; this.abierta = true; col.tope = -99; if (inmediato) this.progreso = 1; } };
    candidatasLuz.push({ pos: new THREE.Vector3(x - 0.6, 1.6, zc), color: new THREE.Color(0xff7ab3), fuerza: 3, cortina: c });
    actualizables.push(({ dt, t }) => {
      if (c.abierta && c.progreso < 1) c.progreso = Math.min(1, c.progreso + dt / 2.2);
      const e = 1 - Math.pow(1 - c.progreso, 3);
      izq.grupo.rotation.y = e * 1.75; der.grupo.rotation.y = -e * 1.75;
      brillo.material.opacity = (1 - e) * (0.75 + Math.sin(t * 2.5) * 0.25);
    });
    return c;
  }

  // ================================================================ Nivel 3: laberinto de rosas
  const rosas = [];
  let reja;
  {
    const { columnas: C, filas: R, celda: T, x0: X0, z0: Z0 } = LAB;
    const { pasa, id } = laberinto;
    const muros = [];
    for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
      if (i < C - 1 && !pasa(id(i, j), id(i + 1, j))) muros.push([X0 + (i + 1) * T, Z0 + j * T + T / 2, false, T]);
      if (j < R - 1 && !pasa(id(i, j), id(i, j + 1))) muros.push([X0 + i * T + T / 2, Z0 + (j + 1) * T, true, T]);
    }
    for (let i = 0; i < C; i++) { muros.push([X0 + i * T + T / 2, Z0, true, T]); muros.push([X0 + i * T + T / 2, Z0 + R * T, true, T]); }
    for (let j = 0; j < R; j++) {
      if (j !== LAB.filaEntrada) muros.push([X0, Z0 + j * T + T / 2, false, T]);
      if (j !== LAB.filaSalida) muros.push([X0 + C * T, Z0 + j * T + T / 2, false, T]);
    }
    for (const s of [-1, 1]) for (const x of [X0, X0 + C * T]) muros.push([x, s * 9.6, false, 3.2]);
    const r = azar(55), setos = [], floresSeto = [];
    for (const [xc, zc, horiz, largo] of muros) {
      const y = alturaTerreno(xc, zc) - 0.05, l = largo + 0.75;
      setos.push(REAL ? matriz(xc, y, zc, horiz ? 0 : Math.PI / 2, 1.03, l / 2.75, 1.05) : matriz(xc, y, zc, horiz ? 0 : Math.PI / 2, 1.5, l / 4.1, 0.72));
      colisiones.push({ tipo: 'b', x: xc, z: zc, hx: horiz ? l / 2 : 0.38, hz: horiz ? 0.38 : l / 2, tope: 9, camara: y + 3.3 });
      for (let k = 0; k < 3; k++) {
        if (r() < 0.75) continue;
        const t = (r() - 0.5) * largo;
        const fx = horiz ? xc + t : xc + (r() - 0.5) * 0.5, fz = horiz ? zc + (r() - 0.5) * 0.5 : zc + t;
        floresSeto.push(matriz(fx, y + 3.15 + r() * 0.15, fz, r() * 6, 0.8 + r() * 0.5));
      }
    }
    const hojaLab = new THREE.MeshStandardMaterial({ color: 0x36694a, roughness: 0.85, emissive: 0x0d2414, emissiveIntensity: 0.4 });
    if (REAL) { instanciar('SM_SetoReal', setos); instanciar('SM_Vinca0', floresSeto.map((m) => m.clone().multiply(new THREE.Matrix4().makeScale(0.8, 0.8, 0.8))), { sombra: false }); }
    else { instanciar('SM_Seto', setos, { mats: { M_Hojas: hojaLab } }); instanciar('SM_Flores', floresSeto, { sombra: false }); }
    colocar('SM_ArcoEntrada', X0 - 0.2, 0, Z0 + LAB.filaEntrada * T + T / 2, 0, new THREE.Vector3(1, 0.8, 0.42));
    colocar('SM_ArcoEntrada', X0 + C * T + 0.2, 0, Z0 + LAB.filaSalida * T + T / 2, 0, new THREE.Vector3(1, 0.8, 0.42));
    const r2 = azar(66);
    const usados = new Set();
    for (let k = 0; k < 40 && usados.size < 18; k++) {
      const i = Math.floor(r2() * C), j = Math.floor(r2() * R);
      if (usados.has(i + ':' + j)) continue; usados.add(i + ':' + j);
      const x = X0 + i * T + 0.45, z = Z0 + j * T + 0.45, y = alturaTerreno(x, z);
      if (REAL) colocar('SM_LinternaMadera', x, y, z, r2() * 6, 1.6); else colocar('SM_Farol', x, y, z, 0, 0.7);
      colisiones.push({ tipo: 'c', x, z, r: 0.18, tope: 9 });
      candidatasLuz.push({ pos: new THREE.Vector3(x, y + (REAL ? 0.5 : 1.16), z), color: new THREE.Color(0xffb36a), fuerza: 3.2 });
    }
    const matPetalo = new THREE.MeshStandardMaterial({ color: 0xff7eb3, emissive: 0xff4f96, emissiveIntensity: 1.6, roughness: 0.4 });
    const matTallo = new THREE.MeshStandardMaterial({ color: 0x3f7a3f, roughness: 0.7 });
    laberinto.rosas.forEach((c, k) => {
      const x = X0 + c.i * T + T / 2, z = Z0 + c.j * T + T / 2, y = alturaTerreno(x, z);
      const g = new THREE.Group();
      const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.5, 6), matTallo); tallo.position.y = 0.25; g.add(tallo);
      const capullo = new THREE.Group(); capullo.position.y = 0.55; g.add(capullo);
      for (let p = 0; p < 7; p++) {
        const pet = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), matPetalo);
        const a = (p / 7) * Math.PI * 2;
        pet.scale.set(0.55, 1, 1); pet.position.set(Math.cos(a) * 0.045, (p % 2) * 0.02, Math.sin(a) * 0.045); pet.rotation.y = -a;
        capullo.add(pet);
      }
      g.add(sprite(lineal(1.4, 0.35, 0.7), 1.3, new THREE.Vector3(0, 0.55, 0)));
      g.position.set(x, y + 0.45, z);
      escena.add(g);
      const luz = { pos: new THREE.Vector3(x, y + 1.0, z), color: new THREE.Color(0xff6aa8), fuerza: 2.5 };
      candidatasLuz.push(luz);
      const rosa = { id: k, x, z, y, grupo: g, tomada: false };
      rosa.tomar = () => { rosa.tomada = true; g.visible = false; luz.fuerza = 0; };
      actualizables.push(({ t }) => { if (!rosa.tomada) { g.rotation.y = t * 0.8 + k; g.position.y = y + 0.45 + Math.sin(t * 2 + k) * 0.08; } });
      rosas.push(rosa);
    });
    reja = REAL ? crearRejaHierro(X0 + C * T + 0.1, Z0 + LAB.filaSalida * T + T / 2) : crearCortina(X0 + C * T + 0.15, Z0 + LAB.filaSalida * T + T / 2, T + 0.2, 3, lineal(1.6, 0.45, 0.85), 0.6);
  }

  // ================================================================ Nivel 4: plaza de los faroles, fuente y puente
  const P = DISENO.plaza;
  const placas = [];
  {
    const perfil = [[0, 0], [1.35, 0], [1.4, 0.12], [1.4, 0.45], [1.25, 0.5], [1.2, 0.3], [0.35, 0.3], [0.3, 0.9], [0.55, 1.0], [0.6, 1.08], [0.18, 1.12], [0.14, 1.6], [0.28, 1.68], [0.3, 1.74], [0, 1.78]]
      .map(([a, b]) => new THREE.Vector2(a, b));
    const yF = alturaTerreno(P.x, P.z);
    const fuente = new THREE.Mesh(new THREE.LatheGeometry(perfil, 40), new THREE.MeshStandardMaterial({ color: 0x8f877c, roughness: 0.92, side: THREE.DoubleSide }));
    fuente.position.set(P.x, yF, P.z); fuente.castShadow = fuente.receiveShadow = true;
    escena.add(fuente);
    colisiones.push({ tipo: 'c', x: P.x, z: P.z, r: 1.45, tope: 9 });
    const espejo = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshStandardMaterial({ color: 0x0b1c2a, roughness: 0.05, metalness: 0.4, emissive: 0x0a2a3a, emissiveIntensity: 0.6 }));
    espejo.rotation.x = -Math.PI / 2; espejo.position.set(P.x, yF + 0.42, P.z);
    escena.add(espejo);
    const n = 160, pos = new Float32Array(n * 3), fase = new Float32Array(n), rr = azar(8);
    for (let i = 0; i < n; i++) { fase[i] = rr(); pos.set([rr() * Math.PI * 2, 0, 0], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
    const uF = { tiempo: uCielo.tiempo, mapa: { value: halo }, base: { value: new THREE.Vector3(P.x, yF + 1.76, P.z) } };
    const chorro = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: uF, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float fase; uniform float tiempo; uniform vec3 base; varying float vA;
        void main(){ float t = fract(tiempo*.55 + fase); float a = position.x;
          vec3 p = base + vec3(cos(a)*t*.95, t*.9 - t*t*2.1, sin(a)*t*.95);
          vA = 1. - t; vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv; gl_PointSize = min(30./-mv.z, 6.); }`,
      fragmentShader: `uniform sampler2D mapa; varying float vA; void main(){ float a = texture2D(mapa, gl_PointCoord).r; gl_FragColor = vec4(vec3(.55,.75,1.)*a*vA*.9, 1.); }`,
    }));
    chorro.frustumCulled = false;
    escena.add(chorro);
    for (const d of DISENO.placas) {
      const col = new THREE.Color(d.color), y = alturaTerreno(d.x, d.z);
      const matPlaca = new THREE.MeshStandardMaterial({ color: 0x3a3631, emissive: col, emissiveIntensity: 0.25, roughness: 0.6 });
      const placa = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.09, 32), matPlaca);
      placa.position.set(d.x, y + 0.03, d.z); placa.receiveShadow = true;
      escena.add(placa);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 8, 40), new THREE.MeshStandardMaterial({ color: 0xd9b26a, metalness: 1, roughness: 0.3 }));
      aro.rotation.x = Math.PI / 2; aro.position.set(d.x, y + 0.08, d.z); escena.add(aro);
      const matVidrio = new THREE.MeshStandardMaterial({ color: 0, emissive: col, emissiveIntensity: 0.25 });
      const fx = d.x + (d.x - P.x) * 0.55, fz = d.z + (d.z - P.z) * 0.55;
      if (REAL) colocar('SM_FarolReal', fx, alturaTerreno(fx, fz), fz, Math.atan2(fx - P.x, fz - P.z), 0.85, { mats: { street_lamp_01_glass: matVidrio, street_lamp_01_bulb: matVidrio } });
      else colocar('SM_Farol', fx, alturaTerreno(fx, fz), fz, 0, 1.15, { mats: { M_LuzFarol: matVidrio } });
      colisiones.push({ tipo: 'c', x: fx, z: fz, r: 0.24, tope: 9 });
      const luz = { pos: new THREE.Vector3(fx, alturaTerreno(fx, fz) + (REAL ? 2.8 : 1.9), fz), color: col.clone(), fuerza: 0.6 };
      candidatasLuz.push(luz);
      const brillo = sprite(new THREE.Color(0, 0, 0), 1.6, luz.pos);
      escena.add(brillo);
      const p = { ...d, y, encendida: false, destello: 0 };
      p.encender = (si) => {
        p.encendida = si;
        matVidrio.emissiveIntensity = si ? 3.2 : 0.25; matPlaca.emissiveIntensity = si ? 1.4 : 0.25;
        luz.fuerza = si ? 6 : 0.6;
        brillo.material.color.copy(col).multiplyScalar(si ? 0.9 : 0);
      };
      p.error = () => { p.destello = 0.6; };
      actualizables.push(({ dt, t }) => {
        if (p.destello > 0) {
          p.destello -= dt;
          matPlaca.emissive.setRGB(1, 0.15, 0.1); matPlaca.emissiveIntensity = 1.5 * (0.5 + 0.5 * Math.sin(t * 40));
          if (p.destello <= 0) { matPlaca.emissive.copy(col); matPlaca.emissiveIntensity = p.encendida ? 1.4 : 0.25; }
        }
      });
      placas.push(p);
    }
    for (const [bx, bz, giro] of [[75, -4.2, Math.PI / 4], [81, -4.2, Math.PI * 0.75], [75, 4.2, -Math.PI / 4], [81, 4.2, -Math.PI * 0.75]]) {
      colocar('SM_Banca', bx, alturaTerreno(bx, bz), bz, giro);
      if (REAL) colocar('SM_Gato', bx + Math.cos(giro) * 0.7, alturaTerreno(bx, bz), bz - Math.sin(giro) * 0.7, giro + Math.PI, 1.6);
      colisiones.push({ tipo: 'c', x: bx, z: bz, r: 0.6, tope: 1.2 });
    }
  }

  const B = DISENO.barranco;
  {
    const uN = { tiempo: uCielo.tiempo };
    const niebla = new THREE.Mesh(new THREE.PlaneGeometry(8, 40, 1, 1), new THREE.ShaderMaterial({
      uniforms: uN, transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vUv; varying vec3 vM; void main(){ vUv = uv; vM = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float tiempo; varying vec2 vUv; varying vec3 vM;
        void main(){ float n = sin(vM.z*.7+tiempo*.3)*.5+.5; n *= sin(vM.x*1.3-tiempo*.2+vM.z*.2)*.5+.5;
          float borde = smoothstep(0.,.25,vUv.x)*smoothstep(1.,.75,vUv.x);
          gl_FragColor = vec4(vec3(.25,.33,.5), (.35+.35*n)*borde); }`,
    }));
    niebla.rotation.x = -Math.PI / 2; niebla.position.set(B.centro, -3.2, 0);
    escena.add(niebla);
    const r = azar(99), roc = [];
    for (let i = 0; i < 40; i++) {
      const s = r() < 0.5 ? -1 : 1, x = B.centro + s * (2.4 + r() * 0.9), z = -14 + r() * 28;
      roc.push(matriz(x, alturaTerreno(x, z) + 0.4, z, r() * 6, 0.8 + r() * 1.6));
    }
    if (REAL) rocasReales(roc, 1.4); else instanciar('SM_Roca', roc);
    for (const x of [B.x0 - 0.3, B.x1 + 0.3]) for (const s of [-1, 1]) {
      if (REAL) colocar('SM_FarolReal', x, alturaTerreno(x, s * 1.4), s * 1.4, 0, 0.7); else colocar('SM_Farol', x, alturaTerreno(x, s * 1.4), s * 1.4, 0, 0.8);
      colisiones.push({ tipo: 'c', x, z: s * 1.4, r: 0.18, tope: 9 });
    }
  }
  const puente = { activo: false, progreso: 0, plataformas: [] };
  {
    const matLosa = new THREE.MeshStandardMaterial({ color: 0x9c938a, roughness: 0.85, emissive: 0x2a3a5a, emissiveIntensity: 0.25 });
    DISENO.puente.forEach(([x, z, movZ, movY], i) => {
      const g = new THREE.Group();
      for (const p of piezas('SM_Losa')) { const m = new THREE.Mesh(p.geometria, matLosa); m.castShadow = m.receiveShadow = true; g.add(m); }
      g.scale.set(2.1, 3, 2.1);
      g.add(sprite(lineal(0.4, 0.6, 1.2), 0.8, new THREE.Vector3(0, -0.05, 0)));
      escena.add(g);
      const sup = { tipo: 'c', x, z, r: 1.15, tope: -99, puente: true };
      superficies.push(sup);
      actualizables.push(({ t }) => {
        const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, puente.progreso * 1.9 - i * 0.3)), 3);
        const k = ayuda.puente ? 0 : 1;
        const nz = z + Math.sin(t * 1.0 + i) * movZ * k;
        const ny = THREE.MathUtils.lerp(-7, -0.2, e) + Math.sin(t * 0.9 + i) * movY * k;
        sup.dz = nz - sup.z; sup.z = nz;
        sup.tope = e > 0.98 ? ny + 0.36 : -99;
        g.position.set(x, ny, nz);
        g.visible = e > 0.01;
      });
      puente.plataformas.push({ grupo: g, sup });
    });
    puente.activar = (inmediato = false) => { puente.activo = true; if (inmediato) puente.progreso = 1; };
    actualizables.push(({ dt }) => { if (puente.activo && puente.progreso < 1) puente.progreso = Math.min(1, puente.progreso + dt / 2.6); });
  }

  // ================================================================ Árboles, arbustos, flores, rocas y hongos
  {
    const r = azar(21), a1 = [], a2 = [], lejanos1 = [], lejanos2 = [], arb = [], flo = [], roc = [], hongos = [];
    const libre = (x, z, minS) => distSendero(x, z) > minS && !(x > 20.5 && x < 38.6 && Math.abs(z) < 12.5)
      && Math.hypot(x - DISENO.mirador.x, z) > 6 && !(x > LAB.x0 - 1.5 && x < LAB.x0 + LAB.columnas * LAB.celda + 1.5 && Math.abs(z) < 10.5)
      && Math.abs(x - B.centro) > 4.2 && Math.hypot(x - P.x, z - P.z) > 7 && !enZonaLibre(x, z);
    const total = alta ? 500 : 300;
    for (let i = 0; i < total * 5 && a1.length + a2.length + lejanos1.length + lejanos2.length < total; i++) {
      const x = -14 + r() * 230, z = (r() < 0.5 ? -1 : 1) * (4.6 + Math.pow(r(), 0.8) * 42);
      if (!libre(x, z, 3.2)) continue;
      if (Math.abs(x - DISENO.puertas.x) < 2 && Math.abs(z) < 13) continue;
      if (Math.abs(x - DISENO.arco) < 1.5 && Math.abs(z) < 10.5) continue;
      const e = 0.85 + r() * 0.55 + Math.min(0.5, Math.abs(z) / 60);
      const tipo1 = r() < 0.55;
      const destino = Math.abs(z) > 13 ? (tipo1 ? lejanos1 : lejanos2) : (tipo1 ? a1 : a2);
      destino.push(matriz(x, alturaTerreno(x, z) - 0.1, z, r() * 6.3, e));
      if (Math.abs(z) < 11) colisiones.push({ tipo: 'c', x, z, r: 0.38 * e, tope: 99 });
    }
    if (REAL) {
      // jacarandás realistas cerca del camino; los lejanos (entre la niebla) siguen siendo livianos
      const cerca = [], lejos1 = [], lejos2 = [], p = new THREE.Vector3();
      const limite = alta ? 130 : 75;
      for (const [lista, dest] of [[a1, lejos1], [a2, lejos2]]) for (const m of lista) {
        p.setFromMatrixPosition(m);
        if (Math.abs(p.z) < 15 && cerca.length < limite) cerca.push(m.clone().multiply(new THREE.Matrix4().makeScale(0.8, 0.8, 0.8))); else dest.push(m);
      }
      instanciar('SM_ArbolReal', cerca, { lod: 'cerca' }); instanciar('SM_Arbol1', cerca, { sombra: false, soloReflejo: true }); instanciar('SM_Arbol1', cerca, { sombra: false, lod: 'lejos', reflejo: false }); instanciar('SM_Arbol1', [...lejos1, ...lejanos1], { sombra: false }); instanciar('SM_Arbol2', [...lejos2, ...lejanos2], { sombra: false });
    } else { instanciar('SM_Arbol1', a1); instanciar('SM_Arbol2', a2); instanciar('SM_Arbol1', lejanos1, { sombra: false }); instanciar('SM_Arbol2', lejanos2, { sombra: false }); }
    for (let i = 0; i < 3500 && arb.length < (alta ? 190 : 125); i++) {
      const x = -3 + r() * 206, z = (r() < 0.5 ? -1 : 1) * (2.9 + r() * 9);
      if (!libre(x, z, 1.9)) continue;
      if (Math.abs(x - DISENO.puertas.x) < 1.3 && Math.abs(z) < 12) continue;
      arb.push(matriz(x, alturaTerreno(x, z) - 0.05, z, r() * 6, 0.8 + r() * 0.6));
    }
    instanciar(REAL ? 'SM_BolaSeto' : 'SM_Arbusto', arb, { sombra: false, reflejo: false });
    for (let i = 0; i < 7000 && flo.length < (alta ? 350 : 200); i++) {
      const x = -3 + r() * 206, z = (r() < 0.5 ? -1 : 1) * (1.6 + r() * 10);
      if (!libre(x, z, 1.4)) continue;
      flo.push(matriz(x, alturaTerreno(x, z) - 0.02, z, r() * 6, 0.8 + r() * 0.7));
    }
    if (REAL) {
      ['SM_Vinca0', 'SM_Vinca1', 'SM_Vinca2', 'SM_Trebol0', 'SM_Trebol1', 'SM_Helecho0', 'SM_Helecho1'].forEach((n, k) => instanciar(n, flo.filter((_, i) => i % 7 === k).map((m) => m.clone().multiply(new THREE.Matrix4().makeScale(n.includes('Trebol') ? 2.4 : 1, n.includes('Trebol') ? 2.4 : 1, n.includes('Trebol') ? 2.4 : 1))), { sombra: false, reflejo: false }));
    } else instanciar('SM_Flores', flo, { sombra: false, reflejo: false });
    for (let i = 0; i < 1400 && roc.length < 110; i++) {
      const x = -6 + r() * 212, z = (r() < 0.5 ? -1 : 1) * (3.5 + r() * 18);
      if (!libre(x, z, 2.2)) continue;
      roc.push(matriz(x, alturaTerreno(x, z) - 0.15, z, r() * 6, 0.4 + r() * 1.2));
    }
    if (REAL) rocasReales(roc); else instanciar('SM_Roca', roc);
    if (REAL) {
      const rr = azar(404), toc = [], tronc = [], hel = [];
      for (let i = 0; i < 300; i++) {
        const x = 92.5 + rr() * 17, z = (rr() < 0.5 ? -1 : 1) * (3 + rr() * 9);
        if (distSendero(x, z) < 2) continue;
        const m = matriz(x, alturaTerreno(x, z) - 0.05, z, rr() * 6, 0.8 + rr() * 0.6);
        if (i % 9 === 0) toc.push(m); else if (i % 13 === 0) tronc.push(m); else if (hel.length < 90) hel.push(m);
      }
      instanciar('SM_Tocon', toc, { reflejo: false }); instanciar('SM_TroncoCaido', tronc, { reflejo: false });
      ['SM_Helecho0', 'SM_Helecho1', 'SM_Helecho2', 'SM_Helecho3'].forEach((n, k) => instanciar(n, hel.filter((_, i) => i % 4 === k), { sombra: false, reflejo: false }));
    }
    for (let i = 0; i < 600 && hongos.length < 140; i++) {
      const x = 92 + r() * 18, z = (r() < 0.5 ? -1 : 1) * (1.6 + r() * 9);
      if (distSendero(x, z) < 1.3) continue;
      hongos.push(matriz(x, alturaTerreno(x, z), z, r() * 6, 0.6 + r() * 0.9));
    }
    const sombrero = new THREE.SphereGeometry(0.07, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.09, 0);
    const pie = new THREE.CylinderGeometry(0.018, 0.024, 0.1, 6).translate(0, 0.05, 0);
    const imS = new THREE.InstancedMesh(sombrero, new THREE.MeshStandardMaterial({ color: 0x6fd6ff, emissive: 0x2fa8ff, emissiveIntensity: 1.6, roughness: 0.4 }), hongos.length);
    const imP = new THREE.InstancedMesh(pie, new THREE.MeshStandardMaterial({ color: 0xe8e2d0, emissive: 0x405060, emissiveIntensity: 0.4 }), hongos.length);
    hongos.forEach((m, i) => { imS.setMatrixAt(i, m); imP.setMatrixAt(i, m); });
    imS.computeBoundingSphere(); imP.computeBoundingSphere();
    escena.add(imS, imP);
  }

  // ================================================================ Pasto con viento (por tramos)
  const uPasto = { tiempo: { value: 0 } };
  {
    const hoja = new THREE.PlaneGeometry(0.06, 1, 1, 2);
    hoja.translate(0, 0.5, 0);
    const p = hoja.attributes.position, nor = hoja.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setX(i, p.getX(i) * (1 - y * 0.92));
      p.setZ(i, y * y * 0.12);
      nor.setXYZ(i, 0, 1, 0);
    }
    const mata = mergeGeometries([hoja, hoja.clone().rotateY(Math.PI / 2)]);
    const matPasto = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
    matPasto.onBeforeCompile = (s) => {
      s.uniforms.tiempo = uPasto.tiempo;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float tiempo; varying float vAlto;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vAlto = position.y;
          vec3 base = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float w = sin(tiempo*1.7 + base.x*.35 + base.z*.22)*.10 + sin(tiempo*3.1 + base.x*1.7 + base.z)*.035;
          transformed.x += w * position.y * position.y;
          transformed.z += w * .6 * position.y * position.y;`);
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAlto;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(.28, 1.15, vAlto);');
    };
    const n = alta ? 58000 : 22000, r = azar(33);
    const c1 = new THREE.Color(0x3d6b3a), c2 = new THREE.Color(0x5a7f45), c3 = new THREE.Color(0x2f5a45);
    const tramos = new Map();
    let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) {
      const cerca = r() < 0.75;
      const x = -4 + r() * 210, z = (r() < 0.5 ? -1 : 1) * (cerca ? 1.1 + r() * 9 : 9 + r() * 12);
      const ds = distSendero(x, z);
      if (ds < 1.05 + r() * 0.5) continue;
      const y = alturaTerreno(x, z);
      if (y < NIVEL_AGUA + 0.08) continue;
      if (Math.hypot(x - DISENO.mirador.x, z) < 4.4) continue;
      if (x > DISENO.invernadero.x0 - 0.2 && x < DISENO.invernadero.x1 + 0.2 && Math.abs(z) < DISENO.invernadero.z + 0.2) continue;
      if (x > 177.5 && x < 190.8 && Math.abs(z) < 3) continue;
      const alto = (0.22 + r() * 0.3) * (ds < 2.2 ? 0.7 : 1) * (Math.abs(z) > 9 ? 1.35 : 1);
      const clave = Math.floor(x / 20);
      if (!tramos.has(clave)) tramos.set(clave, []);
      tramos.get(clave).push([matriz(x, y - 0.02, z, r() * 6.3, 1, 1, 1).scale(new THREE.Vector3(1, alto, 1)), c1.clone().lerp(r() < 0.5 ? c2 : c3, r())]);
      k++;
    }
    for (const lista of tramos.values()) {
      const im = new THREE.InstancedMesh(mata, matPasto, lista.length);
      im.name = 'pasto';
      lista.forEach(([m, c], i) => { im.setMatrixAt(i, m); im.setColorAt(i, c); });
      im.receiveShadow = true;
      im.computeBoundingSphere();
      im.layers.set(1); // el reflejo del estanque no dibuja el pasto
      escena.add(im);
    }
  }

  // ================================================================ Nivel 5: luciérnagas
  const geoLuc = new THREE.SphereGeometry(0.055, 12, 8);
  const luciernagas = DISENO.luciernagas.map(([x, z, alto], id) => {
    const y = alturaTerreno(x, z) + alto;
    const m = new THREE.Mesh(geoLuc, new THREE.MeshBasicMaterial({ color: lineal(3, 2.6, 0.75) }));
    m.add(sprite(lineal(0.9, 0.78, 0.22), 1.1));
    m.position.set(x, y, z);
    escena.add(m);
    candidatasLuz.push({ pos: m.position, color: new THREE.Color(0xfff08a), fuerza: 1.6 });
    return { id, malla: m, origen: new THREE.Vector3(x, y, z), atrapada: false, orden: 0 };
  });
  const objetivoLuc = new THREE.Vector3();
  actualizables.push(({ t, jugador }) => {
    for (const l of luciernagas) {
      if (!l.atrapada) {
        l.malla.position.set(l.origen.x + Math.sin(t * 0.9 + l.id) * 0.35, l.origen.y + Math.sin(t * 1.6 + l.id * 2) * 0.18, l.origen.z + Math.cos(t * 0.7 + l.id) * 0.35);
      } else if (jugador) {
        const a = t * 1.1 + l.orden * (Math.PI * 2 / 7);
        l.malla.position.lerp(objetivoLuc.set(jugador.x + Math.cos(a) * 0.85, jugador.y + 1.35 + Math.sin(t * 2 + l.orden) * 0.18, jugador.z + Math.sin(a) * 0.85), 0.08);
      }
      l.malla.children[0].scale.setScalar((l.atrapada ? 0.55 : 1.1) * (1 + Math.sin(t * 6 + l.id * 3) * 0.25));
    }
  });
  {
    const n = alta ? 820 : 340, r = azar(77), pos = new Float32Array(n * 3), fase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = -4 + r() * 208, z = (r() - 0.5) * 30;
      pos.set([x, Math.max(alturaTerreno(x, z), -1.5) + 0.3 + r() * 2.6, z], i * 3); fase[i] = r() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
    const uLuc = { tiempo: uCielo.tiempo, mapa: { value: halo }, escalaPx: { value: innerHeight / 2 } };
    const puntos = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: uLuc, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float fase; uniform float tiempo; uniform float escalaPx; varying float vBrillo;
        void main(){ vec3 p = position; p.x += sin(tiempo*.5+fase)*.6; p.y += sin(tiempo*.8+fase*1.3)*.3; p.z += cos(tiempo*.4+fase)*.6;
          vec4 mv = modelViewMatrix*vec4(p,1.); gl_Position = projectionMatrix*mv;
          vBrillo = pow(max(0., sin(tiempo*1.3+fase*7.)), 3.);
          gl_PointSize = min(.16 * escalaPx / -mv.z, 9.); }`,
      fragmentShader: `uniform sampler2D mapa; varying float vBrillo;
        void main(){ float a = texture2D(mapa, gl_PointCoord).r; gl_FragColor = vec4(vec3(1.6,1.4,.45)*a*vBrillo, 1.); }`,
    }));
    puntos.frustumCulled = false;
    escena.add(puntos);
    actualizables.push(() => { uLuc.escalaPx.value = innerHeight / 2; });
  }
  const barrera = crearCortina(DISENO.barrera, 0, 20, 4.2, lineal(1.4, 0.95, 0.4));

  // ================================================================ Niveles 6 a 10, recuerdos y la estrella de Kimberly (niveles2.js)
  const nuevos = construirNiveles2({ escena, DISENO, alturaTerreno, NIVEL_AGUA, REAL, alta, colocar, instanciar, mat, sprite, lineal, azar, matriz,
    colisiones, superficies, candidatasLuz, actualizables, crearCortina, rocasReales, ayuda, LAB, laberinto, DIR_LUNA });

  // ================================================================ Final: mirador y cofre
  const M = DISENO.mirador, yM = Math.max(0, alturaTerreno(M.x, M.z));
  colocar('SM_Mirador', M.x, yM, M.z);
  superficies.push({ tipo: 'c', x: M.x, z: M.z, r: 3.86, tope: yM + 0.6 });
  colisiones.push({ tipo: 'c', x: M.x, z: M.z, r: 3.86, tope: yM + 0.6 });
  for (const [x0, x1, h] of [[-4.42, -3.88, 0.2], [-3.97, -3.4, 0.4]]) superficies.push({ tipo: 'b', x: M.x + (x0 + x1) / 2, z: M.z, hx: (x1 - x0) / 2, hz: 1.3, tope: yM + h });
  for (const a of [30, 90, 270, 330]) {
    const r = (a * Math.PI) / 180;
    colisiones.push({ tipo: 'c', x: M.x + 3.4 * Math.cos(r), z: M.z - 3.4 * Math.sin(r), r: 0.2, tope: 99 });
  }
  for (const s of [-1, 1]) candidatasLuz.push({ pos: new THREE.Vector3(M.x + 0.8, yM + 2.4, M.z + s * 1.6), color: new THREE.Color(0xffc27a), fuerza: 2.2 });
  if (REAL) {
    colocar('SM_MesaJardin', M.x + 2.1, yM + 0.6, M.z, Math.PI / 2, 1.05);
    colocar('SM_Linterna', M.x + 2.1, yM + 0.6 + 0.78, M.z + 0.1, 0, 1.4);
    candidatasLuz.push({ pos: new THREE.Vector3(M.x + 2.1, yM + 1.6, M.z), color: new THREE.Color(0xffc27a), fuerza: 2.5 });
    colocar('SM_Estatua', DISENO.plaza.x + 4.6, alturaTerreno(DISENO.plaza.x + 4.6, 5.6), 5.6, -Math.PI * 0.75, 0.9);
    colocar('SM_Estatua', DISENO.plaza.x + 4.6, alturaTerreno(DISENO.plaza.x + 4.6, -5.6), -5.6, -Math.PI * 0.25, 0.9);
  } else colocar('SM_Banca', M.x + 2.2, yM + 0.6, M.z, Math.PI);
  colisiones.push({ tipo: 'b', x: M.x + 2.2, z: M.z, hx: 0.3, hz: 0.85, tope: yM + 1.6 });

  const cofreX = M.x - 1.1, cofreY = yM + 0.6;
  let cofreGrupo, tapa;
  if (REAL) {
    cofreGrupo = colocar('SM_CofreRealBase', cofreX, cofreY, M.z, -Math.PI / 2, 1.1);
    const t = piezaPivote('SM_CofreRealTapa');
    tapa = t.grupo; tapa.position.copy(t.pivote);
    cofreGrupo.add(tapa);
  } else {
    cofreGrupo = colocar('SM_CofreBase', cofreX, cofreY, M.z, -Math.PI / 2, 1.15);
    tapa = new THREE.Group();
    for (const p of piezas('SM_CofreTapa')) { const m = new THREE.Mesh(p.geometria, mat(p.material)); m.castShadow = true; tapa.add(m); }
    tapa.position.set(0, 0.48, -0.31);
    cofreGrupo.add(tapa);
  }
  colisiones.push({ tipo: 'b', x: cofreX, z: M.z, hx: 0.4, hz: 0.62, tope: 99 });
  const luzCofre = { pos: new THREE.Vector3(cofreX, cofreY + 0.9, M.z), color: new THREE.Color(0xffc56a), fuerza: 2 };
  candidatasLuz.push(luzCofre);
  const destello = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: lineal(2.4, 1.6, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  destello.position.set(cofreX, cofreY + 0.75, M.z); destello.scale.setScalar(3);
  escena.add(destello);
  const cofre = { x: cofreX, z: M.z, y: cofreY, abierto: false, apertura: 0, abrir(inmediato = false) { this.abierto = true; if (inmediato) this.apertura = 1; } };
  actualizables.push(({ dt, t }) => {
    if (cofre.abierto && cofre.apertura < 1) cofre.apertura = Math.min(1, cofre.apertura + dt / 1.5);
    const e = 1 - Math.pow(1 - cofre.apertura, 3);
    tapa.rotation.x = -1.95 * e;
    destello.material.opacity = e * (0.85 + Math.sin(t * 3) * 0.15);
    luzCofre.fuerza = 2 + e * 14;
  });

  // ================================================================ Celebración final: farolillos, fuegos artificiales y un corazón de luz
  const fiesta = { activa: false, t: 0, siempre: false };
  {
    // farolillos de papel que suben al cielo
    const n = alta ? 70 : 40, r = azar(2024);
    const geo = new THREE.CylinderGeometry(0.16, 0.12, 0.34, 10, 1, true);
    const matF = new THREE.MeshBasicMaterial({ color: lineal(2.6, 1.15, 0.38), side: THREE.DoubleSide, transparent: true, opacity: 0.95, fog: false });
    const farolillos = new THREE.InstancedMesh(geo, matF, n);
    farolillos.frustumCulled = false; farolillos.visible = false;
    const datos = [];
    for (let i = 0; i < n; i++) datos.push({ x: M.x + (r() - 0.5) * 30, z: M.z + (r() - 0.5) * 30, y0: yM + 0.5 + r() * 2, v: 0.55 + r() * 0.5, f: r() * 6, retraso: r() * 10 });
    escena.add(farolillos);
    // fuegos artificiales: varias explosiones de partículas sobre el mirador
    const nP = 900, posF = new Float32Array(nP * 3), velF = new Float32Array(nP * 3), colF = new Float32Array(nP * 3), edadF = new Float32Array(nP).fill(99);
    const gF = new THREE.BufferGeometry();
    gF.setAttribute('position', new THREE.BufferAttribute(posF, 3));
    gF.setAttribute('color', new THREE.BufferAttribute(colF, 3));
    gF.setAttribute('edad', new THREE.BufferAttribute(edadF, 1));
    const fuegos = new THREE.Points(gF, new THREE.ShaderMaterial({
      uniforms: { mapa: { value: halo } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: `attribute float edad; varying vec3 vC; varying float vA;
        void main(){ vC = color; vA = clamp(1. - edad / 2.2, 0., 1.); vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = min(380. / -mv.z, 14.) * (.6 + vA * .6); }`,
      fragmentShader: `uniform sampler2D mapa; varying vec3 vC; varying float vA; void main(){ float a = texture2D(mapa, gl_PointCoord).r; gl_FragColor = vec4(vC * a * vA * 2.2, 1.); }`,
    }));
    fuegos.frustumCulled = false; fuegos.visible = false;
    escena.add(fuegos);
    let cursor = 0, proximo = 0;
    const colores = [[1, 0.45, 0.7], [1, 0.8, 0.35], [0.6, 0.8, 1], [0.8, 0.55, 1], [0.5, 1, 0.75]];
    const estallar = () => {
      const cx = M.x + 8 + (r() - 0.5) * 16, cy = 14 + r() * 8, cz = M.z + (r() - 0.5) * 22, c = colores[Math.floor(r() * colores.length)];
      for (let k = 0; k < 150; k++) {
        const i = cursor; cursor = (cursor + 1) % nP;
        const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), v = 5 + r() * 2.5;
        posF.set([cx, cy, cz], i * 3);
        velF.set([Math.sin(ph) * Math.cos(th) * v, Math.cos(ph) * v, Math.sin(ph) * Math.sin(th) * v], i * 3);
        colF.set(c, i * 3); edadF[i] = 0;
      }
    };
    // corazón de luz formado por luciérnagas
    const nC = 90, posC = new Float32Array(nC * 3), destinoC = [];
    for (let i = 0; i < nC; i++) {
      const t = (i / nC) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3), hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      destinoC.push(new THREE.Vector3(M.x + 1.5, yM + 6.5 + hy * 0.13, M.z + hx * 0.13));
      posC.set([M.x + (r() - 0.5) * 20, yM + r() * 4, M.z + (r() - 0.5) * 20], i * 3);
    }
    const gC = new THREE.BufferGeometry(); gC.setAttribute('position', new THREE.BufferAttribute(posC, 3));
    const corazon = new THREE.Points(gC, new THREE.PointsMaterial({ map: halo, size: 0.55, color: lineal(2.4, 2, 0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    corazon.frustumCulled = false; corazon.visible = false;
    escena.add(corazon);
    const luzFiesta = new THREE.PointLight(0xffc27a, 0, 30, 1.5);
    luzFiesta.position.set(M.x + 2, yM + 8, M.z);
    escena.add(luzFiesta);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), uno = new THREE.Vector3(1, 1, 1);
    actualizables.push(({ dt }) => {
      if (!fiesta.activa) return;
      fiesta.t += dt;
      const t = fiesta.t;
      farolillos.visible = fuegos.visible = corazon.visible = true;
      datos.forEach((d, i) => {
        const tt = Math.max(0, t - d.retraso) % 40; // vuelven a salir desde el mirador
        v3.set(d.x + Math.sin(tt * 0.5 + d.f) * 0.6, d.y0 + tt * d.v, d.z + Math.cos(tt * 0.4 + d.f) * 0.6);
        mtx.compose(v3, q, tt > 0 ? uno : v3.clone().set(0.001, 0.001, 0.001));
        farolillos.setMatrixAt(i, mtx);
      });
      farolillos.instanceMatrix.needsUpdate = true;
      if (t < 30 || fiesta.siempre) { proximo -= dt; if (proximo <= 0) { estallar(); proximo = 0.7 + r() * 0.9; } }
      for (let i = 0; i < nP; i++) {
        if (edadF[i] > 3) continue;
        edadF[i] += dt;
        velF[i * 3 + 1] -= 4 * dt;
        for (let k = 0; k < 3; k++) { velF[i * 3 + k] *= 1 - dt * 0.9; posF[i * 3 + k] += velF[i * 3 + k] * dt; }
      }
      gF.attributes.position.needsUpdate = gF.attributes.edad.needsUpdate = gF.attributes.color.needsUpdate = true;
      const atraccion = Math.min(1, Math.max(0, (t - 2) / 4));
      for (let i = 0; i < nC; i++) {
        const d = destinoC[i];
        posC[i * 3] += (d.x - posC[i * 3]) * dt * 1.4 * atraccion + Math.sin(t * 3 + i) * 0.003;
        posC[i * 3 + 1] += (d.y + Math.sin(t * 2 + i * 0.3) * 0.05 - posC[i * 3 + 1]) * dt * 1.4 * atraccion;
        posC[i * 3 + 2] += (d.z - posC[i * 3 + 2]) * dt * 1.4 * atraccion;
      }
      gC.attributes.position.needsUpdate = true;
      corazon.material.size = 0.5 + Math.sin(t * 2.4) * 0.08;
      luzFiesta.intensity = 6 + Math.sin(t * 5) * 1.5;
    });
  }
  // siempre=true: los fuegos no se acaban mientras se mira el cielo del final
  const celebrar = (siempre = false) => { if (!fiesta.activa) fiesta.t = 0; fiesta.activa = true; fiesta.siempre = siempre; };

  // ================================================================ Detalles que pasan solos
  const eventos = { alEstrella: null, alPez: null };
  // estrellas fugaces
  {
    const geo = new THREE.PlaneGeometry(1, 1);
    const matE = new THREE.ShaderMaterial({
      uniforms: { a: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      // se dibuja siempre al fondo del cielo, aunque esté más lejos que la distancia de dibujo
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z = gl_Position.w * 0.99999; }',
      fragmentShader: 'uniform float a; varying vec2 vUv; void main(){ float l = pow(vUv.x, 3.); float w = 1. - abs(vUv.y - .5) * 2.; gl_FragColor = vec4(vec3(1.4,1.35,1.2) * l * w * w * a, 1.); }',
    });
    const estrella = new THREE.Mesh(geo, matE);
    estrella.frustumCulled = false; estrella.visible = false; estrella.renderOrder = -7;
    escena.add(estrella);
    let espera = 12, vida = -1;
    const ini = new THREE.Vector3(), dir = new THREE.Vector3();
    actualizables.push(({ dt, camara }) => {
      if (vida < 0) {
        espera -= dt;
        if (espera <= 0) {
          // aparece delante de la cámara, alta en el cielo
          const f = new THREE.Vector3(); camara.getWorldDirection(f); f.y = 0; f.normalize();
          const lado = new THREE.Vector3(-f.z, 0, f.x);
          ini.copy(camara.position).addScaledVector(f, 160).addScaledVector(lado, (Math.random() - 0.5) * 120); ini.y += 60 + Math.random() * 40;
          dir.copy(lado).multiplyScalar(Math.random() < 0.5 ? -1 : 1).addScaledVector(new THREE.Vector3(0, -1, 0), 0.45).normalize();
          vida = 0; espera = 25 + Math.random() * 35; estrella.visible = true;
          eventos.alEstrella?.();
        }
        return;
      }
      vida += dt;
      const u = vida / 1.3;
      if (u >= 1) { vida = -1; estrella.visible = false; return; }
      const cabeza = ini.clone().addScaledVector(dir, u * 90);
      estrella.position.copy(cabeza).addScaledVector(dir, -6);
      estrella.scale.set(14, 0.35, 1);
      estrella.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(estrella.position, camara.position, new THREE.Vector3(0, 1, 0)));
      // girar en su plano para alinearse con la dirección
      const pd = dir.clone().applyQuaternion(estrella.quaternion.clone().invert());
      estrella.rotateZ(Math.atan2(pd.y, pd.x));
      matE.uniforms.a.value = Math.sin(u * Math.PI);
    });
  }
  // peces que saltan en el estanque
  {
    const geo = new THREE.SphereGeometry(0.09, 12, 8).scale(2.2, 0.8, 0.9);
    const matP = new THREE.MeshStandardMaterial({ color: 0xff8a3c, emissive: 0x6a2a00, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2 });
    const pez = new THREE.Mesh(geo, matP); pez.visible = false; escena.add(pez);
    const anillosP = [];
    const anillo = (x, z) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.17, 32), new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.7, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, NIVEL_AGUA + 0.015, z); escena.add(m); anillosP.push({ m, e: 0 });
    };
    let espera = 5, t0 = -1; const a = new THREE.Vector3(), b = new THREE.Vector3();
    actualizables.push(({ dt, jugador }) => {
      for (let i = anillosP.length - 1; i >= 0; i--) {
        const r = anillosP[i]; r.e += dt; r.m.scale.setScalar(1 + r.e * 5); r.m.material.opacity = Math.max(0, 0.7 - r.e * 0.7);
        if (r.e > 1) { escena.remove(r.m); r.m.geometry.dispose(); anillosP.splice(i, 1); }
      }
      if (t0 < 0) {
        espera -= dt;
        if (espera <= 0 && jugador && jugador.x > 12 && jugador.x < 45) {
          const x = 24 + Math.random() * 11, z = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 6);
          if (alturaTerreno(x, z) < NIVEL_AGUA - 0.2) {
            a.set(x, NIVEL_AGUA, z); const g = Math.random() * 6; b.set(x + Math.cos(g) * 1.2, NIVEL_AGUA, z + Math.sin(g) * 1.2);
            t0 = 0; pez.visible = true; anillo(x, z); eventos.alPez?.(x, z);
          }
          espera = 4 + Math.random() * 6;
        }
        return;
      }
      t0 += dt; const u = t0 / 0.8;
      if (u >= 1) { t0 = -1; pez.visible = false; anillo(b.x, b.z); eventos.alPez?.(b.x, b.z); return; }
      pez.position.lerpVectors(a, b, u); pez.position.y = NIVEL_AGUA + Math.sin(u * Math.PI) * 0.75;
      pez.lookAt(b.x, pez.position.y + Math.cos(u * Math.PI) * 0.8, b.z); pez.rotateY(-Math.PI / 2);
    });
  }

  // ================================================================ Bucle
  let reloj = 0;
  function actualizar(t, dt, camara, foco, jugador) {
    uCielo.tiempo.value = t; uAgua.tiempo.value = t; uPasto.tiempo.value = t;
    agua.visible = !agua.userData.apagado && camara.position.x > 4 && camara.position.x < 56;
    luna.position.copy(camara.position).addScaledVector(DIR_LUNA, 76);
    haloLuna.position.copy(luna.position);
    for (const f of actualizables) f({ t, dt, camara, jugador });
    for (const im of lods) {
      const d = Math.hypot(im.userData.centro.x - camara.position.x, im.userData.centro.y - camara.position.z);
      im.visible = (d < DIST_LOD) === (im.userData.lod === 'cerca');
    }
    luzLuna.target.position.copy(foco);
    luzLuna.position.copy(foco).addScaledVector(DIR_LUNA, 70);
    reloj -= dt;
    if (reloj <= 0) {
      reloj = 0.15;
      const orden = candidatasLuz.filter((c) => c.fuerza > 0 && !(c.cortina && c.cortina.progreso >= 1))
        .map((c) => ({ c, d: c.pos.distanceToSquared(foco) })).sort((a, b) => a.d - b.d);
      luces.forEach((l, i) => {
        const o = orden[i];
        if (!o || o.d > 900) { l.userData.fuente = null; l.intensity = 0; return; }
        l.userData.fuente = o.c;
      });
    }
    for (const l of luces) {
      const c = l.userData.fuente;
      if (!c) continue;
      l.position.copy(c.pos); l.color.copy(c.color);
      l.intensity = c.fuerza * (1 + Math.sin(t * 9 + c.pos.x * 3) * 0.04) * (c.cortina ? 1 - c.cortina.progreso : 1);
    }
  }

  function alturaSuelo(x, z, y) {
    let h = alturaTerreno(x, z), sobre = null;
    for (const s of superficies) {
      const margen = s.piedra || s.nenufar || s.puente || s.balsa || s.estrella ? 0.22 : 0;
      const dentro = s.tipo === 'c' ? Math.hypot(x - s.x, z - s.z) < s.r + margen : Math.abs(x - s.x) < s.hx && Math.abs(z - s.z) < s.hz;
      if (dentro && s.tope <= y + 0.4 && s.tope > h) { h = s.tope; sobre = s; }
    }
    return { h, sobre };
  }
  // Fracción del tramo foco→cámara que queda libre antes de chocar con un seto alto.
  const camaraBloqueante = colisiones.filter((c) => c.camara);
  function libreCamara(a, b) {
    const pasos = 18;
    for (let i = 1; i <= pasos; i++) {
      const t = i / pasos, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
      for (const c of camaraBloqueante) {
        if (y > c.camara) continue;
        if (Math.abs(x - c.x) < c.hx + 0.12 && Math.abs(z - c.z) < c.hz + 0.12) return (i - 1) / pasos;
      }
    }
    return 1;
  }
  function resolverChoques(p, radio) {
    for (const c of colisiones) {
      if (p.y >= c.tope - 0.42) continue;
      if (c.tipo === 'c') {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = c.r + radio;
        if (d < min && d > 1e-5) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
      } else {
        const dx = p.x - c.x, dz = p.z - c.z, px = c.hx + radio - Math.abs(dx), pz = c.hz + radio - Math.abs(dz);
        if (px > 0 && pz > 0) { if (px < pz) p.x += Math.sign(dx || 1) * px; else p.z += Math.sign(dz || 1) * pz; }
      }
    }
    p.x = Math.min(LIMITE.xMax, Math.max(LIMITE.xMin, p.x));
    p.z = Math.min(LIMITE.z, Math.max(-LIMITE.z, p.z));
    if (p.x > DISENO.meseta.x) p.z = Math.min(6, Math.max(-6, p.z));
  }

  // El agua solo refleja lo que de verdad se ve en ella (cielo, luna, árboles, faroles, arcos, luces y la protagonista):
  // el resto del jardín no se dibuja dos veces. Las luces también van en la capa 2 para que el reflejo quede iluminado.
  const REFLEJABLES = /^(SM_Arbol[12]|SM_Farol\b|SM_ArcoEntrada|SM_PuertaArco|SM_Estatua|SM_Juncos|SM_Mirador|SM_Linterna\b|SM_Nenufar|SM_PiedraEstanque)/;
  agua.camera.layers.set(2);
  // el reflejo se actualiza un cuadro sí y otro no: en el agua con ondas no se nota y cuesta la mitad
  { const reflejar = agua.onBeforeRender; let n = 0; agua.onBeforeRender = function (...a) { if ((n++ & 1) === 0) reflejar.apply(this, a); }; }
  escena.traverse((o) => {
    let ok = o === cielo || o.isLight || (o.isSprite && o.scale.x > 0.6) || o.isPoints || o.userData.refleja, n = o;
    while (!ok && n) { if (n.name && REFLEJABLES.test(n.name)) ok = true; n = n.parent; }
    if (ok) o.layers.enable(2);
  });

  return { actualizar, alturaSuelo, resolverChoques, libreCamara, ayuda, celebrar, eventos, mirador: { x: M.x, z: M.z, y: yM }, atriles, piedras, luciernagas, barrera, reja, rosas, placas, puente, cofre, agua, luzLuna, laberinto: { ...LAB, ...laberinto }, ...nuevos };
}
