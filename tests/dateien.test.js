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
  const appJs = await (await fetch('../js/app.js')).text();
  const importe = [...appJs.matchAll(/from '\.\/([^']+)'/g)].map((m) => `js/${m[1]}`);
  for (const i of importe) wahr(sw.includes(`'${i}'`), `${i} fehlt in sw.js`);
});

test('Manifest: Name, Symbole, Startbildschirm', async () => {
  const m = await (await fetch('../manifest.webmanifest')).json();
  gleich(m.display, 'standalone');
  wahr(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512'), 'Symbole 192/512 fehlen');
});
