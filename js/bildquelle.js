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

  // bezug: wozu das Foto gehört (z. B. „B 1 Wasserstand …: Ölfilm“). imText: Bezug auch in der Bildunterschrift nennen.
  const fotos = async (ids, kontext, bezug = '', imText = false, extra = {}) => {
    const r = [];
    for (const id of ids || []) {
      const f = await db.lese('fotos', id);
      if (!f) continue;
      const k = await ausgabeBild(f.blob, fotoKante);
      fotoNr.set(f.id, f.nr);
      const datum = datumDE(String(f.aufgenommen).slice(0, 10));
      const teile = [imText && bezug ? `zu ${bezug}` : '', f.unterschrift || ''].filter(Boolean);
      r.push({
        bytes: await bytesVon(k.blob), blob: k.blob, ext: 'jpeg', breite: k.breite, hoehe: k.hoehe,
        unterschrift: `Foto ${f.nr}${teile.length ? ` – ${teile.join(' – ')}` : ''} (${datum})`,
        foto: { id: f.id, nr: f.nr, unterschrift: f.unterschrift || '', datum: f.aufgenommen, kontext, bezug },
        ...extra,
      });
    }
    return r;
  };
  const kapNr = (kapId) => { const k = g.kapitel.find((x) => x.id === kapId); return k ? (k.nr || k.titel) : kapId; };

  const quelle = async (key) => {
    if (cache.has(key)) return cache.get(key);
    let ergebnis = [];
    if (key.startsWith('zeile:')) {
      const id = key.slice(6);
      for (const [k, e] of Object.entries(buch.werte || {})) {
        const z = Array.isArray(e.wert) ? e.wert.find((x) => x && x.id === id) : null;
        if (!z) continue;
        const t = G.feldIndex(g).get(k);
        const beschreibung = t ? t.feld.spalten.map((sp) => z[sp.id]).filter((v) => v !== undefined && String(v).trim()).slice(0, 2).join(', ') : '';
        const bezug = `${t ? `${kapNr(t.kapitel.id)} ${t.feld.label}` : k}${beschreibung ? ` – ${beschreibung}` : ''}`;
        ergebnis = await fotos(z.fotos, k, bezug, true);
        break;
      }
    } else if (key.startsWith('protokoll:')) {
      // Schadensfotos der Erstkontrolle – in der Reihenfolge der Prüfpunkte, jeweils mit Prüfpunkt und Schaden
      const fk = key.slice(10);
      const e = (buch.werte || {})[fk];
      const t = G.feldIndex(g).get(fk);
      const pk = t && g.kapitel.find((k) => k.id === t.feld.protokoll);
      const punkte = (e && e.wert && e.wert.punkte) || {};
      if (pk && pk.protokoll) {
        for (const gr of pk.protokoll.gruppen) {
          for (const pt of gr.punkte) {
            const pe = punkte[`${gr.id}.${pt.nr}`];
            if (!pe || !(pe.fotos || []).length) continue;
            const bezug = `${gr.id} ${pt.nr} ${pt.text}${pe.schaden ? `: ${pe.schaden}` : ''}`;
            ergebnis.push(...await fotos(pe.fotos, fk, bezug, true, { punkt: `${gr.id}.${pt.nr}` }));
          }
        }
      } else {
        ergebnis = await fotos(Object.values(punkte).flatMap((p) => p.fotos || []), fk);
      }
    } else {
      const t = G.feldIndex(g).get(key);
      if (t) {
        const ziel = t.feld.aus || key;
        const w = ((buch.werte || {})[ziel] || {}).wert;
        if (t.feld.art === 'foto') ergebnis = await fotos(w, ziel, `${kapNr(t.kapitel.id)} ${t.feld.label}`);
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
