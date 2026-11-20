// Construye el jardín: terreno, cielo, agua, modelos de Blender, pasto, luces y efectos.
// Ejes: +X es hacia adelante en el sendero, +Y arriba, Z a los lados. Unidades en metros.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const NIVEL_AGUA = -0.35;
export const LIMITE = { xMin: -3, xMax: 61, z: 9 };
export const DIR_LUNA = new THREE.Vector3(0.85, 0.36, 0.42).normalize();

// ------------------------------------------------------------------ Diseño del recorrido
export const DISENO = {
  inicio: { x: 0.5, z: 0, giro: 0 },
  arco: 5,
  atriles: [{ x: 8, z: -2.4 }, { x: 20, z: 2.5 }, { x: 38.6, z: -2.5 }],
  puertas: { x: 15, lugares: [{ z: -5.5, color: 0x55d6b4, nombre: 'menta' }, { z: 0, color: 0xe57aa6, nombre: 'rosa' }, { z: 5.5, color: 0xf2b252, nombre: 'sol', correcta: true }] },
  piedras: [[23.5, 0], [25.3, 0.8], [27.1, -0.5], [28.9, 0.4, 1.3], [30.7, -0.6], [32.5, 0.5], [34.2, 0, 1.1], [35.8, -0.3]],
  luciernagas: [[40.5, -4.2, 1.1], [42.2, 3.6, 1.4], [43.6, -6.5, 1.0], [45.1, 6.2, 1.3], [46.3, -1.8, 1.6], [47.8, 4.9, 0.9], [49.2, -5.6, 1.2]],
  barrera: 51.3,
  mirador: { x: 56.5, z: 0 },
  faroles: [2.5, 8.6, 12.4, 18.6, 21.4, 37.4, 41.8, 46.2, 50.4],
  controles: { puertas: 10.5, estanqueAntes: 21.2, estanqueDespues: 37.2 },
};

// ------------------------------------------------------------------ Terreno
const suave = (t) => t * t * (3 - 2 * t);
export function alturaTerreno(x, z) {
  const az = Math.abs(z);
  const lado = Math.max(0, az - 5.5);
  let h = Math.pow(Math.min(lado, 12), 1.35) * 0.09 * (1 + 0.35 * Math.sin(x * 0.31) * Math.cos(z * 0.23));
  h += 0.12 * Math.sin(x * 0.9 + z * 0.6) * Math.min(1, lado / 2);
  h += Math.pow(Math.max(0, az - 14), 1.45) * 0.08 * (0.8 + 0.2 * Math.sin(x * 0.07 + z * 0.05));
  h += Math.pow(Math.max(0, -5 - x), 1.4) * 0.12 + Math.pow(Math.max(0, x - 64), 1.4) * 0.14;
  const dx = Math.max(0, Math.abs(x - 29.6) - 5.6), dz = Math.max(0, az - 9.5);
  const hondo = Math.max(0, 1 - Math.hypot(dx, dz) / 2.2);
  h -= 0.95 * suave(hondo);
  h += 0.035 * Math.sin(x * 0.55) * Math.cos(z * 0.7) * (1 - hondo);
  return h;
}

// Segmentos del sendero de tierra (para pintar el terreno y evitar el pasto).
const SENDERO = [
  [-4, 0, 11, 0], [11, 0, 15, -5.5], [11, 0, 15, 0], [11, 0, 15, 5.5],
  [15, -5.5, 19, 0], [15, 0, 19, 0], [15, 5.5, 19, 0], [19, 0, 22.6, 0],
  [36.4, 0, 52.5, 0],
];
export function distSendero(x, z) {
  let m = Infinity;
  for (const [ax, az, bx, bz] of SENDERO) {
    const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    m = Math.min(m, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  const dm = Math.hypot(x - DISENO.mirador.x, z - DISENO.mirador.z) - 5.2;
  return Math.min(m, Math.max(0, dm));
}

// Azar reproducible
function azar(semilla) {
  let a = semilla >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const lineal = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

// ------------------------------------------------------------------ Materiales
function crearPaleta() {
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
  };
}

// ------------------------------------------------------------------ Texturas pequeñas hechas en un lienzo
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

// Materiales orgánicos que se ven mejor con normales suaves (copas, arbustos, piedras del estanque).
const SUAVIZAR = new Set(['M_Hojas', 'M_HojasClaras', 'M_PiedraMusgo', 'M_Nenufar']);

// ------------------------------------------------------------------ Mundo
export function construirMundo(escena, gltf, calidad) {
  const alta = calidad === 'alta';
  const paleta = crearPaleta();
  const halo = texturaHalo();
  const actualizables = [];
  const colisiones = [];   // { tipo:'c', x, z, r, tope } | { tipo:'b', x, z, hx, hz, tope }
  const superficies = [];  // { tipo:'c'|'b', x, z, r|hx,hz, tope, movil? }
  const candidatasLuz = []; // { pos, color, fuerza }

  // ---------- piezas del GLB
  const piezasCache = new Map();
  function piezas(nombre) {
    if (piezasCache.has(nombre)) return piezasCache.get(nombre);
    const nodo = gltf.scene.getObjectByName(nombre);
    if (!nodo) throw new Error('Falta el modelo ' + nombre);
    nodo.updateMatrixWorld(true);
    const lista = [];
    nodo.traverse((o) => {
      if (!o.isMesh) return;
      let g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      if (SUAVIZAR.has(o.material.name)) { g.deleteAttribute('normal'); g = mergeVertices(g, 1e-3); g.computeVertexNormals(); }
      lista.push({ geometria: g, material: o.material.name });
    });
    piezasCache.set(nombre, lista);
    return lista;
  }
  const mat = (nombre, cambios) => (cambios && cambios[nombre]) || paleta[nombre] || paleta.M_Piedra;

  function colocar(nombre, x, y, z, giro = 0, escala = 1, opc = {}) {
    const g = new THREE.Group();
    for (const p of piezas(nombre)) {
      const m = new THREE.Mesh(p.geometria, mat(p.material, opc.mats));
      m.castShadow = opc.sombra !== false; m.receiveShadow = true;
      g.add(m);
    }
    g.position.set(x, y, z); g.rotation.y = giro;
    if (typeof escala === 'number') g.scale.setScalar(escala); else g.scale.copy(escala);
    escena.add(g);
    return g;
  }

  function instanciar(nombre, matrices, opc = {}) {
    const g = new THREE.Group();
    if (!matrices.length) return g;
    for (const p of piezas(nombre)) {
      const im = new THREE.InstancedMesh(p.geometria, mat(p.material, opc.mats), matrices.length);
      matrices.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = opc.sombra !== false; im.receiveShadow = true;
      im.computeBoundingSphere();
      g.add(im);
    }
    escena.add(g);
    return g;
  }
  const matriz = (x, y, z, giro = 0, e = 1, ex, ez) => new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro),
    new THREE.Vector3(ex ?? e, e, ez ?? e));

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
        // estrellas
        vec3 q = d*140.; vec3 id = floor(q); float r = h1(id); vec3 f = fract(q)-.5;
        float e = step(.965, r) * smoothstep(.16, .0, length(f)) * smoothstep(.04,.3,h) * (1.-smoothstep(.85,.99,m));
        c += e * (.55+.45*sin(tiempo*1.7+r*90.)) * mix(vec3(1.,.92,.8), vec3(.8,.88,1.), fract(r*13.)) * (1.2+3.*step(.993,r));
        // montañas lejanas (dos capas)
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
  luna.scale.setScalar(26); luna.position.copy(DIR_LUNA).multiplyScalar(330); luna.renderOrder = -9;
  escena.add(luna);
  const haloLuna = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: lineal(0.35, 0.42, 0.62), fog: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true }));
  haloLuna.scale.setScalar(150); haloLuna.position.copy(luna.position); haloLuna.renderOrder = -8;
  escena.add(haloLuna);

  // ================================================================ Luces
  const hemi = new THREE.HemisphereLight(lineal(0.32, 0.42, 0.7), lineal(0.05, 0.07, 0.05), 1.1);
  escena.add(hemi);
  const luzLuna = new THREE.DirectionalLight(lineal(0.62, 0.72, 1.0), 2.4);
  luzLuna.castShadow = true;
  luzLuna.shadow.mapSize.set(alta ? 2048 : 1024, alta ? 2048 : 1024);
  const sc = luzLuna.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 160;
  luzLuna.shadow.bias = -0.0004; luzLuna.shadow.normalBias = 0.04;
  escena.add(luzLuna, luzLuna.target);

  // Grupo de luces puntuales que se reparten entre las fuentes más cercanas (faroles, atriles, puertas...).
  const POOL = alta ? 10 : 6;
  const luces = [];
  for (let i = 0; i < POOL; i++) {
    const l = new THREE.PointLight(0xffb870, 0, 11, 2);
    escena.add(l); luces.push(l);
  }

  // ================================================================ Terreno
  {
    const ancho = 130, largo = 120, sx = alta ? 260 : 170, sz = alta ? 240 : 150;
    const g = new THREE.PlaneGeometry(ancho, largo, sx, sz);
    g.rotateX(-Math.PI / 2);
    g.translate(29, 0, 0);
    const pos = g.attributes.position, colores = new Float32Array(pos.count * 3), r = azar(3);
    const cPasto = new THREE.Color(0x23402b), cPasto2 = new THREE.Color(0x2f4f2c), cTierra = new THREE.Color(0x5a4a3a), cLodo = new THREE.Color(0x1b2723), cColina = new THREE.Color(0x1f3a35);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = alturaTerreno(x, z);
      pos.setY(i, y);
      const n = 0.5 + 0.5 * Math.sin(x * 0.7 + Math.sin(z * 0.9) * 2) * Math.cos(z * 0.5 + x * 0.13);
      c.copy(cPasto).lerp(cPasto2, n * 0.8 + r() * 0.2);
      c.lerp(cColina, Math.min(1, Math.max(0, (Math.abs(z) - 12) / 20)));
      const ds = distSendero(x, z), anchoS = 1.15 + 0.18 * Math.sin(x * 1.3 + z);
      c.lerp(cTierra, 1 - suave(Math.min(1, Math.max(0, (ds - anchoS) / 0.7))));
      if (y < -0.12) c.lerp(cLodo, Math.min(1, (-0.12 - y) / 0.4));
      colores.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    g.computeVertexNormals();
    const suelo = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    suelo.receiveShadow = true;
    escena.add(suelo);
  }

  // ================================================================ Agua (reflejo real con ondas)
  const uAgua = { tiempo: { value: 0 } };
  const agua = new Reflector(new THREE.PlaneGeometry(18, 26), {
    clipBias: 0.003,
    textureWidth: Math.round(innerWidth * (alta ? 0.6 : 0.35)), textureHeight: Math.round(innerHeight * (alta ? 0.6 : 0.35)),
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
          vec3 profundo = vec3(.004,.016,.03);
          vec3 c = profundo + refl * color * .85;
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
        if (x < -2.5) continue;
        const ang = Math.atan2(bz - az, bx - ax), lado = (i % 2 ? 1 : -1) * 0.38;
        const px = x - Math.sin(ang) * lado * -1, pz = z + Math.cos(ang) * lado;
        m.push(matriz(px, alturaTerreno(px, pz) - 0.07, pz, -ang + r() * 0.5, 0.85 + r() * 0.25));
      }
    }
    instanciar('SM_Losa', m, { sombra: false });
  }

  // ================================================================ Entrada
  colocar('SM_ArcoEntrada', DISENO.arco, 0, 0);
  for (const s of [-1, 1]) colisiones.push({ tipo: 'c', x: DISENO.arco, z: s * 2.35, r: 0.5, tope: 9 });
  // setos bajos a los lados del arco
  for (const s of [-1, 1]) {
    for (const [zc, l] of [[4.6, 3.6], [8.2, 3.6]]) {
      colocar('SM_Seto', DISENO.arco, alturaTerreno(DISENO.arco, s * zc) - 0.05, s * zc, Math.PI / 2, new THREE.Vector3(l / 4.1, 0.5, 0.8));
      colisiones.push({ tipo: 'b', x: DISENO.arco, z: s * zc, hx: 0.45, hz: l / 2, tope: 9 });
    }
  }

  // ================================================================ Faroles
  const faroles = [];
  for (const x of DISENO.faroles) for (const s of [-1, 1]) {
    const z = s * (2.45 + (x > 21 && x < 38 ? 0.4 : 0)), y = alturaTerreno(x, z);
    faroles.push(matriz(x, y, z, s * 0.4));
    colisiones.push({ tipo: 'c', x, z, r: 0.22, tope: 9 });
    candidatasLuz.push({ pos: new THREE.Vector3(x, y + 1.66, z), color: new THREE.Color(0xffb36a), fuerza: 5.5 });
  }
  instanciar('SM_Farol', faroles);
  // halos de los faroles
  {
    const matHalo = new THREE.SpriteMaterial({ map: halo, color: lineal(0.55, 0.32, 0.14), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const p = new THREE.Vector3();
    for (const m of faroles) {
      p.setFromMatrixPosition(m);
      const h = new THREE.Sprite(matHalo); h.position.set(p.x, p.y + 1.66, p.z); h.scale.setScalar(1.1);
      escena.add(h);
    }
  }

  // ================================================================ Atriles con pistas
  const atriles = DISENO.atriles.map((a, i) => {
    const y = alturaTerreno(a.x, a.z);
    const g = colocar('SM_Atril', a.x, y, a.z, 0);
    colisiones.push({ tipo: 'c', x: a.x, z: a.z, r: 0.35, tope: 9 });
    const orbe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: lineal(4, 2.6, 0.9) }));
    const brilloOrbe = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: lineal(1.6, 1.0, 0.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    brilloOrbe.scale.setScalar(0.9);
    orbe.add(brilloOrbe);
    orbe.position.set(a.x, y + 1.95, a.z);
    escena.add(orbe);
    const luz = { pos: orbe.position, color: new THREE.Color(0xffc070), fuerza: 1.4 };
    candidatasLuz.push(luz);
    const estado = { indice: i, x: a.x, z: a.z, grupo: g, orbe, leida: false };
    estado.marcarLeida = (si) => {
      estado.leida = si;
      orbe.material.color.copy(si ? lineal(0.8, 2.6, 1.6) : lineal(4, 2.6, 0.9));
      brilloOrbe.material.color.copy(si ? lineal(0.3, 1.0, 0.6) : lineal(1.6, 1.0, 0.4));
      luz.color.set(si ? 0x8fe0b8 : 0xffc070);
    };
    actualizables.push(({ t }) => { orbe.position.y = y + 1.95 + Math.sin(t * 2 + i) * 0.06; });
    return estado;
  });

  // ================================================================ Las tres puertas
  const puertas = DISENO.puertas.lugares.map((p) => {
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
      const sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: lineal(2.2, 1.4, 0.45), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sol.position.set(x - 0.3, 4.12, p.z); sol.scale.setScalar(2.6);
      escena.add(sol);
      actualizables.push(({ t }) => sol.scale.setScalar(2.4 + Math.sin(t * 2.2) * 0.35));
    }
    return { ...p, x };
  });
  // setos entre puertas
  {
    const x = DISENO.puertas.x;
    for (const [z0, z1] of [[-12, -7.2], [-3.8, -1.7], [1.7, 3.8], [7.2, 12]]) {
      const zc = (z0 + z1) / 2, l = z1 - z0;
      colocar('SM_Seto', x, alturaTerreno(x, zc) - 0.05, zc, Math.PI / 2, new THREE.Vector3(l / 4.0, 1, 1));
      colisiones.push({ tipo: 'b', x, z: zc, hx: 0.55, hz: l / 2, tope: 9 });
    }
  }

  // ================================================================ Estanque: piedras, nenúfares y juncos
  const piedras = DISENO.piedras.map(([x, z, mov], i) => {
    const g = colocar('SM_PiedraEstanque', x, NIVEL_AGUA - 0.02, z, i * 1.3, 0.95);
    const sup = { tipo: 'c', x, z, r: 0.62, tope: NIVEL_AGUA - 0.02 + 0.37, piedra: true };
    superficies.push(sup);
    if (mov) {
      const z0 = z, fase = i;
      actualizables.push(({ t }) => {
        const nz = z0 + Math.sin(t * (Math.PI * 2 / 4.2) + fase) * mov;
        sup.dz = nz - sup.z; sup.z = nz; g.position.z = nz;
      });
    }
    return { grupo: g, sup };
  });
  {
    const r = azar(9), nen = [], jun = [], roc = [];
    for (let i = 0; i < (alta ? 44 : 26); i++) {
      const x = 23 + r() * 13, z = (r() < 0.5 ? -1 : 1) * (2 + r() * 8);
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
    instanciar('SM_Roca', roc);
  }

  // ================================================================ Árboles, arbustos, flores y rocas
  {
    const r = azar(21), a1 = [], a2 = [], arb = [], flo = [], roc = [];
    const libre = (x, z, minS) => distSendero(x, z) > minS && !(x > 20.5 && x < 38.6 && Math.abs(z) < 12.5) && Math.hypot(x - DISENO.mirador.x, z) > 6;
    const total = alta ? 330 : 190;
    for (let i = 0; i < total * 4 && a1.length + a2.length < total; i++) {
      const x = -14 + r() * 92, z = (r() < 0.5 ? -1 : 1) * (4.6 + Math.pow(r(), 0.8) * 42);
      if (!libre(x, z, 3.2)) continue;
      if (Math.abs(x - DISENO.puertas.x) < 2 && Math.abs(z) < 13) continue;
      if (Math.abs(x - DISENO.arco) < 1.5 && Math.abs(z) < 10.5) continue;
      const e = 0.85 + r() * 0.55 + Math.min(0.5, Math.abs(z) / 60);
      (r() < 0.55 ? a1 : a2).push(matriz(x, alturaTerreno(x, z) - 0.1, z, r() * 6.3, e));
      if (Math.abs(z) < 11) colisiones.push({ tipo: 'c', x, z, r: 0.38 * e, tope: 99 });
    }
    instanciar('SM_Arbol1', a1); instanciar('SM_Arbol2', a2);
    for (let i = 0; i < 900 && arb.length < (alta ? 110 : 70); i++) {
      const x = -3 + r() * 64, z = (r() < 0.5 ? -1 : 1) * (2.9 + r() * 9);
      if (!libre(x, z, 1.9)) continue;
      if (Math.abs(x - DISENO.puertas.x) < 1.3 && Math.abs(z) < 12) continue;
      arb.push(matriz(x, alturaTerreno(x, z) - 0.05, z, r() * 6, 0.8 + r() * 0.6));
    }
    instanciar('SM_Arbusto', arb);
    for (let i = 0; i < 2000 && flo.length < (alta ? 260 : 150); i++) {
      const x = -3 + r() * 64, z = (r() < 0.5 ? -1 : 1) * (1.6 + r() * 10);
      if (!libre(x, z, 1.4)) continue;
      flo.push(matriz(x, alturaTerreno(x, z) - 0.02, z, r() * 6, 0.8 + r() * 0.7));
    }
    instanciar('SM_Flores', flo, { sombra: false });
    for (let i = 0; i < 400 && roc.length < 40; i++) {
      const x = -6 + r() * 70, z = (r() < 0.5 ? -1 : 1) * (3.5 + r() * 18);
      if (!libre(x, z, 2.2)) continue;
      roc.push(matriz(x, alturaTerreno(x, z) - 0.15, z, r() * 6, 0.4 + r() * 1.2));
    }
    instanciar('SM_Roca', roc);
  }

  // ================================================================ Pasto con viento
  const uPasto = { tiempo: { value: 0 } };
  {
    const hoja = new THREE.PlaneGeometry(0.055, 1, 1, 4);
    hoja.translate(0, 0.5, 0);
    const p = hoja.attributes.position, nor = hoja.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setX(i, p.getX(i) * (1 - y * 0.92));
      p.setZ(i, y * y * 0.12);
      nor.setXYZ(i, 0, 1, 0);
    }
    const otra = hoja.clone().rotateY(Math.PI / 2);
    const mata = mergeGeometries([hoja, otra]);
    const n = alta ? 52000 : 16000, r = azar(33);
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
    const pasto = new THREE.InstancedMesh(mata, matPasto, n);
    const c1 = new THREE.Color(0x3d6b3a), c2 = new THREE.Color(0x5a7f45), c3 = new THREE.Color(0x2f5a45), col = new THREE.Color();
    let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) {
      const cerca = r() < 0.75;
      const x = -4 + r() * 66, z = (r() < 0.5 ? -1 : 1) * (cerca ? 1.1 + r() * 9 : 9 + r() * 12);
      const ds = distSendero(x, z);
      if (ds < 1.05 + r() * 0.5) continue;
      const y = alturaTerreno(x, z);
      if (y < NIVEL_AGUA + 0.08) continue;
      if (Math.hypot(x - DISENO.mirador.x, z) < 4.4) continue;
      const alto = (0.22 + r() * 0.3) * (ds < 2.2 ? 0.7 : 1) * (Math.abs(z) > 9 ? 1.35 : 1);
      pasto.setMatrixAt(k, matriz(x, y - 0.02, z, r() * 6.3, 1, 1, 1).scale(new THREE.Vector3(1, alto, 1)));
      col.copy(c1).lerp(r() < 0.5 ? c2 : c3, r());
      pasto.setColorAt(k, col);
      k++;
    }
    pasto.count = k;
    pasto.receiveShadow = true;
    pasto.computeBoundingSphere();
    escena.add(pasto);
  }

  // ================================================================ Luciérnagas: las 7 que se atrapan
  const geoLuc = new THREE.SphereGeometry(0.055, 12, 8);
  const luciernagas = DISENO.luciernagas.map(([x, z, alto], id) => {
    const y = alturaTerreno(x, z) + alto;
    const m = new THREE.Mesh(geoLuc, new THREE.MeshBasicMaterial({ color: lineal(3, 2.6, 0.75) }));
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: lineal(0.9, 0.78, 0.22), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    h.scale.setScalar(1.1); m.add(h);
    m.position.set(x, y, z);
    escena.add(m);
    const luz = { pos: m.position, color: new THREE.Color(0xfff08a), fuerza: 1.6 };
    candidatasLuz.push(luz);
    return { id, malla: m, origen: new THREE.Vector3(x, y, z), atrapada: false, orden: 0, luz };
  });
  actualizables.push(({ t, jugador }) => {
    for (const l of luciernagas) {
      if (!l.atrapada) {
        l.malla.position.set(l.origen.x + Math.sin(t * 0.9 + l.id) * 0.35, l.origen.y + Math.sin(t * 1.6 + l.id * 2) * 0.18, l.origen.z + Math.cos(t * 0.7 + l.id) * 0.35);
      } else if (jugador) {
        const a = t * 1.1 + l.orden * (Math.PI * 2 / 7);
        const objetivo = new THREE.Vector3(jugador.x + Math.cos(a) * 0.85, jugador.y + 1.35 + Math.sin(t * 2 + l.orden) * 0.18, jugador.z + Math.sin(a) * 0.85);
        l.malla.position.lerp(objetivo, 0.08);
      }
      const s = 1 + Math.sin(t * 6 + l.id * 3) * 0.25;
      l.malla.children[0].scale.setScalar((l.atrapada ? 0.55 : 1.1) * s);
    }
  });

  // Luciérnagas decorativas por todo el jardín
  {
    const n = alta ? 360 : 160, r = azar(77), pos = new Float32Array(n * 3), fase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = -4 + r() * 66, z = (r() - 0.5) * 30;
      pos.set([x, alturaTerreno(x, z) + 0.3 + r() * 2.6, z], i * 3); fase[i] = r() * 100;
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

  // ================================================================ Barrera de luz
  const uBarrera = { tiempo: uCielo.tiempo, abierto: { value: 0 } };
  const barreraMalla = new THREE.Mesh(new THREE.PlaneGeometry(19, 4.2, 1, 1), new THREE.ShaderMaterial({
    uniforms: uBarrera, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float tiempo; uniform float abierto; varying vec2 vUv;
      void main(){
        float x = vUv.x*60.;
        float rayas = pow(abs(sin(x + sin(x*.37+tiempo)*1.5)), 18.) + pow(abs(sin(x*.53 - tiempo*.7)), 30.)*.7;
        float sube = fract(vUv.y*1.5 - tiempo*.25 + sin(x*.11)*.3);
        float chispa = smoothstep(.97, 1., sube) * .8;
        float borde = smoothstep(0., .12, vUv.y) * (1.-smoothstep(.55, 1., vUv.y)) * smoothstep(0.,.05,vUv.x)*smoothstep(1.,.95,vUv.x);
        float a = (rayas*.5 + chispa*.7 + .08) * borde * (1.-abierto) * .42;
        gl_FragColor = vec4(vec3(1.4,.95,.4)*a, 1.);
      }`,
  }));
  barreraMalla.rotation.y = Math.PI / 2;
  barreraMalla.position.set(DISENO.barrera, 2.0, 0);
  escena.add(barreraMalla);
  const colBarrera = { tipo: 'b', x: DISENO.barrera, z: 0, hx: 0.3, hz: 10, tope: 99 };
  colisiones.push(colBarrera);
  candidatasLuz.push({ pos: new THREE.Vector3(DISENO.barrera - 0.5, 1.5, 0), color: new THREE.Color(0xffc56a), fuerza: 3, barrera: true });
  const barrera = {
    abierta: false, progreso: 0,
    abrir(inmediato = false) {
      if (this.abierta) return;
      this.abierta = true;
      colBarrera.tope = -99;
      if (inmediato) this.progreso = 1;
    },
  };
  actualizables.push(({ dt }) => {
    if (barrera.abierta && barrera.progreso < 1) barrera.progreso = Math.min(1, barrera.progreso + dt / 1.6);
    uBarrera.abierto.value = barrera.progreso;
    barreraMalla.visible = barrera.progreso < 1;
    barreraMalla.scale.y = 1 - barrera.progreso * 0.6;
  });

  // ================================================================ Mirador y cofre
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
  colocar('SM_Banca', M.x + 2.2, yM + 0.6, M.z, Math.PI);
  colisiones.push({ tipo: 'b', x: M.x + 2.2, z: M.z, hx: 0.3, hz: 0.85, tope: yM + 1.6 });

  const cofreX = M.x - 1.1, cofreY = yM + 0.6;
  const cofreGrupo = colocar('SM_CofreBase', cofreX, cofreY, M.z, -Math.PI / 2, 1.15);
  const tapa = new THREE.Group();
  for (const p of piezas('SM_CofreTapa')) {
    const m = new THREE.Mesh(p.geometria, mat(p.material)); m.castShadow = true; tapa.add(m);
  }
  tapa.position.set(0, 0.48, -0.31);
  cofreGrupo.add(tapa);
  colisiones.push({ tipo: 'b', x: cofreX, z: M.z, hx: 0.4, hz: 0.62, tope: 99 });
  const luzCofre = { pos: new THREE.Vector3(cofreX, cofreY + 0.9, M.z), color: new THREE.Color(0xffc56a), fuerza: 2 };
  candidatasLuz.push(luzCofre);
  const destello = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: lineal(2.4, 1.6, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  destello.position.set(cofreX, cofreY + 0.75, M.z); destello.scale.setScalar(3);
  escena.add(destello);
  const cofre = {
    x: cofreX, z: M.z, y: cofreY, abierto: false, apertura: 0,
    abrir(inmediato = false) { this.abierto = true; if (inmediato) this.apertura = 1; },
  };
  actualizables.push(({ dt, t }) => {
    if (cofre.abierto && cofre.apertura < 1) cofre.apertura = Math.min(1, cofre.apertura + dt / 1.5);
    const e = 1 - Math.pow(1 - cofre.apertura, 3);
    tapa.rotation.x = -1.95 * e;
    destello.material.opacity = e * (0.85 + Math.sin(t * 3) * 0.15);
    luzCofre.fuerza = 2 + e * 14;
  });

  // ================================================================ Reparto de luces y animación
  const tmp = new THREE.Vector3();
  let reloj = 0;
  function actualizar(t, dt, camara, foco, jugador) {
    uCielo.tiempo.value = t; uAgua.tiempo.value = t; uPasto.tiempo.value = t;
    for (const f of actualizables) f({ t, dt, camara, jugador });
    // sombra de la luna siguiendo al jugador
    luzLuna.target.position.copy(foco);
    luzLuna.position.copy(foco).addScaledVector(DIR_LUNA, 70);
    // luces puntuales: las más cercanas al foco
    reloj -= dt;
    if (reloj <= 0) {
      reloj = 0.15;
      const orden = candidatasLuz.filter((c) => !(c.barrera && barrera.progreso >= 1))
        .map((c) => ({ c, d: c.pos.distanceToSquared(foco) })).sort((a, b) => a.d - b.d);
      luces.forEach((l, i) => {
        const o = orden[i];
        if (!o || o.d > 900) { l.intensity = 0; return; }
        l.userData.fuente = o.c;
      });
    }
    for (const l of luces) {
      const c = l.userData.fuente;
      if (!c) continue;
      l.position.copy(c.pos); l.color.copy(c.color);
      const parpadeo = 1 + Math.sin(t * 9 + c.pos.x * 3) * 0.04;
      l.intensity = c.fuerza * parpadeo * (c.barrera ? 1 - barrera.progreso : 1);
    }
  }

  // ================================================================ Física simple del escenario
  function alturaSuelo(x, z, y) {
    let h = alturaTerreno(x, z), sobre = null;
    for (const s of superficies) {
      const dentro = s.tipo === 'c' ? Math.hypot(x - s.x, z - s.z) < s.r : Math.abs(x - s.x) < s.hx && Math.abs(z - s.z) < s.hz;
      if (dentro && s.tope <= y + 0.4 && s.tope > h) { h = s.tope; sobre = s; }
    }
    return { h, sobre };
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
    if (p.x > 52) p.z = Math.min(6, Math.max(-6, p.z));
  }

  return { actualizar, alturaSuelo, resolverChoques, atriles, puertas, piedras, luciernagas, barrera, cofre, agua, luzLuna };
}
