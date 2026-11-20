// Niveles 6 a 10, los recuerdos escondidos en cada nivel y la estrella con el nombre de Kimberly.
// Se construyen dentro de construirMundo (mundo.js) y usan sus mismas herramientas (colocar, instanciar, colisiones…).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function construirNiveles2(c) {
  const { escena, DISENO, alturaTerreno, NIVEL_AGUA, REAL, alta, colocar, instanciar, mat, sprite, lineal, azar, matriz,
    colisiones, superficies, candidatasLuz, actualizables, crearCortina, rocasReales, ayuda, LAB, laberinto, DIR_LUNA } = c;

  // ================================================================ Nivel 6: el río de las linternas
  const balsas = [];
  {
    const R = DISENO.rio;
    // agua que corre: un mapa de normales hecho a mano que se desplaza despacio
    const ondas = texturaOndas();
    ondas.wrapS = ondas.wrapT = THREE.RepeatWrapping; ondas.repeat.set(2, 15);
    const matRio = new THREE.MeshStandardMaterial({ color: 0x0b1d2a, roughness: 0.32, metalness: 0.25, normalMap: ondas, normalScale: new THREE.Vector2(0.28, 0.28), emissive: 0x03101a });
    const rio = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 64), matRio);
    rio.rotation.x = -Math.PI / 2; rio.position.set(R.x, NIVEL_AGUA, 0); rio.receiveShadow = true;
    escena.add(rio);
    actualizables.push(({ dt }) => { ondas.offset.y -= dt * 0.05; ondas.offset.x = Math.sin(performance.now() * 0.0002) * 0.02; });

    // balsas de troncos, cada una con su linterna
    const troncos = [];
    for (let k = 0; k < 6; k++) troncos.push(new THREE.CylinderGeometry(0.13, 0.13, 1.75, 9).rotateX(Math.PI / 2).translate(-0.65 + k * 0.26, 0, 0));
    for (const s of [-0.55, 0.55]) troncos.push(new THREE.BoxGeometry(1.7, 0.07, 0.16).translate(0, 0.14, s));
    const geoBalsa = mergeGeometries(troncos);
    const matPapel = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xff9a3c, emissiveIntensity: 1.6, roughness: 0.8 });
    const geoLinterna = new THREE.CylinderGeometry(0.09, 0.09, 0.22, 10);
    DISENO.balsas.forEach(([x, z, amp], i) => {
      const g = new THREE.Group();
      const m = new THREE.Mesh(geoBalsa, mat('M_Madera')); m.castShadow = m.receiveShadow = true; g.add(m);
      const lin = new THREE.Mesh(geoLinterna, matPapel); lin.position.set(0.6, 0.32, 0.6); g.add(lin);
      g.add(sprite(lineal(1.2, 0.55, 0.18), 1.2, new THREE.Vector3(0.6, 0.35, 0.6)));
      escena.add(g);
      const luz = { pos: new THREE.Vector3(x, 0, z), color: new THREE.Color(0xffa95a), fuerza: 1.6 };
      candidatasLuz.push(luz);
      const sup = { tipo: 'c', x, z, r: 0.92, tope: NIVEL_AGUA + 0.27, balsa: true };
      superficies.push(sup);
      actualizables.push(({ t }) => {
        const nz = z + Math.sin(t * (Math.PI * 2 / 6.5) + i * 1.7) * amp * (ayuda.rio ? 0 : 1);
        sup.dz = nz - sup.z; sup.z = nz;
        const y = NIVEL_AGUA + 0.06 + Math.sin(t * 1.4 + i) * 0.025;
        g.position.set(x, y, nz); g.rotation.z = Math.sin(t * 1.1 + i) * 0.02;
        sup.tope = y + 0.21;
        luz.pos.set(x + 0.6, y + 0.5, nz + 0.6);
      });
      balsas.push({ grupo: g, sup });
    });
    // farolillos de papel que bajan flotando por el río (detalle que pasa solo)
    const flotantes = [];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const l = new THREE.Mesh(geoLinterna, matPapel); l.scale.setScalar(0.8); l.position.y = 0.1; g.add(l);
      g.add(sprite(lineal(0.9, 0.42, 0.14), 0.9, new THREE.Vector3(0, 0.12, 0)));
      escena.add(g); flotantes.push({ g, x: R.x - 2.8 + (i % 4) * 1.9, fase: i * 9.3 });
    }
    actualizables.push(({ t }) => {
      for (const f of flotantes) {
        const z = ((t * 0.55 + f.fase) % 60) - 30;
        f.g.position.set(f.x + Math.sin(t * 0.5 + f.fase) * 0.3, NIVEL_AGUA + Math.sin(t * 2 + f.fase) * 0.02, z);
        f.g.visible = Math.abs(z) > 1.6 || Math.abs(f.x - R.x) > 3.5;
      }
    });
    // orillas: juncos y piedras
    const r = azar(606), jun = [], roc = [];
    for (let i = 0; i < 90; i++) {
      const s = r() < 0.5 ? -1 : 1, x = R.x + s * (3.6 + r() * 0.8), z = -22 + r() * 44;
      if (Math.abs(z) < 1.8) continue;
      jun.push(matriz(x, alturaTerreno(x, z) - 0.05, z, r() * 6, 0.8 + r() * 0.6));
    }
    for (let i = 0; i < 24; i++) {
      const s = r() < 0.5 ? -1 : 1, x = R.x + s * (4 + r() * 1.2), z = -16 + r() * 32;
      if (Math.abs(z) < 2.2) continue;
      roc.push(matriz(x, alturaTerreno(x, z) - 0.1, z, r() * 6, 0.5 + r() * 0.8));
    }
    instanciar('SM_Juncos', jun, { sombra: false, reflejo: false });
    if (REAL) rocasReales(roc); else instanciar('SM_Roca', roc, { reflejo: false });
  }

  // Arco de piedra con cortina de luz: la puerta de cada nivel nuevo
  function puertaArco(x, color) {
    colocar('SM_ArcoEntrada', x, alturaTerreno(x, 0), 0);
    for (const s of [-1, 1]) colisiones.push({ tipo: 'c', x, z: s * 2.35, r: 0.5, tope: 9 });
    return crearCortina(x + 0.4, 0, 20, 4.2, color);
  }

  // ================================================================ Nivel 7: las campanas de viento
  const C = DISENO.campanas;
  const campanas = { lista: [], orden: [], puerta: null };
  {
    // el orden correcto: de la más grande (grave) a la más pequeña (aguda)
    campanas.orden = C.lista.map((b, i) => [b.tam, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
    const perfil = [[0, 0.6], [0.07, 0.6], [0.11, 0.56], [0.15, 0.44], [0.18, 0.26], [0.23, 0.1], [0.3, 0.01], [0.31, -0.02], [0.27, -0.01]]
      .map(([a, b]) => new THREE.Vector2(a, b - 0.6));
    const geoCampana = new THREE.LatheGeometry(perfil, 28);
    const geoBadajo = new THREE.SphereGeometry(0.05, 10, 8).translate(0, -0.52, 0);
    const geoPoste = new THREE.CylinderGeometry(0.06, 0.075, 2.7, 8).translate(0, 1.35, 0);
    const geoTravesano = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8).rotateX(Math.PI / 2).translate(0, 2.55, 0);
    C.lista.forEach((d, i) => {
      const y = alturaTerreno(d.x, d.z);
      const g = new THREE.Group(); g.position.set(d.x, y, d.z); g.rotation.y = (i % 2 ? 0.25 : -0.25);
      for (const s of [-0.62, 0.62]) { const p = new THREE.Mesh(geoPoste, mat('M_Madera')); p.position.z = s; p.castShadow = true; g.add(p); }
      const trav = new THREE.Mesh(geoTravesano, mat('M_Madera')); trav.castShadow = true; g.add(trav);
      const bronce = new THREE.MeshStandardMaterial({ color: 0xb98b4e, metalness: 0.95, roughness: 0.3, side: THREE.DoubleSide, emissive: 0xffc46a, emissiveIntensity: 0 });
      const pivote = new THREE.Group(); pivote.position.y = 2.5; g.add(pivote);
      const cuerpo = new THREE.Mesh(geoCampana, bronce); cuerpo.scale.setScalar(d.tam * 1.25); cuerpo.castShadow = true; pivote.add(cuerpo);
      const badajo = new THREE.Mesh(geoBadajo, mat('M_Hierro')); badajo.scale.setScalar(d.tam * 1.25); pivote.add(badajo);
      const brillo = sprite(new THREE.Color(0, 0, 0), 1.6, new THREE.Vector3(0, 2.1, 0)); g.add(brillo);
      escena.add(g);
      for (const s of [-0.62, 0.62]) colisiones.push({ tipo: 'c', x: d.x + Math.sin(g.rotation.y) * s, z: d.z + Math.cos(g.rotation.y) * s, r: 0.12, tope: 9 });
      const luz = { pos: new THREE.Vector3(d.x, y + 2, d.z), color: new THREE.Color(0xffc46a), fuerza: 0 };
      candidatasLuz.push(luz);
      const b = { ...d, i, y, golpe: -9, acierto: false };
      b.tocar = (t, bien = true) => { b.golpe = t; b.color = bien ? lineal(1.4, 0.95, 0.4) : lineal(1.3, 0.25, 0.15); };
      actualizables.push(({ t }) => {
        const e = t - b.golpe, k = e >= 0 && e < 4 ? Math.exp(-e * 1.6) : 0;
        pivote.rotation.x = Math.sin(e * 8) * 0.32 * k;
        bronce.emissiveIntensity = (b.acierto ? 0.25 : 0) + k * 1.2;
        brillo.material.color.copy(b.color || lineal(0, 0, 0)).multiplyScalar(Math.max(k, b.acierto ? 0.25 : 0));
        luz.fuerza = k * 3 + (b.acierto ? 0.8 : 0);
      });
      campanas.lista.push(b);
    });
    // piedra cantora: al tocarla canta la melodía (las campanas suenan solas en el orden correcto)
    const P = C.piedra, yP = alturaTerreno(P.x, P.z);
    const piedra = new THREE.Mesh(new THREE.SphereGeometry(0.7, 28, 18).scale(1, 0.62, 0.85), mat('M_Piedra'));
    piedra.position.set(P.x, yP + 0.25, P.z); piedra.castShadow = piedra.receiveShadow = true; escena.add(piedra);
    const runa = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 32), new THREE.MeshBasicMaterial({ color: lineal(1.6, 1.3, 2.4) }));
    runa.rotation.x = -Math.PI / 2; runa.position.set(P.x, yP + 0.69, P.z); escena.add(runa);
    const brilloRuna = sprite(lineal(0.5, 0.42, 0.9), 1.4, new THREE.Vector3(P.x, yP + 0.75, P.z)); escena.add(brilloRuna);
    colisiones.push({ tipo: 'c', x: P.x, z: P.z, r: 0.75, tope: 9 });
    candidatasLuz.push({ pos: new THREE.Vector3(P.x, yP + 1.2, P.z), color: new THREE.Color(0x9f8cff), fuerza: 1.2 });
    actualizables.push(({ t }) => { brilloRuna.scale.setScalar(1.3 + Math.sin(t * 2) * 0.15); });
    campanas.piedra = { x: P.x, z: P.z, y: yP };
    campanas.puerta = puertaArco(C.puerta, lineal(0.6, 1.25, 0.7));
    // un círculo de losas y faroles bajos alrededor
    const r = azar(707), losas = [];
    for (let k = 0; k < 26; k++) { const a = (k / 26) * Math.PI * 2, x = P.x + Math.cos(a) * 2.1, z = P.z + Math.sin(a) * 2.1; losas.push(matriz(x, alturaTerreno(x, z) - 0.06, z, r() * 6, 0.8 + r() * 0.3)); }
    instanciar('SM_Losa', losas, { sombra: false, reflejo: false });
  }

  // ================================================================ Nivel 8: el jardín de las estatuas
  const E = DISENO.estatuas;
  const estatuas = { lista: [], puerta: null };
  {
    const yawLuna = Math.atan2(DIR_LUNA.x, DIR_LUNA.z);
    // figura con túnica que sostiene una linterna hacia adelante (+Z local)
    const perfil = [[0, 0], [0.34, 0], [0.33, 0.1], [0.27, 0.5], [0.22, 0.95], [0.2, 1.15], [0.16, 1.28], [0.07, 1.33], [0, 1.34]].map(([a, b]) => new THREE.Vector2(a, b));
    const piezasFigura = [
      new THREE.LatheGeometry(perfil, 24),
      new THREE.SphereGeometry(0.13, 18, 14).translate(0, 1.47, 0),
      new THREE.CylinderGeometry(0.045, 0.05, 0.55, 8).rotateX(Math.PI / 2 - 0.35).translate(0.12, 1.12, 0.24),
      new THREE.CylinderGeometry(0.045, 0.05, 0.42, 8).rotateX(0.3).rotateZ(0.25).translate(-0.18, 0.95, 0.02),
      new THREE.SphereGeometry(0.15, 14, 10).scale(1, 0.55, 1).translate(0, 1.36, 0),
    ];
    const geoFigura = mergeGeometries(piezasFigura);
    const geoPedestal = mergeGeometries([new THREE.BoxGeometry(0.85, 0.85, 0.85).translate(0, 0.425, 0), new THREE.BoxGeometry(1.0, 0.12, 1.0).translate(0, 0.06, 0), new THREE.BoxGeometry(0.95, 0.1, 0.95).translate(0, 0.85, 0)]);
    const geoLamp = new THREE.SphereGeometry(0.07, 14, 10);
    E.lista.forEach(([x, z, falta], i) => {
      const y = alturaTerreno(x, z);
      const ped = new THREE.Mesh(geoPedestal, mat('M_Piedra')); ped.position.set(x, y, z); ped.castShadow = ped.receiveShadow = true; escena.add(ped);
      const fig = new THREE.Group(); fig.position.set(x, y + 0.9, z); escena.add(fig);
      const cuerpo = new THREE.Mesh(geoFigura, mat('M_Piedra')); cuerpo.castShadow = true; fig.add(cuerpo);
      const matLamp = new THREE.MeshBasicMaterial({ color: lineal(0.6, 0.55, 0.45) });
      const lamp = new THREE.Mesh(geoLamp, matLamp); lamp.position.set(0.12, 1.25, 0.56); fig.add(lamp);
      const brillo = sprite(new THREE.Color(0, 0, 0), 1.5); lamp.add(brillo);
      colisiones.push({ tipo: 'b', x, z, hx: 0.5, hz: 0.5, tope: 9 });
      const luz = { pos: new THREE.Vector3(), color: new THREE.Color(0xbfd4ff), fuerza: 0 };
      candidatasLuz.push(luz);
      const s = { i, x, z, y, giros: (4 - falta) % 4, yaw: 0 };
      const destino = () => yawLuna - s.giros * (Math.PI / 2);
      s.yaw = destino(); fig.rotation.y = s.yaw;
      s.mira = () => s.giros % 4 === 0;
      s.girar = () => { s.giros = (s.giros + 1) % 4; };
      s.poner = (giros) => { s.giros = giros % 4; s.yaw = destino(); fig.rotation.y = s.yaw; };
      actualizables.push(({ dt, t }) => {
        // gira por el camino corto hacia el destino
        let d = destino() - s.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        s.yaw += d * Math.min(1, dt * 3.2); fig.rotation.y = s.yaw;
        const on = s.mira() && Math.abs(d) < 0.05 ? 1 : 0;
        s.encendida = on;
        matLamp.color.copy(on ? lineal(2.6, 2.8, 3.4) : lineal(0.6, 0.55, 0.45));
        brillo.material.color.copy(lineal(0.5, 0.6, 0.95)).multiplyScalar(on * (0.85 + Math.sin(t * 3 + i) * 0.15));
        lamp.getWorldPosition(luz.pos); luz.fuerza = on * 2.4;
      });
      estatuas.lista.push(s);
    });
    // setos bajos que enmarcan el jardín
    const bolas = [];
    for (const [x, z] of [[145.4, -5.6], [145.4, 5.6], [149, -5.8], [152.4, 5.8], [155.8, -5.6], [155.8, 5.6], [148.6, 5.4], [152, -5.4]]) bolas.push(matriz(x, alturaTerreno(x, z) - 0.05, z, x, 0.9));
    instanciar(REAL ? 'SM_BolaSeto' : 'SM_Arbusto', bolas, { sombra: false, reflejo: false });
    estatuas.puerta = puertaArco(E.puerta, lineal(0.9, 0.7, 1.5));
  }

  // ================================================================ Nivel 9: el invernadero de mariposas
  const V = DISENO.invernadero;
  const mariposas = [];
  let puertaInvernadero;
  {
    const largo = V.x1 - V.x0, cx = (V.x0 + V.x1) / 2, y0 = alturaTerreno(cx, 0) - 0.02;
    const barras = [], g = (geo) => barras.push(geo);
    const pasos = 6;
    for (let k = 0; k <= pasos; k++) {
      const x = V.x0 + (k / pasos) * largo;
      for (const s of [-1, 1]) {
        g(new THREE.BoxGeometry(0.08, V.alto, 0.08).translate(x, y0 + V.alto / 2, s * V.z));
        // cabio del techo hasta la cumbrera
        const lz = Math.hypot(V.z, V.cumbre - V.alto), ang = Math.atan2(V.cumbre - V.alto, V.z);
        g(new THREE.BoxGeometry(0.07, 0.07, lz).rotateX(s * ang).translate(x, y0 + (V.alto + V.cumbre) / 2, s * V.z / 2));
      }
    }
    for (const s of [-1, 1]) for (const h of [0.08, 1.1, V.alto]) g(new THREE.BoxGeometry(largo, 0.07, 0.07).translate(cx, y0 + h, s * V.z));
    g(new THREE.BoxGeometry(largo, 0.09, 0.09).translate(cx, y0 + V.cumbre, 0));
    for (const x of [V.x0, V.x1]) for (const s of [-1, 1]) g(new THREE.BoxGeometry(0.08, V.alto, 0.08).translate(x, y0 + V.alto / 2, s * 1.35));
    const marco = new THREE.Mesh(mergeGeometries(barras), new THREE.MeshStandardMaterial({ color: 0xdfe6dc, metalness: 0.5, roughness: 0.45 }));
    marco.castShadow = true; marco.name = 'SM_Invernadero';
    escena.add(marco);
    // vidrio: casi transparente, con un leve brillo azulado
    const matVidrio = new THREE.MeshStandardMaterial({ color: 0xcfe7ff, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
    const vidrios = [];
    for (const s of [-1, 1]) {
      vidrios.push(new THREE.PlaneGeometry(largo, V.alto).translate(cx, y0 + V.alto / 2, s * V.z));
      const lz = Math.hypot(V.z, V.cumbre - V.alto);
      vidrios.push(new THREE.PlaneGeometry(largo, lz).rotateX(-s * (Math.PI / 2 - Math.atan2(V.cumbre - V.alto, V.z))).translate(cx, y0 + (V.alto + V.cumbre) / 2, s * V.z / 2));
    }
    for (const x of [V.x0, V.x1]) for (const s of [-1, 1]) {
      const ancho = V.z - 1.35;
      vidrios.push(new THREE.PlaneGeometry(ancho, V.alto).rotateY(Math.PI / 2).translate(x, y0 + V.alto / 2, s * (1.35 + ancho / 2)));
    }
    for (const x of [V.x0, V.x1]) {
      const tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y0 + V.alto, -V.z), new THREE.Vector3(x, y0 + V.alto, V.z), new THREE.Vector3(x, y0 + V.cumbre, 0)]);
      tri.computeVertexNormals(); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
      vidrios.push(tri);
    }
    const vidrio = new THREE.Mesh(mergeGeometries(vidrios.map((v) => (v.index ? v.toNonIndexed() : v))), matVidrio);
    vidrio.renderOrder = 2; escena.add(vidrio);
    // paredes (con puertas en los dos extremos)
    for (const s of [-1, 1]) colisiones.push({ tipo: 'b', x: cx, z: s * V.z, hx: largo / 2, hz: 0.1, tope: 9 });
    for (const x of [V.x0, V.x1]) for (const s of [-1, 1]) colisiones.push({ tipo: 'b', x, z: s * (1.35 + (V.z - 1.35) / 2), hx: 0.1, hz: (V.z - 1.35) / 2, tope: 9 });
    // canteros con plantas a los dos lados
    const tierra = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 });
    for (const s of [-1, 1]) {
      const cantero = new THREE.Mesh(new THREE.BoxGeometry(largo - 1.6, 0.45, 1.6), mat('M_Madera'));
      cantero.position.set(cx, y0 + 0.22, s * (V.z - 1.05)); cantero.castShadow = cantero.receiveShadow = true; escena.add(cantero);
      const sup = new THREE.Mesh(new THREE.BoxGeometry(largo - 1.8, 0.02, 1.4), tierra); sup.position.set(cx, y0 + 0.455, s * (V.z - 1.05)); escena.add(sup);
      colisiones.push({ tipo: 'b', x: cx, z: s * (V.z - 1.05), hx: (largo - 1.6) / 2, hz: 0.8, tope: y0 + 0.5 });
    }
    const r = azar(909), plantas = [[], [], []];
    for (let k = 0; k < (alta ? 60 : 36); k++) {
      const s = r() < 0.5 ? -1 : 1, x = V.x0 + 1.1 + r() * (largo - 2.2), z = s * (V.z - 1.05 + (r() - 0.5) * 1.1);
      plantas[k % 3].push(matriz(x, y0 + 0.45, z, r() * 6, 0.7 + r() * 0.6));
    }
    const nombres = REAL ? ['SM_Helecho0', 'SM_Vinca0', 'SM_Helecho1'] : ['SM_Flores', 'SM_Flores', 'SM_Flores'];
    nombres.forEach((n, k) => instanciar(n, plantas[k], { sombra: false, reflejo: false }));
    // guirnalda de luces bajo el techo
    const focos = [];
    for (let k = 0; k <= 30; k++) { const t = k / 30, x = V.x0 + 0.4 + t * (largo - 0.8); focos.push(matriz(x, y0 + V.alto + 0.1 - Math.abs(Math.sin(t * Math.PI * 5)) * 0.45, Math.sin(t * Math.PI * 10) * 1.2)); }
    const imF = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: lineal(2.6, 1.9, 0.9) }), focos.length);
    focos.forEach((m, i) => imF.setMatrixAt(i, m)); imF.computeBoundingSphere(); escena.add(imF);
    for (const x of [V.x0 + 3, V.x1 - 3]) candidatasLuz.push({ pos: new THREE.Vector3(x, y0 + 3, 0), color: new THREE.Color(0xffd08a), fuerza: 4 });
    // mariposas de luz
    const ala = new THREE.Shape(); ala.moveTo(0, 0); ala.bezierCurveTo(0.12, 0.2, 0.32, 0.18, 0.3, 0.02); ala.bezierCurveTo(0.28, -0.12, 0.12, -0.16, 0, 0);
    const geoAla = new THREE.ShapeGeometry(ala, 8).rotateX(-Math.PI / 2);
    const colores = [0x7fd6ff, 0xff9ad5, 0xbfa2ff, 0x9dffc8, 0xffd27a];
    DISENO.mariposas.forEach(([x, z, alto], id) => {
      const col = new THREE.Color(colores[id % colores.length]);
      const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, side: THREE.DoubleSide, roughness: 0.5 });
      const grupo = new THREE.Group();
      const izq = new THREE.Mesh(geoAla, m), der = new THREE.Mesh(geoAla, m); der.scale.x = -1;
      grupo.add(izq, der, new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.12, 3, 6).rotateX(Math.PI / 2), mat('M_Hierro')));
      grupo.add(sprite(col.clone().multiplyScalar(0.35), 0.8));
      const origen = new THREE.Vector3(x, y0 + alto, z);
      grupo.position.copy(origen); escena.add(grupo);
      mariposas.push({ id, grupo, izq, der, origen, atrapada: false, orden: 0 });
    });
    const meta = new THREE.Vector3();
    actualizables.push(({ t, jugador }) => {
      for (const b of mariposas) {
        const aleteo = Math.sin(t * 14 + b.id * 2) * 0.9;
        b.izq.rotation.z = aleteo; b.der.rotation.z = -aleteo;
        if (!b.atrapada) {
          meta.set(b.origen.x + Math.sin(t * 0.6 + b.id) * 0.9, b.origen.y + Math.sin(t * 1.3 + b.id * 1.7) * 0.25, b.origen.z + Math.sin(t * 0.45 + b.id * 2.1) * 0.7);
        } else if (jugador) {
          const a = t * 0.9 + b.orden * (Math.PI * 2 / 5);
          meta.set(jugador.x + Math.cos(a) * 1.1, jugador.y + 1.7 + Math.sin(t * 1.7 + b.orden) * 0.2, jugador.z + Math.sin(a) * 1.1);
        } else continue;
        const antes = b.grupo.position.clone();
        b.grupo.position.lerp(meta, b.atrapada ? 0.06 : 0.04);
        const d = b.grupo.position.clone().sub(antes);
        if (d.lengthSq() > 1e-7) b.grupo.rotation.y = Math.atan2(d.x, d.z);
      }
    });
    puertaInvernadero = crearCortina(V.puerta, 0, 20, 4.2, lineal(0.45, 0.85, 1.5));
  }

  // ================================================================ Nivel 10: la escalera de estrellas
  const escalera = { estrellas: [] };
  {
    const H = DISENO.meseta.alto;
    const forma = new THREE.Shape();
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI / 2 + (k / 10) * Math.PI * 2, rr = k % 2 ? 0.48 : 1.02;
      if (k === 0) forma.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else forma.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const geoEstrella = new THREE.ExtrudeGeometry(forma, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 2 }).rotateX(-Math.PI / 2).translate(0, -0.2, 0);
    DISENO.escalera.forEach(([x, z, alto], i) => {
      const matE = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffc861, emissiveIntensity: 0.75, roughness: 0.35, metalness: 0.2 });
      const m = new THREE.Mesh(geoEstrella, matE); m.castShadow = m.receiveShadow = true;
      const g = new THREE.Group(); g.add(m); g.add(sprite(lineal(0.9, 0.7, 0.3), 2.6, new THREE.Vector3(0, -0.3, 0)));
      escena.add(g);
      const sup = { tipo: 'c', x, z, r: 1.0, tope: alto, estrella: true };
      superficies.push(sup);
      candidatasLuz.push({ pos: new THREE.Vector3(x, alto - 0.4, z), color: new THREE.Color(0xffd27a), fuerza: 1.4 });
      actualizables.push(({ t }) => {
        const k = ayuda.escalera ? 0 : 1;
        const y = alto + Math.sin(t * 1.2 + i * 0.9) * 0.07 * k;
        g.position.set(x, y, z); g.rotation.y = t * 0.15 * k + i;
        g.scale.setScalar(ayuda.escalera ? 1.45 : 1.18);
        sup.r = ayuda.escalera ? 1.3 : 1.0; sup.tope = y;
        matE.emissiveIntensity = 0.7 + Math.sin(t * 2 + i) * 0.15;
      });
      escalera.estrellas.push({ grupo: g, sup });
    });
    // acantilado: solo se sube por las estrellas
    colisiones.push({ tipo: 'b', x: 190.15, z: 0, hx: 0.55, hz: 9.6, tope: H - 0.5 });
    const r = azar(1101), roc = [];
    for (let i = 0; i < 46; i++) {
      const z = -13 + r() * 26;
      if (Math.abs(z) < 1.5) continue;
      const x = 189.9 + r() * 0.7;
      roc.push(matriz(x, alturaTerreno(x, z) - 0.6 - r() * 1.6, z, r() * 6, 0.9 + r() * 1.4));
    }
    if (REAL) rocasReales(roc, 1.3); else instanciar('SM_Roca', roc, { reflejo: false });
  }

  // ================================================================ Recuerdos: uno escondido en cada nivel
  const recuerdos = [];
  {
    const oro = mat('M_Oro');
    const brilla = (col, k = 1.6) => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: k, roughness: 0.4 });
    const modelos = {
      pluma: () => { const g = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.46, 6).scale(1, 1, 0.25), brilla(0xf2ead8, 0.7)); g.rotation.z = 0.5; return g; },
      perla: () => new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf6f0ff, emissive: 0x6a6a90, roughness: 0.12, metalness: 0.25 })),
      rosa: () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), brilla(0xe0305a, 0.9)),
      llave: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 18), oro)); const v = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.02), oro); v.position.y = -0.17; g.add(v); const d = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.02), oro); d.position.set(0.035, -0.25, 0); g.add(d); return g; },
      frasco: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 14), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35, roughness: 0.05 }))); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), brilla(0xfff08a, 3))); return g; },
      linterna: () => new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 12), brilla(0xff7a3c, 1.4)),
      campanita: () => new THREE.Mesh(new THREE.LatheGeometry([[0, 0.12], [0.03, 0.12], [0.05, 0.08], [0.07, 0], [0.08, -0.03]].map(([a, b]) => new THREE.Vector2(a, b)), 16), new THREE.MeshStandardMaterial({ color: 0xdfe3ea, metalness: 1, roughness: 0.25, side: THREE.DoubleSide })),
      moneda: () => { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 24).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe6e9f2, metalness: 1, roughness: 0.2, emissive: 0x30344a })); return g; },
      ala: () => { const a = new THREE.Shape(); a.moveTo(0, 0); a.bezierCurveTo(0.1, 0.2, 0.3, 0.2, 0.28, 0.02); a.bezierCurveTo(0.26, -0.12, 0.1, -0.15, 0, 0); return new THREE.Mesh(new THREE.ShapeGeometry(a, 8), new THREE.MeshStandardMaterial({ color: 0x7fd6ff, emissive: 0x7fd6ff, emissiveIntensity: 1.4, side: THREE.DoubleSide })); },
      estrellas: () => { const f = new THREE.Shape(); for (let k = 0; k <= 10; k++) { const a = Math.PI / 2 + (k / 10) * Math.PI * 2, rr = k % 2 ? 0.05 : 0.12; if (k === 0) f.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else f.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } return new THREE.Mesh(new THREE.ExtrudeGeometry(f, { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015), brilla(0xffd86a, 2)); },
    };
    for (const d of DISENO.recuerdos) {
      let x = d.x, z = d.z, y;
      if (d.laberinto) { x = LAB.x0 + (laberinto.recuerdo.i + 0.5) * LAB.celda; z = LAB.z0 + (laberinto.recuerdo.j + 0.5) * LAB.celda; }
      if (d.sobrePiedra) y = NIVEL_AGUA + 0.35 + 0.55;
      else if (d.alto !== undefined) y = d.alto + 0.75;
      else y = alturaTerreno(x, z) + 0.85;
      const g = new THREE.Group(); g.position.set(x, y, z);
      g.add(modelos[d.tipo]());
      g.add(sprite(lineal(0.75, 0.62, 0.42), 0.95));
      escena.add(g);
      const o = { ...d, x, z, y, grupo: g, tomado: false };
      o.tomar = () => { o.tomado = true; g.visible = false; };
      recuerdos.push(o);
    }
    actualizables.push(({ t }) => { for (const o of recuerdos) if (!o.tomado) { o.grupo.position.y = o.y + Math.sin(t * 2 + o.id) * 0.06; o.grupo.children[0].rotation.y = t * 1.2 + o.id; } });
  }

  // ================================================================ La estrella de Kimberly (aparece en el cielo al abrir el cofre)
  const estrellaKimberly = { visible: false, alfa: 0 };
  {
    const dir = new THREE.Vector3(18, 12, 6).normalize();
    const estrella = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaDestello(), color: lineal(2.2, 2.0, 1.7), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, opacity: 0 }));
    estrella.scale.setScalar(10); estrella.renderOrder = -8;
    const nombre = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaNombre('Kimberly'), fog: false, depthWrite: false, transparent: true, opacity: 0 }));
    nombre.scale.set(18, 4.5, 1); nombre.renderOrder = -8;
    escena.add(estrella, nombre);
    estrella.userData.refleja = nombre.userData.refleja = true;
    estrellaKimberly.mostrar = (inmediato = false) => { estrellaKimberly.visible = true; if (inmediato) estrellaKimberly.alfa = 1; };
    actualizables.push(({ dt, t, camara }) => {
      if (estrellaKimberly.visible && estrellaKimberly.alfa < 1) estrellaKimberly.alfa = Math.min(1, estrellaKimberly.alfa + dt / 3);
      const a = estrellaKimberly.alfa;
      estrella.visible = nombre.visible = a > 0.001;
      if (!estrella.visible) return;
      estrella.position.copy(camara.position).addScaledVector(dir, 76);
      nombre.position.copy(estrella.position); nombre.position.y -= 5.4;
      estrella.material.opacity = a * (0.85 + Math.sin(t * 2.3) * 0.15);
      estrella.material.rotation = t * 0.05;
      nombre.material.opacity = a * 0.9;
    });
  }

  return { balsas, campanas, estatuas, mariposas, puertaInvernadero, escalera, recuerdos, estrellaKimberly };
}

// mapa de normales para el agua del río (ondas suaves, se repite sin costuras)
function texturaOndas() {
  const n = 128, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d'), img = g.createImageData(n, n);
  const h = (x, y) => {
    const u = (x / n) * Math.PI * 2, v = (y / n) * Math.PI * 2;
    return Math.sin(u * 3 + Math.sin(v * 2) * 1.5) * 0.5 + Math.sin(v * 5 + u) * 0.3 + Math.sin((u + v) * 7) * 0.15;
  };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
    const v = new THREE.Vector3(-dx * 2, -dy * 2, 1).normalize(), k = (y * n + x) * 4;
    img.data[k] = (v.x * 0.5 + 0.5) * 255; img.data[k + 1] = (v.y * 0.5 + 0.5) * 255; img.data[k + 2] = (v.z * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(cv);
}

// destello de estrella con cuatro rayos
function texturaDestello() {
  const n = 128, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d');
  const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.08, 'rgba(255,245,220,0.9)'); r.addColorStop(0.3, 'rgba(255,220,170,0.18)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, n, n);
  g.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[n, 3], [3, n]]) {
    const l = g.createLinearGradient(w > h ? 0 : n / 2, w > h ? n / 2 : 0, w > h ? n : n / 2, w > h ? n / 2 : n);
    l.addColorStop(0, 'rgba(255,240,210,0)'); l.addColorStop(0.5, 'rgba(255,240,210,0.85)'); l.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = l; g.fillRect((n - w) / 2, (n - h) / 2, w, h);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// nombre escrito con letra elegante, para ponerlo bajo la estrella
function texturaNombre(texto) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'italic 600 74px "Cormorant Garamond", Georgia, serif';
  g.shadowColor = 'rgba(255,200,130,0.9)'; g.shadowBlur = 18;
  g.fillStyle = '#fff3df'; g.fillText(texto, 256, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
