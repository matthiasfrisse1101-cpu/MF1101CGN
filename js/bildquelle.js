// Bilder für Word und PDF: Fotos (verkleinert), Handskizzen (fertige Grafik), Skizzen aus Maßen (SVG + PNG).
// quelle(key) liefert [{ bytes, ext, breite, hoehe, unterschrift, svg?, svgText? }].
// key: Feldschlüssel („FOTO.foto“), „zeile:<id>“ (Fotos einer Tabellenzeile) oder „protokoll:<feld>“ (Schadensfotos).
import * as db from './db.js';
import * as G from './gliederung.js';
import * as M from './massskizze.js';
import { ausgabeBild, datumDE } from './ausgabe.js';
import { svgZuPng } from './massskizze_ui.js';

async function bytesVon(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

export function bildQuelle(g, buch, { erfasser = '', fotoKante = 1400 } = {}) {
  const cache = new Map();
  const fotoNr = new Map();

  const fotos = async (ids, kontext) => {
    const r = [];
    for (const id of ids || []) {
      const f = await db.lese('fotos', id);
      if (!f) continue;
      const k = await ausgabeBild(f.blob, fotoKante);
      fotoNr.set(f.id, f.nr);
      r.push({
        bytes: await bytesVon(k.blob), blob: k.blob, ext: 'jpeg', breite: k.breite, hoehe: k.hoehe,
        unterschrift: `Foto ${f.nr}${f.unterschrift ? `: ${f.unterschrift}` : ''} (${datumDE(String(f.aufgenommen).slice(0, 10))})`,
        foto: { nr: f.nr, unterschrift: f.unterschrift || '', datum: f.aufgenommen, kontext },
      });
    }
    return r;
  };

  const quelle = async (key) => {
    if (cache.has(key)) return cache.get(key);
    let ergebnis = [];
    if (key.startsWith('zeile:')) {
      const id = key.slice(6);
      for (const [k, e] of Object.entries(buch.werte || {})) {
        const z = Array.isArray(e.wert) ? e.wert.find((x) => x && x.id === id) : null;
        if (z) { ergebnis = await fotos(z.fotos, k); break; }
      }
    } else if (key.startsWith('protokoll:')) {
      const e = (buch.werte || {})[key.slice(10)];
      const ids = Object.values((e && e.wert && e.wert.punkte) || {}).flatMap((p) => p.fotos || []);
      ergebnis = await fotos(ids, key.slice(10));
    } else {
      const t = G.feldIndex(g).get(key);
      if (t) {
        const ziel = t.feld.aus || key;
        const w = ((buch.werte || {})[ziel] || {}).wert;
        if (t.feld.art === 'foto') ergebnis = await fotos(w, ziel);
        else if (t.feld.art === 'skizze') {
          for (const id of w || []) {
            const s = await db.lese('skizzen', id);
            if (!s || !s.bild) continue;
            const bm = await createImageBitmap(s.bild);
            ergebnis.push({ bytes: await bytesVon(s.bild), blob: s.bild, ext: s.bild.type === 'image/png' ? 'png' : 'jpeg', breite: bm.width, hoehe: bm.height });
          }
        } else if (t.feld.art === 'massskizze' && w) {
          const masse = M.leseMasse(buch, t.feld.masse);
          const info = { datum: new Date().toLocaleDateString('de-DE'), erfasser };
          const teile = [M.lageplanSvg(masse, w, { ...info, titel: 'Lageplanskizze' }), M.schnittSvg(masse, 'quer', info), M.schnittSvg(masse, 'laengs', info)].filter(Boolean);
          for (const sk of teile) {
            const hoehe = Number(sk.svg.match(/viewBox="0 0 \d+ (\d+)"/)[1]);
            const png = await svgZuPng(sk.svg, M.BREITE, hoehe);
            ergebnis.push({ bytes: await bytesVon(png), blob: png, ext: 'png', breite: M.BREITE, hoehe, svg: new TextEncoder().encode(sk.svg), svgText: sk.svg });
          }
        }
      }
    }
    cache.set(key, ergebnis);
    return ergebnis;
  };
  quelle.fotoNr = fotoNr;
  return quelle;
}
