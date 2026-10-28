"""Genera docs/mapa-navegacion.svg (y el .png con Playwright). Posiciones fijas para que ninguna flecha se encime.
Uso: python3 docs/fuentes/mapa-navegacion.py"""
import math, pathlib
W, H = 240, 72
N = {  # id: (x, y, texto, ruta, tipo)
 'P10': (700, 20, 'P10 Solicitudes', '/solicitudes', 'main'),
 'P08': (330, 40, 'P08 Clientes e inquilinos', '/personas', 'comp'),
 'P05': (700, 190, 'P05 Agenda de citas', '/citas', 'main'),
 'P06': (1180, 190, 'P06 Nueva cita / Reprogramar', 'diálogo sobre P05', 'dlg'),
 'P01': (10, 330, 'P01 Inicio de sesión', '/login', 'main'),
 'P02': (390, 330, 'P02 Resumen', '/resumen', 'main'),
 'P04': (700, 480, 'P04 Detalle de propiedad', '/propiedades/:id', 'main'),
 'P07': (1180, 480, 'P07 Formulario de propiedad', '/propiedades/nueva · /:id/editar', 'main'),
 'P09': (330, 620, 'P09 Brokers', '/brokers', 'comp'),
 'P11': (1480, 640, 'P11 Pagos', '/pagos', 'comp'),
 'P03': (700, 780, 'P03 Propiedades', '/propiedades', 'main'),
}
STY = {'main': ('#E8F0FE', '#1F5BDB', ''), 'dlg': ('#FFFFFF', '#1F5BDB', '7 5'), 'comp': ('#FFFFFF', '#8391A6', ''), 'api': ('#F4F7FB', '#8391A6', '5 4')}
# (origen, destino, texto, tipo) tipo: ir | volver | api ; desplazamiento para pares
E = [('P01','P02','Entrar al panel','ir'),('P02','P01','Cerrar sesión','volver'),
 ('P02','P05','Ver agenda / Revisar','ir'),('P02','P04','Administrar propiedad','ir'),('P02','P07','Nueva propiedad / Completar','ir',0.64),
 ('P05','P06','Nueva cita / Reprogramar','ir'),('P06','P05','Guardar o Esc','volver'),
 ('P05','P04','Ver casa','ir'),('P04','P05','Ver agenda','volver'),
 ('P04','P07','Editar propiedad','ir'),('P07','P04','Guardar / Cancelar','volver'),
 ('P03','P04','Ver (ojo)','ir'),('P04','P03','Volver al listado','volver'),
 ('P03','P07','Editar / Nueva propiedad','ir'),
 ('P08','P05','Ver cita','ir'),('P08','P06','Agendar visita','ir',0.72),('P09','P04','Asignar responsable','ir'),
 ('P10','P05','Agendar cita','ir'),('P04','P11','Pestaña Pagos','ir')]
def center(n): x,y,*_=N[n]; return x+W/2, y+H/2
def border(n, tx, ty):
    cx, cy = center(n); dx, dy = tx-cx, ty-cy
    s = min((W/2)/abs(dx) if dx else 1e9, (H/2)/abs(dy) if dy else 1e9)
    return cx+dx*s, cy+dy*s
pairs = {frozenset((a,b)) for a,b,*_ in E if any(c==b and d==a for c,d,*_ in E)}
out = []
for e in E:
    a,b,t,k = e[:4]; pos = e[4] if len(e) > 4 else None
    (ax,ay),(bx,by) = center(a), center(b)
    off = 9 if frozenset((a,b)) in pairs else 0
    L = math.hypot(bx-ax, by-ay); nx, ny = -(by-ay)/L*off, (bx-ax)/L*off
    x1,y1 = border(a, bx+nx, by+ny); x2,y2 = border(b, ax+nx, ay+ny)
    x1,y1,x2,y2 = x1+nx,y1+ny,x2+nx,y2+ny
    col = '#8391A6' if k=='api' else '#0B2A5B'; dash = {'ir':'','volver':'6 5','api':'2 5'}[k]
    out.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{col}" stroke-width="2" stroke-dasharray="{dash}" marker-end="url(#{"g" if k=="api" else "a"})"/>')
    if pos is None: pos = 0.33 if off else 0.5
    mx, my = x1+(x2-x1)*pos + nx*1.6, y1+(y2-y1)*pos + ny*1.6
    tw = len(t)*7.2+14
    out.append(f'<rect x="{mx-tw/2:.0f}" y="{my-12:.0f}" width="{tw:.0f}" height="22" rx="11" fill="white" stroke="#DCE3ED"/><text x="{mx:.0f}" y="{my+4:.0f}" class="e">{t}</text>')
for n,(x,y,t,r,k) in N.items():
    f,s,d = STY[k]
    out.append(f'<rect x="{x}" y="{y}" width="{W}" height="{H}" rx="12" fill="{f}" stroke="{s}" stroke-width="2.2" stroke-dasharray="{d}"/>'
               f'<text x="{x+W/2}" y="{y+31}" class="n" fill="{"#5A6A82" if k=="api" else "#0B2A5B"}">{t}</text><text x="{x+W/2}" y="{y+53}" class="r">{r}</text>')
legend = '''<g transform="translate(1440,40)"><rect width="300" height="140" rx="12" fill="#FAFBFE" stroke="#C3CEDD"/>
<text x="20" y="32" class="h">Cómo leer el mapa</text>
<line x1="20" y1="60" x2="80" y2="60" stroke="#0B2A5B" stroke-width="2" marker-end="url(#a)"/><text x="95" y="65" class="l">Ir a otra pantalla</text>
<line x1="20" y1="92" x2="80" y2="92" stroke="#0B2A5B" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#a)"/><text x="95" y="97" class="l">Regresar</text>
<text x="20" y="127" class="l">El menú lateral lleva a P02, P03, P05, P08–P11</text></g>'''
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1780" height="900" viewBox="0 0 1780 900">
<style>text{{font-family:Inter,Arial,sans-serif}} .n{{font-size:16px;font-weight:600;text-anchor:middle}} .r{{font-size:13px;fill:#5A6A82;text-anchor:middle}} .e{{font-size:12.5px;fill:#1B2A44;text-anchor:middle}} .h{{font-size:15px;font-weight:700;fill:#0B2A5B}} .l{{font-size:13px;fill:#1B2A44}}</style>
<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0B2A5B"/></marker>
<marker id="g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8391A6"/></marker></defs>
<rect width="100%" height="100%" fill="white"/>
<text x="40" y="880" class="l" fill="#5A6A82">Mapa de navegación · Panel administrativo Zugar (Homiz) · Equipo 6 · Los IDs coinciden con src/data/pantallas.ts, el reporte y docs/mockups/</text>
{''.join(out)}{legend}</svg>'''
root = pathlib.Path(__file__).resolve().parents[1]
(root/'mapa-navegacion.svg').write_text(svg, encoding='utf-8')
print('ok')
