#!/usr/bin/env python3
"""Baut die Desktop-Testversion: EINE HTML-Datei mit der ganzen App.

Wozu: Die normale App besteht aus vielen Dateien und braucht einen Webserver
(oder GitHub Pages). Die Desktop-Testversion lässt sich dagegen per Doppelklick
im Browser (Chrome oder Edge) öffnen – ohne Server, ohne Internet.

Aufruf im App-Ordner:   python3 tools/desktop_bauen.py
Ergebnis:               desktop/Beckenbuch-Desktop-Test.html

Wie es funktioniert (ohne fremde Werkzeuge):
- Jede Datei aus js/ wird in eine eigene Funktion gepackt, damit sich gleiche
  Namen in verschiedenen Dateien nicht stören.
- Aus "export function x" wird "function x"; am Ende gibt die Funktion alle
  exportierten Namen zurück.
- Aus "import { a } from './b.js'" wird "const { a } = Modul_b".
- CSS und Test-Gliederung werden direkt in die Seite geschrieben.
Die App selbst bleibt unverändert; dieses Skript erzeugt nur eine Kopie.
"""
import json
import re
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
JS = WURZEL / 'js'
ZIEL = WURZEL / 'desktop' / 'Beckenbuch-Desktop-Test.html'

IMPORT = re.compile(r"^\s*import\s+(.+?)\s+from\s+'\./([\w-]+)\.js';\s*$", re.M)
EXPORT = re.compile(r"^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)", re.M)


def modulname(datei):
    return 'Modul_' + datei.replace('-', '_')


def lies_modul(name):
    text = (JS / f'{name}.js').read_text(encoding='utf-8')
    abh = [m.group(2) for m in IMPORT.finditer(text)]
    if re.search(r"^\s*(import|export)\b", IMPORT.sub('', EXPORT.sub(r'\1 \2', text)), re.M):
        raise SystemExit(f'{name}.js: unbekannte import/export-Form – Skript erweitern.')
    return text, abh


def ordne(start):
    """Reihenfolge so, dass jede Datei nach ihren Abhängigkeiten kommt."""
    fertig, reihe, gerade = set(), [], set()

    def besuche(n):
        if n in fertig:
            return
        if n in gerade:
            raise SystemExit(f'Kreisverweis bei {n}.js')
        gerade.add(n)
        for a in lies_modul(n)[1]:
            besuche(a)
        gerade.discard(n)
        fertig.add(n)
        reihe.append(n)

    besuche(start)
    return reihe


def umsetzen(name):
    text, _ = lies_modul(name)
    namen = [m.group(2) for m in EXPORT.finditer(text)]

    def imp(m):
        teil, quelle = m.group(1).strip(), modulname(m.group(2))
        if teil.startswith('* as '):
            return f'const {teil[5:].strip()} = {quelle};'
        return f'const {teil} = {quelle};'

    text = IMPORT.sub(imp, text)
    text = EXPORT.sub(r'\1 \2', text)
    rueck = ', '.join(namen)
    return (f'// ===== js/{name}.js =====\n'
            f'const {modulname(name)} = await (async () => {{\n{text}\nreturn {{ {rueck} }};\n}})();\n')


def main():
    reihe = ordne('app')
    module = '\n'.join(umsetzen(n) for n in reihe)
    css = (WURZEL / 'css' / 'app.css').read_text(encoding='utf-8')
    gliederung = json.loads((WURZEL / 'gliederung' / 'test-gliederung.json').read_text(encoding='utf-8'))
    # "</" im eingebetteten Text würde das <script> vorzeitig beenden.
    gl_json = json.dumps(gliederung, ensure_ascii=False).replace('</', '<\\/')
    module = module.replace('</script', '<\\/script')
    version = re.search(r"VERSION\s*=\s*'([^']+)'", (JS / 'version.js').read_text()).group(1)

    html = f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beckenbuch – Desktop-Test {version}</title>
<!-- Automatisch erzeugt mit tools/desktop_bauen.py – nicht von Hand ändern. -->
<style>
{css}
/* Desktop-Test: App in Handybreite in der Mitte zeigen */
@media (min-width: 700px) {{
  body {{ background: #d9dee5; }}
  #app {{ max-width: 480px; margin: 0 auto; background: #fff; min-height: 100vh; box-shadow: 0 0 24px rgba(0,0,0,.15); }}
  .fuss, .toast {{ max-width: 480px; margin: 0 auto; }}
}}
.desktop-band {{ background: #5a2d82; color: #fff; text-align: center; padding: .35rem; font: 600 .9rem system-ui, sans-serif; }}
</style>
</head>
<body>
<div class="desktop-band">Desktop-Testversion {version} – Daten bleiben in diesem Browser auf diesem Rechner</div>
<button id="update" class="update-leiste" hidden>Neue Version verfügbar</button>
<div id="app"><p style="padding:1rem">Beckenbuch wird geladen …</p></div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<noscript>Diese App benötigt JavaScript.</noscript>
<script>window.BECKENBUCH_TESTGLIEDERUNG = {gl_json};</script>
<script type="module">
{module}
</script>
</body>
</html>
"""
    ZIEL.parent.mkdir(exist_ok=True)
    ZIEL.write_text(html, encoding='utf-8')
    print(f'Erzeugt: {ZIEL.relative_to(WURZEL)}  ({len(html) // 1024} KB, {len(reihe)} Programmdateien)')


if __name__ == '__main__':
    main()
