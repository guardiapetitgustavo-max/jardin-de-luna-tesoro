// Personaje de la protagonista, hecho con formas suaves y animado por código (caminar, correr, saltar, respirar).
// Mira hacia +Z en su espacio local; el juego lo gira con rotation.y.
import * as THREE from 'three';

function capsula(radio, largo, material, seg = 10) {
  const g = new THREE.CapsuleGeometry(radio, largo, 6, seg);
  g.translate(0, -largo / 2 - radio * 0.6, 0); // el pivote queda arriba (hombro, cadera, rodilla)
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  return m;
}

export function crearPersonaje() {
  const piel = new THREE.MeshStandardMaterial({ color: 0xf0c4a2, roughness: 0.6 });
  const vestido = new THREE.MeshPhysicalMaterial({ color: 0xd97aa6, roughness: 0.55, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffd0e4) });
  const vestidoOscuro = new THREE.MeshStandardMaterial({ color: 0xa8507c, roughness: 0.7 });
  const pelo = new THREE.MeshStandardMaterial({ color: 0x3b261c, roughness: 0.45, side: THREE.DoubleSide });
  const zapato = new THREE.MeshStandardMaterial({ color: 0xf3e2d0, roughness: 0.5 });
  const medias = new THREE.MeshStandardMaterial({ color: 0x4a3150, roughness: 0.75 });
  const ojo = new THREE.MeshStandardMaterial({ color: 0x1d1310, roughness: 0.2 });
  const rubor = new THREE.MeshBasicMaterial({ color: 0xf08f9a, transparent: true, opacity: 0.45 });
  const cinta = new THREE.MeshStandardMaterial({ color: 0xffd36e, emissive: 0x6b4a10, emissiveIntensity: 0.4, roughness: 0.4 });

  const raiz = new THREE.Group();
  const cuerpo = new THREE.Group(); // sube y baja al caminar
  raiz.add(cuerpo);

  // ---- piernas
  const piernas = [];
  for (const s of [-1, 1]) {
    const cadera = new THREE.Group(); cadera.position.set(s * 0.085, 0.8, 0);
    const muslo = capsula(0.07, 0.29, medias); cadera.add(muslo);
    const rodilla = new THREE.Group(); rodilla.position.y = -0.4; cadera.add(rodilla);
    const pantorrilla = capsula(0.06, 0.29, medias); rodilla.add(pantorrilla);
    const pie = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), zapato);
    pie.scale.set(0.85, 0.6, 1.5); pie.position.set(0, -0.39, 0.035); pie.castShadow = true;
    rodilla.add(pie);
    cuerpo.add(cadera);
    piernas.push({ cadera, rodilla });
  }

  // ---- vestido (perfil girado) y torso
  const perfil = [];
  const puntosVestido = [[0.0, 1.13], [0.13, 1.12], [0.142, 1.02], [0.128, 0.95], [0.16, 0.86], [0.23, 0.72], [0.30, 0.58], [0.315, 0.55], [0.3, 0.535], [0.0, 0.535]];
  for (const [x, y] of puntosVestido) perfil.push(new THREE.Vector2(x, y));
  const falda = new THREE.Mesh(new THREE.LatheGeometry(perfil, 40), vestido);
  falda.castShadow = true;
  cuerpo.add(falda);
  const cinturon = new THREE.Mesh(new THREE.CylinderGeometry(0.131, 0.131, 0.03, 32, 1, true), vestidoOscuro);
  cinturon.position.y = 0.955; cuerpo.add(cinturon);
  const lazo = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), cinta);
  lazo.scale.set(1.5, 0.9, 0.5); lazo.position.set(0, 0.955, -0.13); cuerpo.add(lazo);
  const pecho = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14), vestido);
  pecho.scale.set(1.05, 1.05, 0.82); pecho.position.y = 1.18; pecho.castShadow = true; cuerpo.add(pecho);

  // ---- brazos
  const brazos = [];
  for (const s of [-1, 1]) {
    const hombro = new THREE.Group(); hombro.position.set(s * 0.165, 1.27, 0);
    const manga = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), vestidoOscuro);
    manga.scale.set(1, 1.1, 1); manga.position.y = -0.03; manga.castShadow = true; hombro.add(manga);
    const brazo = capsula(0.038, 0.2, piel); hombro.add(brazo);
    const codo = new THREE.Group(); codo.position.y = -0.27; hombro.add(codo);
    const antebrazo = capsula(0.034, 0.18, piel); codo.add(antebrazo);
    const mano = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), piel);
    mano.position.y = -0.25; mano.castShadow = true; codo.add(mano);
    hombro.rotation.z = s * 0.12;
    cuerpo.add(hombro);
    brazos.push({ hombro, codo, s });
  }

  // ---- cabeza
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.1, 12), piel);
  cuello.position.y = 1.33; cuerpo.add(cuello);
  const cabeza = new THREE.Group(); cabeza.position.y = 1.47; cuerpo.add(cabeza);
  const cara = new THREE.Mesh(new THREE.SphereGeometry(0.118, 28, 20), piel);
  cara.scale.set(0.95, 1.05, 0.98); cara.castShadow = true; cabeza.add(cara);
  for (const s of [-1, 1]) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), ojo);
    o.scale.set(0.9, 1.25, 0.6); o.position.set(s * 0.042, 0.005, 0.108); cabeza.add(o);
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.02, 12), rubor);
    b.position.set(s * 0.062, -0.03, 0.102); b.rotation.y = s * 0.5; cabeza.add(b);
  }
  // pelo: casquete, flequillo y melena larga que se mece
  const casquete = new THREE.Mesh(new THREE.SphereGeometry(0.128, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), pelo);
  casquete.rotation.x = -0.32; casquete.position.set(0, 0.012, -0.008); casquete.castShadow = true; cabeza.add(casquete);
  const flequillo = new THREE.Mesh(new THREE.SphereGeometry(0.124, 24, 10, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.16, Math.PI * 0.22), pelo);
  flequillo.rotation.y = 0; flequillo.position.set(0, 0.018, 0.012); cabeza.add(flequillo);
  const melenaPivote = new THREE.Group(); melenaPivote.position.set(0, 0.05, -0.05); cabeza.add(melenaPivote);
  const perfilPelo = [[0.0, 0.0], [0.115, -0.01], [0.13, -0.1], [0.125, -0.22], [0.11, -0.33], [0.085, -0.4], [0.0, -0.42]].map(([x, y]) => new THREE.Vector2(x, y));
  const melena = new THREE.Mesh(new THREE.LatheGeometry(perfilPelo, 24, Math.PI * 0.5, Math.PI), pelo);
  melena.scale.set(1.05, 1, 0.75); melena.castShadow = true; melenaPivote.add(melena);
  const flor = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), cinta);
  flor.position.set(0.1, 0.07, 0.03); cabeza.add(flor);

  raiz.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });

  // ---------------------------------------------------------------- animación
  let fase = 0, mezclaAire = 0, tiempo = 0, inclinacion = 0;
  /**
   * @param dt segundos
   * @param velocidad m/s horizontal
   * @param enSuelo si pisa el suelo
   * @param vy velocidad vertical
   * @param giro cuánto está girando (rad/s) para inclinarse en las curvas
   */
  function animar(dt, velocidad, enSuelo, vy, giro = 0) {
    tiempo += dt;
    const corre = Math.min(1, Math.max(0, (velocidad - 4.4) / 2));
    const anda = Math.min(1, velocidad / 2.2);
    fase += dt * (velocidad * 2.25 + 0.0001);
    mezclaAire += ((enSuelo ? 0 : 1) - mezclaAire) * Math.min(1, dt * 10);
    const s = Math.sin(fase), c = Math.cos(fase);
    const amp = 0.55 + corre * 0.35;

    piernas.forEach(({ cadera, rodilla }, i) => {
      const sg = i ? -1 : 1, ph = s * sg;
      const caminar = ph * amp * anda;
      const doblar = Math.max(0, -Math.cos(fase + (i ? Math.PI : 0))) * (0.75 + corre * 0.6) * anda;
      cadera.rotation.x = THREE.MathUtils.lerp(caminar, i ? -0.55 : 0.25, mezclaAire);
      rodilla.rotation.x = THREE.MathUtils.lerp(doblar, i ? 0.9 : 0.35, mezclaAire);
    });
    brazos.forEach(({ hombro, codo, s: lado }, i) => {
      const sg = i ? 1 : -1;
      const caminar = s * sg * (0.45 + corre * 0.4) * anda;
      hombro.rotation.x = THREE.MathUtils.lerp(caminar, -0.9, mezclaAire);
      hombro.rotation.z = lado * (0.12 + mezclaAire * 0.5 + Math.sin(tiempo * 1.6) * 0.015);
      codo.rotation.x = THREE.MathUtils.lerp(-0.25 - corre * 0.7 * anda, -0.5, mezclaAire);
    });
    const rebote = Math.abs(c) * 0.035 * anda * (1 + corre);
    const respira = Math.sin(tiempo * 2.2) * 0.006 * (1 - anda);
    cuerpo.position.y = rebote + respira - (1 - mezclaAire) * anda * 0.01;
    inclinacion += ((-giro * 0.05 * anda) - inclinacion) * Math.min(1, dt * 6);
    cuerpo.rotation.z = THREE.MathUtils.clamp(inclinacion, -0.18, 0.18);
    cuerpo.rotation.x = 0.06 * anda + corre * 0.08 - mezclaAire * 0.05;
    falda.scale.set(1 + mezclaAire * 0.08, 1 - mezclaAire * 0.04, 1 + mezclaAire * 0.08);
    falda.rotation.y = s * 0.05 * anda;
    melenaPivote.rotation.x = 0.12 * anda + corre * 0.2 + Math.sin(fase * 2) * 0.05 * anda + (vy > 0 ? -0.2 : 0.25) * mezclaAire;
    cabeza.rotation.x = -0.04 * anda + Math.sin(tiempo * 1.1) * 0.02;
    cabeza.rotation.y = Math.sin(tiempo * 0.37) * 0.12 * (1 - anda);
  }

  return { objeto: raiz, animar };
}
