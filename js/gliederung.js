// Logik rund um die Gliederung (Vorlage) und den Bearbeitungsstand eines Beckenbuchs.
// Reine Funktionen ohne Bildschirm und ohne Speicher – deshalb automatisch testbar.
import { massZustand } from './masse.js';
import { pruefeMassskizzeFeld } from './massskizze.js';

export const STATUS = {
  erfasst: 'erfasst',
  nicht_vorhanden: 'nicht vorhanden',
  nicht_zugaenglich: 'nicht zugänglich',
  offen: 'offen',
  aus_akten: 'aus Akten',
  leer: 'noch leer',
};

// Status, die von Hand gesetzt werden können (erfasst ergibt sich aus dem Wert).
export const HAND_STATUS = ['nicht_vorhanden', 'nicht_zugaenglich', 'offen', 'aus_akten'];

// Diese Status gelten als „geklärt“ für den Fortschritt.
const GEKLAERT = new Set(['erfasst', 'nicht_vorhanden', 'nicht_zugaenglich']);

export const FELDARTEN = ['text', 'langtext', 'zahl', 'datum', 'auswahl', 'mehrfach', 'janein', 'foto', 'skizze', 'tabelle', 'pruefprotokoll', 'massskizze'];

// Feldarten, die nicht diktiert werden (kein Sammeldiktat, keine Stichwörter).
export const OHNE_DIKTAT = ['foto', 'skizze', 'pruefprotokoll', 'massskizze'];

export const BUCH_STAND = {
  in_arbeit: 'in Arbeit',
  vor_ort_fertig: 'vor Ort fertig',
  vollstaendig: 'vollständig',
  versendet: 'versendet',
};

export function feldKey(kapitelId, feldId) {
  return `${kapitelId}.${feldId}`;
}

// ---------- Prüfung einer Gliederungsdatei ----------
export function pruefeGliederung(g) {
  const fehler = [];
  if (!g || typeof g !== 'object') return ['Die Datei enthält keine Gliederung.'];
  if (g.format !== 1) fehler.push('Unbekanntes Format (erwartet: "format": 1).');
  if (!g.vorlage) fehler.push('Name der Vorlage ("vorlage") fehlt.');
  if (!g.version) fehler.push('Version ("version") fehlt.');
  if (!Array.isArray(g.kapitel) || g.kapitel.length === 0) fehler.push('Keine Kapitel vorhanden.');
  const tbIds = new Set((g.teilbauwerke || []).map((t) => t.id));
  const stIds = new Set((g.stammdaten || []).map((s) => s.id));
  const kapIds = new Set();
  const alleKeys = new Set();
  for (const k of g.kapitel || []) {
    if (!k.id) { fehler.push('Ein Kapitel hat keine "id".'); continue; }
    if (kapIds.has(k.id)) fehler.push(`Kapitel-ID doppelt: ${k.id}`);
    kapIds.add(k.id);
    pruefeSichtbar(k.sichtbarWenn, tbIds, `Kapitel ${k.id}`, fehler);
    const feldIds = new Set();
    for (const f of k.felder || []) {
      const wo = `Feld ${k.id}.${f.id}`;
      if (!f.id) { fehler.push(`Kapitel ${k.id}: Feld ohne "id".`); continue; }
      if (feldIds.has(f.id)) fehler.push(`${wo} ist doppelt.`);
      feldIds.add(f.id);
      alleKeys.add(feldKey(k.id, f.id));
      if (!f.label) fehler.push(`${wo}: "label" fehlt.`);
      if (!FELDARTEN.includes(f.art)) fehler.push(`${wo}: unbekannte Feldart "${f.art}".`);
      if ((f.art === 'auswahl' || f.art === 'mehrfach') && !(Array.isArray(f.optionen) && f.optionen.length)) {
        fehler.push(`${wo}: Auswahlfeld ohne "optionen".`);
      }
      if (f.art === 'tabelle' && !(Array.isArray(f.spalten) && f.spalten.length)) fehler.push(`${wo}: Tabelle ohne "spalten".`);
      if (f.stammdaten && !stIds.has(f.stammdaten)) fehler.push(`${wo}: Stammdatum "${f.stammdaten}" ist nicht definiert.`);
      pruefeSichtbar(f.sichtbarWenn, tbIds, wo, fehler);
    }
  }
  const index = new Map();
  for (const k of g.kapitel || []) for (const f of k.felder || []) if (k.id && f.id) index.set(feldKey(k.id, f.id), f);
  for (const k of g.kapitel || []) {
    for (const f of k.felder || []) {
      const wo = `Feld ${k.id}.${f.id}`;
      if (f.aus && !alleKeys.has(f.aus)) fehler.push(`${wo}: Verweis "aus": "${f.aus}" zeigt auf kein Feld.`);
      if (f.aus && index.has(f.aus) && ['foto', 'skizze'].includes(f.art) && index.get(f.aus).art !== f.art) {
        fehler.push(`${wo}: "aus" muss auf ein Feld derselben Art (${f.art}) zeigen.`);
      }
      // Marken einer Skizze sind mit einer Tabelle verknüpft (Spalte "nr"), z. B. Eingriffsstellen.
      if (f.marken) {
        const t = index.get(f.marken);
        if (f.art !== 'skizze') fehler.push(`${wo}: "marken" gibt es nur bei Skizzen.`);
        if (!t) fehler.push(`${wo}: "marken": "${f.marken}" zeigt auf kein Feld.`);
        else if (t.art !== 'tabelle' || !(t.spalten || []).some((s) => s.id === 'nr')) fehler.push(`${wo}: "marken" muss auf eine Tabelle mit Spalte "nr" zeigen.`);
      }
      if (f.fotosJeZeile && f.art !== 'tabelle') fehler.push(`${wo}: "fotosJeZeile" gibt es nur bei Tabellen.`);
      if (f.art === 'pruefprotokoll') {
        const pk = (g.kapitel || []).find((x) => x.id === f.protokoll);
        if (!pk || !pk.protokoll || !Array.isArray(pk.protokoll.gruppen)) fehler.push(`${wo}: "protokoll" muss auf ein Kapitel mit Protokoll (gruppen) zeigen.`);
      }
      if (f.art === 'massskizze') fehler.push(...pruefeMassskizzeFeld(f, index, wo));
      if (f.format && !['verhaeltnis', 'dn'].includes(f.format)) fehler.push(`${wo}: unbekanntes "format" "${f.format}".`);
    }
  }
  for (const m of g.mindestumfang || []) {
    for (const key of m.felder || []) {
      if (!alleKeys.has(key)) fehler.push(`Mindestumfang "${m.label}": Feld ${key} gibt es nicht.`);
    }
  }
  return fehler;
}

function pruefeSichtbar(s, tbIds, wo, fehler) {
  if (!s) return;
  for (const id of s.teilbauwerk || []) {
    if (!tbIds.has(id)) fehler.push(`${wo}: Teilbauwerk "${id}" in "sichtbarWenn" ist nicht definiert.`);
  }
}

// ---------- Sichtbarkeit ----------
export function istSichtbar(element, buch) {
  const s = element.sichtbarWenn;
  if (!s || !s.teilbauwerk || s.teilbauwerk.length === 0) return true;
  const gewaehlt = new Set(buch.teilbauwerke || []);
  return s.teilbauwerk.some((id) => gewaehlt.has(id));
}

export function sichtbareKapitel(g, buch) {
  const zu = new Set(buch.zugeschaltet || []);
  return g.kapitel.filter((k) => (!k.zuschaltbar || zu.has(k.id)) && istSichtbar(k, buch));
}

export function sichtbareFelder(kapitel, buch) {
  return (kapitel.felder || []).filter((f) => istSichtbar(f, buch));
}

// ---------- Werte und Status ----------
export function istLeer(feld, wert) {
  if (wert === undefined || wert === null) return true;
  switch (feld.art) {
    case 'janein':
      return wert !== true && wert !== false;
    case 'mehrfach':
    case 'foto':
    case 'skizze':
      return !Array.isArray(wert) || wert.length === 0;
    case 'tabelle':
      return !Array.isArray(wert) || !wert.some((z) => zeileHatInhalt(feld, z));
    case 'massskizze':
      return typeof wert !== 'object' || !wert.geprueft;
    case 'pruefprotokoll':
      return typeof wert !== 'object' || (!wert.datum && Object.keys(wert.punkte || {}).length === 0);
    default:
      return String(wert).trim() === '';
  }
}

// Vorschlagszeilen aus der Vorlage (Beispiele) zählen erst, wenn sie bestätigt oder bearbeitet wurden.
export function zeileHatInhalt(feld, zeile) {
  if (zeile && zeile._vorschlag) return false;
  if (zeile && Array.isArray(zeile.fotos) && zeile.fotos.length) return true;
  return (feld.spalten || []).some((s) => zeile && zeile[s.id] !== undefined && String(zeile[s.id]).trim() !== '');
}

// Wert eines Feldes – bei "aus"-Feldern der Wert des Bezugsfeldes.
export function wertVon(g, buch, kapitelId, feld) {
  if (feld.aus) {
    const e = (buch.werte || {})[feld.aus];
    return e ? e.wert : undefined;
  }
  const e = (buch.werte || {})[feldKey(kapitelId, feld.id)];
  return e ? e.wert : undefined;
}

export function feldStatus(g, buch, kapitelId, feld) {
  const e = (buch.werte || {})[feldKey(kapitelId, feld.id)];
  if (!feld.aus && e && e.status && HAND_STATUS.includes(e.status)) return e.status;
  return istLeer(feld, wertVon(g, buch, kapitelId, feld)) ? 'leer' : 'erfasst';
}

export function kapitelFortschritt(g, buch, kapitel) {
  const felder = sichtbareFelder(kapitel, buch).filter((f) => !f.aus);
  const r = { gesamt: felder.length, geklaert: 0, offen: 0, aus_akten: 0, leer: 0, pflichtLeer: 0, pruefen: 0 };
  for (const f of felder) {
    const st = feldStatus(g, buch, kapitel.id, f);
    if (f.art === 'zahl' && massZustand(f, (buch.werte || {})[feldKey(kapitel.id, f.id)]) === 'pruefen') r.pruefen++;
    if (GEKLAERT.has(st)) r.geklaert++;
    else if (st === 'offen') r.offen++;
    else if (st === 'aus_akten') r.aus_akten++;
    else r.leer++;
    if (f.pflicht && st === 'leer') r.pflichtLeer++;
  }
  return r;
}

export function mindestumfang(g, buch) {
  const index = feldIndex(g);
  return (g.mindestumfang || []).map((m) => {
    const fehlend = (m.felder || []).filter((key) => {
      const t = index.get(key);
      if (!t) return true;
      return feldStatus(g, buch, t.kapitel.id, t.feld) !== 'erfasst';
    });
    return { label: m.label, erfuellt: fehlend.length === 0, fehlend };
  });
}

export function feldIndex(g) {
  const m = new Map();
  for (const k of g.kapitel) for (const f of k.felder || []) m.set(feldKey(k.id, f.id), { kapitel: k, feld: f });
  return m;
}

// Alle Felder, die als „aus Akten“ markiert sind oder deren Ort „akten“ ist und die noch leer sind.
export function akteneintraege(g, buch) {
  const liste = [];
  for (const k of sichtbareKapitel(g, buch)) {
    for (const f of sichtbareFelder(k, buch)) {
      if (f.aus) continue;
      const st = feldStatus(g, buch, k.id, f);
      if (st === 'aus_akten' || (f.ort === 'akten' && st === 'leer')) liste.push({ kapitel: k, feld: f, status: st });
    }
  }
  return liste;
}

// ---------- Vorschläge ----------
export function vorschlagAusTeilbauwerken(g, buch, feld) {
  if (feld.vorschlagAus !== 'teilbauwerke') return '';
  const erlaubt = feld.vorschlagTeilbauwerke ? new Set(feld.vorschlagTeilbauwerke) : null;
  const gewaehlt = new Set(buch.teilbauwerke || []);
  const namen = (g.teilbauwerke || [])
    .filter((t) => gewaehlt.has(t.id) && (!erlaubt || erlaubt.has(t.id)))
    .map((t) => t.label);
  return namen.join(', ');
}

// ---------- Neues Beckenbuch ----------
export function neueId() {
  const zufall = Math.random().toString(36).slice(2, 8);
  return `bb-${Date.now().toString(36)}-${zufall}`;
}

export function neueZeilenId() {
  return `z-${Math.random().toString(36).slice(2, 10)}`;
}

export function neuesBeckenbuch(g, stammdaten, angaben, jetzt = new Date().toISOString()) {
  const buch = {
    id: neueId(),
    vorlage: { name: g.vorlage, version: g.version, testdaten: !!g.testdaten },
    stand: 'in_arbeit',
    teilbauwerke: [...(angaben.teilbauwerke || [])],
    freieTeilbauwerke: (angaben.freieTeilbauwerke || []).filter((t) => t && t.trim()),
    zugeschaltet: [],
    werte: {},
    notizen: {},
    angelegt: jetzt,
    geaendert: jetzt,
    gesichert: null,
    versendet: null,
  };
  const setze = (key, wert) => { buch.werte[key] = { wert, status: null, geaendert: jetzt }; };
  const deck = g.kapitel.find((k) => k.id === 'DECK');
  const hatFeld = (id) => !!deck && (deck.felder || []).some((f) => f.id === id);
  if (angaben.name && hatFeld('name')) setze('DECK.name', angaben.name);
  if (angaben.bauwerksnr && hatFeld('bauwerksnr')) setze('DECK.bauwerksnr', angaben.bauwerksnr);
  // Rückfall: Hat die Gliederung (z. B. die Test-Gliederung) kein Deckblattfeld dafür,
  // merkt sich das Beckenbuch Name und Bauwerksnummer selbst, damit nichts verloren geht.
  buch.kopf = {
    name: !hatFeld('name') && angaben.name ? angaben.name.trim() : '',
    bauwerksnr: !hatFeld('bauwerksnr') && angaben.bauwerksnr ? angaben.bauwerksnr.trim() : '',
  };
  // Stammdaten übernehmen (Kopie – später im Beckenbuch änderbar)
  for (const k of g.kapitel) {
    for (const f of k.felder || []) {
      if (!f.stammdaten) continue;
      const w = stammdaten ? stammdaten[f.stammdaten] : undefined;
      if (w === undefined || w === null || w === '') continue;
      if (f.art === 'tabelle') {
        if (Array.isArray(w) && w.length) setze(feldKey(k.id, f.id), w.map((z) => ({ ...z, id: neueZeilenId() })));
      } else setze(feldKey(k.id, f.id), w);
    }
  }
  // Vorschlagszeilen für Tabellen anlegen
  for (const k of g.kapitel) {
    for (const f of k.felder || []) {
      const key = feldKey(k.id, f.id);
      if (f.art === 'tabelle' && Array.isArray(f.vorschlagZeilen) && !buch.werte[key]) {
        setze(key, f.vorschlagZeilen.map((z) => ({ ...z, id: neueZeilenId(), _vorschlag: true })));
      }
    }
  }
  return buch;
}

export function buchName(buch) {
  const e = buch.werte && buch.werte['DECK.name'];
  return (e && e.wert) || (buch.kopf && buch.kopf.name) || 'Ohne Namen';
}

export function buchBauwerksnr(buch) {
  const e = buch.werte && buch.werte['DECK.bauwerksnr'];
  return (e && e.wert) || (buch.kopf && buch.kopf.bauwerksnr) || '';
}

// Hinweis „nicht gesichert“: geändert nach letzter Sicherung bzw. letztem Versand.
export function brauchtSicherung(buch) {
  const letzte = [buch.gesichert, buch.versendet].filter(Boolean).sort().pop();
  return !letzte || letzte < buch.geaendert;
}
