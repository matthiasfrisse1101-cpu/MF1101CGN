// Sicherung und Wiedereinlesen: Beckenbuch (oder mehrere) mit Fotos und Skizzen als ZIP-Datei.
// Aufbau der Datei:
//   sicherung.json   { format, version, erstellt, appVersion, buecher: [{ buch, gliederung, fotos: [...], skizzen: [...] }] }
//   fotos/<id>.<jpg|png>, fotos/<id>_vorschau.jpg
//   skizzen/<id>_bild.<png|jpg>, skizzen/<id>_grundlage.<jpg|png>
// Fotos und Skizzen stehen in sicherung.json ohne Bilddaten; die Bilder liegen als eigene Dateien daneben.
// Die Word-Vorlage gehört nicht in die Sicherung (sie wird auf jedem Gerät einmal als Vorlagenpaket geladen).
import * as db from './db.js';
import { neueId } from './gliederung.js';
import { ladeSkript } from './ausgabe.js';

export const FORMAT = 'beckenbuch-sicherung';
export const FORMAT_VERSION = 1;

async function jszip() {
  if (!window.JSZip) await ladeSkript(new URL('../lib/jszip.min.js', import.meta.url).href);
  return window.JSZip;
}
const endung = (blob) => (blob && blob.type === 'image/png' ? 'png' : 'jpg');
const typVon = (name) => (name.endsWith('.png') ? 'image/png' : 'image/jpeg');

// Alle Foto- und Skizzen-IDs, auf die ein Beckenbuch verweist (Felder, Tabellenzeilen, Protokoll).
export function verweise(buch) {
  const fotos = new Set(), skizzen = new Set();
  for (const e of Object.values(buch.werte || {})) {
    const w = e && e.wert;
    if (Array.isArray(w)) {
      for (const x of w) {
        if (typeof x === 'string' && x.startsWith('f-')) fotos.add(x);
        else if (typeof x === 'string' && x.startsWith('s-')) skizzen.add(x);
        else if (x && Array.isArray(x.fotos)) x.fotos.forEach((f) => fotos.add(f));
      }
    } else if (w && typeof w === 'object' && w.punkte) {
      for (const p of Object.values(w.punkte)) (p.fotos || []).forEach((f) => fotos.add(f));
    }
  }
  return { fotos: [...fotos], skizzen: [...skizzen] };
}

export async function sicherungErstellen(buchIds, { appVersion = '' } = {}) {
  const JSZip = await jszip();
  const zip = new JSZip();
  const inhalt = { format: FORMAT, version: FORMAT_VERSION, erstellt: new Date().toISOString(), appVersion, buecher: [] };
  for (const id of buchIds) {
    const buch = await db.lese('buecher', id);
    if (!buch) continue;
    const vorlage = await db.lese('vorlagen', `${buch.vorlage.name}@${buch.vorlage.version}`);
    // Fotos und Skizzen des Buchs: über die Verweise und über buchId (auch nicht mehr verknüpfte gehen nicht verloren)
    const v = verweise(buch);
    const fotoIds = new Set(v.fotos), skizzenIds = new Set(v.skizzen);
    for (const f of await db.alle('fotos')) if (f.buchId === id) fotoIds.add(f.id);
    for (const s of await db.alle('skizzen')) if (s.buchId === id) skizzenIds.add(s.id);
    const fotos = [];
    for (const fid of fotoIds) {
      const f = await db.lese('fotos', fid);
      if (!f) continue;
      const { blob, vorschau, ...meta } = f;
      meta.datei = `fotos/${f.id}.${endung(blob)}`;
      zip.file(meta.datei, blob);
      if (vorschau) { meta.vorschauDatei = `fotos/${f.id}_vorschau.jpg`; zip.file(meta.vorschauDatei, vorschau); }
      fotos.push(meta);
    }
    const skizzen = [];
    for (const sid of skizzenIds) {
      const s = await db.lese('skizzen', sid);
      if (!s) continue;
      const { bild, grundlage, ...meta } = s;
      if (bild) { meta.bildDatei = `skizzen/${s.id}_bild.${endung(bild)}`; zip.file(meta.bildDatei, bild); }
      if (grundlage) {
        meta.grundlage = { breite: grundlage.breite, hoehe: grundlage.hoehe, datei: `skizzen/${s.id}_grundlage.${endung(grundlage.blob)}` };
        zip.file(meta.grundlage.datei, grundlage.blob);
      }
      skizzen.push(meta);
    }
    inhalt.buecher.push({ buch, gliederung: vorlage ? vorlage.gliederung : null, fotos, skizzen });
  }
  zip.file('sicherung.json', JSON.stringify(inhalt, null, 1));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

// Datei lesen und prüfen. Liefert { inhalt, zip } oder wirft einen verständlichen Fehler.
export async function sicherungLesen(datei) {
  const JSZip = await jszip();
  let zip;
  try { zip = await JSZip.loadAsync(datei); } catch { throw new Error('Das ist keine Sicherungsdatei der Beckenbuch-App (keine ZIP-Datei).'); }
  const f = zip.file('sicherung.json');
  if (!f) throw new Error('In der Datei fehlt „sicherung.json“ – keine Sicherung der Beckenbuch-App.');
  let inhalt;
  try { inhalt = JSON.parse(await f.async('string')); } catch { throw new Error('„sicherung.json“ ist beschädigt.'); }
  if (inhalt.format !== FORMAT) throw new Error('Unbekanntes Dateiformat.');
  if (inhalt.version > FORMAT_VERSION) throw new Error(`Die Sicherung stammt aus einer neueren App-Version (Format ${inhalt.version}). Bitte die App aktualisieren.`);
  for (const b of inhalt.buecher || []) {
    for (const x of b.fotos || []) if (!zip.file(x.datei)) throw new Error(`Foto ${x.nr ?? x.id} fehlt in der Sicherung.`);
    for (const x of b.skizzen || []) {
      if (x.bildDatei && !zip.file(x.bildDatei)) throw new Error('Eine Skizze fehlt in der Sicherung.');
      if (x.grundlage && !zip.file(x.grundlage.datei)) throw new Error('Ein Skizzen-Hintergrund fehlt in der Sicherung.');
    }
  }
  return { inhalt, zip };
}

// Vergleich mit einem vorhandenen Beckenbuch gleicher ID.
export function vergleich(vorhanden, buch) {
  if (!vorhanden) return 'neu';
  const a = vorhanden.geaendert || '', b = buch.geaendert || '';
  if (a === b) return 'gleich';
  return b > a ? 'sicherung_neuer' : 'geraet_neuer';
}

// IDs für eine Kopie ersetzen (Buch, Fotos, Skizzen, Tabellenzeilen bleiben).
export function alsKopie(eintrag) {
  const neu = structuredClone({ buch: eintrag.buch, fotos: eintrag.fotos, skizzen: eintrag.skizzen });
  const buchId = neueId();
  const fotoMap = new Map(), skizzenMap = new Map();
  const zufall = () => Math.random().toString(36).slice(2, 7);
  for (const f of neu.fotos) { const n = `f-${Date.now().toString(36)}-${zufall()}`; fotoMap.set(f.id, n); f.id = n; f.buchId = buchId; }
  for (const s of neu.skizzen) { const n = `s-${Date.now().toString(36)}-${zufall()}`; skizzenMap.set(s.id, n); s.id = n; s.buchId = buchId; }
  const ersetze = (x) => (fotoMap.get(x) || skizzenMap.get(x) || x);
  for (const e of Object.values(neu.buch.werte || {})) {
    if (Array.isArray(e.wert)) e.wert = e.wert.map((x) => (typeof x === 'string' ? ersetze(x) : (x && Array.isArray(x.fotos) ? { ...x, fotos: x.fotos.map(ersetze) } : x)));
    else if (e.wert && e.wert.punkte) for (const p of Object.values(e.wert.punkte)) if (p.fotos) p.fotos = p.fotos.map(ersetze);
  }
  neu.buch.id = buchId;
  const name = neu.buch.werte && neu.buch.werte['DECK.name'];
  if (name && name.wert) name.wert = `${name.wert} (Kopie)`;
  return neu;
}

// Einlesen. entscheidung(eintrag, vergleich) → 'ersetzen' | 'kopie' | 'ueberspringen' (für vorhandene Bücher).
export async function sicherungEinlesen({ inhalt, zip }, entscheidung) {
  const bericht = { eingelesen: [], uebersprungen: [], vorlagen: [] };
  for (const eintrag of inhalt.buecher || []) {
    const vorhanden = await db.lese('buecher', eintrag.buch.id);
    const v = vergleich(vorhanden, eintrag.buch);
    let e = eintrag;
    if (v !== 'neu') {
      const wahl = await entscheidung(eintrag, v);
      if (wahl === 'ueberspringen') { bericht.uebersprungen.push(eintrag.buch); continue; }
      if (wahl === 'kopie') e = { ...eintrag, ...alsKopie(eintrag) };
      if (wahl === 'ersetzen') {
        // Alte Fotos/Skizzen des Buchs entfernen, die in der Sicherung nicht mehr vorkommen
        const bleiben = new Set([...e.fotos.map((x) => x.id), ...e.skizzen.map((x) => x.id)]);
        for (const store of ['fotos', 'skizzen']) for (const r of await db.alle(store)) if (r.buchId === eintrag.buch.id && !bleiben.has(r.id)) await db.loesche(store, r.id);
      }
    }
    // Gliederung ergänzen, falls diese Version auf dem Gerät fehlt (ohne Word-Vorlage)
    if (eintrag.gliederung) {
      const vid = `${eintrag.gliederung.vorlage}@${eintrag.gliederung.version}`;
      if (!(await db.lese('vorlagen', vid))) {
        await db.speichere('vorlagen', { id: vid, gliederung: eintrag.gliederung, geladen: new Date().toISOString(), ausSicherung: true });
        bericht.vorlagen.push(vid);
      }
    }
    // Erst Bilder, dann das Buch – so verweist das Buch nie auf fehlende Bilder
    const orig = new Map((eintrag.fotos || []).map((f, i) => [e.fotos[i].id, f]));
    for (const f of e.fotos) {
      const quelle = orig.get(f.id) || f;
      const { datei, vorschauDatei, ...meta } = f;
      meta.blob = new Blob([await zip.file(quelle.datei).async('arraybuffer')], { type: typVon(quelle.datei) });
      if (quelle.vorschauDatei && zip.file(quelle.vorschauDatei)) meta.vorschau = new Blob([await zip.file(quelle.vorschauDatei).async('arraybuffer')], { type: 'image/jpeg' });
      await db.speichere('fotos', meta);
    }
    const origS = new Map((eintrag.skizzen || []).map((s, i) => [e.skizzen[i].id, s]));
    for (const s of e.skizzen) {
      const quelle = origS.get(s.id) || s;
      const { bildDatei, ...meta } = s;
      if (quelle.bildDatei) meta.bild = new Blob([await zip.file(quelle.bildDatei).async('arraybuffer')], { type: typVon(quelle.bildDatei) });
      if (quelle.grundlage) meta.grundlage = { breite: quelle.grundlage.breite, hoehe: quelle.grundlage.hoehe, blob: new Blob([await zip.file(quelle.grundlage.datei).async('arraybuffer')], { type: typVon(quelle.grundlage.datei) }) };
      await db.speichere('skizzen', meta);
    }
    await db.allesGespeichert();
    await db.speichere('buecher', e.buch);
    await db.allesGespeichert();
    bericht.eingelesen.push(e.buch);
  }
  return bericht;
}
