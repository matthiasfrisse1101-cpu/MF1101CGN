// Logik rund um die Gliederung (Vorlage) und den Bearbeitungsstand eines Beckenbuchs.
// Reine Funktionen ohne Bildschirm und ohne Speicher – deshalb automatisch testbar.
import { massZustand } from './masse.js';

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
  for (const t of g.teilbauwerke || []) {
    if (t.hilfe !== undefined && typeof t.hilfe !== 'string') fehler.push(`Teilbauwerk ${t.id}: "hilfe" muss ein Text sein.`);
  }
  const stIds = new Set((g.stammdaten || []).map((s) => s.id));
  const kapIds = new Set();
  const alleKeys = new Set();
  for (const k of g.kapitel || []) {
    if (!k.id) { fehler.push('Ein Kapitel hat keine "id".'); continue; }
    if (kapIds.has(k.id)) fehler.push(`Kapitel-ID doppelt: ${k.id}`);
    kapIds.add(k.id);
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
      if (f.art === 'massskizze') {
        const erlaubt = ['laengeOben', 'breiteOben', 'laengeSohle', 'breiteSohle', 'boeschung', 'tiefe', 'dauerstau', 'schlammraum'];
        if (!f.masse || typeof f.masse !== 'object') fehler.push(`${wo}: Maßskizze ohne "masse" (Zuordnung der Hauptmaße).`);
        for (const [mk, ref] of Object.entries(f.masse || {})) {
          if (!erlaubt.includes(mk)) fehler.push(`${wo}: unbekanntes Maß "${mk}" (erlaubt: ${erlaubt.join(', ')}).`);
          const z = index.get(ref);
          if (!z) fehler.push(`${wo}: Maß "${mk}" zeigt auf kein Feld (${ref}).`);
          else if (z.art !== 'zahl') fehler.push(`${wo}: Maß "${mk}" muss auf ein Zahlfeld zeigen (${ref}).`);
        }
        if (f.funktionsskizze && (!index.get(f.funktionsskizze) || index.get(f.funktionsskizze).art !== 'skizze')) fehler.push(`${wo}: "funktionsskizze" muss auf ein Skizzenfeld zeigen.`);
      }
      if (f.format && !['verhaeltnis', 'dn'].includes(f.format)) fehler.push(`${wo}: unbekanntes "format" "${f.format}".`);
      // Bedingungen in Sichtbarkeit und Vorschlagsregeln
      const ctx = { g, tbIds, index, eigen: feldKey(k.id, f.id) };
      pruefeBedingung(f.sichtbarWenn, ctx, `${wo} (sichtbarWenn)`, fehler);
      for (const [i, r] of (f.vorschlagRegeln || []).entries()) {
        pruefeBedingung(r.wenn, ctx, `${wo} (vorschlagRegeln ${i + 1})`, fehler);
        if (!('wert' in r)) fehler.push(`${wo}: vorschlagRegeln ${i + 1} ohne "wert".`);
        else if (!wertPasstZuFeld(f, r.wert)) fehler.push(`${wo}: vorschlagRegeln ${i + 1}: Wert ${JSON.stringify(r.wert)} passt nicht zum Feld.`);
      }
      for (const [i, b] of (f.vorschlagBausteine || []).entries()) {
        if (b.teilbauwerk && !tbIds.has(b.teilbauwerk)) fehler.push(`${wo}: vorschlagBausteine ${i + 1}: Teilbauwerk "${b.teilbauwerk}" ist nicht definiert.`);
        if (!b.text) fehler.push(`${wo}: vorschlagBausteine ${i + 1} ohne "text".`);
        pruefeBedingung(b.wenn, ctx, `${wo} (vorschlagBausteine ${i + 1})`, fehler);
        for (const z of b.zusaetze || []) pruefeBedingung(z.wenn, ctx, `${wo} (vorschlagBausteine ${i + 1}, Zusatz „${z.text}“)`, fehler);
      }
    }
    pruefeBedingung(k.sichtbarWenn, { g, tbIds, index, eigen: null }, `Kapitel ${k.id} (sichtbarWenn)`, fehler);
    const p = k.protokoll;
    for (const [i, r] of ((p && p.anlagenartRegeln) || []).entries()) {
      const wo = `Kapitel ${k.id}: anlagenartRegeln ${i + 1}`;
      pruefeBedingung(r.wenn, { g, tbIds, index, eigen: null }, wo, fehler);
      if (r.vorschlag && !(p.anlagenarten || []).includes(r.vorschlag)) fehler.push(`${wo}: „${r.vorschlag}“ steht nicht in der Liste „anlagenarten“.`);
      if (!r.vorschlag && !r.sonstiges && !r.hinweis) fehler.push(`${wo}: braucht "vorschlag", "sonstiges" oder "hinweis".`);
    }
  }
  // Kreisbezüge in der Sichtbarkeit (Feld A hängt von B ab, B von A)
  const bezuege = new Map();
  for (const [key, f] of index) bezuege.set(key, bezugsfelderVon(f.sichtbarWenn));
  const kreis = (start) => {
    const besucht = new Set();
    const stapel = [...(bezuege.get(start) || [])];
    while (stapel.length) {
      const x = stapel.pop();
      if (x === start) return true;
      if (besucht.has(x)) continue;
      besucht.add(x);
      stapel.push(...(bezuege.get(x) || []));
    }
    return false;
  };
  for (const key of index.keys()) if (kreis(key)) fehler.push(`Feld ${key}: Kreisbezug in "sichtbarWenn" (das Feld hängt über andere Felder von sich selbst ab).`);
  for (const m of g.mindestumfang || []) {
    for (const key of m.felder || []) {
      if (!alleKeys.has(key)) fehler.push(`Mindestumfang "${m.label}": Feld ${key} gibt es nicht.`);
    }
  }
  return fehler;
}

// Passt ein Wert (aus einer Regel oder einer Bedingung) zur Art des Feldes?
function wertPasstZuFeld(f, w) {
  if (f.art === 'janein') return w === true || w === false;
  if (f.art === 'auswahl') return typeof w === 'string' && (f.optionen || []).includes(w);
  if (f.art === 'mehrfach') return (Array.isArray(w) ? w : [w]).every((x) => (f.optionen || []).includes(x));
  return typeof w === 'string' || typeof w === 'number';
}

const BEDINGUNG_SCHLUESSEL = new Set(['teilbauwerk', 'felder', 'alle', 'eines', 'nicht']);

// Prüft eine Bedingung (Schreibweise wie in "sichtbarWenn") und meldet Fehler im Klartext.
function pruefeBedingung(bed, ctx, wo, fehler, tiefe = 0) {
  if (bed === undefined || bed === null) return;
  if (typeof bed !== 'object' || Array.isArray(bed)) { fehler.push(`${wo}: Bedingung muss ein Objekt sein.`); return; }
  if (tiefe > 10) { fehler.push(`${wo}: Bedingung zu tief verschachtelt.`); return; }
  for (const k of Object.keys(bed)) if (!BEDINGUNG_SCHLUESSEL.has(k)) fehler.push(`${wo}: unbekannte Angabe "${k}" (erlaubt: teilbauwerk, felder, alle, eines, nicht).`);
  for (const id of bed.teilbauwerk || []) {
    if (!ctx.tbIds.has(id)) fehler.push(`${wo}: Teilbauwerk "${id}" ist nicht definiert.`);
  }
  if (bed.felder !== undefined && !Array.isArray(bed.felder)) fehler.push(`${wo}: "felder" muss eine Liste sein.`);
  for (const c of Array.isArray(bed.felder) ? bed.felder : []) {
    const ziel = ctx.index.get(c.feld);
    if (!c.feld) { fehler.push(`${wo}: Feldbedingung ohne "feld".`); continue; }
    if (!ziel) { fehler.push(`${wo}: Feld "${c.feld}" gibt es nicht.`); continue; }
    if (c.feld === ctx.eigen) fehler.push(`${wo}: Das Feld darf nicht von sich selbst abhängen.`);
    if (!Array.isArray(c.ist) || c.ist.length === 0) { fehler.push(`${wo}: Bedingung für "${c.feld}" braucht "ist" mit mindestens einem Wert.`); continue; }
    if (['tabelle', 'foto', 'skizze', 'pruefprotokoll'].includes(ziel.art)) fehler.push(`${wo}: Auf Feld "${c.feld}" (${ziel.art}) kann keine Bedingung verweisen.`);
    for (const w of c.ist) {
      if (ziel.art === 'janein' && w !== true && w !== false) fehler.push(`${wo}: "${c.feld}" ist ein Ja/Nein-Feld – erlaubt sind nur true und false, nicht ${JSON.stringify(w)}.`);
      if (ziel.art !== 'janein' && (w === true || w === false)) fehler.push(`${wo}: true/false passt nur zu Ja/Nein-Feldern, "${c.feld}" ist ${ziel.art}.`);
      if ((ziel.art === 'auswahl' || ziel.art === 'mehrfach') && !(ziel.optionen || []).includes(w)) fehler.push(`${wo}: „${w}“ ist keine Option von "${c.feld}".`);
    }
  }
  for (const b of bed.alle || []) pruefeBedingung(b, ctx, wo, fehler, tiefe + 1);
  for (const b of bed.eines || []) pruefeBedingung(b, ctx, wo, fehler, tiefe + 1);
  if (bed.nicht) pruefeBedingung(bed.nicht, ctx, wo, fehler, tiefe + 1);
}

// Alle Felder, auf die eine Bedingung verweist.
export function bezugsfelderVon(bed, set = new Set()) {
  if (!bed || typeof bed !== 'object') return set;
  for (const c of Array.isArray(bed.felder) ? bed.felder : []) if (c && c.feld) set.add(c.feld);
  for (const b of bed.alle || []) bezugsfelderVon(b, set);
  for (const b of bed.eines || []) bezugsfelderVon(b, set);
  if (bed.nicht) bezugsfelderVon(bed.nicht, set);
  return set;
}

// Felder, deren Änderung Sichtbarkeit oder Vorschläge anderer Felder beeinflusst.
export function abhaengigkeitsfelder(g) {
  const set = new Set();
  for (const k of g.kapitel) {
    bezugsfelderVon(k.sichtbarWenn, set);
    for (const f of k.felder || []) {
      bezugsfelderVon(f.sichtbarWenn, set);
      for (const r of f.vorschlagRegeln || []) bezugsfelderVon(r.wenn, set);
      for (const b of f.vorschlagBausteine || []) { bezugsfelderVon(b.wenn, set); for (const z of b.zusaetze || []) bezugsfelderVon(z.wenn, set); }
    }
    for (const r of (k.protokoll && k.protokoll.anlagenartRegeln) || []) bezugsfelderVon(r.wenn, set);
  }
  return set;
}

// ---------- Bedingungen und Sichtbarkeit ----------
// Bedingung (z. B. "sichtbarWenn"):
//   teilbauwerk: [...]                 mindestens eines angekreuzt
//   felder: [{ feld, ist: [...] }]     jedes Feld hat einen der Werte (Mehrfachauswahl: einer davon gewählt)
//   alle / eines: [Bedingung, ...]     UND / ODER
//   nicht: Bedingung
// Alle Angaben zusammen gelten als UND. Ist das Bezugsfeld selbst ausgeblendet, gilt seine Bedingung als nicht erfüllt.
const indexCache = new WeakMap();
function indexVon(g) {
  if (!indexCache.has(g)) indexCache.set(g, feldIndex(g));
  return indexCache.get(g);
}

export function bedingungErfuellt(bed, buch, g, tiefe = 0) {
  if (!bed) return true;
  if (tiefe > 20) return false; // Schutz gegen Kreisbezüge
  if (Array.isArray(bed.teilbauwerk) && bed.teilbauwerk.length) {
    const gewaehlt = new Set(buch.teilbauwerke || []);
    if (!bed.teilbauwerk.some((id) => gewaehlt.has(id))) return false;
  }
  for (const c of Array.isArray(bed.felder) ? bed.felder : []) {
    if (!feldBedingungErfuellt(c, buch, g, tiefe)) return false;
  }
  if (Array.isArray(bed.alle) && !bed.alle.every((b) => bedingungErfuellt(b, buch, g, tiefe + 1))) return false;
  if (Array.isArray(bed.eines) && !bed.eines.some((b) => bedingungErfuellt(b, buch, g, tiefe + 1))) return false;
  if (bed.nicht && bedingungErfuellt(bed.nicht, buch, g, tiefe + 1)) return false;
  return true;
}

function feldBedingungErfuellt(c, buch, g, tiefe) {
  if (g) {
    const t = indexVon(g).get(c.feld);
    if (!t) return false;
    const zu = new Set(buch.zugeschaltet || []);
    if (t.kapitel.zuschaltbar && !zu.has(t.kapitel.id)) return false;
    if (!istSichtbar(t.kapitel, buch, g, tiefe + 1) || !istSichtbar(t.feld, buch, g, tiefe + 1)) return false;
  }
  const w = ((buch.werte || {})[c.feld] || {}).wert;
  if (w === undefined || w === null || w === '') return false;
  const werte = Array.isArray(w) ? w : [w];
  return (c.ist || []).some((x) => werte.includes(x));
}

// g ist nötig, damit Bedingungen auf andere Felder deren Sichtbarkeit berücksichtigen.
export function istSichtbar(element, buch, g, tiefe = 0) {
  return bedingungErfuellt(element.sichtbarWenn, buch, g, tiefe);
}

export function sichtbareKapitel(g, buch) {
  const zu = new Set(buch.zugeschaltet || []);
  return g.kapitel.filter((k) => (!k.zuschaltbar || zu.has(k.id)) && istSichtbar(k, buch, g));
}

export function sichtbareFelder(kapitel, buch, g) {
  return (kapitel.felder || []).filter((f) => istSichtbar(f, buch, g));
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
  const felder = sichtbareFelder(kapitel, buch, g).filter((f) => !f.aus);
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
    for (const f of sichtbareFelder(k, buch, g)) {
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
  // Freie Teilbauwerke (Textzeilen des Deckblatts) auf Wunsch hinten anhängen
  if (feld.vorschlagFreie) for (const t of buch.freieTeilbauwerke || []) if (t && t.trim()) namen.push(t.trim());
  return namen.join(feld.vorschlagTrenner || ', ');
}

// Text aus Bausteinen: je zutreffendem Baustein der Text, zutreffende Zusätze in Klammern,
// sortiert nach der Reihenfolge der Teilbauwerke auf dem Deckblatt.
export function vorschlagAusBausteinen(g, buch, feld) {
  const reihenfolge = (g.teilbauwerke || []).map((t) => t.id);
  const teile = [];
  (feld.vorschlagBausteine || []).forEach((b, i) => {
    const wenn = b.wenn || (b.teilbauwerk ? { teilbauwerk: [b.teilbauwerk] } : null);
    if (!bedingungErfuellt(wenn, buch, g)) return;
    const zus = (b.zusaetze || []).filter((z) => bedingungErfuellt(z.wenn, buch, g)).map((z) => z.text);
    const pos = b.teilbauwerk ? reihenfolge.indexOf(b.teilbauwerk) : -1;
    teile.push({ pos: pos < 0 ? 999 : pos, i, text: zus.length ? `${b.text} (${zus.join(', ')})` : b.text });
  });
  return teile.sort((a, b) => a.pos - b.pos || a.i - b.i).map((t) => t.text).join(', ');
}

// Vorschlag für ein Feld oder undefined (kein Vorschlag). Regeln: erste zutreffende gewinnt.
export function vorschlagFuerFeld(g, buch, feld) {
  if (Array.isArray(feld.vorschlagRegeln)) {
    const r = feld.vorschlagRegeln.find((x) => bedingungErfuellt(x.wenn, buch, g));
    if (r) return r.wert;
  }
  if (Array.isArray(feld.vorschlagBausteine)) {
    const t = vorschlagAusBausteinen(g, buch, feld);
    if (t) return t;
  }
  if (feld.vorschlagAus === 'teilbauwerke') {
    const t = vorschlagAusTeilbauwerken(g, buch, feld);
    if (t) return t;
  }
  return undefined;
}

// Gleicht ein Wert dem Vorschlag? (Mehrfachauswahl ohne Rücksicht auf die Reihenfolge)
export function gleicherWert(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x = [...(a || [])].sort(), y = [...(b || [])].sort();
    return JSON.stringify(x) === JSON.stringify(y);
  }
  return a === b;
}

// Art der Anlage im Protokoll: Vorschläge aus "anlagenartRegeln" (alle zutreffenden Regeln).
// Ergebnis: { arten: [...], sonstiges: [...], hinweise: [...] }
export function anlagenartVorschlag(protokoll, g, buch) {
  const r = { arten: [], sonstiges: [], hinweise: [] };
  for (const regel of (protokoll && protokoll.anlagenartRegeln) || []) {
    if (!bedingungErfuellt(regel.wenn, buch, g)) continue;
    if (regel.vorschlag && !r.arten.includes(regel.vorschlag)) r.arten.push(regel.vorschlag);
    if (regel.sonstiges && !r.sonstiges.includes(regel.sonstiges)) r.sonstiges.push(regel.sonstiges);
    if (regel.hinweis && !r.hinweise.includes(regel.hinweis)) r.hinweise.push(regel.hinweis);
  }
  // Reihenfolge wie in der Liste der Vorlage
  r.arten.sort((a, b) => protokoll.anlagenarten.indexOf(a) - protokoll.anlagenarten.indexOf(b));
  return r;
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
  if (deck) {
    if (angaben.name && deck.felder.some((f) => f.id === 'name')) setze('DECK.name', angaben.name);
    if (angaben.bauwerksnr && deck.felder.some((f) => f.id === 'bauwerksnr')) setze('DECK.bauwerksnr', angaben.bauwerksnr);
  }
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
  return (e && e.wert) || 'Ohne Namen';
}

export function buchBauwerksnr(buch) {
  const e = buch.werte && buch.werte['DECK.bauwerksnr'];
  return (e && e.wert) || '';
}

// Hinweis „nicht gesichert“: geändert nach letzter Sicherung bzw. letztem Versand.
export function brauchtSicherung(buch) {
  const letzte = [buch.gesichert, buch.versendet].filter(Boolean).sort().pop();
  return !letzte || letzte < buch.geaendert;
}
