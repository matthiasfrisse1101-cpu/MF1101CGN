// Sammeldiktat je Kapitel: freier Text → Vorschläge, welcher Wert in welches Feld gehört.
// Ohne KI-Dienst: Zuordnung über Stichwörter und Wörter der Feldnamen. Ich bestätige oder korrigiere jeden Vorschlag;
// was sich nicht zuordnen lässt, wird als Notiz zum Kapitel vorgeschlagen.
import { bewerteMassEingabe } from './masse.js';
import { zahlwort, leseMass } from './zahlen.js';

// Gängige Ausdrücke beim Sprechen → Wörter der Feld- bzw. Prüfpunktnamen (allgemeiner Wortschatz, keine Vorlagentexte).
export const SYNONYME = {
  länge: ['lang'], breite: ['breit'], tiefe: ['tief'], höhe: ['hoch'],
  böschung: ['neigung', 'böschungsneigung'], böschungsneigung: ['neigung', 'böschung'],
  ölrückhaltung: ['ölsperre'], einzäunung: ['zaun'], schächte: ['schacht'], pumpen: ['pumpe'], böschungen: ['böschung'],
  klappen: ['klappe'], antriebe: ['antrieb'], abdeckroste: ['abdeckrost', 'gitterrost', 'rost'], steighilfen: ['steigeisen', 'leiter'],
  bewuchs: ['aufwuchs', 'gehölz', 'gehölze', 'bäume', 'sträucher', 'bewachsen'], ölfilm: ['öl'], schlammhöhe: ['schlamm'],
  zuwegung: ['zufahrt'], notüberlauf: ['überlauf'], einstiegsöffnungen: ['einstieg', 'schachtdeckel', 'deckel'],
  ablagerungen: ['ablagerung'], auskolkungen: ['auskolkung', 'kolk', 'kolke'], ablauf: ['zulauf'], bauwerksfugen: ['fuge', 'fugen'],
  schilder: ['schild'], absturzsicherung: ['geländer'], schieber: ['absperrschieber'],
};
// Wörter, die beim Diktieren zwei Angaben verbinden oder eine Korrektur einleiten – sie gehören zu keinem Wert.
const VERBINDER = new Set(['und', 'sowie', 'außerdem', 'dann', 'weiter', 'also', 'korrektur', 'korrigiere', 'korrigiert', 'falsch', 'stopp']);
const EINHEITWORT = /^(m|meter|metern|cm|zentimeter|mm|millimeter|ha|hektar|prozent|%|grad|dn|kubikmeter|quadratmeter)$/i;

const FUELLWOERTER = new Set(['der', 'die', 'das', 'des', 'dem', 'den', 'und', 'oder', 'von', 'vom', 'für', 'mit', 'zur', 'zum', 'nach',
  'sowie', 'bei', 'als', 'aus', 'ggf', 'z.b', 'vorhandene', 'vorhandener', 'angaben', 'angabe', 'optional', 'hinweise', 'test']);

function norm(s) {
  return String(s || '').toLowerCase().replace(/[()„“"]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Stichwörter eines Feldes oder einer Tabellenspalte: ausdrückliche + Wörter des Namens (ab 4 Buchstaben).
export function stichwoerter(feld) {
  const eigene = (feld.stichwoerter || []).map(norm);
  const ausLabel = norm(feld.label).split(/[\s/,.:;-]+/).filter((w) => w.length >= 4 && !FUELLWOERTER.has(w));
  const alle = [...eigene, ...ausLabel];
  for (const w of [...alle]) for (const syn of SYNONYME[w] || []) alle.push(syn);
  return [...new Set(alle)].filter(Boolean);
}

// Passt ein gesprochenes Wort zum Stichwort? Gebeugte Formen („Schiebers“, „Längen“) zählen mit.
export function passt(wort, stichwort) {
  const w = String(wort).toLowerCase().replace(/[:,.;!?]+$/, '');
  if (w === stichwort) return true;
  if (stichwort.length < 4) return false;
  return w.startsWith(stichwort) && w.length - stichwort.length <= 2;
}

// Abschnitt weiter zerlegen, wenn mehrere Angaben ohne Komma hintereinander diktiert wurden:
// „Länge 32 Meter und Breite 14 Meter Böschung 1 zu 2“ → drei Abschnitte. Geschnitten wird nur vor einem Stichwort,
// wenn davor ein Verbindungswort steht oder die vorige Angabe schon einen Wert hat (Zahl, Einheit, ja/nein).
export function feinTeilen(abschnitt, woerter) {
  const tokens = String(abschnitt).split(/\s+/).filter(Boolean);
  const kw = woerter.map((w) => w.split(' '));
  const kwAb = (i) => kw.find((kt) => kt.every((t, j) => tokens[i + j] && passt(tokens[i + j], t)));
  const segs = [];
  let cur = [];
  let curKw = null;
  for (let i = 0; i < tokens.length; i++) {
    const k = i > 0 && cur.length ? kwAb(i) : null;
    if (k) {
      const prev = cur[cur.length - 1].toLowerCase().replace(/[:,.]$/, '');
      const hatWert = cur.some((t) => /\d/.test(t) || EINHEITWORT.test(t) || zahlwort(t.toLowerCase()) !== null)
        || /^(ja|nein|vorhanden|kein|keine|ok)$/.test(prev);
      const gleicherKw = curKw && curKw.join(' ') === k.join(' ');
      if (VERBINDER.has(prev)) { cur.pop(); if (cur.length) segs.push(cur); cur = []; }
      else if (prev === 'nein' && gleicherKw) { cur.pop(); segs.push(cur); cur = []; } // „Länge 32 nein Länge 33“
      else if (hatWert) { segs.push(cur); cur = []; }
    }
    if (!cur.length) curKw = kwAb(i) || null;
    cur.push(tokens[i]);
  }
  if (cur.length) segs.push(cur);
  return segs.map((x) => x.join(' ')).filter(Boolean);
}

// Text in Sätze und Abschnitte zerlegen. Dezimalkommas („2,40“) bleiben erhalten.
export function zerlege(text) {
  return String(text || '')
    // Punkte in Abkürzungen sind kein Satzende
    .replace(/\b(ca|bzw|ggf|evtl|nr|z\.\s?b|u\.\s?a)\./gi, (m) => m.replace(/\./g, '\u2024'))
    // Satzende: Punkt/Frage-/Ausrufezeichen/Semikolon vor Leerzeichen oder Textende („2.40“ bleibt eine Zahl)
    .split(/[.!?;](?=\s|$)|\n+/)
    .map((satz) => satz.split(/,\s+|,(?=\D)/).map((t) => t.replace(/\u2024/g, '.').trim()).filter(Boolean))
    .filter((teile) => teile.length);
}

// Findet das Stichwort am Anfang eines Abschnitts (in den ersten drei Wörtern). Liefert { laenge, rest } oder null.
// Mehrwortige Stichwörter („länge sohle“) passen auch in anderer Reihenfolge („Sohle Länge 24 m“);
// das längste passende Stichwort gewinnt.
function treffer(abschnitt, woerter) {
  const n = String(abschnitt).replace(/\s+/g, ' ').trim();
  const anfang = n.split(' ').slice(0, 3).map((w) => w.toLowerCase().replace(/[:,]$/, ''));
  let best = null;
  const nimm = (laenge, restAb) => {
    if (!best || laenge > best.laenge) best = { laenge, rest: n.slice(restAb).replace(/^\s*(:|ist|beträgt|=)\s*/i, '').trim() };
  };
  for (const w of woerter) {
    const re = new RegExp(`^((?:\\S+\\s+){0,2}?)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${w.length >= 4 ? '(?:e|en|n|s|es|er)?' : ''}(?=\\s|$|:|,)`, 'iu');
    const m = n.match(re);
    if (m) { nimm(w.length, m[0].length); continue; }
    const teile = w.split(' ');
    if (teile.length > 1 && teile.every((t) => anfang.includes(t))) {
      // Rest beginnt nach dem letzten der Stichwort-Wörter
      const letzter = Math.max(...teile.map((t) => anfang.indexOf(t)));
      const ab = n.split(' ').slice(0, letzter + 1).join(' ').length;
      nimm(w.length, ab);
    }
  }
  return best;
}

function datumAusText(t) {
  const m = String(t).match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// Wert für ein Feld aus dem Rest-Text. Liefert { wert, sicher, mass?, hinweis? } oder null.
export function wertFuerFeld(feld, rest) {
  const roh = rest.trim();
  const r = norm(roh);
  switch (feld.art) {
    case 'zahl': {
      const b = bewerteMassEingabe(roh, feld);
      if (b.zustand === 'leer') return null;
      return { wert: roh, sicher: b.zustand === 'auto' || b.zustand === 'bestaetigen', bewertung: b };
    }
    case 'janein': {
      if (/\b(nicht vorhanden|nein|kein|keine|fehlt|ohne)\b/.test(r) || r === '') {
        return r === '' ? { wert: true, sicher: false } : { wert: false, sicher: true };
      }
      if (/\b(vorhanden|ja|gibt es)\b/.test(r)) return { wert: true, sicher: true };
      return null;
    }
    case 'auswahl': {
      const o = (feld.optionen || []).find((x) => norm(x) === r || r.includes(norm(x)) || (r.length >= 3 && norm(x).includes(r)));
      return o ? { wert: o, sicher: true } : null;
    }
    case 'mehrfach': {
      const os = (feld.optionen || []).filter((x) => r.includes(norm(x)));
      return os.length ? { wert: os, sicher: true } : null;
    }
    case 'datum': {
      const d = datumAusText(r);
      return d ? { wert: d, sicher: true } : null;
    }
    case 'text':
    case 'langtext':
      return roh ? { wert: roh, sicher: true } : null;
    default:
      return null;
  }
}

// Hauptfunktion. felder: sichtbare, bearbeitbare Felder des Kapitels.
// Ergebnis: Liste von Vorschlägen
//   { typ: 'feld', feldId, wert, sicher, bewertung?, quelle }
//   { typ: 'zeile', feldId, zeile: {spalte: wert}, quelle }  (eine neue Tabellenzeile je Satz)
//   { typ: 'notiz', text }
//   { typ: 'punkt', feldId, punkt, ergebnis, schaden, quelle }  (Prüfpunkt der Erstkontrolle)
//   { typ: 'restOk', feldId, quelle }                          („sonst alles ok“)
// optionen.protokolle: [{ feld, protokoll }] – Prüfprotokolle des Kapitels (Erstkontrolle)
export function werteAus(text, felder, optionen = {}) {
  const kandidaten = felder.filter((f) => !f.aus && !['foto', 'skizze', 'tabelle', 'pruefprotokoll', 'massskizze'].includes(f.art))
    .map((f) => ({ f, w: stichwoerter(f) }));
  const tabellen = felder.filter((f) => f.art === 'tabelle' && !f.aus);
  const protokolle = optionen.protokolle || [];
  const alleWoerter = [
    ...kandidaten.flatMap((k) => k.w),
    ...tabellen.flatMap((t) => t.spalten.flatMap((sp) => (sp.stichwoerter || []).map(norm))),
    ...protokolle.flatMap((pr) => pr.protokoll.gruppen.flatMap((gr) => gr.punkte.flatMap((pt) => punktWoerter(pt.text)))),
  ];
  const vorschlaege = [];
  for (const satz of zerlege(text)) {
    const offen = [];
    const warteschlange = satz.flatMap((a) => feinTeilen(a, alleWoerter));
    while (warteschlange.length) {
      const abschnitt = warteschlange.shift();
      let best = null;
      for (const k of kandidaten) {
        const t = treffer(abschnitt, k.w);
        if (t && (!best || t.laenge > best.t.laenge)) best = { k, t };
      }
      // Maßfeld: nur Zahl und Einheit gehören zum Wert; was danach kommt, ist eine neue Angabe
      if (best && best.k.f.art === 'zahl') {
        const tok = best.t.rest.split(/\s+/).filter(Boolean);
        for (let n = tok.length; n > 0; n--) {
          const kopf = tok.slice(0, n).join(' ');
          if (leseMass(kopf).erkannt) {
            if (n < tok.length) {
              const rest = tok.slice(n).join(' ');
              warteschlange.unshift(rest);
              vorschlaege.push({ typ: 'feld', feldId: best.k.f.id, ...wertFuerFeld(best.k.f, kopf), quelle: abschnitt.slice(0, abschnitt.length - rest.length).trim() });
              best.erledigt = true;
            }
            break;
          }
        }
        if (best.erledigt) continue;
      }
      const wert = best ? wertFuerFeld(best.k.f, best.t.rest) : null;
      if (wert) { vorschlaege.push({ typ: 'feld', feldId: best.k.f.id, ...wert, quelle: abschnitt }); continue; }
      const pt = protokolle.length ? protokollTreffer(abschnitt, protokolle) : null;
      if (pt) vorschlaege.push({ ...pt, quelle: abschnitt });
      else offen.push(abschnitt);
    }
    if (!offen.length) continue;
    // Nicht zugeordnete Abschnitte eines Satzes: als neue Tabellenzeile, wenn das Kapitel genau eine Tabelle hat.
    if (tabellen.length === 1) {
      const tab = tabellen[0];
      const zeile = {};
      const sammel = tab.sammelSpalte || tab.spalten[tab.spalten.length - 1].id;
      const erste = tab.spalten.find((s) => s.art !== 'zahl') || tab.spalten[0];
      offen.forEach((abschnitt, i) => {
        let ziel = null;
        let rest = abschnitt;
        for (const s of tab.spalten) {
          const t = treffer(abschnitt, (s.stichwoerter || []).map(norm));
          if (t) { ziel = s.id; rest = (s.stichwortBehalten ? abschnitt : t.rest) || abschnitt; break; }
        }
        if (!ziel) ziel = i === 0 ? erste.id : sammel;
        zeile[ziel] = zeile[ziel] ? `${zeile[ziel]}; ${rest}` : rest;
      });
      vorschlaege.push({ typ: 'zeile', feldId: tab.id, zeile, quelle: offen.join(', ') });
    } else {
      vorschlaege.push({ typ: 'notiz', text: offen.join(', ') });
    }
  }
  // Korrektur: Wird ein Feld mehrfach genannt, gilt die letzte Angabe (außer bei Fließtext und Mehrfachauswahl).
  const letzte = new Map();
  vorschlaege.forEach((v, i) => {
    if (v.typ === 'feld') {
      const f = felder.find((x) => x.id === v.feldId);
      if (f && !['langtext', 'text', 'mehrfach'].includes(f.art)) { if (letzte.has(v.feldId)) vorschlaege[letzte.get(v.feldId)].ersetzt = true; letzte.set(v.feldId, i); }
    }
    if (v.typ === 'punkt') {
      const k = `${v.feldId}|${v.punkt}`;
      if (letzte.has(k)) vorschlaege[letzte.get(k)].ersetzt = true;
      letzte.set(k, i);
    }
  });
  return vorschlaege;
}

// ---------- Erstkontrolle per Diktat ----------
const PUNKT_FUELL = new Set(['funktion', 'sonstige', 'bewegliche', 'teile', 'allgem', 'zustand', 'anlage', 'messung', 'nennenswerte', 'sichtbare', 'schäden', 'ausr', 'und']);
export function punktWoerter(text) {
  const w = norm(text).replace(/[*]/g, '').split(/[\s,/().-]+/).filter((x) => x.length >= 3 && !PUNKT_FUELL.has(x));
  for (const x of [...w]) for (const syn of SYNONYME[x] || []) w.push(syn);
  return [...new Set(w)];
}
const OK_WORTE = /\b(ok|okay|in ordnung|i\.?\s?o\.?|ohne befund|keine mängel|kein mangel|einwandfrei)\b/;
const REST_OK = /\b(sonst|rest|restliche[nrs]?|alles andere|alle anderen|übrigen?|alle weiteren)\b.*\b(ok|okay|in ordnung|i\.?\s?o\.?)\b/;

export function protokollTreffer(abschnitt, protokolle) {
  const n = norm(abschnitt);
  if (REST_OK.test(n)) return { typ: 'restOk', feldId: protokolle[0].feld.id };
  const tokens = n.split(/[\s,:;]+/).filter(Boolean);
  let best = null;
  for (const pr of protokolle) {
    for (const gr of pr.protokoll.gruppen) {
      for (const pt of gr.punkte) {
        // Das zuerst genannte Stichwort bestimmt den Prüfpunkt („Ölfilm an der Tauchwand“ → Ölfilm), bei Gleichstand das längere.
        const ws = punktWoerter(pt.text);
        let pos = Infinity, laenge = 0;
        for (const w of ws) {
          const i = tokens.findIndex((t) => passt(t, w));
          if (i >= 0) { laenge += w.length; if (i < pos) pos = i; }
        }
        if (laenge && (!best || pos < best.pos || (pos === best.pos && laenge > best.laenge))) best = { pos, laenge, pr, gr, pt };
      }
    }
  }
  if (!best) return null;
  const ok = OK_WORTE.test(n) && !/\b(schaden|mangel|defekt|beschädigt|kaputt)\b/.test(n);
  const schaden = ok ? '' : String(abschnitt).replace(/^\s*(schaden|mangel|mängel)\s*(an|am|bei|beim|der|die|das|dem|den)?\s*:?\s*/i, '').trim();
  return { typ: 'punkt', feldId: best.pr.feld.id, punkt: `${best.gr.id}.${best.pt.nr}`, punktText: `${best.gr.id} ${best.pt.nr} ${best.pt.text}`, ergebnis: ok ? 'ok' : 'schaden', schaden };
}
