"""
Marca Peltre: logo (plato de peltre con borde cobalto y despostilladura), favicon e íconos de app.
Uso: python3 scripts/marca.py   (requiere playwright para los PNG)
"""
import os

RAIZ = os.path.join(os.path.dirname(__file__), '..', 'public')
COBALTO, NOCHE = '#1f3f94', '#13203b'


def plato(cx, cy, r, borde=True):
    """Plato de peltre visto desde arriba: blanco, filete cobalto en la orilla y una despostilladura."""
    s = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffffff"/>'
    if borde:
        s += f'<circle cx="{cx}" cy="{cy}" r="{r - r * .06:.2f}" fill="none" stroke="{COBALTO}" stroke-width="{r * .12:.2f}"/>'
    else:
        s += f'<circle cx="{cx}" cy="{cy}" r="{r * .88:.2f}" fill="none" stroke="{COBALTO}" stroke-width="{r * .07:.2f}"/>'
    s += f'<circle cx="{cx}" cy="{cy}" r="{r * .5:.2f}" fill="none" stroke="{COBALTO}" stroke-width="{r * .06:.2f}"/>'
    # despostilladura sobre el filete: el hierro negro que asoma
    import math
    a = math.radians(-50)
    x, y, k = cx + math.cos(a) * r * .86, cy + math.sin(a) * r * .86, r / 30
    s += (f'<path d="M{x - 4 * k:.2f},{y - 1 * k:.2f} q{2 * k:.2f},{-3.2 * k:.2f} {5.4 * k:.2f},{-1.6 * k:.2f} '
          f'q{2.8 * k:.2f},{1.8 * k:.2f} {1.6 * k:.2f},{4.8 * k:.2f} q{-2 * k:.2f},{2.6 * k:.2f} {-5 * k:.2f},{1.2 * k:.2f} '
          f'q{-2.8 * k:.2f},{-1.4 * k:.2f} {-2 * k:.2f},{-4.4 * k:.2f}Z" fill="{NOCHE}"/>')
    return s


def escribir(ruta, contenido):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, 'w') as f:
        f.write(contenido)


logo = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{plato(32, 32, 30)}</svg>'
logo_claro = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{plato(32, 32, 30, borde=False)}</svg>'
favicon = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="{COBALTO}"/>'
           f'{plato(32, 32, 23, borde=False)}</svg>')
icono = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="{COBALTO}"/>'
         f'{plato(256, 256, 176, borde=False)}</svg>')
icono_mask = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="{COBALTO}"/>'
              f'{plato(256, 256, 132, borde=False)}</svg>')

escribir(os.path.join(RAIZ, 'marca', 'logo.svg'), logo)
escribir(os.path.join(RAIZ, 'marca', 'logo-claro.svg'), logo_claro)
escribir(os.path.join(RAIZ, 'favicon.svg'), favicon)
escribir(os.path.join(RAIZ, 'marca', 'icono.svg'), icono)
escribir(os.path.join(RAIZ, 'marca', 'icono-mask.svg'), icono_mask)

try:
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        for fuente, salida, tam in [('icono', 'icon-512.png', 512), ('icono', 'icon-192.png', 192),
                                    ('icono', 'apple-touch-icon.png', 180), ('icono-mask', 'icon-maskable-512.png', 512)]:
            pg.set_viewport_size({'width': tam, 'height': tam})
            svg = open(os.path.join(RAIZ, 'marca', fuente + '.svg')).read().replace('<svg ', f'<svg width="{tam}" height="{tam}" ', 1)
            pg.set_content(f'<html><body style="margin:0">{svg}</body></html>')
            pg.screenshot(path=os.path.join(RAIZ, salida), omit_background=False)
        b.close()
    print('Íconos PNG listos')
except ImportError:
    print('Sin playwright: solo se generaron los SVG')
