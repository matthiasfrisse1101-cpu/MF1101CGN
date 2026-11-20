"""Erzeugt die App-Symbole (PNG) ohne Zusatzpakete. Aufruf: python3 tools/icons_erzeugen.py"""
import struct, zlib, os, math

BLAU = (11, 61, 107); WEISS = (255, 255, 255); WASSER = (120, 190, 235)

def png(pfad, groesse, rand):
    px = []
    for y in range(groesse):
        zeile = []
        for x in range(groesse):
            u, v = x / groesse, y / groesse
            farbe = BLAU
            # Becken als Trapez (Böschungen), innerhalb des sicheren Bereichs
            r = rand
            oben, unten = 0.38, 0.74
            if oben <= v <= unten:
                t = (v - oben) / (unten - oben)
                links = r + 0.08 + t * 0.14
                rechts = 1 - r - 0.08 - t * 0.14
                if links <= u <= rechts:
                    farbe = WEISS
                    # Wasserlinie mit Welle
                    welle = 0.50 + 0.02 * math.sin(u * math.pi * 6)
                    if v >= welle:
                        farbe = WASSER
            # Geländelinie
            if abs(v - oben) < 0.018 and r + 0.02 <= u <= 1 - r - 0.02:
                farbe = WEISS
            zeile.append(farbe)
        px.append(zeile)
    roh = b''.join(b'\x00' + bytes(c for p in zeile for c in p) for zeile in px)
    def block(typ, daten):
        return struct.pack('>I', len(daten)) + typ + daten + struct.pack('>I', zlib.crc32(typ + daten) & 0xffffffff)
    inhalt = b'\x89PNG\r\n\x1a\n' + block(b'IHDR', struct.pack('>IIBBBBB', groesse, groesse, 8, 2, 0, 0, 0)) \
        + block(b'IDAT', zlib.compress(roh, 9)) + block(b'IEND', b'')
    with open(pfad, 'wb') as f:
        f.write(inhalt)

ziel = os.path.join(os.path.dirname(__file__), '..', 'icons')
png(os.path.join(ziel, 'icon-192.png'), 192, 0.06)
png(os.path.join(ziel, 'icon-512.png'), 512, 0.06)
png(os.path.join(ziel, 'icon-maskable-512.png'), 512, 0.16)
print('Symbole erzeugt')
