"""Exporta los modelos del jardín en un solo GLB para la versión web.

Uso:
    blender -b --factory-startup --python tools/blender/modelos_web.py -- assets

Reutiliza las funciones de modelos.py (las mismas que usa la versión de Unreal).
Cada modelo queda como un nodo con su nombre (SM_Arbol1, SM_Farol...) y cada
material con el nombre de la paleta (M_Piedra, M_Hojas...), que el juego
reemplaza por sus propios materiales.
"""
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import modelos as m

SALIDA = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "assets"
os.makedirs(SALIDA, exist_ok=True)

m.limpiar()
m.random.seed(7)
modelos = [m.losa, m.arco_entrada, m.puerta_arco, m.seto, m.farol, m.atril, m.cofre_base, m.cofre_tapa,
           m.piedra_estanque, m.nenufar, lambda: m.arbol(1, 6.0, 7), lambda: m.arbol(2, 5.0, 5),
           m.arbusto, m.flores, m.juncos, m.roca, m.banca, m.mirador]
nombres = []
for fn in modelos:
    previos = set(bpy.data.objects)
    ob = fn()
    nombres.append(ob.name)
    # Si quedó algún objeto suelto (no debería), se elimina.
    for o in set(bpy.data.objects) - previos - {ob}:
        bpy.data.objects.remove(o, do_unlink=True)

bpy.ops.object.select_all(action="SELECT")
ruta = os.path.join(SALIDA, "modelos.glb")
bpy.ops.export_scene.gltf(filepath=ruta, export_format="GLB", use_selection=True, export_apply=True,
                          export_yup=True, export_normals=True, export_materials="EXPORT",
                          export_texcoords=False, export_animations=False)
print("EXPORTADO", ruta, nombres)
print("MODELOS_WEB_OK", len(nombres))
