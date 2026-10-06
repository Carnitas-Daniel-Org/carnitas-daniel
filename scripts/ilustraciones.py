"""
Genera las ilustraciones de productos de Peltre (SVG) en public/ilustraciones/.
Estilo: vista desde arriba, plano con dos tonos, sobre plato claro.
Uso: python3 scripts/ilustraciones.py
"""
import math
import os
import random

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'ilustraciones')
os.makedirs(OUT, exist_ok=True)

COBALTO = '#1f3f94'


# ---------------------------------------------------------------- utilidades
def mezcla(c1, c2, t):
    a = [int(c1[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(c2[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(a[i] + (b[i] - a[i]) * t):02x}' for i in range(3))


def blob(cx, cy, r, rng, puntos=7, var=0.28, rx=1.0, ry=1.0, rot=0.0):
    """Mancha irregular suave (ruta SVG)."""
    pts = []
    for i in range(puntos):
        a = 2 * math.pi * i / puntos + rng.uniform(-0.25, 0.25)
        rr = r * rng.uniform(1 - var, 1 + var * 0.6)
        x, y = math.cos(a) * rr * rx, math.sin(a) * rr * ry
        c, s = math.cos(rot), math.sin(rot)
        pts.append((cx + x * c - y * s, cy + x * s + y * c))
    mid = lambda p, q: ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
    m0 = mid(pts[-1], pts[0])
    d = f'M{m0[0]:.1f},{m0[1]:.1f}'
    for i, p in enumerate(pts):
        m = mid(p, pts[(i + 1) % len(pts)])
        d += f' Q{p[0]:.1f},{p[1]:.1f} {m[0]:.1f},{m[1]:.1f}'
    return d + 'Z'


def svg(cuerpo, fondo='plato'):
    if fondo == 'plato':
        base = ('<rect width="200" height="200" fill="#f4f6fa"/>'
                '<circle cx="100" cy="100" r="84" fill="#eef2f7"/>'
                '<circle cx="100" cy="100" r="84" fill="none" stroke="#e1e7ef" stroke-width="2"/>')
        cuerpo = f'<g transform="translate(100 100) scale(1.16) translate(-100 -100)">{cuerpo}</g>'
    else:
        base = f'<rect width="200" height="200" fill="{fondo}"/>'
        cuerpo = f'<g transform="translate(100 104) scale(1.16) translate(-100 -104)">{cuerpo}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">{base}{cuerpo}</svg>'


def guardar(nombre, contenido):
    with open(os.path.join(OUT, nombre + '.svg'), 'w') as f:
        f.write(contenido)


# ---------------------------------------------------------------- piezas de comida
def carnitas(cx, cy, R, rng, n=14, rmin=8, rmax=13):
    trozos = []
    for _ in range(n):
        a = rng.uniform(0, 2 * math.pi)
        d = R * math.sqrt(rng.random())
        trozos.append((cx + math.cos(a) * d, cy + math.sin(a) * d * 0.9, rng.uniform(rmin, rmax)))
    trozos.sort(key=lambda t: t[1])
    s = ''
    for x, y, r in trozos:
        base = rng.choice(['#9c4a1f', '#a9552a', '#8c3f19', '#b4612f'])
        s += f'<path d="{blob(x, y + 1.5, r, rng)}" fill="#6a2c10" opacity=".55"/>'
        s += f'<path d="{blob(x, y, r, rng)}" fill="{base}"/>'
        s += f'<path d="{blob(x - r * .25, y - r * .3, r * .45, rng)}" fill="#d38a4a" opacity=".75"/>'
        if rng.random() < .6:
            s += f'<circle cx="{x + r * .3:.1f}" cy="{y + r * .2:.1f}" r="{r * .16:.1f}" fill="#5e260d" opacity=".7"/>'
    return s


def chicharron(cx, cy, R, rng, n=7):
    s = ''
    for _ in range(n):
        a = rng.uniform(0, 2 * math.pi)
        d = R * math.sqrt(rng.random())
        x, y, r = cx + math.cos(a) * d, cy + math.sin(a) * d, rng.uniform(12, 18)
        s += f'<path d="{blob(x, y, r, rng, 9, .35)}" fill="#c98a3f" stroke="#9a6328" stroke-width="1.5"/>'
        s += f'<path d="{blob(x - 2, y - 2, r * .65, rng, 8, .3)}" fill="#e7b96c"/>'
        for _ in range(4):
            s += (f'<circle cx="{x + rng.uniform(-r * .5, r * .5):.1f}" cy="{y + rng.uniform(-r * .5, r * .5):.1f}" '
                  f'r="{rng.uniform(1.2, 2.4):.1f}" fill="#f6dca6"/>')
    return s


def frijoles(cx, cy, r, rng, queso=True):
    s = f'<path d="{blob(cx, cy + 2, r, rng, 9, .15)}" fill="#2e1814" opacity=".35"/>'
    s += f'<path d="{blob(cx, cy, r, rng, 9, .15)}" fill="#4a2721"/>'
    s += f'<path d="{blob(cx - r * .2, cy - r * .25, r * .55, rng, 7, .2)}" fill="#6a3a31" opacity=".8"/>'
    for _ in range(int(r * .9)):
        a, d = rng.uniform(0, 6.28), r * .8 * math.sqrt(rng.random())
        s += (f'<ellipse cx="{cx + math.cos(a) * d:.1f}" cy="{cy + math.sin(a) * d:.1f}" rx="2.6" ry="1.7" '
              f'transform="rotate({rng.randint(0, 180)} {cx + math.cos(a) * d:.1f} {cy + math.sin(a) * d:.1f})" fill="#5b3029"/>')
    if queso:
        for _ in range(int(r * .7)):
            a, d = rng.uniform(0, 6.28), r * .7 * math.sqrt(rng.random())
            s += (f'<rect x="{cx + math.cos(a) * d:.1f}" y="{cy + math.sin(a) * d:.1f}" width="{rng.uniform(2, 3.6):.1f}" '
                  f'height="{rng.uniform(2, 3.2):.1f}" rx=".6" fill="#f7f2e4"/>')
    return s


def chimol(cx, cy, R, rng, n=34):
    s = ''
    for _ in range(n):
        a, d = rng.uniform(0, 6.28), R * math.sqrt(rng.random())
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
        c = rng.choices(['#d9412b', '#e85a3c', '#f4efe6', '#4f9a45'], [5, 3, 3, 2])[0]
        w = rng.uniform(3.5, 6)
        s += f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{w * .85:.1f}" rx="1.2" fill="{c}" transform="rotate({rng.randint(0, 90)} {x:.1f} {y:.1f})"/>'
    return s


def repollo(cx, cy, R, rng, n=30):
    s = ''
    for _ in range(n):
        a, d = rng.uniform(0, 6.28), R * math.sqrt(rng.random())
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
        ang = rng.uniform(0, 3.14)
        l = rng.uniform(8, 14)
        x2, y2 = x + math.cos(ang) * l, y + math.sin(ang) * l
        s += (f'<path d="M{x:.1f},{y:.1f} Q{(x + x2) / 2 + 3:.1f},{(y + y2) / 2 - 3:.1f} {x2:.1f},{y2:.1f}" '
              f'stroke="{rng.choice(["#dfeab8", "#cfe09a", "#eef4d6"])}" stroke-width="2.6" stroke-linecap="round" fill="none"/>')
    return s


def cilantro(cx, cy, rng, n=4):
    s = ''
    for _ in range(n):
        x, y = cx + rng.uniform(-10, 10), cy + rng.uniform(-8, 8)
        for k in range(3):
            a = k * 2.1 + rng.uniform(0, .5)
            s += f'<circle cx="{x + math.cos(a) * 2.6:.1f}" cy="{y + math.sin(a) * 2.6:.1f}" r="2.4" fill="#3e8e3a"/>'
    return s


def limon(cx, cy, r, ang):
    # gajo de limón visto desde arriba
    t = f'transform="rotate({ang} {cx} {cy})"'
    return (f'<g {t}><path d="M{cx - r},{cy} A{r},{r} 0 0 1 {cx + r},{cy} Z" fill="#5f9a2c"/>'
            f'<path d="M{cx - r + 3},{cy} A{r - 3},{r - 3} 0 0 1 {cx + r - 3},{cy} Z" fill="#d5e88f"/>'
            f'<path d="M{cx},{cy} L{cx - r * .55},{cy - r * .6} M{cx},{cy} L{cx},{cy - r + 4} M{cx},{cy} L{cx + r * .55},{cy - r * .6}" '
            f'stroke="#b4cf62" stroke-width="1.4"/></g>')


def tortilla(cx, cy, r, rng, color='#ead08f'):
    s = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{mezcla(color, "#9b7a3a", .25)}"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="{r - 1.5}" fill="{color}"/>'
    for _ in range(int(r * .5)):
        a, d = rng.uniform(0, 6.28), (r - 4) * math.sqrt(rng.random())
        s += (f'<ellipse cx="{cx + math.cos(a) * d:.1f}" cy="{cy + math.sin(a) * d:.1f}" rx="{rng.uniform(1.5, 3.5):.1f}" '
              f'ry="{rng.uniform(1, 2.2):.1f}" fill="#c69d55" opacity=".7"/>')
    return s


def tortilla_doblada(cx, cy, r, ang, rng):
    s = f'<g transform="rotate({ang} {cx} {cy})">'
    s += f'<path d="M{cx - r},{cy} A{r},{r} 0 0 0 {cx + r},{cy} Z" fill="#cfae63"/>'
    s += f'<path d="M{cx - r + 1.5},{cy} A{r - 1.5},{r - 1.5} 0 0 0 {cx + r - 1.5},{cy} Z" fill="#ead08f"/>'
    for _ in range(6):
        a, d = rng.uniform(.2, 2.9), (r - 5) * math.sqrt(rng.random())
        s += f'<ellipse cx="{cx + math.cos(a) * d:.1f}" cy="{cy + math.sin(a) * d:.1f}" rx="2.6" ry="1.6" fill="#c69d55" opacity=".7"/>'
    return s + '</g>'


def ala(cx, cy, tam, ang, rng, salsa='bbq'):
    base, luz, osc = {'bbq': ('#7a2a12', '#b24a22', '#4f1a0a'), 'bufalo': ('#cf4a1b', '#f07a3a', '#8f2a0e')}[salsa]
    s = f'<path d="{blob(cx, cy + 2, tam, rng, 8, .12, 1.45, .8, math.radians(ang))}" fill="{osc}" opacity=".45"/>'
    s += f'<path d="{blob(cx, cy, tam, rng, 8, .12, 1.45, .8, math.radians(ang))}" fill="{base}"/>'
    s += f'<path d="{blob(cx - 2, cy - 2, tam * .55, rng, 7, .2, 1.5, .6, math.radians(ang))}" fill="{luz}" opacity=".85"/>'
    c, sn = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    def dentro():
        u, v = rng.uniform(-tam * .9, tam * .9), rng.uniform(-tam * .35, tam * .35)
        return cx + u * c - v * sn, cy + u * sn + v * c
    for _ in range(3):
        x, y = dentro()
        s += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rng.uniform(1.5, 2.6):.1f}" fill="{osc}" opacity=".7"/>'
    if salsa == 'bbq':
        for _ in range(5):
            x, y = dentro()
            s += f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="1.6" ry=".9" fill="#f5ecd2" transform="rotate({rng.randint(0, 180)} {x:.1f} {y:.1f})"/>'
    return s


def papas(cx, cy, R, rng, n=22):
    s = ''
    for _ in range(n):
        a, d = rng.uniform(0, 6.28), R * math.sqrt(rng.random())
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
        l, ang = rng.uniform(22, 34), rng.randint(0, 180)
        s += (f'<g transform="rotate({ang} {x:.1f} {y:.1f})"><rect x="{x - l / 2:.1f}" y="{y - 3.6:.1f}" width="{l:.1f}" height="7.2" rx="2.6" fill="#d99a2b"/>'
              f'<rect x="{x - l / 2 + 1:.1f}" y="{y - 3:.1f}" width="{l - 2:.1f}" height="5" rx="2.2" fill="#f4c752"/></g>')
    return s


def tajadas(cx, cy, R, rng, n=12):
    s = ''
    piezas = []
    for i in range(n):
        a = 2 * math.pi * i / n + rng.uniform(-.15, .15)
        d = R * rng.uniform(.35, .75)
        piezas.append((cx + math.cos(a) * d, cy + math.sin(a) * d, math.degrees(a) + rng.uniform(-20, 20)))
    piezas.append((cx, cy, rng.randint(0, 180)))
    for x, y, ang in piezas:
        l = rng.uniform(24, 30)
        s += (f'<g transform="rotate({ang:.0f} {x:.1f} {y:.1f})">'
              f'<ellipse cx="{x:.1f}" cy="{y + 1.5:.1f}" rx="{l:.1f}" ry="8.5" fill="#8a5a1a" opacity=".35"/>'
              f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{l:.1f}" ry="8.5" fill="#c48a2c"/>'
              f'<ellipse cx="{x:.1f}" cy="{y - .8:.1f}" rx="{l - 2.5:.1f}" ry="6.4" fill="#eec45c"/>'
              f'<ellipse cx="{x - l * .3:.1f}" cy="{y - 2:.1f}" rx="{l * .35:.1f}" ry="2" fill="#f8de8e" opacity=".8"/>'
              f'<circle cx="{x + rng.uniform(-l * .5, l * .5):.1f}" cy="{y + 1:.1f}" r="1.5" fill="#a8701f" opacity=".7"/></g>')
    return s


def tazon(cx, cy, r, relleno):
    return (f'<circle cx="{cx}" cy="{cy + 3}" r="{r}" fill="#c9d3e1" opacity=".6"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffffff" stroke="{COBALTO}" stroke-width="3"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r - 6}" fill="#f1f4f8"/>{relleno}')


def salsa(cx, cy, r, color):
    return tazon(cx, cy, r, f'<circle cx="{cx}" cy="{cy}" r="{r - 7}" fill="{color}"/>'
                 f'<ellipse cx="{cx - r * .25}" cy="{cy - r * .3}" rx="{r * .3}" ry="{r * .15}" fill="#ffffff" opacity=".35"/>')


def aguacate_mitad(cx, cy, r, ang):
    t = f'transform="rotate({ang} {cx} {cy})"'
    return (f'<g {t}><path d="M{cx},{cy - r * 1.25} C{cx + r * .7},{cy - r * 1.25} {cx + r * 1.1},{cy + r * .2} {cx + r},{cy + r * .55} '
            f'C{cx + r * .8},{cy + r * 1.15} {cx - r * .8},{cy + r * 1.15} {cx - r},{cy + r * .55} C{cx - r * 1.1},{cy + r * .2} {cx - r * .7},{cy - r * 1.25} {cx},{cy - r * 1.25}Z" fill="#2f5a22"/>'
            f'<path d="M{cx},{cy - r * 1.08} C{cx + r * .6},{cy - r * 1.08} {cx + r * .95},{cy + r * .2} {cx + r * .86},{cy + r * .5} '
            f'C{cx + r * .7},{cy + r},{cx - r * .7},{cy + r} {cx - r * .86},{cy + r * .5} C{cx - r * .95},{cy + r * .2} {cx - r * .6},{cy - r * 1.08} {cx},{cy - r * 1.08}Z" fill="#a9c94e"/>'
            f'<path d="M{cx},{cy - r * .9} C{cx + r * .5},{cy - r * .9} {cx + r * .8},{cy + r * .2} {cx + r * .7},{cy + r * .45} '
            f'C{cx + r * .55},{cy + r * .85},{cx - r * .55},{cy + r * .85} {cx - r * .7},{cy + r * .45} C{cx - r * .8},{cy + r * .2} {cx - r * .5},{cy - r * .9} {cx},{cy - r * .9}Z" fill="#e2ec9a"/>'
            f'<circle cx="{cx}" cy="{cy + r * .25}" r="{r * .42}" fill="#7a4a26"/>'
            f'<ellipse cx="{cx - r * .12}" cy="{cy + r * .12}" rx="{r * .14}" ry="{r * .09}" fill="#b07a4c"/></g>')


# ---------------------------------------------------------------- platos
def plato_carnitas(semilla=1):
    rng = random.Random(semilla)
    s = tortilla_doblada(58, 66, 30, -35, rng) + tortilla_doblada(70, 54, 30, -20, rng)
    s += frijoles(138, 72, 24, rng)
    s += chimol(132, 136, 16, rng)
    s += carnitas(86, 116, 34, rng, 20, 9, 14)
    s += limon(150, 108, 13, 70)
    s += cilantro(98, 92, rng, 3)
    return svg(s)


def plato_mixto():
    rng = random.Random(2)
    s = tortilla_doblada(62, 62, 30, -30, rng)
    s += frijoles(140, 70, 23, rng)
    s += chicharron(130, 128, 20, rng, 5)
    s += carnitas(78, 120, 26, rng, 12)
    s += limon(104, 154, 12, 0)
    s += chimol(110, 88, 10, rng, 16)
    return svg(s)


def libra_carnitas():
    rng = random.Random(3)
    s = '<rect x="38" y="42" width="124" height="118" rx="4" fill="#efe2c4" transform="rotate(-8 100 100)"/>'
    s += '<rect x="38" y="42" width="124" height="118" rx="4" fill="none" stroke="#dccaa0" stroke-width="2" transform="rotate(-8 100 100)"/>'
    s += carnitas(100, 102, 44, rng, 30, 9, 14)
    s += limon(146, 146, 13, -30)
    return svg(s)


def carnitas_tajadas():
    rng = random.Random(4)
    s = tajadas(100, 104, 50, rng, 9)
    s += repollo(66, 130, 18, rng, 22)
    s += chimol(68, 128, 12, rng, 14)
    s += carnitas(116, 94, 22, rng, 10)
    s += salsa(138, 140, 14, '#e7dcc4')
    return svg(s)


def tacos(n=3):
    rng = random.Random(5 + n)
    pos = [(64, 120), (100, 92), (136, 64)] if n == 3 else [(98, 100)]
    r = 30 if n == 3 else 46
    s = ''
    for x, y in pos:
        s += tortilla(x, y, r, rng)
        s += carnitas(x, y, r * .55, rng, 7 if n == 3 else 12, 5, 8 if n == 3 else 10)
        for _ in range(8 if n == 3 else 14):
            a, d = rng.uniform(0, 6.28), r * .55 * math.sqrt(rng.random())
            s += f'<rect x="{x + math.cos(a) * d:.1f}" y="{y + math.sin(a) * d:.1f}" width="3.4" height="3" rx="1" fill="#f4efe6"/>'
        s += cilantro(x, y, rng, 2 if n == 3 else 4)
    if n == 3:
        s += limon(140, 128, 14, 160) + salsa(64, 66, 14, '#3f7d32')
    else:
        s += limon(142, 144, 14, 200) + salsa(62, 62, 13, '#c83a22')
    return svg(s)


def alitas(salsa_tipo='bbq', n=6, papas_extra=False):
    rng = random.Random({'bbq': 7, 'bufalo': 8}[salsa_tipo] + n)
    s = ''
    if papas_extra:
        s += papas(66, 70, 26, rng, 20)
        pos = [(112, 92, 20), (142, 112, 70), (100, 126, -30), (130, 142, 110), (84, 100, 60)]
        tam = 18
    elif n <= 6:
        pos = [(76, 82, 30), (118, 74, -20), (146, 104, 80), (70, 122, -60), (110, 116, 15), (98, 150, 100)]
        tam = 20
    else:
        pos = [(64, 78, 20), (98, 64, -30), (134, 70, 60), (156, 102, -10), (58, 112, 80), (92, 100, 10),
               (126, 104, -50), (150, 138, 40), (70, 146, -20), (104, 136, 70), (128, 162, 0), (88, 170, 40)]
        tam = 15
    for x, y, ang in pos:
        s += ala(x, y, tam, ang, rng, salsa_tipo)
    if salsa_tipo == 'bufalo':
        for i in range(3):
            x, y = 34 + i * 9, 132 + i * 4
            s += (f'<rect x="{x}" y="{y}" width="9" height="44" rx="4" fill="#8cbf52" transform="rotate(-35 {x} {y})"/>'
                  f'<rect x="{x + 2}" y="{y}" width="2" height="42" fill="#b5dc7e" transform="rotate(-35 {x} {y})"/>')
    s += salsa(140, 142 if n <= 6 else 58, 15, '#f6f1e2')
    return svg(s)


def tortillas_extra():
    rng = random.Random(9)
    s = ''
    for i in range(4, -1, -1):
        s += f'<circle cx="{100 + i * 2.5}" cy="{104 + i * 3}" r="58" fill="{mezcla("#d8b56c", "#ead08f", i / 5)}"/>'
    s += tortilla(98, 100, 58, rng)
    return svg(s)


def chicharron_plato():
    rng = random.Random(10)
    return svg(chicharron(98, 102, 40, rng, 13) + limon(146, 146, 13, -40))


def frijoles_tazon():
    rng = random.Random(11)
    return svg(tazon(100, 100, 58, frijoles(100, 100, 44, rng)))


def chimol_tazon():
    rng = random.Random(12)
    return svg(tazon(100, 100, 58, chimol(92, 92, 36, rng, 80)))


def papas_plato():
    rng = random.Random(13)
    return svg(papas(96, 100, 42, rng, 40) + salsa(140, 140, 14, '#c83a22'))


def tajadas_plato():
    rng = random.Random(14)
    return svg(tajadas(100, 100, 50, rng, 11))


def aguacate():
    return svg(aguacate_mitad(78, 100, 32, -18) + aguacate_mitad(128, 106, 30, 22))


def generico():
    s = (f'<circle cx="100" cy="100" r="48" fill="#ffffff" stroke="{COBALTO}" stroke-width="4"/>'
         f'<circle cx="100" cy="100" r="34" fill="none" stroke="{COBALTO}" stroke-width="2" opacity=".5"/>'
         f'<rect x="38" y="62" width="5" height="76" rx="2.5" fill="{COBALTO}"/>'
         f'<path d="M33 62v20a7.5 7.5 0 0 0 15 0V62" stroke="{COBALTO}" stroke-width="3" fill="none" stroke-linecap="round"/>'
         f'<path d="M160 62c-8 6-8 26 0 32v44" stroke="{COBALTO}" stroke-width="5" fill="none" stroke-linecap="round"/>')
    return svg(s)


# ---------------------------------------------------------------- bebidas
def botella_jugo(liquido, icono, tapa='#f2c230', fondo=None):
    fondo = fondo or mezcla(liquido, '#ffffff', .82)
    s = (f'<circle cx="100" cy="182" r="0" />'
         f'<ellipse cx="100" cy="180" rx="34" ry="5" fill="#000" opacity=".08"/>'
         # cuerpo
         f'<path d="M86 44 L114 44 C114 54 128 58 128 72 L128 168 Q128 178 118 178 L82 178 Q72 178 72 168 L72 72 C72 58 86 54 86 44Z" fill="#ffffff" opacity=".55"/>'
         f'<path d="M86 56 C86 60 74 64 74 74 L74 168 Q74 176 82 176 L118 176 Q126 176 126 168 L126 74 C126 64 114 60 114 56Z" fill="{liquido}"/>'
         f'<path d="M86 44 L114 44 C114 54 128 58 128 72 L128 168 Q128 178 118 178 L82 178 Q72 178 72 168 L72 72 C72 58 86 54 86 44Z" fill="none" stroke="{mezcla(liquido, "#1a1a1a", .35)}" stroke-width="2" opacity=".5"/>'
         # anillos
         f'<path d="M73 152h54M73 160h54" stroke="#ffffff" stroke-width="1.6" opacity=".35"/>'
         # brillo
         f'<rect x="80" y="70" width="6" height="96" rx="3" fill="#ffffff" opacity=".35"/>'
         # etiqueta
         f'<rect x="72" y="96" width="56" height="44" fill="#fbfaf6"/>'
         f'<rect x="72" y="96" width="56" height="4" fill="{COBALTO}"/><rect x="72" y="136" width="56" height="4" fill="{COBALTO}"/>'
         f'<g transform="translate(100 118)">{icono}</g>'
         # tapa
         f'<rect x="84" y="28" width="32" height="17" rx="3" fill="{tapa}"/>'
         f'<path d="M89 30v13M94 30v13M99 30v13M104 30v13M109 30v13" stroke="{mezcla(tapa, "#000000", .2)}" stroke-width="1.4"/>'
         f'<rect x="82" y="43" width="36" height="4" rx="1.5" fill="{mezcla(tapa, "#000000", .15)}"/>')
    return svg(s, fondo)


def botella_vidrio(liquido, tapa, etiqueta, icono='', fondo=None):
    fondo = fondo or mezcla(etiqueta, '#ffffff', .84)
    s = (f'<ellipse cx="100" cy="182" rx="30" ry="5" fill="#000" opacity=".08"/>'
         f'<path d="M92 40 L108 40 L108 70 C108 84 124 92 124 108 L124 170 Q124 180 114 180 L86 180 Q76 180 76 170 L76 108 C76 92 92 84 92 70Z" fill="{mezcla(liquido, "#ffffff", .1)}"/>'
         f'<path d="M92 40 L108 40 L108 70 C108 84 124 92 124 108 L124 170 Q124 180 114 180 L86 180 Q76 180 76 170 L76 108 C76 92 92 84 92 70Z" fill="none" stroke="{mezcla(liquido, "#000000", .3)}" stroke-width="2"/>'
         f'<path d="M93 40 L107 40 L107 58 L93 58Z" fill="#ffffff" opacity=".35"/>'
         f'<rect x="82" y="98" width="5" height="68" rx="2.5" fill="#ffffff" opacity=".3"/>'
         f'<rect x="76" y="122" width="48" height="34" fill="{etiqueta}"/>'
         f'<rect x="76" y="125" width="48" height="2" fill="#ffffff" opacity=".7"/><rect x="76" y="151" width="48" height="2" fill="#ffffff" opacity=".7"/>'
         f'<g transform="translate(100 139)">{icono}</g>'
         f'<path d="M90 30 L110 30 L111 40 L89 40Z" fill="{tapa}"/>'
         f'<path d="M90 33h20M90 36h20" stroke="{mezcla(tapa, "#000000", .25)}" stroke-width="1"/>')
    return svg(s, fondo)


ICONOS = {
    'maracuya': '<circle r="13" fill="#6b2d5c"/><circle r="10" fill="#f4c430"/>' + ''.join(
        f'<circle cx="{math.cos(a) * d:.1f}" cy="{math.sin(a) * d:.1f}" r="1.6" fill="#2b1a10"/>' for a, d in
        [(i * 1.1, 3 + (i % 3) * 2) for i in range(12)]),
    'tamarindo': '<path d="M-16 4 C-12 -6 -6 6 0 -2 C6 -10 10 4 16 -6" stroke="#8b5a2b" stroke-width="9" fill="none" stroke-linecap="round"/>'
                 '<path d="M-16 4 C-12 -6 -6 6 0 -2 C6 -10 10 4 16 -6" stroke="#b07a42" stroke-width="3" fill="none" stroke-linecap="round"/>',
    'nance': '<circle cx="-7" cy="3" r="7" fill="#f2b632"/><circle cx="7" cy="3" r="7" fill="#e9a21f"/><circle cx="0" cy="-7" r="7" fill="#f6c84a"/>'
             '<path d="M0 -14 L3 -19" stroke="#5c7a2a" stroke-width="2"/>',
    'pozol': '<ellipse rx="7" ry="14" fill="#f2c84b"/>' + ''.join(
        f'<circle cx="{x}" cy="{y}" r="1.7" fill="#d9a62a"/>' for x in (-3, 0, 3) for y in range(-10, 12, 4)) +
        '<path d="M-7 4 C-14 -2 -12 -12 -8 -16 M7 4 C14 -2 12 -12 8 -16" stroke="#6c9a3a" stroke-width="3" fill="none"/>',
    'limon': '<circle r="13" fill="#5f9a2c"/><circle r="10.5" fill="#d5e88f"/>' + ''.join(
        f'<path d="M0 0 L{math.cos(i * 1.047) * 10:.1f} {math.sin(i * 1.047) * 10:.1f}" stroke="#b4cf62" stroke-width="1.4"/>' for i in range(6)),
    'jamaica': ''.join(f'<ellipse cx="{math.cos(i * 1.2566) * 7:.1f}" cy="{math.sin(i * 1.2566) * 7:.1f}" rx="7" ry="5" '
                       f'transform="rotate({i * 72} {math.cos(i * 1.2566) * 7:.1f} {math.sin(i * 1.2566) * 7:.1f})" fill="#b0123a"/>' for i in range(5))
               + '<circle r="3.5" fill="#f2c230"/>',
    'horchata': '<rect x="-15" y="-4" width="30" height="7" rx="3.5" fill="#9a5b2e" transform="rotate(-25)"/>'
                '<rect x="-15" y="-2" width="30" height="7" rx="3.5" fill="#b8733d" transform="rotate(20)"/>',
    'pina': '<ellipse cy="4" rx="9" ry="11" fill="#f2b632"/><path d="M-8 -2 L8 10 M-8 6 L6 -6 M-4 14 L9 2 M-9 -2 L4 -7" stroke="#c98a12" stroke-width="1.3"/>'
            '<path d="M0 -6 L-6 -16 M0 -6 L0 -18 M0 -6 L6 -16" stroke="#4f9a45" stroke-width="3" stroke-linecap="round"/>',
    'mora': ''.join(f'<circle cx="{x}" cy="{y}" r="4" fill="#4b1d4f"/>' for x, y in [(-4, -4), (4, -4), (0, 2), (-6, 4), (6, 4), (0, 9)])
            + '<path d="M0 -8 L-4 -14 M0 -8 L4 -14" stroke="#4f9a45" stroke-width="2.5" stroke-linecap="round"/>',
    'gota': '<path d="M0 -12 C6 -4 9 1 9 5 A9 9 0 0 1 -9 5 C-9 1 -6 -4 0 -12Z" fill="#2a7de1"/>',
    'banana': '<path d="M-14 -6 C-10 10 8 12 14 0 C8 6 -6 4 -10 -8Z" fill="#ffffff"/>',
    'uva': ''.join(f'<circle cx="{x}" cy="{y}" r="3.3" fill="#ffffff"/>' for x, y in [(-5, -5), (2, -5), (-2, 1), (5, 1), (1, 7)]),
    'naranja': '<circle r="8" fill="#ffffff"/><circle r="6" fill="none" stroke="#f28c28" stroke-width="1.2"/>',
    'cola': '<path d="M-14 -3h28M-14 3h28" stroke="#ffffff" stroke-width="2"/>',
    'ginger': '<path d="M-14 0h28" stroke="#d9b45a" stroke-width="2.4"/>',
}

JUGOS = {
    'fresco-maracuya': ('#f2a51a', 'maracuya'),
    'fresco-tamarindo': ('#8a5a2e', 'tamarindo'),
    'fresco-nance': ('#f4d04a', 'nance'),
    'fresco-pozol': ('#e8dcc4', 'pozol'),
    'fresco-limon': ('#cfe387', 'limon'),
    'fresco-jamaica': ('#8e1531', 'jamaica'),
    'fresco-horchata': ('#efe4d0', 'horchata'),
    'fresco-pina': ('#f6d55c', 'pina'),
    'fresco-mora': ('#5a1e4f', 'mora'),
}

GASEOSAS = {
    'gaseosa-cola': ('#3b1d12', '#c8102e', '#c8102e', 'cola'),
    'gaseosa-ginger': ('#e6c56d', '#1f6b3a', '#1f6b3a', 'ginger'),
    'gaseosa-banana': ('#f3dc62', '#e9b21a', '#e9b21a', 'banana'),
    'gaseosa-uva': ('#5b2a6e', '#6a2c8c', '#6a2c8c', 'uva'),
    'gaseosa-naranja': ('#f28c28', '#e2701a', '#e2701a', 'naranja'),
}

if __name__ == '__main__':
    guardar('plato-carnitas', plato_carnitas())
    guardar('plato-mixto', plato_mixto())
    guardar('libra-carnitas', libra_carnitas())
    guardar('carnitas-tajadas', carnitas_tajadas())
    guardar('tacos-orden', tacos(3))
    guardar('taco', tacos(1))
    guardar('alitas-bbq', alitas('bbq', 6))
    guardar('alitas-bufalo', alitas('bufalo', 6))
    guardar('alitas-12', alitas('bbq', 12))
    guardar('alitas-papas', alitas('bbq', 5, papas_extra=True))
    guardar('tortillas', tortillas_extra())
    guardar('chicharron', chicharron_plato())
    guardar('frijoles', frijoles_tazon())
    guardar('chimol', chimol_tazon())
    guardar('papas', papas_plato())
    guardar('tajadas', tajadas_plato())
    guardar('aguacate', aguacate())
    guardar('generico', generico())
    for nombre, (liq, ic) in JUGOS.items():
        guardar(nombre, botella_jugo(liq, ICONOS[ic]))
    for nombre, (liq, tapa, et, ic) in GASEOSAS.items():
        guardar(nombre, botella_vidrio(liq, tapa, et, ICONOS[ic]))
    guardar('agua', botella_jugo('#d6eaf6', ICONOS['gota'], tapa='#2a7de1', fondo='#e3f0fa'))
    print('Ilustraciones en', os.path.abspath(OUT), len(os.listdir(OUT)))
