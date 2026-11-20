# Regenera assets/modelos.glb con Blender (modo sin ventana).
$ErrorActionPreference = "Stop"
$raiz = Resolve-Path (Join-Path $PSScriptRoot "..")
$blender = Get-ChildItem "C:\Program Files\Blender Foundation" -Recurse -Filter blender.exe -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
if (-not $blender) { throw "No se encontró Blender en C:\Program Files\Blender Foundation" }
Write-Output "Blender: $blender"
Push-Location $raiz
& $blender -b --factory-startup --python tools\blender\modelos_web.py -- assets 2>&1 | Select-String "MODELOS_WEB_OK|EXPORTADO|Error|Traceback|File |line " | ForEach-Object { $_.Line }
Pop-Location
Get-Item (Join-Path $raiz "assets\modelos.glb") | ForEach-Object { Write-Output ("GLB {0} bytes" -f $_.Length) }
