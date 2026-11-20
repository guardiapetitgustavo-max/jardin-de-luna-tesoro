// El jardín de luna: cámara en tercera persona, controles, progreso, guardado e interfaz.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { construirMundo, alturaTerreno, DISENO, NIVEL_AGUA } from './mundo.js';
import { crearPersonaje } from './personaje.js';
import * as D from './datos.js';
import { iniciarSonido, alternarSonido, sonidos } from './sonido.js';

const $ = (id) => document.getElementById(id);
const parametros = new URLSearchParams(location.search);
const tactil = matchMedia('(pointer: coarse)').matches;
const calidad = parametros.get('calidad') || (tactil || (navigator.hardwareConcurrency || 8) <= 4 ? 'baja' : 'alta');
const alta = calidad === 'alta';
const CLAVE = 'jardinDeLuna.v2';

// ------------------------------------------------------------------ Render
const lienzo = $('lienzo');
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: parametros.has('prueba') });
let escalaPixel = Math.min(devicePixelRatio, alta ? 1.6 : 1.25);
renderer.setPixelRatio(escalaPixel);
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(escena, camara));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight).multiplyScalar(alta ? 0.6 : 0.4), 0.5, 0.45, 0.9);
composer.addPass(bloom);
const pasoFinal = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tiempo: { value: 0 }, fuerza: { value: 0.32 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float tiempo; uniform float fuerza; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + tiempo*7.) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - .5;
      float v = 1. - dot(d, d) * fuerza * 2.2; c.rgb *= clamp(v, 0., 1.);
      c.rgb = mix(c.rgb, c.rgb * vec3(.96, 1., 1.06), .5);
      c.rgb += (h(vUv * 800.) - .5) * .012;
      gl_FragColor = c; }`,
});
composer.addPass(pasoFinal);
composer.addPass(new OutputPass());

function ajustar() {
  camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix();
  renderer.setPixelRatio(escalaPixel);
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(escalaPixel);
  composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', ajustar);

// ------------------------------------------------------------------ Estado de la aventura
const nuevoEstado = () => ({ pistas: [false, false, false, false], puerta: false, estanque: false, rosas: [], faroles: false, luc: [], cofre: false, control: null, niveles: [], visitadas: [] });
let estado = nuevoEstado();
const guardar = () => { if (!parametros.has('prueba')) try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch {} };
const cargarGuardado = () => { try { const s = JSON.parse(localStorage.getItem(CLAVE)); return s && Array.isArray(s.pistas) ? { ...nuevoEstado(), ...s } : null; } catch { return null; } };
const pistasLeidas = () => estado.pistas.filter(Boolean).length;
const puedeAbrir = () => pistasLeidas() === D.PISTAS.length && estado.luc.length >= D.LUCIERNAGAS_NECESARIAS;
let secuencia = [], placaPisada = null;

// ------------------------------------------------------------------ Jugador y cámara
let mundo, personaje;
const jugador = { pos: new THREE.Vector3(DISENO.inicio.x, 0, DISENO.inicio.z), vel: new THREE.Vector3(), vy: 0, enSuelo: true, rumbo: Math.PI / 2, sobre: null, tiempoAire: 0, bufferSalto: 0 };
const cam = { yaw: 0, pitch: 0.3, dist: 4.4, distActual: 4.4, foco: new THREE.Vector3(), pos: new THREE.Vector3() };
let modo = 'carga'; // carga | portada | juego | panel | pausa
let orbeJugador;

// ------------------------------------------------------------------ Entradas
const teclas = new Set();
const palanca = { x: 0, y: 0, activa: false };
let pedirSalto = false;
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (modo === 'juego') {
    if (k === ' ' && !e.repeat) pedirSalto = true;
    if ((k === 'e' || k === 'enter') && !e.repeat) interactuar();
    if ((k === 'escape' || k === 'p') && !e.repeat) pausar();
  }
  teclas.add(k);
});
addEventListener('keyup', (e) => teclas.delete(e.key.toLowerCase()));
addEventListener('blur', () => teclas.clear());

const girar = (dx, dy, k = 0.0026) => {
  cam.yaw += dx * k;
  cam.pitch = THREE.MathUtils.clamp(cam.pitch + dy * k, -0.15, 1.15);
};
let arrastre = null;
lienzo.addEventListener('pointerdown', (e) => {
  if (modo !== 'juego') return;
  if (e.pointerType === 'mouse' && !document.pointerLockElement && !parametros.has('prueba')) {
    lienzo.requestPointerLock?.()?.catch?.(() => {});
  }
  arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY };
  lienzo.setPointerCapture(e.pointerId);
});
lienzo.addEventListener('pointermove', (e) => {
  if (modo !== 'juego') return;
  if (document.pointerLockElement === lienzo) { girar(e.movementX, e.movementY); return; }
  if (arrastre && arrastre.id === e.pointerId) {
    girar(e.clientX - arrastre.x, e.clientY - arrastre.y, tactil ? 0.0055 : 0.004);
    arrastre.x = e.clientX; arrastre.y = e.clientY;
  }
});
const soltar = (e) => { if (arrastre && arrastre.id === e.pointerId) arrastre = null; };
lienzo.addEventListener('pointerup', soltar);
lienzo.addEventListener('pointercancel', soltar);
lienzo.addEventListener('wheel', (e) => { cam.dist = THREE.MathUtils.clamp(cam.dist + e.deltaY * 0.004, 2.6, 7.5); }, { passive: true });
document.addEventListener('pointerlockchange', () => { $('ayudaRaton').style.opacity = document.pointerLockElement ? '0' : '1'; });

// palanca táctil
{
  const zona = $('palanca'), punto = $('palancaPunto');
  let id = null;
  const mover = (e) => {
    const r = zona.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), max = r.width * 0.42;
    if (d > max) { dx *= max / d; dy *= max / d; }
    palanca.x = dx / max; palanca.y = -dy / max;
    punto.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  zona.addEventListener('pointerdown', (e) => { id = e.pointerId; zona.setPointerCapture(id); palanca.activa = true; mover(e); });
  zona.addEventListener('pointermove', (e) => { if (e.pointerId === id) mover(e); });
  const fin = (e) => { if (e.pointerId !== id) return; id = null; palanca.activa = false; palanca.x = palanca.y = 0; punto.style.transform = ''; };
  zona.addEventListener('pointerup', fin); zona.addEventListener('pointercancel', fin);
  $('tSaltar').addEventListener('pointerdown', (e) => { e.preventDefault(); pedirSalto = true; });
}
$('accion').addEventListener('click', () => interactuar());
$('btnPausa').addEventListener('click', () => pausar());
$('btnSonido').addEventListener('click', () => { iniciarSonido(); $('btnSonido').textContent = alternarSonido() ? '♪' : '✕'; });

// ------------------------------------------------------------------ Interfaz
let avisoTiempo = 0;
function aviso(texto, segundos = 3.2) {
  const a = $('aviso'); a.textContent = texto; a.classList.add('ver'); avisoTiempo = segundos;
}
function fundido(accion) {
  const f = $('fundido');
  f.style.opacity = '1';
  setTimeout(() => { accion(); setTimeout(() => (f.style.opacity = '0'), 120); }, 380);
}
function tablaControles() {
  const lista = tactil ? D.CONTROLES_TACTILES : D.CONTROLES;
  return `<div class="controles">${lista.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join('')}</div>`;
}
const panel = $('panel');
function abrirPanel({ sub = '', titulo, cuerpo = '', botones = [{ texto: 'Continuar' }], alCerrar }) {
  if (document.pointerLockElement) document.exitPointerLock();
  $('panelSub').textContent = sub; $('panelSub').hidden = !sub;
  $('panelTitulo').textContent = titulo;
  $('panelCuerpo').innerHTML = cuerpo;
  const caja = $('panelBotones'); caja.innerHTML = '';
  botones.forEach((b, i) => {
    const el = document.createElement('button');
    el.className = i === 0 ? 'primario' : 'secundario';
    el.textContent = b.texto;
    el.onclick = () => { cerrarPanel(); b.accion?.(); };
    caja.appendChild(el);
  });
  panel._alCerrar = alCerrar;
  if (modo === 'juego') modo = 'panel';
  teclas.clear();
  if (!panel.open) panel.showModal();
  setTimeout(() => caja.firstChild?.focus(), 30);
}
function cerrarPanel() {
  if (panel.open) panel.close();
}
panel.addEventListener('close', () => {
  if (modo === 'panel' || modo === 'pausa') modo = 'juego';
  const f = panel._alCerrar; panel._alCerrar = null; f?.();
});
panel.addEventListener('cancel', (e) => { if (modo === 'portada') e.preventDefault(); });

function pausar() {
  if (modo !== 'juego') return;
  modo = 'pausa';
  abrirPanel({
    sub: D.TITULO, titulo: 'Pausa', cuerpo: tablaControles(),
    botones: [
      { texto: 'Seguir jugando' },
      { texto: 'Empezar de nuevo', accion: () => { try { localStorage.removeItem(CLAVE); } catch {} location.reload(); } },
    ],
  });
  modo = 'pausa';
}

// ------------------------------------------------------------------ Acciones del juego
function reaparecer(motivo) {
  if (motivo) aviso(motivo);
  fundido(() => {
    const c = estado.control || DISENO.inicio;
    colocarJugador(c.x, c.z, c.giro ?? 0);
  });
}
function colocarJugador(x, z, giro = 0) {
  jugador.pos.set(x, 0, z);
  jugador.pos.y = mundo.alturaSuelo(x, z, 50).h;
  jugador.vel.set(0, 0, 0); jugador.vy = 0; jugador.enSuelo = true;
  jugador.rumbo = Math.atan2(Math.cos(giro), Math.sin(giro));
  cam.yaw = giro; cam.pitch = 0.3;
  cam.foco.copy(jugador.pos).add(new THREE.Vector3(0, 1.35, 0));
  cam.pos.copy(cam.foco).add(new THREE.Vector3(-Math.cos(giro) * cam.dist, 1.4, -Math.sin(giro) * cam.dist));
}
function puntoControl(x, z, giro = 0) {
  estado.control = { x, z, giro }; guardar();
}

function interactuar() {
  if (modo !== 'juego') return;
  const cerca = buscarCercano();
  if (!cerca) return;
  if (cerca.tipo === 'atril') leerPista(cerca.atril.indice);
  else abrirCofre();
}
function leerPista(i) {
  const p = D.PISTAS[i];
  const nueva = !estado.pistas[i];
  estado.pistas[i] = true; mundo.atriles[i].marcarLeida(true); guardar();
  sonidos.pista();
  abrirPanel({ sub: `Pista ${i + 1} de ${D.PISTAS.length}`, titulo: p.titulo, cuerpo: `<p class="frase">«${p.texto}»</p>`, botones: [{ texto: 'Continuar' }] });
  if (nueva && i === 2) $('filaRosas').classList.remove('oculta');
}
function abrirCofre() {
  if (estado.cofre) { mostrarCupones(); return; }
  if (!puedeAbrir()) {
    const faltan = [];
    const np = D.PISTAS.length - pistasLeidas();
    if (np > 0) faltan.push(`${np} pista${np > 1 ? 's' : ''}`);
    if (estado.luc.length < 7) faltan.push(`${7 - estado.luc.length} luciérnaga${7 - estado.luc.length > 1 ? 's' : ''}`);
    abrirPanel({ titulo: 'El cofre sigue cerrado', cuerpo: `<p>Te falta${faltan.length > 1 ? 'n' : ''} ${faltan.join(' y ')} para abrirlo.</p>`, botones: [{ texto: 'Entendido' }] });
    return;
  }
  estado.cofre = true; guardar();
  mundo.cofre.abrir();
  sonidos.final();
  aviso('El cofre se abre…', 2);
  setTimeout(mostrarCupones, 1900);
}
function mostrarCupones() {
  abrirPanel({
    sub: `Hecho para ti, ${D.DESTINATARIA}`, titulo: 'El tesoro de los dos',
    cuerpo: `<ul class="cupones">${D.CUPONES.map(([t, d], i) => `<li style="animation-delay:${0.1 + i * 0.08}s">${t}<small>${d}</small></li>`).join('')}</ul><p class="suave">Elige un cupón y dime cuándo lo usamos.</p>`,
    botones: [{ texto: 'Seguir paseando' }],
  });
}
function atraparLuciernaga(l) {
  l.atrapada = true; l.orden = estado.luc.length;
  if (!estado.luc.includes(l.id)) estado.luc.push(l.id);
  $('filaLuc').classList.remove('oculta');
  const n = estado.luc.length;
  if (n >= D.LUCIERNAGAS_NECESARIAS) { aviso('Las luciérnagas abren el camino al mirador'); mundo.barrera.abrir(); sonidos.logro(); }
  else { aviso(`Luciérnaga ${n} de ${D.LUCIERNAGAS_NECESARIAS}`, 1.8); sonidos.objeto(); }
  guardar();
}

function pisarPlaca(placa) {
  const esperado = D.ORDEN_FAROLES[secuencia.length];
  if (placa.encendida) return;
  if (placa.nombre === esperado) {
    placa.encender(true); secuencia.push(placa.nombre);
    if (secuencia.length === D.ORDEN_FAROLES.length) {
      estado.faroles = true; guardar();
      aviso('¡Los cuatro faroles brillan! El puente aparece sobre el barranco', 4);
      mundo.puente.activar(); sonidos.logro();
    } else { aviso(`Farol ${secuencia.length} de 4`, 1.4); sonidos.objeto(); }
  } else {
    mundo.placas.forEach((q) => { q.encender(false); q.error(); });
    secuencia = []; sonidos.error();
    aviso(estado.pistas[3] ? 'Ese no era el orden. Vuelve a empezar' : 'Primero lee la pista junto a la fuente', 2.6);
  }
}
let cartelTiempo = 0;
function cartelNivel(nv) {
  const c = $('cartel');
  $('cartelNum').textContent = nv.final ? 'Final' : `Nivel ${nv.numero}`;
  $('cartelNombre').textContent = nv.nombre;
  c.classList.add('ver'); cartelTiempo = 3.2;
}

function buscarCercano() {
  const p = jugador.pos;
  for (const a of mundo.atriles) if (Math.hypot(p.x - a.x, p.z - a.z) < 1.9) return { tipo: 'atril', atril: a, texto: a.leida ? 'Volver a leer' : 'Leer la pista' };
  const c = mundo.cofre;
  if (Math.hypot(p.x - c.x, p.z - c.z) < 2.1 && p.y > c.y - 0.3) return { tipo: 'cofre', texto: estado.cofre ? 'Ver el tesoro' : 'Abrir el cofre' };
  return null;
}

function objetivo() {
  const A = mundo.atriles, p = jugador.pos;
  const masCercana = (lista, pos) => { let m = null, d = Infinity; for (const o of lista) { const dd = pos(o).distanceTo(p); if (dd < d) { d = dd; m = o; } } return m; };
  if (!estado.pistas[0]) return ['Lee la pista junto al arco de entrada', A[0].orbe.position];
  if (!estado.puerta) return ['Cruza la puerta que brilla como el sol', null];
  if (!estado.pistas[1]) return ['Lee la pista a orillas del estanque', A[1].orbe.position];
  if (!estado.estanque) return ['Cruza el estanque saltando de piedra en piedra', new THREE.Vector3(DISENO.controles.estanqueDespues, 0.8, 0)];
  if (!estado.pistas[2]) return ['Lee la pista a la entrada del laberinto', A[2].orbe.position];
  if (estado.rosas.length < D.ROSAS_NECESARIAS) {
    const r = masCercana(mundo.rosas.filter((x) => !x.tomada), (x) => x.grupo.position);
    return [`Encuentra las rosas de luz del laberinto (${estado.rosas.length}/${D.ROSAS_NECESARIAS})`, r?.grupo.position];
  }
  const L = mundo.laberinto;
  if (p.x < L.x0 + L.columnas * L.celda + 0.6) return ['Sal del laberinto por la reja de rosas', new THREE.Vector3(L.x0 + L.columnas * L.celda, 1.5, L.z0 + L.filaSalida * L.celda + 1)];
  if (!estado.pistas[3]) return ['Lee la pista junto a la fuente', A[3].orbe.position];
  if (!estado.faroles) return [`Enciende los faroles en el orden de la pista (${secuencia.length}/4)`, null];
  if (p.x < DISENO.controles.barrancoDespues) return ['Cruza el barranco por el puente de piedras', new THREE.Vector3(DISENO.controles.barrancoDespues, 0.8, 0)];
  if (estado.luc.length < D.LUCIERNAGAS_NECESARIAS) {
    const l = masCercana(mundo.luciernagas.filter((x) => !x.atrapada), (x) => x.malla.position);
    return [`Atrapa las luciérnagas del bosque (${estado.luc.length}/${D.LUCIERNAGAS_NECESARIAS})`, l?.malla.position];
  }
  if (!estado.cofre) return ['Sube al mirador y abre el cofre', new THREE.Vector3(mundo.cofre.x, mundo.cofre.y + 1.1, mundo.cofre.z)];
  return ['Encontraste el tesoro. Pasea por el jardín', null];
}

// ------------------------------------------------------------------ Bucle
const reloj = new THREE.Clock();
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
let t = 0, xAnterior = 0, enAgua = false;
const caidas = { estanque: 0, puente: 0 };
let fps = { cuadros: 0, tiempo: 0, revisado: false };

function pasoJugador(dt) {
  // dirección deseada relativa a la cámara
  let ad = 0, de = 0;
  if (modo === 'juego') {
    ad = (teclas.has('w') || teclas.has('arrowup') ? 1 : 0) - (teclas.has('s') || teclas.has('arrowdown') ? 1 : 0);
    de = (teclas.has('d') || teclas.has('arrowright') ? 1 : 0) - (teclas.has('a') || teclas.has('arrowleft') ? 1 : 0);
    if (palanca.activa) { ad = palanca.y; de = palanca.x; }
  }
  const largo = Math.min(1, Math.hypot(ad, de));
  const corre = teclas.has('shift') || (palanca.activa && largo > 0.95);
  const vel = (corre ? 6.4 : 4.1) * largo;
  const fx = Math.cos(cam.yaw), fz = Math.sin(cam.yaw);
  let dx = 0, dz = 0;
  if (largo > 0.05) {
    dx = fx * ad - fz * de; dz = fz * ad + fx * de;
    const n = Math.hypot(dx, dz); dx /= n; dz /= n;
  }
  const k = 1 - Math.exp(-dt * (jugador.enSuelo ? 12 : 7));
  jugador.vel.x += (dx * vel - jugador.vel.x) * k;
  jugador.vel.z += (dz * vel - jugador.vel.z) * k;

  const p = jugador.pos, yAntes = p.y;
  xAnterior = p.x;
  p.x += jugador.vel.x * dt; p.z += jugador.vel.z * dt;
  if (jugador.sobre && jugador.sobre.dz) p.z += jugador.sobre.dz;
  mundo.resolverChoques(p, 0.27);

  // salto con tolerancia
  jugador.bufferSalto = pedirSalto ? 0.2 : Math.max(0, jugador.bufferSalto - dt);
  pedirSalto = false;
  jugador.tiempoAire = jugador.enSuelo ? 0 : jugador.tiempoAire + dt;
  if (jugador.bufferSalto > 0 && jugador.tiempoAire < 0.18 && modo === 'juego') {
    jugador.vy = 6.1; jugador.enSuelo = false; jugador.tiempoAire = 1; jugador.bufferSalto = 0;
  }
  jugador.vy -= 15 * dt;
  p.y += jugador.vy * dt;
  const { h, sobre } = mundo.alturaSuelo(p.x, p.z, Math.max(yAntes, p.y));
  if (p.y <= h) { p.y = h; jugador.vy = 0; jugador.enSuelo = true; }
  else if (jugador.enSuelo && jugador.vy <= 0 && p.y - h < 0.32) { p.y = h; jugador.vy = 0; }
  else jugador.enSuelo = false;
  jugador.sobre = jugador.enSuelo ? sobre : null;

  // orientación del personaje
  const vh = Math.hypot(jugador.vel.x, jugador.vel.z);
  let giro = 0;
  if (vh > 0.3) {
    const objetivoRumbo = Math.atan2(jugador.vel.x, jugador.vel.z);
    let d = objetivoRumbo - jugador.rumbo; d = Math.atan2(Math.sin(d), Math.cos(d));
    const paso = d * Math.min(1, dt * 12); giro = paso / Math.max(dt, 1e-4);
    jugador.rumbo += paso;
  }
  personaje.objeto.position.copy(p);
  personaje.objeto.rotation.y = jugador.rumbo;
  personaje.animar(dt, vh, jugador.enSuelo, jugador.vy, giro);
}

function reglas() {
  const p = jugador.pos;
  // agua
  if (!enAgua && p.x > 21 && p.x < 38.5 && alturaTerreno(p.x, p.z) < NIVEL_AGUA - 0.03 && p.y < NIVEL_AGUA + 0.02) {
    enAgua = true;
    salpicar(p.x, p.z); sonidos.agua();
    caidas.estanque++;
    if (caidas.estanque >= 3 && !mundo.ayuda.estanque) { mundo.ayuda.estanque = true; setTimeout(() => aviso('Te dejé las piedras quietas para que cruces más fácil', 3.5), 900); }
    reaparecer('¡Splash! Salta de piedra en piedra (mantén adelante y presiona saltar)');
    setTimeout(() => (enAgua = false), 700);
  }
  // puertas
  const X = DISENO.puertas.x;
  if (xAnterior < X && p.x >= X) {
    const puerta = DISENO.puertas.lugares.find((l) => Math.abs(p.z - l.z) < 1.4);
    if (puerta?.correcta) {
      if (!estado.puerta) { estado.puerta = true; aviso('La puerta del sol te deja pasar'); puntoControl(X + 1.6, puerta.z, 0); sonidos.logro(); }
    } else if (puerta) {
      reaparecer('Esa puerta no brilla como el sol. Vuelve a leer la pista'); sonidos.error();
    }
  }
  if (!estado.control && p.x > DISENO.controles.puertas) puntoControl(DISENO.controles.puertas + 0.5, 0, 0);
  if (estado.puerta && p.x > DISENO.controles.estanqueAntes && p.x < 23 && (!estado.control || estado.control.x < DISENO.controles.estanqueAntes)) puntoControl(DISENO.controles.estanqueAntes + 0.3, 0, 0);
  if (!estado.estanque && p.x > DISENO.controles.estanqueDespues && jugador.enSuelo && alturaTerreno(p.x, p.z) > NIVEL_AGUA) {
    estado.estanque = true; aviso('¡Cruzaste el estanque!'); puntoControl(DISENO.controles.estanqueDespues + 0.3, 0, 0);
  }
  const C = DISENO.controles, avanzar = (x, z = 0) => { if (!estado.control || estado.control.x < x - 0.1) puntoControl(x, z, 0); };
  if (estado.estanque && p.x > 37 && p.x < 40) avanzar(C.estanqueDespues + 0.3);
  if (mundo.reja.abierta && p.x > C.laberintoSalida) avanzar(C.laberintoSalida + 0.3, 1);
  if (estado.faroles && p.x > C.barrancoAntes - 1 && p.x < 84) avanzar(C.barrancoAntes);
  if (p.x > C.barrancoDespues && jugador.enSuelo && p.y > -0.3) avanzar(C.barrancoDespues + 0.3);
  if (p.x > C.mirador) avanzar(C.mirador + 0.2);
  // nenúfares que se hunden
  if (jugador.sobre?.pisada) jugador.sobre.pisada(t);
  // caída al barranco
  if (!enAgua && p.y < -1.3) {
    enAgua = true;
    caidas.puente++;
    if (caidas.puente >= 3 && !mundo.ayuda.puente) { mundo.ayuda.puente = true; setTimeout(() => aviso('Te dejé las piedras del puente quietas', 3.5), 900); }
    reaparecer('¡Cuidado con el barranco! Salta cuando la piedra esté cerca');
    setTimeout(() => (enAgua = false), 700);
  }
  // rosas del laberinto
  for (const r of mundo.rosas) {
    if (r.tomada || Math.hypot(p.x - r.x, p.z - r.z) > 0.9) continue;
    r.tomar();
    if (!estado.rosas.includes(r.id)) estado.rosas.push(r.id);
    $('filaRosas').classList.remove('oculta');
    const n = estado.rosas.length;
    if (n >= D.ROSAS_NECESARIAS) { mundo.reja.abrir(); aviso('La reja de rosas se abre'); sonidos.logro(); }
    else { aviso(`Rosa ${n} de ${D.ROSAS_NECESARIAS}`, 1.8); sonidos.objeto(); }
    guardar();
  }
  // placas de los cuatro faroles
  if (!estado.faroles) {
    const placa = jugador.enSuelo ? mundo.placas.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 0.78) : null;
    if (placa && placa !== placaPisada) pisarPlaca(placa);
    placaPisada = placa || null;
  }
  // carteles de nivel
  const nv = D.nivelEn(p.x);
  if (nv && !estado.niveles.includes(nv.numero)) { estado.niveles.push(nv.numero); cartelNivel(nv); guardar(); }
  // luciérnagas
  tmp.copy(p); tmp.y += 1.0;
  for (const l of mundo.luciernagas) if (!l.atrapada && l.malla.position.distanceTo(tmp) < 1.15) atraparLuciernaga(l);
}

// salpicadura: anillos que se expanden en el agua
const anillos = [];
function salpicar(x, z) {
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.28, 40), new THREE.MeshBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, NIVEL_AGUA + 0.02, z);
    escena.add(m); anillos.push({ m, edad: -i * 0.18 });
  }
}

function pasoCamara(dt) {
  const p = jugador.pos;
  const focoDeseado = tmp.set(p.x, p.y + 1.35, p.z);
  cam.foco.lerp(focoDeseado, 1 - Math.exp(-dt * 10));
  cam.distActual += (cam.dist - cam.distActual) * Math.min(1, dt * 6);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const deseo = tmp2.set(cam.foco.x - Math.cos(cam.yaw) * cp * cam.distActual, cam.foco.y + sp * cam.distActual, cam.foco.z - Math.sin(cam.yaw) * cp * cam.distActual);
  const suelo = alturaTerreno(deseo.x, deseo.z) + 0.35;
  if (deseo.y < suelo) deseo.y = suelo;
  // que la cámara no atraviese los setos altos del laberinto
  const libre = mundo.libreCamara(cam.foco, deseo);
  if (libre < 1) {
    const largo = deseo.distanceTo(cam.foco), f = Math.max(0.12, libre - 0.06);
    deseo.sub(cam.foco).multiplyScalar(f).add(cam.foco);
    // si queda muy pegada, sube la cámara para mirar por encima del hombro
    const corto = largo * f;
    if (corto < 1.8) deseo.y += (1.8 - corto) * 0.9;
    cam.pos.lerp(deseo, 1 - Math.exp(-dt * 30));
  } else cam.pos.lerp(deseo, 1 - Math.exp(-dt * 14));
  camara.position.copy(cam.pos);
  camara.lookAt(cam.foco);
}

// cámara de la portada: recorre el jardín despacio
function pasoPortada(t) {
  const u = (t * 0.009) % 1;
  const x = THREE.MathUtils.lerp(-2, 104, (Math.sin(u * Math.PI * 2 - Math.PI / 2) + 1) / 2);
  camara.position.set(x, 2.3 + Math.sin(t * 0.2) * 0.3, Math.sin(t * 0.13) * 1.6);
  camara.lookAt(x + 12, 2.6, Math.sin(t * 0.1) * 2);
}

const lienzoMapa = $('mapa'), pincel = lienzoMapa.getContext('2d');
function dibujarMapa() {
  const L = mundo.laberinto, p = jugador.pos;
  const dentro = p.x > L.x0 - 1 && p.x < L.x0 + L.columnas * L.celda + 0.5 && Math.abs(p.z) < 8.5;
  lienzoMapa.classList.toggle('ver', dentro && modo === 'juego');
  if (!dentro) return;
  const ci = Math.floor((p.x - L.x0) / L.celda), cj = Math.floor((p.z - L.z0) / L.celda);
  if (ci >= 0 && cj >= 0 && ci < L.columnas && cj < L.filas) {
    const k = L.id(ci, cj);
    if (!estado.visitadas.includes(k)) { estado.visitadas.push(k); if (estado.visitadas.length % 4 === 0) guardar(); }
  }
  // el mapa mira hacia adelante (+X arriba, +Z a la derecha)
  const T = 13, W = L.filas * T, H = L.columnas * T, m = 10;
  if (lienzoMapa.width !== W + m * 2) { lienzoMapa.width = W + m * 2; lienzoMapa.height = H + m * 2; }
  const ctx = pincel; ctx.clearRect(0, 0, lienzoMapa.width, lienzoMapa.height);
  const px = (j) => m + j * T, py = (i) => m + (L.columnas - 1 - i) * T;
  const vis = new Set(estado.visitadas);
  const visto = (i, j) => vis.has(L.id(i, j));
  ctx.fillStyle = 'rgba(255,236,200,.13)';
  for (const k of vis) { const i = k % L.columnas, j = Math.floor(k / L.columnas); ctx.fillRect(px(j), py(i), T, T); }
  ctx.strokeStyle = 'rgba(140,200,140,.95)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < L.columnas; i++) for (let j = 0; j < L.filas; j++) {
    if (!visto(i, j)) continue;
    const x0 = px(j), y0 = py(i);
    // +X (arriba)
    if (i === L.columnas - 1 ? j !== L.filaSalida : !L.pasa(L.id(i, j), L.id(i + 1, j))) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + T, y0); }
    // -X (abajo)
    if (i === 0 ? j !== L.filaEntrada : !L.pasa(L.id(i, j), L.id(i - 1, j))) { ctx.moveTo(x0, y0 + T); ctx.lineTo(x0 + T, y0 + T); }
    // +Z (derecha)
    if (j === L.filas - 1 || !L.pasa(L.id(i, j), L.id(i, j + 1))) { ctx.moveTo(x0 + T, y0); ctx.lineTo(x0 + T, y0 + T); }
    // -Z (izquierda)
    if (j === 0 || !L.pasa(L.id(i, j), L.id(i, j - 1))) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + T); }
  }
  ctx.stroke();
  // rosas ya vistas y la reja
  for (const r of mundo.rosas) {
    const i = Math.floor((r.x - L.x0) / L.celda), j = Math.floor((r.z - L.z0) / L.celda);
    if (r.tomada || !visto(i, j)) continue;
    ctx.fillStyle = '#ff7eb3'; ctx.beginPath(); ctx.arc(px(j) + T / 2, py(i) + T / 2, 3.5, 0, 7); ctx.fill();
  }
  ctx.fillStyle = mundo.reja.abierta ? '#8fe0b8' : '#ff7eb3'; ctx.fillRect(px(L.filaSalida) + 2, py(L.columnas - 1) - 4, T - 4, 3);
  // jugadora
  const jx = m + ((p.z - L.z0) / L.celda) * T, jy = m + (L.columnas - (p.x - L.x0) / L.celda) * T;
  ctx.save(); ctx.translate(jx, jy); ctx.rotate(Math.PI - jugador.rumbo);
  ctx.fillStyle = '#ffe2b0'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4.5, 4); ctx.lineTo(-4.5, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function actualizarHUD() {
  dibujarMapa();
  const [texto, punto] = objetivo();
  $('objetivo').textContent = texto;
  const nv = D.nivelEn(jugador.pos.x);
  $('zona').textContent = nv.final ? nv.nombre : `Nivel ${nv.numero} · ${nv.nombre}`;
  $('cRosas').textContent = estado.rosas.length;
  $('cPistas').textContent = pistasLeidas();
  $('cLuc').textContent = estado.luc.length;
  const cerca = buscarCercano();
  $('accion').hidden = !cerca || modo !== 'juego';
  if (cerca) $('accionTexto').textContent = cerca.texto;
  if (tactil) $('accion').querySelector('kbd').textContent = '●';
  // marca del objetivo
  const marca = $('marca'), flecha = $('flecha');
  if (!punto || modo !== 'juego') { marca.style.opacity = '0'; flecha.style.display = 'none'; return; }
  const d = punto.distanceTo(jugador.pos);
  tmp.copy(punto).project(camara);
  const detras = tmp.z > 1;
  const x = (tmp.x * 0.5 + 0.5) * innerWidth, y = (-tmp.y * 0.5 + 0.5) * innerHeight;
  const dentro = !detras && x > 30 && x < innerWidth - 30 && y > 90 && y < innerHeight - 40;
  if (dentro) {
    marca.style.opacity = d < 2.2 ? '0' : '1';
    marca.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    $('marcaDist').textContent = `${Math.round(d)} m`;
    flecha.style.display = 'none';
  } else {
    marca.style.opacity = '0';
    let ax = tmp.x, ay = tmp.y; if (detras) { ax = -ax; ay = -ay; }
    const ang = Math.atan2(ay, ax), cx = innerWidth / 2, cy = innerHeight / 2, r = Math.min(cx, cy) - 50;
    flecha.style.display = 'block';
    flecha.style.left = `${cx + Math.cos(ang) * r - 11}px`;
    flecha.style.top = `${cy - Math.sin(ang) * r - 10}px`;
    flecha.style.transform = `rotate(${-ang + Math.PI / 2}rad)`;
  }
}

function cuadro() {
  const dt = Math.min(0.05, reloj.getDelta());
  t += dt;
  if (mundo) {
    if (modo === 'portada') pasoPortada(t);
    else if (modo !== 'carga') {
      if (modo === 'juego' || modo === 'panel') pasoJugador(modo === 'juego' ? dt : 0.0001);
      if (modo === 'juego') reglas();
      pasoCamara(dt);
      actualizarHUD();
    }
    mundo.actualizar(t, dt, camara, modo === 'portada' ? camara.position : jugador.pos, modo === 'portada' ? null : jugador.pos);
    if (orbeJugador) {
      orbeJugador.position.set(jugador.pos.x, jugador.pos.y + 2.2, jugador.pos.z);
      orbeJugador.intensity = estado.luc.length * 0.22;
    }
    for (let i = anillos.length - 1; i >= 0; i--) {
      const a = anillos[i]; a.edad += dt;
      if (a.edad < 0) { a.m.visible = false; continue; }
      a.m.visible = true; a.m.scale.setScalar(1 + a.edad * 6); a.m.material.opacity = Math.max(0, 0.8 - a.edad * 0.9);
      if (a.edad > 0.9) { escena.remove(a.m); a.m.geometry.dispose(); anillos.splice(i, 1); }
    }
    if (avisoTiempo > 0) { avisoTiempo -= dt; if (avisoTiempo <= 0) $('aviso').classList.remove('ver'); }
    if (cartelTiempo > 0) { cartelTiempo -= dt; if (cartelTiempo <= 0) $('cartel').classList.remove('ver'); }
    pasoFinal.uniforms.tiempo.value = t;
    composer.render(dt);
    // calidad adaptable: si va lento, baja la resolución
    if (modo === 'juego' && !fps.revisado) {
      fps.cuadros++; fps.tiempo += dt;
      if (fps.tiempo > 4) {
        const medio = fps.cuadros / fps.tiempo; fps.revisado = true;
        if (medio < 40 && escalaPixel > 0.85) { escalaPixel = Math.max(0.85, escalaPixel * 0.75); ajustar(); fps = { cuadros: 0, tiempo: 0, revisado: false }; }
      }
    }
  }
  requestAnimationFrame(cuadro);
}

// ------------------------------------------------------------------ Inicio
function comenzar(continuar) {
  iniciarSonido();
  const guardado = continuar ? cargarGuardado() : null;
  estado = guardado || nuevoEstado();
  if (!continuar) try { localStorage.removeItem(CLAVE); } catch {}
  // aplicar el progreso guardado al mundo
  estado.pistas.forEach((l, i) => mundo.atriles[i].marcarLeida(l));
  for (const l of mundo.luciernagas) {
    l.atrapada = estado.luc.includes(l.id);
    l.orden = estado.luc.indexOf(l.id);
    if (l.atrapada) { l.malla.position.set(estado.control?.x ?? 0, 1.5, estado.control?.z ?? 0); }
  }
  if (estado.luc.length >= D.LUCIERNAGAS_NECESARIAS) mundo.barrera.abrir(true);
  for (const r of mundo.rosas) if (estado.rosas.includes(r.id)) r.tomar();
  if (estado.rosas.length >= D.ROSAS_NECESARIAS) mundo.reja.abrir(true);
  secuencia = [];
  if (estado.faroles) { mundo.placas.forEach((q) => q.encender(true)); mundo.puente.activar(true); }
  $('filaRosas').classList.toggle('oculta', !(estado.pistas[2] || estado.rosas.length));
  if (estado.cofre) mundo.cofre.abrir(true);
  $('filaLuc').classList.toggle('oculta', !(estado.faroles || estado.luc.length));
  $('portada').hidden = true;
  fundido(() => {
    const c = estado.control || DISENO.inicio;
    colocarJugador(c.x, c.z, c.giro ?? 0);
    $('hud').hidden = false;
    personaje.objeto.visible = true;
    modo = 'juego';
    if (!continuar) {
      abrirPanel({ sub: `Para ${D.DESTINATARIA}`, titulo: D.TITULO, cuerpo: `<p>${D.BIENVENIDA}</p>${tablaControles()}`, botones: [{ texto: 'Entrar al jardín' }] });
    } else aviso('Bienvenida de vuelta al jardín');
  });
}

async function iniciar() {
  const barra = $('cargaBarra');
  const progreso = { modelos: 0, real: 0 };
  const pintar = () => { barra.style.width = `${Math.round(progreso.modelos * 15 + progreso.real * 60)}%`; };
  const draco = new DRACOLoader().setDecoderPath('vendor/three/examples/jsm/libs/draco/gltf/');
  const cargador = new GLTFLoader().setDRACOLoader(draco);
  const texturas = new THREE.TextureLoader();
  const tex = (nombre, color = true) => {
    const t = texturas.load(`assets/tex/${nombre}`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const sinReal = parametros.has('simple');
  const [gltf, real] = await Promise.all([
    cargador.loadAsync('assets/modelos.glb', (e) => { if (e.total) { progreso.modelos = e.loaded / e.total; pintar(); } }),
    sinReal ? null : cargador.loadAsync('assets/realista.glb', (e) => { if (e.total) { progreso.real = e.loaded / e.total; pintar(); } }).catch((e) => { console.warn('Sin modelos realistas', e); return null; }),
  ]);
  let texs = null;
  if (real) {
    texs = {
      pasto: tex('leafy_grass_color.jpg'), senda: tex('brown_mud_leaves_01_color.jpg'), grava: tex('gravel_floor_color.jpg'), lodo: tex('mossy_rock_color.jpg'),
      piedra: tex('rustic_stone_wall_color.jpg'), rocaMusgo: tex('mossy_rock_color.jpg'), madera: tex('brown_planks_04_color.jpg'), corteza: tex('bark_brown_02_color.jpg'),
      hoja: tex('hoja.png'),
    };
    new RGBELoader().load('assets/tex/moonlit_golf_1k.hdr', (hdr) => {
      const pm = new THREE.PMREMGenerator(renderer);
      escena.environment = pm.fromEquirectangular(hdr).texture;
      escena.environmentIntensity = 0.35;
      hdr.dispose(); pm.dispose();
    });
  }
  $('cargaTexto').textContent = 'Plantando el jardín…'; barra.style.width = '78%';
  await new Promise((r) => setTimeout(r, 30));
  mundo = construirMundo(escena, gltf, calidad, real, texs);
  personaje = crearPersonaje();
  escena.add(personaje.objeto);
  orbeJugador = new THREE.PointLight(0xfff0a0, 0, 6, 2);
  escena.add(orbeJugador);
  colocarJugador(DISENO.inicio.x, DISENO.inicio.z, 0);
  barra.style.width = '92%'; $('cargaTexto').textContent = 'Encendiendo los faroles…';
  await new Promise((r) => setTimeout(r, 30));
  pasoPortada(0);
  mundo.actualizar(0, 0.016, camara, camara.position, null);
  renderer.compile(escena, camara);
  barra.style.width = '100%';
  modo = 'portada';
  personaje.objeto.visible = false;
  requestAnimationFrame(cuadro);
  setTimeout(() => $('carga').classList.add('fuera'), 150);
  $('portada').hidden = false;
  const hay = !!cargarGuardado();
  $('btnContinuar').hidden = !hay;
  $('btnComenzar').textContent = hay ? 'Empezar de nuevo' : 'Comenzar la aventura';
  $('btnComenzar').className = hay ? 'secundario' : 'primario';
  $('btnContinuar').onclick = () => comenzar(true);
  $('btnComenzar').onclick = () => comenzar(false);
  $('btnControles').onclick = () => abrirPanel({ titulo: 'Cómo se juega', cuerpo: `<p class="suave">${D.BIENVENIDA}</p>${tablaControles()}`, botones: [{ texto: 'Volver' }] });
  if (parametros.has('prueba')) exponerPruebas();
}

// ------------------------------------------------------------------ Ganchos para pruebas automáticas (?prueba)
function exponerPruebas() {
  window.__jardin = {
    estado: () => estado, modo: () => modo,
    comenzar: () => { comenzar(false); },
    cerrarPanel,
    ir: (x, z, giro = 0, pitch = 0.3) => { colocarJugador(x, z, giro); cam.pitch = pitch; },
    camara: (yaw, pitch, dist) => { cam.yaw = yaw; cam.pitch = pitch; if (dist) cam.dist = cam.distActual = dist; },
    teclas, interactuar, saltar: () => (pedirSalto = true),
    jugador: () => ({ x: jugador.pos.x, y: jugador.pos.y, z: jugador.pos.z, suelo: jugador.enSuelo }),
    atrapar: () => mundo.luciernagas.forEach((l) => !l.atrapada && atraparLuciernaga(l)),
    rosas: () => mundo.rosas.map((r) => ({ x: r.x, z: r.z, tomada: r.tomada })),
    mapaVisible: () => lienzoMapa.classList.contains('ver'),
    reja: () => mundo.reja.abierta, puente: () => mundo.puente.progreso,
    placas: () => mundo.placas.map((q) => ({ nombre: q.nombre, x: q.x, z: q.z, encendida: q.encendida })),
    nenufares: () => mundo.piedras.filter((q) => q.sup.nenufar).map((q) => ({ x: q.sup.x, z: q.sup.z, tope: q.sup.tope })),
    info: () => renderer.info.render,
    // avanza el juego con pasos fijos de 1/60 s (sin depender de la velocidad del navegador de pruebas)
    simular: (segundos, keys = [], saltarEn = -1) => {
      keys.forEach((k) => teclas.add(k));
      const n = Math.round(segundos * 60);
      for (let i = 0; i < n; i++) {
        if (i === saltarEn) pedirSalto = true;
        t += 1 / 60;
        mundo.actualizar(t, 1 / 60, camara, jugador.pos, jugador.pos);
        if (modo === 'juego') { pasoJugador(1 / 60); reglas(); }
      }
      keys.forEach((k) => teclas.delete(k));
    },
  };
}

iniciar().catch((e) => {
  console.error(e);
  $('cargaTexto').textContent = 'No se pudo cargar el jardín. Recarga la página.';
});
