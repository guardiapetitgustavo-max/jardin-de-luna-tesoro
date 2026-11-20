// Sonido hecho con Web Audio (sin archivos): grillos de noche, un colchón suave y campanitas al conseguir algo.
let ctx = null, maestro = null, activo = true;

export function iniciarSonido() {
  if (ctx) { ctx.resume?.(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  maestro = ctx.createGain();
  maestro.gain.value = activo ? 0.55 : 0;
  maestro.connect(ctx.destination);
  colchon();
  grillos();
}

export function alternarSonido() {
  activo = !activo;
  if (maestro) maestro.gain.setTargetAtTime(activo ? 0.55 : 0, ctx.currentTime, 0.1);
  return activo;
}
export const sonidoActivo = () => activo;

// Acorde suave que respira despacio
function colchon() {
  const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 900;
  const g = ctx.createGain(); g.gain.value = 0.035;
  filtro.connect(g); g.connect(maestro);
  for (const f of [220, 277.18, 329.63, 440]) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const lfo = ctx.createOscillator(), prof = ctx.createGain();
    lfo.frequency.value = 0.05 + Math.random() * 0.05; prof.gain.value = 0.4;
    lfo.connect(prof); prof.connect(o.detune);
    o.connect(filtro); o.start(); lfo.start();
  }
}

// Grillos: pulsos cortos de un tono agudo filtrado, a ritmos distintos
function grillos() {
  const crear = (frecuencia, cada, pan) => {
    const tic = () => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      o.type = 'triangle'; o.frequency.value = frecuencia;
      g.gain.value = 0;
      for (let i = 0; i < 3; i++) {
        g.gain.setValueAtTime(0, t + i * 0.045);
        g.gain.linearRampToValueAtTime(0.018, t + i * 0.045 + 0.008);
        g.gain.linearRampToValueAtTime(0, t + i * 0.045 + 0.03);
      }
      o.connect(g);
      if (p) { p.pan.value = pan; g.connect(p); p.connect(maestro); } else g.connect(maestro);
      o.start(t); o.stop(t + 0.2);
      setTimeout(tic, cada * (0.7 + Math.random() * 0.6) * 1000);
    };
    setTimeout(tic, Math.random() * 2000);
  };
  crear(4300, 1.1, -0.6); crear(4700, 1.6, 0.5); crear(3900, 2.3, 0.1);
}

function nota(frecuencia, cuando, duracion = 0.9, volumen = 0.12, tipo = 'sine') {
  if (!ctx) return;
  const t = ctx.currentTime + cuando;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.value = frecuencia;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volumen, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
  o.connect(g); g.connect(maestro);
  o.start(t); o.stop(t + duracion + 0.05);
}

function deslizar(f0, f1, cuando, dur, vol, tipo = 'sine') {
  if (!ctx) return;
  const t = ctx.currentTime + cuando, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(maestro); o.start(t); o.stop(t + dur + 0.05);
}

export const sonidos = {
  buho: () => { deslizar(420, 360, 0, 0.35, 0.05); deslizar(400, 340, 0.55, 0.6, 0.05); },
  rana: () => { for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) deslizar(180, 120, i * 0.18, 0.12, 0.04, 'square'); },
  estrella: () => { [1568, 2093, 2637].forEach((f, i) => nota(f, i * 0.09, 1.1, 0.04)); },
  corazon: () => { [784, 987.77, 1174.66, 1567.98].forEach((f, i) => nota(f, i * 0.07, 0.9, 0.08)); },
  pez: () => { if (!ctx) return; const t = ctx.currentTime, n = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const g = ctx.createGain(); g.gain.value = 0.12;
    n.buffer = b; n.connect(f); f.connect(g); g.connect(maestro); n.start(t); },
  objeto: () => { nota(880, 0); nota(1318.5, 0.08); },
  pista: () => { nota(659.25, 0); nota(987.77, 0.1, 1.2, 0.08); },
  logro: () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => nota(f, i * 0.11, 1.4, 0.1)); },
  error: () => { nota(220, 0, 0.35, 0.12, 'triangle'); nota(196, 0.12, 0.45, 0.12, 'triangle'); },
  agua: () => { if (!ctx) return; const t = ctx.currentTime, n = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200; const g = ctx.createGain(); g.gain.value = 0.25;
    n.buffer = b; n.connect(f); f.connect(g); g.connect(maestro); n.start(t); },
  final: () => { [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => nota(f, i * 0.16, 2.2, 0.09)); },
};
