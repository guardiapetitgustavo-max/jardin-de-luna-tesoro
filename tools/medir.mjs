// Mide el juego en esta PC con Chrome oculto (usa la tarjeta gráfica real). Uso: node tools/medir.mjs "<consulta>" <etiqueta>
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const consulta = (process.argv[2] || '').replace(/:/g, '='), etiqueta = process.argv[3] || 'prueba';
const salida = 'C:/Users/Gustavo/Documents/jardin-de-luna-tesoro/tools/capturas';
mkdirSync(salida, { recursive: true });
const puerto = 9333;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${process.env.TEMP}/jardin-medir-${Date.now()}`,
  '--window-size=1920,1080', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const espera = new Map();
for (let i = 0; i < 40; i++) { try { const l = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json(); const p = l.find((t) => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await dormir(500); }
await new Promise((r) => ws.addEventListener('open', r));
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && espera.has(m.id)) { espera.get(m.id)(m); espera.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; espera.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description; };
const foto = async (nombre) => { const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 80 }); writeFileSync(`${salida}/${etiqueta}_${nombre}.jpg`, Buffer.from(r.result.data, 'base64')); };
await cdp('Page.enable'); await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: `${process.env.BASE || 'http://localhost:8123/'}?prueba${consulta ? '&' + consulta : ''}` });
const t0 = Date.now();
while (Date.now() - t0 < 120000) { if ((await ev('window.__jardin?.modo?.()')) === 'portada') break; await dormir(500); }
const res = { etiqueta, carga_s: ((Date.now() - t0) / 1000).toFixed(1) };
res.gpu = await ev(`(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; })()`);
res.realista = await ev('window.__jardin.info?.().realista ?? null');
await ev('__jardin.comenzar()'); await dormir(2500); await ev('__jardin.cerrarPanel()');
const medirFps = `new Promise((r) => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 4000) requestAnimationFrame(f); else r(Math.round(n * 1000 / (performance.now() - t))); }; requestAnimationFrame(f); })`;
const brillo = `(() => { const c = document.querySelector('canvas'); const g = document.createElement('canvas'); g.width = 48; g.height = 27; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 48, 27); const d = x.getImageData(0, 0, 48, 27).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return Math.round(s / (d.length / 4) / 3); })()`;
res.zonas = [];
for (const [x, z, nombre] of [[-97, 0, 'entrada'], [12, 0, 'estanque'], [44, -2, 'laberinto'], [80, 0, 'plaza'], [100, 0, 'bosque'], [112.5, 0, 'rio'], [131, 0, 'campanas'], [145, 0, 'estatuas'], [161, 0, 'invernadero'], [177, 0, 'escalera'], [192, 0, 'mirador']]) {
  await ev(`__jardin.ir(${x}, ${z}, 0)`); await dormir(2500);
  const fps = await ev(medirFps);
  const info = await ev(`(() => { const r = __jardin.info(); return r; })()`);
  res.zonas.push({ nombre, fps, brillo: await ev(brillo), escala: info?.escala, realista: info?.realista, tris: info?.triangulos ?? info?.triangles, llamadas: info?.llamadas ?? info?.calls, pesados: await ev('__jardin.desglose?.()') });
  await foto(nombre);
}
// experimentos en el estanque: cuánto cuesta cada cosa
await ev('__jardin.ir(12, 0, 0)'); await dormir(2500);
res.experimentos = [];
for (const cfg of ['{}', '{reflejo:false}', '{reflejo:true,sombras:false}', '{sombras:true,bloom:false}', '{bloom:true}']) {
  await ev(`__jardin.experimento(${cfg})`); await dormir(2000);
  const fps = await ev(medirFps); const info = await ev('__jardin.info()');
  res.experimentos.push({ cfg, fps, tris: info.triangulos, llamadas: info.llamadas, escala: info.escala });
}
res.zonas.forEach((z) => delete z.pesados);

await ev('__jardin.experimento({reflejo:true,sombras:true,bloom:true})'); await ev('__jardin.ir(12, 0, 0)'); await dormir(1500);
res.reflejo = await ev('__jardin.medirReflejo()');
console.log(JSON.stringify(res, null, 1));
writeFileSync(`${salida}/${etiqueta}.json`, JSON.stringify(res, null, 1));
ws.close(); chrome.kill(); process.exit(0);
