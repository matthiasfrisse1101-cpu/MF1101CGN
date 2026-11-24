import { test, gleich, wahr } from './harness.js';
import { VERSION } from '../js/version.js';

const sw = await (await fetch('../sw.js')).text();

test('Version in sw.js und version.js gleich', () => {
  const m = sw.match(/const VERSION = '([^']+)'/);
  gleich(m && m[1], VERSION);
});

test('Alle Dateien des Offline-Speichers sind vorhanden', async () => {
  const liste = [...sw.matchAll(/^\s+'([^']+)',$/gm)].map((m) => m[1]);
  wahr(liste.length > 10, 'Dateiliste nicht gefunden');
  for (const d of liste) {
    const r = await fetch(`../${d === './' ? '' : d}`);
    wahr(r.ok, `${d} fehlt (${r.status})`);
  }
});

test('Alle JS-Module stehen im Offline-Speicher', async () => {
  // Alle Module, die von app.js aus (auch über Umwege) geladen werden.
  const offen = ['app.js'], gesehen = new Set();
  while (offen.length) {
    const d = offen.pop();
    if (gesehen.has(d)) continue;
    gesehen.add(d);
    const text = await (await fetch(`../js/${d}`)).text();
    for (const m of text.matchAll(/from '\.\/([^']+)'/g)) offen.push(m[1]);
  }
  wahr(gesehen.size >= 8, `nur ${gesehen.size} Module gefunden`);
  for (const d of gesehen) wahr(sw.includes(`'js/${d}'`), `js/${d} fehlt in sw.js`);
});

test('Service Worker holt Dateien beim Installieren frisch vom Server', () => {
  wahr(sw.includes("cache: 'reload'"), 'Installation könnte veraltete Dateien aus dem Browser-Zwischenspeicher übernehmen');
});

test('Manifest: Name, Symbole, Startbildschirm', async () => {
  const m = await (await fetch('../manifest.webmanifest')).json();
  gleich(m.display, 'standalone');
  wahr(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512'), 'Symbole 192/512 fehlen');
});
