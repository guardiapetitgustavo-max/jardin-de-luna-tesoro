# Descarga Three.js y los complementos que usa el juego a vendor/three (sin depender de un CDN en producción).
$ErrorActionPreference = "Stop"
$v = "0.170.0"
$base = "https://cdn.jsdelivr.net/npm/three@$v"
$raiz = Join-Path $PSScriptRoot "..\vendor\three"
$archivos = @(
  "build/three.module.js",
  "examples/jsm/loaders/GLTFLoader.js",
  "examples/jsm/utils/BufferGeometryUtils.js",
  "examples/jsm/utils/SkeletonUtils.js",
  "examples/jsm/objects/Reflector.js",
  "examples/jsm/postprocessing/EffectComposer.js",
  "examples/jsm/postprocessing/Pass.js",
  "examples/jsm/postprocessing/RenderPass.js",
  "examples/jsm/postprocessing/ShaderPass.js",
  "examples/jsm/postprocessing/MaskPass.js",
  "examples/jsm/postprocessing/UnrealBloomPass.js",
  "examples/jsm/postprocessing/OutputPass.js",
  "examples/jsm/shaders/CopyShader.js",
  "examples/jsm/shaders/LuminosityHighPassShader.js",
  "examples/jsm/shaders/OutputShader.js",
  "LICENSE"
)
foreach ($a in $archivos) {
  $dest = Join-Path $raiz $a
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  Invoke-WebRequest -UseBasicParsing "$base/$a" -OutFile $dest
  Write-Output "OK $a"
}
# Algunas versiones separan el núcleo en three.core.js
try { Invoke-WebRequest -UseBasicParsing "$base/build/three.core.js" -OutFile (Join-Path $raiz "build/three.core.js"); Write-Output "OK three.core.js" } catch { Write-Output "sin three.core.js" }
Write-Output "VENDOR_OK"
