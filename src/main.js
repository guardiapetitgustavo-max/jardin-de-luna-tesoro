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
import { iniciarSonido, alternarSonido, sonidos, campana, NOTAS_CAMPANAS, cajaMusica } from './sonido.js';

const $ = (id) => document.getElementById(id);
const parametros = new URLSearchParams(location.search);
const tactil = matchMedia('(pointer: coarse)').matches;
const calidad = parametros.get('calidad') || (tactil || (navigator.hardwareConcurrency || 8) <= 4 ? 'baja' : 'alta');
const alta = calidad === 'alta';
const CLAVE = 'jardinDeLuna.v2';

// ------------------------------------------------------------------ Render
const lienzo = $('lienzo');
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: parametros.has('prueba') });
const escalaMax = Math.min(devicePixelRatio, alta ? 1.35 : 1.1);
let escalaPixel = escalaMax;
renderer.setPixelRatio(escalaPixel);
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.info.autoReset = false;

const escena = new THREE.Scene();
// lo que está a más de ~100 m ya lo tapa la niebla: no se dibuja (el cielo se pinta aparte, siempre al fondo)
const camara = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, alta ? 92 : 82);
camara.layers.enable(1); // capa 1: pasto (no se refleja en el agua)

// sin MSAA en el composer: en algunas tarjetas el multimuestreo en media precisión deja la pantalla en blanco
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(escena, camara));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight).multiplyScalar(alta ? 0.5 : 0.35), 0.5, 0.45, 0.9);
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
// suavizado de bordes (FXAA) barato, después de pasar a color de pantalla
const pasoSuave = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, paso: { value: new THREE.Vector2(1 / 1920, 1 / 1080) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 paso; varying vec2 vUv;
    float lum(vec3 c){ return dot(c, vec3(.299, .587, .114)); }
    void main(){
      vec3 m = texture2D(tDiffuse, vUv).rgb;
      float lNW = lum(texture2D(tDiffuse, vUv + vec2(-1., -1.) * paso).rgb), lNE = lum(texture2D(tDiffuse, vUv + vec2(1., -1.) * paso).rgb);
      float lSW = lum(texture2D(tDiffuse, vUv + vec2(-1., 1.) * paso).rgb), lSE = lum(texture2D(tDiffuse, vUv + vec2(1., 1.) * paso).rgb);
      float lM = lum(m), lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      if (lMax - lMin < max(.0312, lMax * .125)) { gl_FragColor = vec4(m, 1.); return; }
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
      float red = max((lNW + lNE + lSW + lSE) * .03125, 1. / 128.);
      dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), vec2(-8.), vec2(8.)) * paso;
      vec3 a = .5 * (texture2D(tDiffuse, vUv + dir * (1. / 3. - .5)).rgb + texture2D(tDiffuse, vUv + dir * (2. / 3. - .5)).rgb);
      vec3 b = a * .5 + .25 * (texture2D(tDiffuse, vUv - dir * .5).rgb + texture2D(tDiffuse, vUv + dir * .5).rgb);
      float lB = lum(b);
      gl_FragColor = vec4((lB < lMin || lB > lMax) ? a : b, 1.);
    }`,
});
composer.addPass(pasoSuave);

// Si la tarjeta gráfica deja la imagen en blanco (o negra) con los efectos, se apagan solos y se dibuja directo.
let sinPost = parametros.has('sinefectos'), revisiones = 0, malas = 0;
const pixel = new Uint8Array(4);
function revisarPantalla() {
  revisiones++;
  const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  let blancos = 0;
  for (const [fx, fy] of [[0.2, 0.3], [0.5, 0.5], [0.8, 0.3], [0.3, 0.75], [0.7, 0.75]]) {
    gl.readPixels(Math.floor(w * fx), Math.floor(h * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    if (pixel[0] > 238 && pixel[1] > 238 && pixel[2] > 238) blancos++;
  }
  if (blancos < 5) { malas = 0; return; }
  if (++malas < 2) return;
  malas = 0;
  if (bloom.enabled) { bloom.enabled = false; console.warn('Pantalla en blanco: se apaga el resplandor'); revisiones = 0; }
  else if (!sinPost) { sinPost = true; console.warn('Pantalla en blanco: se dibuja sin efectos'); revisiones = 0; }
}
function ajustar() {
  camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix();
  renderer.setPixelRatio(escalaPixel);
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(escalaPixel);
  composer.setSize(innerWidth, innerHeight);
  const b = new THREE.Vector2(); renderer.getDrawingBufferSize(b);
  pasoSuave.uniforms.paso.value.set(1 / b.x, 1 / b.y);
}
addEventListener('resize', ajustar);
ajustar(); // tamaño correcto desde el primer cuadro (si no, los efectos quedaban de 1×1 y la pantalla salía de un solo color)

// ------------------------------------------------------------------ Estado de la aventura
const nuevoEstado = () => ({ pistas: D.PISTAS.map(() => false), puerta: false, estanque: false, rosas: [], faroles: false, luc: [], cofre: false, control: null, niveles: [], visitadas: [], deseos: 0,
  rio: false, campanas: false, estatuas: false, giros: null, mariposas: [], escalera: false, recuerdos: [] });
let estado = nuevoEstado();
const guardar = () => { if (!parametros.has('prueba')) try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch {} };
const cargarGuardado = () => { try { const s = JSON.parse(localStorage.getItem(CLAVE)); return s && Array.isArray(s.pistas) ? { ...nuevoEstado(), ...s } : null; } catch { return null; } };
const pistasLeidas = () => estado.pistas.filter(Boolean).length;
// El cofre se abre al llegar al mirador aunque no se hayan leído todas las pistas (las luciérnagas ya abren el camino).
const puedeAbrir = () => true;
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
    if (k === 'f' && !e.repeat) alternarFoto();
  } else if (modo === 'cine' && !e.repeat) { salirCielo(); return;
  } else if (modo === 'foto' && !e.repeat) {
    if (k === 'f' || k === 'escape') alternarFoto();
    if (k === ' ' || k === 'enter') guardarFoto();
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
  if (modo === 'cine') { salirCielo(); return; }
  if (modo !== 'juego' && modo !== 'foto') return;
  if (e.pointerType === 'mouse' && !document.pointerLockElement && !parametros.has('prueba')) {
    lienzo.requestPointerLock?.()?.catch?.(() => {});
  }
  arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY };
  lienzo.setPointerCapture(e.pointerId);
});
lienzo.addEventListener('pointermove', (e) => {
  if (modo !== 'juego' && modo !== 'foto') return;
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

function alternarFoto() {
  if (modo === 'juego') { modo = 'foto'; document.body.classList.add('foto'); teclas.clear(); }
  else if (modo === 'foto') { modo = 'juego'; document.body.classList.remove('foto'); }
}
function guardarFoto() {
  composer.render();
  const a = document.createElement('a');
  a.href = lienzo.toDataURL('image/png'); a.download = 'jardin-de-luna.png'; a.click();
  const f = $('fundido'); f.style.background = '#fff'; f.style.opacity = '0.7'; setTimeout(() => { f.style.opacity = '0'; setTimeout(() => (f.style.background = ''), 400); }, 90);
}
$('btnFoto').addEventListener('click', () => alternarFoto());
$('fotoGuardar').addEventListener('click', () => guardarFoto());
$('fotoSalir').addEventListener('click', () => alternarFoto());

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
  else if (cerca.tipo === 'campana') tocarCampana(cerca.campana);
  else if (cerca.tipo === 'piedra') cantarPiedra();
  else if (cerca.tipo === 'estatua') girarEstatua(cerca.estatua);
  else abrirCofre();
}

// ---------------------------------------------------------------- Nivel 7: campanas de viento
let melodia = [], cantando = false;
const notaDe = (b) => NOTAS_CAMPANAS[mundo.campanas.orden.indexOf(b.i)];
function tocarCampana(b) {
  campana(notaDe(b));
  if (estado.campanas || cantando) { b.tocar(t, true); return; }
  const esperado = mundo.campanas.orden[melodia.length];
  if (b.i === esperado) {
    b.tocar(t, true); b.acierto = true; melodia.push(b.i);
    if (melodia.length === 4) {
      estado.campanas = true; guardar();
      mundo.campanas.puerta.abrir();
      setTimeout(() => sonidos.logro(), 700);
      aviso('¡Qué bonita canción! El arco de las campanas se abre', 4);
    } else aviso(`Campana ${melodia.length} de 4`, 1.4);
  } else {
    b.tocar(t, false); melodia = []; mundo.campanas.lista.forEach((x) => (x.acierto = false));
    setTimeout(() => sonidos.error(), 250);
    aviso('Esa no seguía. Empieza otra vez por la más grande (la piedra del centro te canta la canción)', 3.6);
  }
}
function cantarPiedra() {
  if (cantando) return;
  cantando = true;
  aviso('La piedra canta la canción de las campanas…', 3);
  mundo.campanas.orden.forEach((i, k) => setTimeout(() => { const b = mundo.campanas.lista[i]; b.tocar(t, true); campana(notaDe(b), 0.07); }, 600 + k * 750));
  setTimeout(() => { cantando = false; if (!estado.campanas) { melodia = []; mundo.campanas.lista.forEach((x) => (x.acierto = false)); } }, 600 + 4 * 750);
}

// ---------------------------------------------------------------- Nivel 8: estatuas
function girarEstatua(s) {
  if (estado.estatuas) return;
  s.girar(); sonidos.piedra();
  estado.giros = mundo.estatuas.lista.map((x) => x.giros); guardar();
  const bien = mundo.estatuas.lista.filter((x) => x.mira()).length;
  if (bien === 3) {
    estado.estatuas = true; guardar();
    setTimeout(() => { mundo.estatuas.puerta.abrir(); sonidos.logro(); aviso('Las tres estatuas miran a la luna. El arco se abre', 4); }, 900);
  } else if (s.mira()) setTimeout(() => { sonidos.objeto(); aviso(`Esta ya mira a la luna (${bien} de 3)`, 1.8); }, 700);
}
function atraparMariposa(b) {
  b.atrapada = true; b.orden = estado.mariposas.length;
  if (!estado.mariposas.includes(b.id)) estado.mariposas.push(b.id);
  const n = estado.mariposas.length;
  sonidos.mariposa();
  if (n >= D.MARIPOSAS_NECESARIAS) { mundo.puertaInvernadero.abrir(); aviso('Las mariposas te abren la puerta del invernadero', 3.6); setTimeout(() => sonidos.logro(), 400); }
  else aviso(`Mariposa ${n} de ${D.MARIPOSAS_NECESARIAS}`, 1.6);
  guardar();
}
function tomarRecuerdo(o) {
  o.tomar();
  if (!estado.recuerdos.includes(o.id)) estado.recuerdos.push(o.id);
  const R = D.RECUERDOS[o.id];
  sonidos.recuerdo();
  $('filaRec').classList.remove('oculta');
  aviso(`Encontraste un recuerdo: ${R.icono} ${R.nombre} (${estado.recuerdos.length}/10)`, 3);
  guardar();
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
  if (estado.cofre) { cajaMusica.iniciar(); mostrarRecuerdos(); return; }
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
  setTimeout(() => { cajaMusica.iniciar(); mostrarCarta(); }, 2600); // primero se ve abrirse el cofre, luego sale la carta (con caja de música)
}
// ---------------------------------------------------------------- Final: carta, cupones y luego la cámara sube al cielo
function mostrarCarta() {
  abrirPanel({ sub: 'Una carta para ti', titulo: `Para ${D.DESTINATARIA}`, cuerpo: '<div class="carta" id="carta"></div>', botones: [{ texto: 'Abrir el tesoro', accion: () => setTimeout(mostrarRecuerdos, 250) }] });
  const caja = $('carta'), parrafos = [...D.CARTA, D.FIRMA];
  let i = 0, j = 0, p = null;
  const escribir = () => {
    if (!panel.open || !caja.isConnected) return;
    if (i >= parrafos.length) return;
    if (!p) { p = document.createElement('p'); if (i === parrafos.length - 1) p.className = 'firma'; caja.appendChild(p); }
    p.textContent = parrafos[i].slice(0, ++j);
    if (j >= parrafos[i].length) { i++; j = 0; p = null; setTimeout(escribir, 420); } else setTimeout(escribir, 22);
  };
  escribir();
}
function mostrarRecuerdos() {
  const n = estado.recuerdos.length;
  const items = D.RECUERDOS.map((r, i) => {
    const tiene = estado.recuerdos.includes(i);
    return `<li class="${tiene ? '' : 'falta'}" style="animation-delay:${0.08 + i * 0.07}s"><span class="ico">${tiene ? r.icono : '?'}</span><b>${tiene ? r.nombre : 'Sin encontrar'}</b><small>${tiene ? r.texto : `Nivel ${i + 1}`}</small></li>`;
  }).join('');
  abrirPanel({
    sub: `${n} de 10 recuerdos`, titulo: 'Tus recuerdos del jardín',
    cuerpo: `<ul class="recuerdos">${items}</ul><p class="suave">${n === 10 ? '¡Los encontraste todos!' : 'Los que faltan siguen escondidos en el jardín: puedes volver a buscarlos.'}</p>`,
    botones: [{ texto: 'Ver los cupones', accion: () => setTimeout(mostrarCupones, 250) }],
  });
}
function mostrarCupones() {
  abrirPanel({
    sub: `De ${D.AUTOR}, para ${D.DESTINATARIA}`, titulo: 'El tesoro de los dos',
    cuerpo: `<ul class="cupones">${D.CUPONES.map(([t, d], i) => `<li style="animation-delay:${0.1 + i * 0.08}s">${t}<small>${d}</small></li>`).join('')}</ul><p class="suave">Elige un cupón y dime cuándo lo usamos.</p>`,
    botones: [{ texto: 'Mirar el cielo', accion: () => setTimeout(iniciarCine, 300) }],
  });
}
let cine = null;
const cineDesde = new THREE.Vector3(), cineMira = new THREE.Vector3(), cineA = new THREE.Vector3(), cineB = new THREE.Vector3();
function iniciarCine() {
  if (cine) return;
  if (document.pointerLockElement) document.exitPointerLock();
  mundo.celebrar(true);
  mundo.estrellaKimberly.mostrar();
  cajaMusica.iniciar();
  cineDesde.copy(camara.position);
  cineMira.copy(cam.foco);
  cine = { t: 0, dur: 8 };
  modo = 'cine';
  teclas.clear(); palanca.x = palanca.y = 0; palanca.activa = false;
  $('hud').classList.add('cine');
  aviso('Mira el cielo…', 3);
  setTimeout(() => sonidos.logro(), 2500);
  setTimeout(() => { if (cine) $('dedicatoriaFinal').classList.add('ver'); }, 4500);
  setTimeout(() => { if (cine) $('volverFinal').classList.add('ver'); }, 15000);
}
function pasoCine(dt) {
  cine.t += dt;
  const M = mundo.mirador, t = cine.t;
  const u = Math.min(1, t / cine.dur), s = u * u * (3 - 2 * u);
  // destino: detrás del mirador, mirando hacia arriba donde estallan los fuegos y suben los farolillos
  const d = t * 0.04;
  cineA.set(M.x - 8 + Math.sin(d) * 1.2, M.y + 5 + Math.sin(t * 0.3) * 0.3, M.z + Math.cos(d * 0.8) * 1.5);
  cineB.set(M.x + 10, M.y + 16 + Math.sin(t * 0.21) * 0.8, M.z + Math.sin(t * 0.13) * 2.5);
  camara.position.lerpVectors(cineDesde, cineA, s);
  camara.lookAt(cineA.lerpVectors(cineMira, cineB, s));
}
function salirCielo() {
  if (!cine || cine.t < 6) return;
  cine = null;
  mundo.celebrar(false);
  cajaMusica.parar();
  $('dedicatoriaFinal').classList.remove('ver');
  $('volverFinal').classList.remove('ver');
  fundido(() => {
    $('hud').classList.remove('cine');
    colocarJugador(mundo.cofre.x - 1.2, mundo.cofre.z, 0);
    modo = 'juego';
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
  if (p.x > 128 && p.x < 142) {
    for (const b of mundo.campanas.lista) if (Math.hypot(p.x - b.x, p.z - b.z) < 1.7) return { tipo: 'campana', campana: b, texto: 'Tocar la campana' };
    const q = mundo.campanas.piedra;
    if (Math.hypot(p.x - q.x, p.z - q.z) < 1.7) return { tipo: 'piedra', texto: 'Escuchar la canción' };
  }
  if (p.x > 144 && p.x < 157 && !estado.estatuas) for (const e of mundo.estatuas.lista) if (Math.hypot(p.x - e.x, p.z - e.z) < 1.8) return { tipo: 'estatua', estatua: e, texto: 'Girar la estatua' };
  const c = mundo.cofre;
  if (Math.hypot(p.x - c.x, p.z - c.z) < 2.1 && p.y > c.y - 0.3) return { tipo: 'cofre', texto: estado.cofre ? 'Volver a abrir el cofre' : 'Abrir el cofre' };
  return null;
}

function objetivo() {
  const A = mundo.atriles, p = jugador.pos;
  const masCercana = (lista, pos) => { let m = null, d = Infinity; for (const o of lista) { const dd = pos(o).distanceTo(p); if (dd < d) { d = dd; m = o; } } return m; };
  // una pista que se dejó atrás ya no se pide: se sigue con lo siguiente
  const falta = (i) => !estado.pistas[i] && p.x < A[i].x + 3;
  if (falta(0)) return ['Lee la pista junto al arco de entrada', A[0].orbe.position];
  if (!estado.puerta) return ['Cruza la puerta que brilla como el sol', null];
  if (falta(1)) return ['Lee la pista a orillas del estanque', A[1].orbe.position];
  if (!estado.estanque) return ['Cruza el estanque saltando de piedra en piedra', new THREE.Vector3(DISENO.controles.estanqueDespues, 0.8, 0)];
  if (falta(2)) return ['Lee la pista a la entrada del laberinto', A[2].orbe.position];
  if (estado.rosas.length < D.ROSAS_NECESARIAS) {
    const r = masCercana(mundo.rosas.filter((x) => !x.tomada), (x) => x.grupo.position);
    return [`Encuentra las rosas de luz del laberinto (${estado.rosas.length}/${D.ROSAS_NECESARIAS})`, r?.grupo.position];
  }
  const L = mundo.laberinto;
  if (p.x < L.x0 + L.columnas * L.celda + 0.6) return ['Sal del laberinto por la reja de rosas', new THREE.Vector3(L.x0 + L.columnas * L.celda, 1.5, L.z0 + L.filaSalida * L.celda + 1)];
  if (falta(3)) return ['Lee la pista junto a la fuente', A[3].orbe.position];
  if (!estado.faroles) return [`Enciende los faroles en el orden de la pista (${secuencia.length}/4)`, null];
  if (p.x < DISENO.controles.barrancoDespues) return ['Cruza el barranco por el puente de piedras', new THREE.Vector3(DISENO.controles.barrancoDespues, 0.8, 0)];
  if (estado.luc.length < D.LUCIERNAGAS_NECESARIAS) {
    const l = masCercana(mundo.luciernagas.filter((x) => !x.atrapada), (x) => x.malla.position);
    return [`Atrapa las luciérnagas del bosque (${estado.luc.length}/${D.LUCIERNAGAS_NECESARIAS})`, l?.malla.position];
  }
  if (p.x < DISENO.barrera + 1) return ['Cruza la cortina de luz hacia el río', new THREE.Vector3(DISENO.barrera + 2, 1.2, 0)];
  const C = DISENO.controles;
  if (falta(4)) return ['Lee la pista junto al río', A[4].orbe.position];
  if (!estado.rio) return ['Cruza el río saltando a las balsas de linterna', new THREE.Vector3(C.rioDespues, 0.8, 0)];
  if (falta(5)) return ['Lee la pista de las campanas', A[5].orbe.position];
  if (!estado.campanas) {
    const q = mundo.campanas.piedra;
    return [`Toca las campanas de la más grande a la más pequeña (${melodia.length}/4)`, new THREE.Vector3(q.x, q.y + 1.4, q.z)];
  }
  if (falta(6)) return ['Lee la pista del jardín de las estatuas', A[6].orbe.position];
  if (!estado.estatuas) {
    const L = mundo.estatuas.lista, mal = L.filter((x) => !x.mira());
    const e = masCercana(mal.length ? mal : L, (x) => tmp2.set(x.x, x.y + 2.2, x.z).clone());
    return [`Gira las estatuas hasta que miren a la luna (${L.length - mal.length}/3)`, e ? new THREE.Vector3(e.x, e.y + 2.6, e.z) : null];
  }
  if (estado.mariposas.length < D.MARIPOSAS_NECESARIAS) {
    const b = masCercana(mundo.mariposas.filter((x) => !x.atrapada), (x) => x.grupo.position);
    return [`Atrapa las mariposas del invernadero (${estado.mariposas.length}/${D.MARIPOSAS_NECESARIAS})`, b?.grupo.position];
  }
  if (!estado.escalera) {
    const sig = mundo.escalera.estrellas.find((e) => e.sup.tope > p.y + 0.2) || mundo.escalera.estrellas[mundo.escalera.estrellas.length - 1];
    return ['Sube la escalera de estrellas hasta lo alto', p.x < 176 ? new THREE.Vector3(C.escalera + 1, 1, 0) : new THREE.Vector3(sig.sup.x, sig.sup.tope + 0.8, sig.sup.z)];
  }
  if (!estado.cofre) return ['Abre el cofre del mirador', new THREE.Vector3(mundo.cofre.x, mundo.cofre.y + 1.1, mundo.cofre.z)];
  return ['Encontraste el tesoro. Pasea por el jardín', null];
}

// ------------------------------------------------------------------ Bucle
const reloj = new THREE.Clock();
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
let t = 0, xAnterior = 0, enAgua = false;
const caidas = { estanque: 0, puente: 0, rio: 0, escalera: 0 };
let enEscalera = false;
const ambiente = { buho: 15, rana: 3 };
let fps = { cuadros: 0, tiempo: 0 }, cuadroN = 0;

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
  const enRio = Math.abs(p.x - DISENO.rio.x) < 4.3;
  if (!enAgua && ((p.x > 21 && p.x < 38.5) || enRio) && alturaTerreno(p.x, p.z) < NIVEL_AGUA - 0.03 && p.y < NIVEL_AGUA + 0.02) {
    enAgua = true;
    salpicar(p.x, p.z); sonidos.agua();
    if (enRio) {
      caidas.rio++;
      if (caidas.rio >= 3 && !mundo.ayuda.rio) { mundo.ayuda.rio = true; setTimeout(() => aviso('Te dejé las balsas quietas para que cruces más fácil', 3.5), 900); }
      reaparecer('¡Splash! Espera a que la balsa se acerque y salta');
    } else {
      caidas.estanque++;
      if (caidas.estanque >= 3 && !mundo.ayuda.estanque) { mundo.ayuda.estanque = true; setTimeout(() => aviso('Te dejé las piedras quietas para que cruces más fácil', 3.5), 900); }
      reaparecer('¡Splash! Salta de piedra en piedra (mantén adelante y presiona saltar)');
    }
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
  // niveles 6 a 10: puntos de control
  if (p.x > C.rioAntes && p.x < 115.2) avanzar(C.rioAntes);
  if (!estado.rio && p.x > C.rioDespues && jugador.enSuelo && alturaTerreno(p.x, p.z) > NIVEL_AGUA) { estado.rio = true; aviso('¡Cruzaste el río!'); sonidos.objeto(); }
  if (estado.rio && p.x > C.rioDespues) avanzar(C.rioDespues + 0.3);
  if (p.x > C.campanas) avanzar(C.campanas);
  if (estado.campanas && p.x > C.estatuas) avanzar(C.estatuas);
  if (estado.estatuas && p.x > C.invernadero) avanzar(C.invernadero);
  if (p.x > C.escalera && p.y < 1) avanzar(C.escalera);
  // escalera de estrellas: si se cae, ayuda a la tercera vez
  if (jugador.sobre?.estrella) enEscalera = true;
  else if (enEscalera && jugador.enSuelo && p.y < 1.2) {
    enEscalera = false; caidas.escalera++;
    if (caidas.escalera >= 3 && !mundo.ayuda.escalera) { mundo.ayuda.escalera = true; aviso('Las estrellas ahora son más grandes y no se mueven', 3.5); }
    else aviso('Casi… vuelve a la primera estrella', 2);
  }
  if (!estado.escalera && p.x > DISENO.meseta.x + 0.3 && p.y > DISENO.meseta.alto - 0.4) { estado.escalera = true; enEscalera = false; aviso('¡Llegaste a lo alto! El mirador te espera', 3.2); sonidos.logro(); }
  if (p.x > C.mirador && p.y > DISENO.meseta.alto - 0.5) avanzar(C.mirador + 0.2);
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
  // sonidos del ambiente
  ambiente.buho -= 1 / 60; ambiente.rana -= 1 / 60;
  if (ambiente.buho <= 0) { sonidos.buho(); ambiente.buho = 25 + Math.random() * 30; }
  if (ambiente.rana <= 0) { if (p.x > 17 && p.x < 41) sonidos.rana(); ambiente.rana = 2.5 + Math.random() * 4; }
  // carteles de nivel
  const nv = D.nivelEn(p.x);
  if (nv && !estado.niveles.includes(nv.numero)) { estado.niveles.push(nv.numero); cartelNivel(nv); guardar(); }
  // luciérnagas
  tmp.copy(p); tmp.y += 1.0;
  for (const l of mundo.luciernagas) if (!l.atrapada && l.malla.position.distanceTo(tmp) < 1.15) atraparLuciernaga(l);
  for (const b of mundo.mariposas) if (!b.atrapada && b.grupo.position.distanceTo(tmp) < 1.25) atraparMariposa(b);
  // recuerdos
  for (const o of mundo.recuerdos) if (!o.tomado && Math.hypot(p.x - o.x, p.z - o.z) < 0.95 && Math.abs(p.y + 0.9 - o.y) < 1.25) tomarRecuerdo(o);
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
  $('cRec').textContent = estado.recuerdos.length;
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
  const dtReal = reloj.getDelta(), dt = Math.min(0.05, dtReal);
  cuadroN++;
  renderer.shadowMap.needsUpdate = cuadroN % 2 === 0;
  t += dt;
  if (mundo) {
    if (modo === 'portada') pasoPortada(t);
    else if (modo === 'cine') { pasoJugador(0.0001); if (cine) pasoCine(dt); }
    else if (modo !== 'carga') {
      if (modo === 'juego' || modo === 'panel' || modo === 'foto') pasoJugador(modo === 'juego' ? dt : 0.0001);
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
    renderer.info.reset();
    if (sinPost) renderer.render(escena, camara); else composer.render(dt);
    if (modo === 'juego' && cuadroN % 60 === 30 && revisiones < 6) revisarPantalla();
    // calidad adaptable: cada 2 s ajusta la resolución para mantener el juego fluido
    if (modo === 'juego' || modo === 'cine') {
      fps.cuadros++; fps.tiempo += dtReal;
      if (fps.tiempo > 2) {
        const medio = fps.cuadros / fps.tiempo;
        fps.cuadros = 0; fps.tiempo = 0;
        let nueva = escalaPixel;
        if (medio < 48) nueva = Math.max(alta ? 0.75 : 0.65, escalaPixel * 0.9);
        else if (medio > 58 && escalaPixel < escalaMax) nueva = Math.min(escalaMax, escalaPixel * 1.07);
        if (Math.abs(nueva - escalaPixel) > 0.01) { escalaPixel = nueva; ajustar(); }
        if (medio < 30 && escalaPixel <= (alta ? 0.76 : 0.66) && bloom.enabled) bloom.enabled = false;
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
  // partidas guardadas con menos pistas o sin los niveles nuevos
  estado.pistas = D.PISTAS.map((_, i) => !!estado.pistas[i]);
  for (const [k, v] of Object.entries(nuevoEstado())) if (estado[k] === undefined) estado[k] = v;
  // aplicar el progreso guardado al mundo
  estado.pistas.forEach((l, i) => mundo.atriles[i].marcarLeida(l));
  melodia = [];
  if (estado.campanas) { mundo.campanas.puerta.abrir(true); mundo.campanas.lista.forEach((b) => (b.acierto = true)); }
  if (estado.giros) mundo.estatuas.lista.forEach((e, i) => e.poner(estado.giros[i] ?? e.giros));
  if (estado.estatuas) { mundo.estatuas.lista.forEach((e) => e.poner(0)); mundo.estatuas.puerta.abrir(true); }
  for (const b of mundo.mariposas) { b.atrapada = estado.mariposas.includes(b.id); b.orden = estado.mariposas.indexOf(b.id); }
  if (estado.mariposas.length >= D.MARIPOSAS_NECESARIAS) mundo.puertaInvernadero.abrir(true);
  for (const o of mundo.recuerdos) if (estado.recuerdos.includes(o.id)) o.tomar();
  $('filaRec').classList.toggle('oculta', !estado.recuerdos.length);
  if (estado.cofre) mundo.estrellaKimberly.mostrar(true);
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
  if (estado.cofre) { mundo.cofre.abrir(true); mundo.celebrar(); }
  $('filaLuc').classList.toggle('oculta', !(estado.faroles || estado.luc.length));
  $('portada').hidden = true;
  fundido(() => {
    const c = estado.control || DISENO.inicio;
    colocarJugador(c.x, c.z, c.giro ?? 0);
    $('hud').hidden = false;
    personaje.objeto.visible = true;
    modo = 'juego';
    if (!continuar) {
      abrirPanel({ sub: `De ${D.AUTOR}, para ${D.DESTINATARIA}`, titulo: D.TITULO, cuerpo: `<p>${D.BIENVENIDA}</p>${tablaControles()}`, botones: [{ texto: 'Entrar al jardín' }] });
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
  mundo.esReal = !!real;
  mundo.eventos.alEstrella = () => {
    if (modo !== 'juego') return;
    estado.deseos++; sonidos.estrella();
    aviso(estado.deseos === 1 ? 'Mira, una estrella fugaz… pide un deseo' : 'Otra estrella fugaz', 2.8);
  };
  mundo.eventos.alPez = (x, z) => { if (Math.hypot(jugador.pos.x - x, jugador.pos.z - z) < 14) sonidos.pez(); };
  personaje = crearPersonaje();
  escena.add(personaje.objeto);
  orbeJugador = new THREE.PointLight(0xfff0a0, 0, 6, 2);
  escena.add(orbeJugador);
  personaje.objeto.traverse((o) => o.layers.enable(2)); orbeJugador.layers.enable(2); // ella también se refleja en el agua
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
  if (parametros.has('prueba') || parametros.has('tour')) exponerPruebas();
  if (parametros.has('tour')) recorrido();
}

// ------------------------------------------------------------------ Recorrido automático (?tour): muestra cada zona y los cuadros por segundo
function recorrido() {
  const caja = document.createElement('div');
  caja.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:50;font:700 16px monospace;color:#fff;background:rgba(0,0,0,.6);padding:8px 12px;border-radius:8px';
  document.body.appendChild(caja);
  let cuadros = 0, ultimo = performance.now(), fpsTxt = '';
  const medir = () => { cuadros++; const ahora = performance.now(); if (ahora - ultimo > 1000) { fpsTxt = `${Math.round((cuadros * 1000) / (ahora - ultimo))} fps`; cuadros = 0; ultimo = ahora; } requestAnimationFrame(medir); };
  medir();
  const vistas = [[0.5, 0, 0, 0.22, 'Entrada'], [11, 0, 0, 0.15, 'Puertas'], [21.8, 0, 0, 0.3, 'Estanque'], [40, -1, 0, 0.25, 'Laberinto'], [52, -5, 0.4, 0.3, 'Dentro del laberinto'], [71.5, 0, 0, 0.3, 'Plaza'], [83.4, 0, 0, 0.3, 'Puente'], [93, 0, 0, 0.2, 'Bosque'], [110.6, 0, 0, 0.3, 'Mirador']];
  let i = 0;
  setTimeout(() => {
    comenzar(false);
    setTimeout(() => {
      cerrarPanel();
      const siguiente = () => {
        const [x, z, giro, pitch, nombre] = vistas[i % vistas.length];
        colocarJugador(x, z, giro); cam.pitch = pitch;
        caja.dataset.zona = nombre; i++;
      };
      siguiente(); setInterval(siguiente, 7000);
      setInterval(() => { const r = renderer.info.render; caja.textContent = `${caja.dataset.zona} · ${fpsTxt} · ${(r.triangles / 1e6).toFixed(2)} M triángulos · ${r.calls} llamadas · ${mundo ? (mundo.esReal ? 'realista' : 'simple') : ''}`; }, 500);
    }, 1500);
  }, 1500);
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
    campanas: () => mundo.campanas.lista.map((b) => ({ x: b.x, z: b.z, i: b.i })), ordenCampanas: () => mundo.campanas.orden, tocarCampana: (i) => tocarCampana(mundo.campanas.lista[i]),
    estatuas: () => mundo.estatuas.lista.map((e) => ({ x: e.x, z: e.z, giros: e.giros, mira: e.mira() })), girarEstatua: (i) => girarEstatua(mundo.estatuas.lista[i]),
    mariposas: () => mundo.mariposas.map((b) => ({ x: b.grupo.position.x, y: b.grupo.position.y, z: b.grupo.position.z, atrapada: b.atrapada })),
    balsas: () => mundo.balsas.map((b) => ({ x: b.sup.x, z: b.sup.z, tope: b.sup.tope })),
    estrellas: () => mundo.escalera.estrellas.map((e) => ({ x: e.sup.x, z: e.sup.z, tope: e.sup.tope })),
    recuerdos: () => mundo.recuerdos.map((o) => ({ id: o.id, x: o.x, y: o.y, z: o.z, tomado: o.tomado })),
    saltarCine: () => { if (cine) cine.t = Math.max(cine.t, cine.dur); },
    salirCielo,
    vista: () => { const d = camara.getWorldDirection(new THREE.Vector3()); return { y: camara.position.y, dy: d.y }; },
    dedicatoria: () => document.getElementById('dedicatoriaFinal').className,
    estrella: () => mundo.eventos.alEstrella?.(),
    foto: () => alternarFoto(),
    reja: () => mundo.reja.abierta, puente: () => mundo.puente.progreso,
    placas: () => mundo.placas.map((q) => ({ nombre: q.nombre, x: q.x, z: q.z, encendida: q.encendida })),
    nenufares: () => mundo.piedras.filter((q) => q.sup.nenufar).map((q) => ({ x: q.sup.x, z: q.sup.z, tope: q.sup.tope })),
    info: () => ({ triangulos: renderer.info.render.triangles, llamadas: renderer.info.render.calls, escala: escalaPixel, realista: !!mundo?.esReal, bloom: bloom.enabled, sinPost }),
    experimento: (cfg) => { if ('reflejo' in cfg) mundo.agua.userData.apagado = !cfg.reflejo; if ('sombras' in cfg) { renderer.shadowMap.enabled = cfg.sombras; escena.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); }); } if ('bloom' in cfg) bloom.enabled = cfg.bloom; return true; },
    medirReflejo: () => new Promise((r) => {
      const ag = mundo.agua, f = ag.onBeforeRender;
      ag.onBeforeRender = function (...x) { const i = renderer.info.render, t0 = i.triangles, c0 = i.calls; f.apply(this, x); ag.onBeforeRender = f; r({ tris: i.triangles - t0, llamadas: i.calls - c0 }); };
      setTimeout(() => r('sin reflejo en este cuadro'), 1500);
    }),
    capa: (n) => {
      const m = {}, cam = new THREE.Camera(); cam.layers.set(n);
      escena.traverse((o) => {
        if (!o.isMesh || !o.visible || !o.layers.test(cam.layers)) return;
        const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3, k = o.name || o.parent?.name || o.material.type;
        m[k] = (m[k] || 0) + t * (o.isInstancedMesh ? o.count : 1);
      });
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}: ${(v / 1000).toFixed(0)}k`);
    },
    desglose: () => {
      const m = {};
      escena.traverse((o) => {
        if (!o.isMesh || !o.visible) return;
        const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3, n = o.isInstancedMesh ? o.count : 1;
        const k = o.name || o.parent?.name || o.material.type;
        m[k] = (m[k] || 0) + t * n;
      });
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k}: ${(v / 1000).toFixed(0)}k`);
    },
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
