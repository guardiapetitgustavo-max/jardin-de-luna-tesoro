@echo off
cd /d C:\Users\Gustavo\Documents\jardin-de-luna-tesoro
for %%f in (index.html estilos.css src\main.js src\mundo.js src\datos.js) do echo %%~zf %%f
