"""Gera as plaquinhas 3D dos produtos (placa com QR + logo Contente+ e suporte), em 3MF para Bambu Studio.

Uso:  python tools/plaquinhas3d.py            (rode depois de `node build.js`)
Saída: plaquinhas-3d/<ambiente>/<CODIGO>_<slug>.3mf

Formato baseado no modelo "Customizable QR Code with stand" (placa 50 × 73 × 3 mm, cantos r4,
suporte 50 × 40 × 10 mm com fenda inclinada). O suporte é reaproveitado do modelo original
(tools/suporte-plaquinha.json); a placa é gerada aqui.

Cores (2 filamentos):  1 = cor da placa e dos módulos do QR (escuro)  ·  2 = fundo do QR, logo e código (claro)
Requisitos: pip install trimesh shapely mapbox_earcut matplotlib svgelements qrcode  (no Mac, a leitura dos QR é conferida com tools/lerqr.swift)
"""
import csv, json, os, re, sys, zipfile, uuid
import numpy as np
import qrcode
import trimesh
from shapely.geometry import Polygon, box, MultiPolygon
from shapely.ops import unary_union
from shapely import affinity
from matplotlib.textpath import TextPath
from matplotlib.font_manager import FontProperties
import svgelements

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'plaquinhas-3d')

# ---- medidas (mm) ----
W, H, R = 50.0, 73.0, 4.0          # placa
T_BASE, T_TOP = 2.6, 0.4           # espessura: corpo + camada de cor (total 3,0 mm, igual ao original)
PAD, PAD_TOP = 42.0, 4.0           # quadrado claro do QR e margem superior
QUIET = 2                          # margem do QR, em módulos (dentro do quadrado claro)
LOGO_W, LOGO_Y = 30.0, 21.5        # largura e centro vertical do logo Contente+
CODE_H, CODE_Y = 3.6, 12.8         # altura e centro vertical do código do produto (abaixo disso fica dentro do suporte)


def rounded_rect(w, h, r, x0=0.0, y0=0.0):
    return box(x0 + r, y0 + r, x0 + w - r, y0 + h - r).buffer(r, resolution=16)


def rings_to_shape(rings):
    """Anéis fechados → polígonos com furos (regra par/ímpar, como em fontes e SVG)."""
    polys = [Polygon(r).buffer(0) for r in rings if len(r) >= 3]
    polys = [p for p in polys if not p.is_empty]
    shape = Polygon()
    for p in sorted(polys, key=lambda p: -p.area):
        shape = shape.symmetric_difference(p)
    return shape.buffer(0)


def text_shape(txt, height, font='/System/Library/Fonts/Supplemental/Arial Bold.ttf'):
    tp = TextPath((0, 0), txt, size=10, prop=FontProperties(fname=font))
    shape = rings_to_shape([np.asarray(r) for r in tp.to_polygons()])
    minx, miny, maxx, maxy = shape.bounds
    s = height / (maxy - miny)
    return affinity.scale(affinity.translate(shape, -minx, -miny), s, s, origin=(0, 0))


_LOGO = {}
def logo_shape(svg_path, width):
    if (svg_path, width) in _LOGO: return _LOGO[(svg_path, width)]
    svg = svgelements.SVG.parse(svg_path)
    parts = []
    for el in svg.elements():
        if not isinstance(el, svgelements.Path) or not len(el):
            continue
        rings = []
        for sub in el.as_subpaths():
            sub = svgelements.Path(sub)
            n = max(24, int(sub.length() / 1.5))
            pts = [sub.point(t) for t in np.linspace(0, 1, n)]
            rings.append([(p.x, -p.y) for p in pts if p is not None])
        sh = rings_to_shape(rings)
        if not sh.is_empty:
            parts.append(sh)
    shape = unary_union(parts)
    minx, miny, maxx, maxy = shape.bounds
    s = width / (maxx - minx)
    _LOGO[(svg_path, width)] = affinity.scale(affinity.translate(shape, -minx, -miny), s, s, origin=(0, 0))
    return _LOGO[(svg_path, width)]


def qr_shapes(url, size, x0, y0):
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0)
    q.add_data(url); q.make(fit=True)
    m = q.get_matrix(); n = len(m)
    cell = size / (n + 2 * QUIET)
    dark = []
    for r, row in enumerate(m):
        c = 0
        while c < n:                      # junta módulos vizinhos da mesma linha num retângulo só
            if row[c]:
                c0 = c
                while c < n and row[c]: c += 1
                x = x0 + (QUIET + c0) * cell; y = y0 + size - (QUIET + r + 1) * cell
                dark.append(box(x, y, x + (c - c0) * cell, y + cell))
            else:
                c += 1
    # encolhe 0,05 mm a união dos módulos: quinas que só se tocam na diagonal se separam (malha manifold)
    return unary_union(dark).buffer(-0.05, join_style=1, quad_segs=2).simplify(0.001), cell, n


def extrude(shape, z0, h):
    geoms = shape.geoms if isinstance(shape, MultiPolygon) else [shape]
    meshes = [trimesh.creation.extrude_polygon(g, h) for g in geoms if g.area > 1e-4]
    for x in meshes: x.merge_vertices()
    m = trimesh.util.concatenate(meshes)
    m.apply_translation([0, 0, z0])
    m.metadata['fechada'] = all(x.is_watertight for x in meshes)
    return m


def plate_parts(url, code):
    outline = rounded_rect(W, H, R)
    px = (W - PAD) / 2; py = H - PAD_TOP - PAD
    pad = rounded_rect(PAD, PAD, 1.5, px, py)
    modules, cell, n = qr_shapes(url, PAD, px, py)
    logo = logo_shape(os.path.join(ROOT, 'imagens', 'logo-contente-mais.svg'), LOGO_W)
    lb = logo.bounds; logo = affinity.translate(logo, (W - (lb[2] - lb[0])) / 2 - lb[0], LOGO_Y - (lb[3] - lb[1]) / 2 - lb[1])
    txt = text_shape(code, CODE_H)
    tb = txt.bounds; txt = affinity.translate(txt, (W - (tb[2] - tb[0])) / 2 - tb[0], CODE_Y - CODE_H / 2 - tb[1])
    light = unary_union([pad.difference(modules), logo, txt]).buffer(0)
    dark_top = outline.difference(light).buffer(0)
    return {
        'placa': extrude(outline, 0, T_BASE),
        'placa_topo': extrude(dark_top, T_BASE, T_TOP),
        'qr_logo_claro': extrude(light, T_BASE, T_TOP),
    }, (outline, light, dark_top), cell, n


def stand_mesh():
    d = json.load(open(os.path.join(ROOT, 'tools', 'suporte-plaquinha.json')))
    m = trimesh.Trimesh(np.array(d['vertices']), np.array(d['faces']), process=True)
    m.apply_translation(-m.bounds[0])
    return m


# ---------- escrita do 3MF (formato Bambu Studio: partes + filamento por parte) ----------
def mesh_xml(oid, m):
    v = ''.join(f'<vertex x="{x:.4f}" y="{y:.4f}" z="{z:.4f}"/>' for x, y, z in m.vertices)
    t = ''.join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in m.faces)
    return f'<object id="{oid}" type="model"><mesh><vertices>{v}</vertices><triangles>{t}</triangles></mesh></object>'


def write_3mf(path, title, objects):
    """objects: [(nome, [(nome_parte, mesh, filamento)], (x, y))]"""
    oid = 0; res = []; build = []; cfg = []
    for name, parts, (bx, by) in objects:
        comps = []; cparts = []
        for pname, m, fil in parts:
            oid += 1; res.append(mesh_xml(oid, m)); comps.append(f'<component objectid="{oid}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>')
            cparts.append(f'<part id="{oid}" subtype="normal_part"><metadata key="name" value="{pname}"/><metadata key="extruder" value="{fil}"/></part>')
        oid += 1; parent = oid
        res.append(f'<object id="{parent}" type="model"><components>{"".join(comps)}</components></object>')
        build.append(f'<item objectid="{parent}" transform="1 0 0 0 1 0 0 0 1 {bx:.3f} {by:.3f} 0" printable="1"/>')
        cfg.append(f'<object id="{parent}"><metadata key="name" value="{name}"/><metadata key="extruder" value="{parts[0][2]}"/>{"".join(cparts)}</object>')
    model = ('<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="pt-BR" '
             'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021">'
             f'<metadata name="Title">{title}</metadata><metadata name="Application">CasaLiv-plaquinhas</metadata>'
             f'<resources>{"".join(res)}</resources><build>{"".join(build)}</build></model>')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
                   '<Default Extension="png" ContentType="image/png"/></Types>')
        z.writestr('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
        z.writestr('3D/3dmodel.model', model)
        z.writestr('Metadata/model_settings.config', f'<?xml version="1.0" encoding="UTF-8"?><config>{"".join(cfg)}</config>')


def preview(path, shapes, code, title):
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    from matplotlib.patches import PathPatch
    from matplotlib.path import Path as MPath
    outline, light, dark_top = shapes
    fig, ax = plt.subplots(figsize=(2.6, 3.6), dpi=200)
    def draw(g, color):
        for p in (g.geoms if hasattr(g, 'geoms') else [g]):
            if p.is_empty: continue
            verts = list(p.exterior.coords); codes = [MPath.MOVETO] + [MPath.LINETO] * (len(verts) - 2) + [MPath.CLOSEPOLY]
            for i in p.interiors:
                iv = list(i.coords); verts += iv; codes += [MPath.MOVETO] + [MPath.LINETO] * (len(iv) - 2) + [MPath.CLOSEPOLY]
            ax.add_patch(PathPatch(MPath(verts, codes), facecolor=color, edgecolor='none'))
    draw(outline, '#2b2420'); draw(light, '#f4f1ec')
    ax.axhline(8, color='#c89a3a', lw=.6, ls='--'); ax.text(W / 2, 4, 'encaixe no suporte', color='#c89a3a', ha='center', fontsize=5)
    ax.set_xlim(-2, W + 2); ax.set_ylim(-2, H + 2); ax.set_aspect('equal'); ax.axis('off'); ax.set_title(title, fontsize=6)
    fig.savefig(path, bbox_inches='tight', facecolor='white'); plt.close(fig)


def qr_lidos(pngs):
    """Lê os QR das prévias com o leitor do macOS (tools/lerqr.swift). Devolve {arquivo: url} ou {} se indisponível."""
    import subprocess
    try:
        out = subprocess.run(['swift', os.path.join(ROOT, 'tools', 'lerqr.swift'), *pngs], capture_output=True, text=True, timeout=600).stdout
    except Exception:
        return {}
    return dict(l.split('\t', 1) for l in out.splitlines() if '\t' in l)


def main():
    stand = stand_mesh()
    resumo = []; lote = {}
    for amb in sorted(os.listdir(os.path.join(ROOT, 'qrcodes'))):
        links = os.path.join(ROOT, 'qrcodes', amb, 'links.csv')
        if not os.path.exists(links): continue
        out = os.path.join(OUT, amb); os.makedirs(out, exist_ok=True)
        for row in csv.DictReader(open(links, encoding='utf-8')):
            code = row['codigo']
            if code.startswith('ENTRADA'): continue
            slug = row['url'].rstrip('/?qr').rstrip('/').split('/')[-1]
            parts, shapes, cell, n = plate_parts(row['url'], code)
            for k, m in parts.items():
                if not m.metadata.get('fechada', m.is_watertight): print(f'⚠ {code} {k}: malha não fechada', file=sys.stderr)
            objs = [(f'{code} placa', [('Placa', parts['placa'], 1), ('Placa (topo)', parts['placa_topo'], 1), ('QR + logo (claro)', parts['qr_logo_claro'], 2)], (60, 90)),
                    (f'{code} suporte', [('Suporte', stand, 1)], (130, 105))]
            write_3mf(os.path.join(out, f'{code}_{slug}.3mf'), f'{code} · {row["produto"]}', objs)
            preview(os.path.join(out, f'{code}_{slug}.png'), shapes, code, row['produto'])
            resumo.append((amb, code, n, round(cell, 2), f'{code}_{slug}.png', row['url']))
            lote.setdefault(amb, []).append((code, parts))
    # Lotes: todas as placas de um ambiente numa mesa (até 12) e todos os suportes em outra
    for amb, itens in lote.items():
        for k in range(0, len(itens), 12):
            grupo = itens[k:k + 12]; suf = f'-{k // 12 + 1}' if len(itens) > 12 else ''
            objs = [(f'{c} placa', [('Placa', p['placa'], 1), ('Placa (topo)', p['placa_topo'], 1), ('QR + logo (claro)', p['qr_logo_claro'], 2)],
                     (18 + (i % 4) * 56, 12 + (i // 4) * 78)) for i, (c, p) in enumerate(grupo)]
            write_3mf(os.path.join(OUT, amb, f'_LOTE{suf} - todas as placas.3mf'), f'{amb} · placas', objs)
        objs = [(f'{c} suporte', [('Suporte', stand, 1)], (18 + (i % 4) * 56, 12 + (i // 4) * 46)) for i, (c, _) in enumerate(itens)]
        write_3mf(os.path.join(OUT, amb, '_LOTE - todos os suportes.3mf'), f'{amb} · suportes', objs)
    lidos = qr_lidos([os.path.join(OUT, a, f) for a, _, _, _, f, _ in resumo])
    for a, c, n, cell, f, url in resumo:
        st = '✓ QR lido' if lidos.get(f) == url else ('? leitura não conferida' if not lidos else '✗ QR NÃO LEU')
        print(f'{st} · {a}/{c}: {n}×{n} módulos, {cell} mm por módulo')


if __name__ == '__main__':
    main()
