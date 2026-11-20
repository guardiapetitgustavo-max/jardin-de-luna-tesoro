"""Genera los modelos del Jardín de luna y los exporta como FBX para Unreal.

Uso (lo llama Tools/Generar.cmd):
    blender -b --factory-startup --python Tools/blender/modelos.py -- <carpeta_salida>

Convenciones:
- Unidades en metros; Unreal las convierte a centímetros al importar.
- +X es "hacia adelante" en el sendero (igual que en Unreal); +Z arriba.
- El origen de cada modelo está en la base, centrado (salvo la tapa del cofre: en la bisagra).
- Cada material lleva el nombre del material de Unreal que lo reemplaza (ver Tools/unreal/paleta.py).
"""
import bpy, bmesh, math, os, random, sys
from mathutils import Vector, Matrix

SALIDA = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.join(os.path.dirname(__file__), "..", "..", "Importar", "Modelos")
os.makedirs(SALIDA, exist_ok=True)
random.seed(7)


# ---------- utilidades ----------
def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mat(nombre):
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    return m


def objeto(nombre, bm, material):
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(mat(material))
    return ob


def caja(nombre, tam, pos=(0, 0, 0), material="M_Piedra", bisel=0.0, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(tam), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector((0, 0, tam[2] / 2)), verts=bm.verts)
    if bisel:
        bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bisel, segments=2, affect="EDGES")
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(rot[2], 3, "Z") @ Matrix.Rotation(rot[1], 3, "Y") @ Matrix.Rotation(rot[0], 3, "X"))
    bmesh.ops.translate(bm, vec=Vector(pos), verts=bm.verts)
    return objeto(nombre, bm, material)


def cilindro(nombre, r1, r2, alto, pos=(0, 0, 0), material="M_Madera", seg=12, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=alto)
    bmesh.ops.translate(bm, vec=Vector((0, 0, alto / 2)), verts=bm.verts)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(rot[2], 3, "Z") @ Matrix.Rotation(rot[1], 3, "Y") @ Matrix.Rotation(rot[0], 3, "X"))
    bmesh.ops.translate(bm, vec=Vector(pos), verts=bm.verts)
    return objeto(nombre, bm, material)


def esfera(nombre, r, pos=(0, 0, 0), material="M_Hojas", sub=2, escala=(1, 1, 1), ruido=0.0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    for v in bm.verts:
        if ruido:
            v.co *= 1 + random.uniform(-ruido, ruido)
        v.co = Vector((v.co.x * escala[0], v.co.y * escala[1], v.co.z * escala[2]))
    bmesh.ops.translate(bm, vec=Vector(pos), verts=bm.verts)
    return objeto(nombre, bm, material)


def arco_curvo(nombre, ancho, alto_pilar, grosor, prof, material, seg=10):
    """Medio arco de medio punto entre dos pilares (dovelas)."""
    partes = []
    r = ancho / 2
    for i in range(seg):
        a0, a1 = math.pi * i / seg, math.pi * (i + 1) / seg
        am = (a0 + a1) / 2
        largo = 2 * (r + grosor / 2) * math.sin((a1 - a0) / 2) + 0.02
        x, z = (r + grosor / 2) * math.cos(am), alto_pilar + (r + grosor / 2) * math.sin(am)
        partes.append(caja(f"{nombre}_d{i}", (prof, largo, grosor), (0, x, z - grosor / 2), material, 0.015, (am + math.pi / 2, 0, 0)))
    return partes


def unir(nombre, objs, suave=True):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = ob.data.name = nombre
    if suave:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40)) if hasattr(bpy.ops.object, "shade_smooth_by_angle") else bpy.ops.object.shade_smooth()
    return ob


def exportar(ob):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    ruta = os.path.join(SALIDA, ob.name + ".fbx")
    bpy.ops.export_scene.fbx(filepath=ruta, use_selection=True, axis_forward="X", axis_up="Z",
                             apply_unit_scale=True, mesh_smooth_type="FACE", add_leaf_bones=False, bake_anim=False)
    print("EXPORTADO", ruta)


def nuevo(fn):
    """Cada modelo se construye en una escena vacía y se exporta solo."""
    limpiar()
    exportar(fn())


# ---------- modelos ----------
def suelo():
    """Terreno de 70 x 50 m: sendero llano en el centro, colinas suaves a los lados y la hondonada del estanque."""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=140, y_segments=100, size=1.0)
    for v in bm.verts:
        x, y = v.co.x * 35 + 28, v.co.y * 25
        lado = max(0.0, abs(y) - 5.5)
        z = 0.0
        z += min(lado, 12) ** 1.35 * 0.09 * (1 + 0.35 * math.sin(x * 0.31) * math.cos(y * 0.23))
        z += 0.12 * math.sin(x * 0.9 + y * 0.6) * min(1, lado / 2)
        # hondonada del estanque (x 23..36)
        dx = max(0.0, abs(x - 29.5) - 5.5)
        dy = max(0.0, abs(y) - 7.5)
        hondo = max(0.0, 1 - math.hypot(dx, dy) / 2.2)
        z -= 0.9 * hondo * hondo * (3 - 2 * hondo)
        # meseta del mirador (x 52..60)
        if 52 <= x <= 60 and abs(y) < 5:
            z = max(z, 0.0)
        v.co = Vector((x, y, z))
    return objeto("SM_Suelo", bm, "M_Pasto")


def losa():
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=9, radius=0.48)
    for v in bm.verts:
        v.co.x *= 1.15 + random.uniform(-.08, .08)
        v.co.y *= 0.85 + random.uniform(-.08, .08)
    cara = [f for f in bm.faces][0]
    ext = bmesh.ops.extrude_face_region(bm, geom=[cara])
    bmesh.ops.translate(bm, vec=Vector((0, 0, 0.12)), verts=[g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)])
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.03, segments=2, affect="EDGES")
    return unir("SM_Losa", [objeto("SM_Losa", bm, "M_Piedra")])


def arco_entrada():
    p = [caja("p1", (0.7, 0.7, 3.2), (0, -2.35, 0), "M_Piedra", 0.04), caja("p2", (0.7, 0.7, 3.2), (0, 2.35, 0), "M_Piedra", 0.04),
         caja("b1", (0.9, 0.9, 0.25), (0, -2.35, 0), "M_PiedraOscura", 0.03), caja("b2", (0.9, 0.9, 0.25), (0, 2.35, 0), "M_PiedraOscura", 0.03)]
    p += arco_curvo("a", 4.7, 3.2, 0.45, 0.6, "M_Piedra", 11)
    for i in range(26):  # enredadera
        a = random.uniform(0.15, math.pi - 0.15)
        p.append(esfera(f"h{i}", random.uniform(.16, .3), (random.uniform(-.38, .38), 2.62 * math.cos(a), 3.2 + 2.62 * math.sin(a)), "M_Hojas", 1, ruido=.2))
    for i in range(8):
        a = random.uniform(0.3, math.pi - 0.3)
        p.append(esfera(f"f{i}", .07, (random.uniform(-.4, .4), 2.7 * math.cos(a), 3.2 + 2.7 * math.sin(a)), "M_FlorRosa", 1))
    return unir("SM_ArcoEntrada", p)


def puerta_arco():
    p = [caja("p1", (0.5, 0.5, 2.6), (0, -1.45, 0), "M_PuertaColor", 0.03), caja("p2", (0.5, 0.5, 2.6), (0, 1.45, 0), "M_PuertaColor", 0.03)]
    p += arco_curvo("a", 2.9, 2.6, 0.32, 0.45, "M_PuertaColor", 9)
    p.append(cilindro("gema", .16, .16, .08, (-.26, 0, 4.12), "M_PuertaBrillo", 16, (0, math.pi / 2, 0)))
    return unir("SM_PuertaArco", p)


def seto():
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((4.0, 1.0, 2.2)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector((0, 0, 1.1)), verts=bm.verts)
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.35, segments=4, affect="EDGES")
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
    for v in bm.verts:
        n = math.sin(v.co.x * 7.1) * math.cos(v.co.z * 6.3) + math.sin(v.co.y * 9.0 + v.co.x * 3)
        v.co += v.normal * 0.05 * n
    return unir("SM_Seto", [objeto("SM_Seto", bm, "M_Hojas")])


def farol():
    p = [cilindro("base", .18, .14, .12, (0, 0, 0), "M_Hierro", 8), cilindro("poste", .045, .04, 1.55, (0, 0, .1), "M_Hierro", 8),
         caja("techo", (.36, .36, .06), (0, 0, 1.92), "M_Hierro", .01), cilindro("punta", .2, .02, .16, (0, 0, 1.98), "M_Hierro", 4, (0, 0, math.pi / 4)),
         caja("vidrio", (.24, .24, .27), (0, 0, 1.65), "M_LuzFarol", .01), caja("marco", (.28, .28, .03), (0, 0, 1.62), "M_Hierro")]
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.append(caja(f"v{sx}{sy}", (.025, .025, .3), (sx * .13, sy * .13, 1.63), "M_Hierro"))
    return unir("SM_Farol", p, False)


def atril():
    p = [cilindro("pie", .22, .18, .1, (0, 0, 0), "M_PiedraOscura", 10), cilindro("col", .08, .07, .95, (0, 0, .08), "M_Madera", 8),
         caja("tabla", (.62, .48, .06), (0, 0, 1.02), "M_Madera", .015, (0, math.radians(-28), 0)),
         caja("papel", (.5, .38, .012), (-.012, 0, 1.075), "M_Papel", 0, (0, math.radians(-28), 0)),
         cilindro("cinta", .02, .02, .5, (-.2, -.03, 1.0), "M_FlorRosa", 6, (math.radians(-90), 0, 0))]
    return unir("SM_Atril", p, False)


def cofre_base():
    p = [caja("caja", (1.0, .62, .48), (0, 0, 0), "M_Madera", .03), caja("banda1", (.08, .64, .5), (-.25, 0, 0), "M_Oro", .01),
         caja("banda2", (.08, .64, .5), (.25, 0, 0), "M_Oro", .01), caja("cerradura", (.14, .06, .16), (0, -.32, .3), "M_Oro", .01),
         caja("interior", (.9, .52, .02), (0, 0, .45), "M_Brillo")]
    return unir("SM_CofreBase", p, False)


def cofre_tapa():
    """Tapa semicilíndrica. Origen en la bisagra (borde trasero +Y, a ras de la caja): se abre girando en Roll."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=.31, radius2=.31, depth=1.0)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Y"))
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.001], context="VERTS")
    bmesh.ops.contextual_create(bm, geom=[e for e in bm.edges if e.is_boundary])
    bmesh.ops.scale(bm, vec=Vector((1, 1, .7)), verts=bm.verts)
    p = [objeto("tapa", bm, "M_Madera"), caja("b1", (.08, .64, .23), (-.25, 0, -0.005), "M_Oro"), caja("b2", (.08, .64, .23), (.25, 0, -0.005), "M_Oro")]
    ob = unir("SM_CofreTapa", p, False)
    ob.data.transform(Matrix.Translation((0, -0.31, 0)))
    return ob


def piedra_estanque():
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=.7)
    for v in bm.verts:
        v.co.z = max(v.co.z, -.15) * .45
        v.co *= 1 + random.uniform(-.06, .06)
    bmesh.ops.translate(bm, vec=Vector((0, 0, .07)), verts=bm.verts)
    return unir("SM_PiedraEstanque", [objeto("SM_PiedraEstanque", bm, "M_PiedraMusgo")])


def nenufar():
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=20, radius=.55)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.length > .1 and abs(math.atan2(v.co.y, v.co.x)) < .25], context="VERTS")
    p = [objeto("hoja", bm, "M_Nenufar")]
    for i in range(6):
        a = i * math.pi / 3
        p.append(esfera(f"pet{i}", .07, (.1 * math.cos(a), .1 * math.sin(a), .06), "M_FlorBlanca", 1, (1.6, .8, .6)))
    p.append(esfera("centro", .05, (0, 0, .08), "M_Oro", 1))
    return unir("SM_Nenufar", p, False)


def arbol(n, alto, copas):
    p = [cilindro("tronco", .32, .16, alto * .55, (0, 0, 0), "M_Corteza", 9)]
    for i in range(3):
        a = i * 2.1 + n
        p.append(cilindro(f"rama{i}", .1, .04, 1.4, (0, 0, alto * .42), "M_Corteza", 6, (math.radians(50), 0, a)))
    for i in range(copas):
        a = random.uniform(0, math.tau)
        d = random.uniform(.3, 1.4)
        p.append(esfera(f"copa{i}", random.uniform(1.0, 1.6), (d * math.cos(a), d * math.sin(a), alto * .58 + random.uniform(0, 1.6)), "M_Hojas" if i % 3 else "M_HojasClaras", 2, (1, 1, .85), .12))
    return unir(f"SM_Arbol{n}", p)


def arbusto():
    p = [esfera(f"b{i}", random.uniform(.35, .55), (random.uniform(-.4, .4), random.uniform(-.4, .4), .3), "M_Hojas", 2, (1, 1, .8), .12) for i in range(5)]
    p += [esfera(f"f{i}", .06, (random.uniform(-.6, .6), random.uniform(-.6, .6), random.uniform(.45, .75)), "M_FlorRosa" if i % 2 else "M_FlorLila", 1) for i in range(9)]
    return unir("SM_Arbusto", p)


def flores():
    p = []
    for i in range(14):
        x, y = random.uniform(-.5, .5), random.uniform(-.5, .5)
        h = random.uniform(.18, .38)
        p.append(cilindro(f"t{i}", .008, .006, h, (x, y, 0), "M_Hojas", 4))
        p.append(esfera(f"c{i}", random.uniform(.035, .055), (x, y, h), ["M_FlorRosa", "M_FlorLila", "M_FlorBlanca", "M_Oro"][i % 4], 1, (1, 1, .6)))
    return unir("SM_Flores", p, False)


def juncos():
    p = []
    for i in range(16):
        a = random.uniform(0, math.tau)
        d = random.uniform(0, .5)
        h = random.uniform(.7, 1.3)
        p.append(cilindro(f"j{i}", .018, .004, h, (d * math.cos(a), d * math.sin(a), 0), "M_Junco", 4, (random.uniform(-.15, .15), random.uniform(-.15, .15), 0)))
    return unir("SM_Juncos", p, False)


def roca():
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=.6)
    for v in bm.verts:
        v.co *= 1 + random.uniform(-.18, .18)
        v.co.z *= .65
    return unir("SM_Roca", [objeto("SM_Roca", bm, "M_PiedraMusgo")], False)


def banca():
    p = [caja("asiento", (.45, 1.6, .06), (0, 0, .45), "M_Madera", .01), caja("resp", (.06, 1.6, .4), (.22, 0, .55), "M_Madera", .01)]
    for y in (-.7, .7):
        p += [caja(f"pata{y}", (.42, .06, .45), (0, y, 0), "M_Hierro"), caja(f"brazo{y}", (.42, .05, .04), (0, y, .68), "M_Hierro")]
    return unir("SM_Banca", p, False)


def mirador():
    p = [cilindro("plataforma", 4.2, 4.2, .6, (0, 0, 0), "M_Piedra", 8, (0, 0, math.pi / 8)),
         cilindro("borde", 4.35, 4.35, .08, (0, 0, .6), "M_PiedraOscura", 8, (0, 0, math.pi / 8))]
    for i in range(3):  # escalones hacia -X (por donde llega el jugador)
        p.append(caja(f"esc{i}", (.5, 2.6, .2 * (i + 1)), (-4.6 + i * .45 + .45, 0, 0), "M_Piedra", .02))
    for i in range(6):  # postes, dejando libre la entrada
        a = math.pi / 6 + i * math.pi * 2 / 6
        if abs(math.cos(a) + 1) < .2:
            continue
        x, y = 3.4 * math.cos(a), 3.4 * math.sin(a)
        p.append(cilindro(f"poste{i}", .14, .12, 3.0, (x, y, .6), "M_Madera", 8))
        p.append(caja(f"viga{i}", (.14, .14, 3.5), (x * .5, y * .5, 3.55), "M_Madera", 0, (0, math.radians(90), a)))
    p.append(cilindro("aro", 3.5, 3.5, .14, (0, 0, 3.5), "M_Madera", 24))
    p.append(cilindro("aro_hueco", 3.3, 3.3, .16, (0, 0, 3.49), "M_Madera", 24))
    for i in range(18):  # guirnalda de luces
        a = i * math.tau / 18
        p.append(esfera(f"luz{i}", .07, (3.4 * math.cos(a), 3.4 * math.sin(a), 3.25 + .12 * math.sin(i * 1.7)), "M_LuzFarol", 1))
    for i in range(30):  # flores en el borde
        a = random.uniform(0, math.tau)
        p.append(esfera(f"fl{i}", .09, (3.9 * math.cos(a), 3.9 * math.sin(a), .66), ["M_FlorRosa", "M_FlorLila", "M_FlorBlanca"][i % 3], 1))
    return unir("SM_Mirador", p, False)


def luciernaga():
    return unir("SM_Luciernaga", [esfera("cuerpo", .06, (0, 0, 0), "M_Luciernaga", 2)], False)


def luna():
    return unir("SM_Luna", [esfera("luna", 1.0, (0, 0, 0), "M_Luna", 4)])


MODELOS = [suelo, losa, arco_entrada, puerta_arco, seto, farol, atril, cofre_base, cofre_tapa, piedra_estanque, nenufar,
           lambda: arbol(1, 6.0, 7), lambda: arbol(2, 5.0, 5), arbusto, flores, juncos, roca, banca, mirador, luciernaga, luna]

if __name__ == "__main__":
    for fn in MODELOS:
        nuevo(fn)
    print("MODELOS_OK", len(MODELOS))
