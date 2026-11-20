# Commit y push de la rama de la mejora visual.
$ErrorActionPreference = "Continue"
Set-Location (Join-Path $PSScriptRoot "..")
git add index.html estilos.css README.md .vercelignore src assets vendor tools 2>&1 | Out-Null
$msg = @"
Rehace la versión web en 3D real con Three.js

- Terreno con colinas, sendero, cielo con estrellas, luna y montañas.
- Modelos de Blender (assets/modelos.glb) para arco, puertas, faroles, árboles, estanque y mirador.
- Agua con reflejo, pasto con viento, luciérnagas, niebla, sombras de luna, bloom y viñeta.
- Protagonista animada, cámara en tercera persona, controles de teclado, ratón y táctiles.
- Progreso guardado: tres pistas, puerta del sol, estanque, siete luciérnagas y cofre con cupones.
- Three.js 0.170.0 incluido en vendor/ y ganchos de prueba con ?prueba.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01G6Zk7eFkXXaNyun1wUtqxQ
"@
$msg | Out-File -Encoding utf8 $env:TEMP\msg_jardin.txt
git -c core.autocrlf=false commit -F $env:TEMP\msg_jardin.txt 2>&1
git push -u origin claude/web-visual 2>&1
git log --oneline -3
Write-Output "COMMIT_OK"
