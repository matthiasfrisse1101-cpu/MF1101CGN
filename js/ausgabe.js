// Gemeinsame Aufbereitung der Werte für Word und PDF.
// Leere Felder erscheinen nie leer, sondern mit ihrem Status („nicht erfasst“, „nicht vorhanden“, …).
import * as G from './gliederung.js';
import { massAnzeige } from './masse.js';

export const NICHT_ERFASST = 'nicht erfasst';
const STATUS_TEXT = {
  nicht_vorhanden: 'nicht vorhanden',
  nicht_zugaenglich: 'nicht zugänglich',
  offen: 'offen',
  aus_akten: 'aus den Akten nachzutragen',
};

export function datumDE(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(iso || '');
}

// Text eines Feldwertes (ohne Status). null, wenn leer.
export function feldText(g, buch, kapitelId, feld) {
  const w = G.wertVon(g, buch, kapitelId, feld);
  if (G.istLeer(feld, w)) return null;
  const e = (buch.werte || {})[feld.aus || G.feldKey(kapitelId, feld.id)] || {};
  switch (feld.art) {
    case 'datum': return datumDE(w);
    case 'janein': return w ? 'ja' : 'nein';
    case 'mehrfach': return w.join(', ');
    case 'zahl': {
      if (e.mass) return massAnzeige(e);
      return `${w}${feld.einheit && feld.einheit !== '1:n' ? ` ${feld.einheit}` : ''} (zur Prüfung)`;
    }
    case 'tabelle': {
      const zeilen = w.filter((z) => G.zeileHatInhalt(feld, z));
      return zeilen.map((z) => feld.spalten.map((s) => z[s.id]).filter((x) => x !== undefined && String(x).trim() !== '').join(' – ')).join('\n');
    }
    case 'foto': case 'skizze': return `${w.length} ${feld.art === 'foto' ? 'Foto(s)' : 'Skizze(n)'}`;
    case 'pruefprotokoll': return w.datum ? `Erstkontrolle vom ${datumDE(w.datum)}` : 'Erstkontrolle';
    case 'massskizze': return 'Skizzen aus den Maßen';
    default: return String(w);
  }
}

// Text mit Status für leere Felder.
export function feldAusgabe(g, buch, kapitelId, feld) {
  const t = feldText(g, buch, kapitelId, feld);
  if (t !== null) return t;
  const st = G.feldStatus(g, buch, kapitelId, feld);
  return STATUS_TEXT[st] || NICHT_ERFASST;
}

export function feldNachKey(g, key) {
  return G.feldIndex(g).get(key) || null;
}

// Vorlage für einen Wert: „{A1.ort}“, mehrere Platzhalter, Zeilen als Liste.
// Eine Zeile, deren Platzhalter alle leer sind, entfällt; bleibt nichts übrig: Status bzw. „nicht erfasst“.
export function fuelleVorlage(g, buch, vorlage) {
  const zeilen = Array.isArray(vorlage) ? vorlage : [vorlage];
  const ergebnis = [];
  let ersterStatus = null;
  for (const z of zeilen) {
    let leer = true, hatPlatzhalter = false;
    const text = String(z).replace(/\{([A-Za-z0-9_]+\.[A-Za-z0-9_]+)\}/g, (_, key) => {
      hatPlatzhalter = true;
      const t = feldNachKey(g, key);
      if (!t) return `[${key}?]`;
      const v = feldText(g, buch, t.kapitel.id, t.feld);
      if (v !== null) { leer = false; return v; }
      if (!ersterStatus) ersterStatus = feldAusgabe(g, buch, t.kapitel.id, t.feld);
      return '';
    });
    if (!hatPlatzhalter || !leer) ergebnis.push(text.replace(/^[,;\s]+|[,;\s]+$/g, '').replace(/\s+,/g, ','));
  }
  const t = ergebnis.filter((x) => x.trim()).join('\n');
  return t || ersterStatus || NICHT_ERFASST;
}

// Für die Ausgabe sichtbare Felder eines Kapitels (ohne Bauform-Hilfen u. ä.).
export function ausgabeFelder(g, buch, kap) {
  return G.sichtbareFelder(kap, buch, g).filter((f) => f.ausgabe !== false);
}

// Betreff und Dateiname
export function betreff(buch) {
  const nr = G.buchBauwerksnr(buch);
  return `Beckenbuch ${nr ? `${nr} ` : ''}${G.buchName(buch)}`.trim();
}
export function dateiname(buch, endung) {
  return `${betreff(buch).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_')}.${endung}`;
}

// Offene Punkte: Pflichtfelder leer, Status „offen“, Maße zur Prüfung.
export function offenePunkte(g, buch) {
  const r = [];
  for (const k of G.sichtbareKapitel(g, buch)) {
    for (const f of ausgabeFelder(g, buch, k)) {
      if (f.aus) continue;
      const st = G.feldStatus(g, buch, k.id, f);
      const e = (buch.werte || {})[G.feldKey(k.id, f.id)] || {};
      if (st === 'offen') r.push({ kapitel: k, feld: f, grund: 'offen' });
      else if (st === 'leer' && f.pflicht) r.push({ kapitel: k, feld: f, grund: 'Pflichtangabe fehlt' });
      else if (f.art === 'zahl' && String(e.wert ?? '').trim() && !e.mass) r.push({ kapitel: k, feld: f, grund: 'Maß zur Prüfung' });
    }
  }
  return r;
}

export function blobZuDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// Bild für die Ausgabe verkleinern (JPEG). Liefert { blob, breite, hoehe }.
export async function ausgabeBild(blob, maxKante = 1400, qualitaet = 0.78, typ = 'image/jpeg') {
  const bild = await createImageBitmap(blob);
  const f = Math.min(1, maxKante / Math.max(bild.width, bild.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bild.width * f); c.height = Math.round(bild.height * f);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bild, 0, 0, c.width, c.height);
  const b = await new Promise((res) => c.toBlob(res, typ, qualitaet));
  return { blob: b, breite: c.width, hoehe: c.height };
}

// Skripte (Bibliotheken) erst bei Bedarf laden – die App startet so schneller.
const geladen = new Map();
export function ladeSkript(src) {
  if (!geladen.has(src)) {
    geladen.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`${src} konnte nicht geladen werden`));
      document.head.append(s);
    }));
  }
  return geladen.get(src);
}
