# El jardín de luna

Aventura en 3D para el navegador, hecha para Kimberly. Se publica en Vercel como sitio estático (sin paso de compilación).

## Cómo se juega
Lee las tres pistas, cruza la puerta que brilla como el sol, salta por las piedras del estanque, reúne siete luciérnagas para abrir la cortina de luz y abre el cofre del mirador.

## Estructura
- `index.html`, `estilos.css`: interfaz (portada, HUD, paneles, controles táctiles).
- `src/main.js`: render (Three.js + bloom + viñeta), cámara en tercera persona, controles, progreso, guardado en `localStorage` y ganchos de prueba (`?prueba`).
- `src/mundo.js`: terreno, cielo, agua con reflejo, modelos, pasto con viento, luces, colisiones.
- `src/personaje.js`: protagonista animada por código.
- `src/datos.js`: textos, pistas y cupones (edita aquí los mensajes).
- `assets/modelos.glb`: modelos generados con Blender (`tools/modelos.ps1` → `tools/blender/modelos_web.py`).
- `vendor/three`: Three.js 0.170.0 y complementos (`tools/vendor.ps1`), sin depender de un CDN.

## Probar en local
```
python -m http.server 8123
```
y abre http://localhost:8123. Parámetros: `?calidad=baja|alta`, `?prueba` (expone `window.__jardin` para pruebas automáticas).
