// Sammeldiktat je Kapitel: freier Text → Vorschläge, welcher Wert in welches Feld gehört.
// Ohne KI-Dienst: Zuordnung über Stichwörter und Wörter der Feldnamen. Ich bestätige oder korrigiere jeden Vorschlag;
// was sich nicht zuordnen lässt, wird als Notiz zum Kapitel vorgeschlagen.
import { bewerteMassEingabe } from './masse.js';
import { OHNE_DIKTAT } from './gliederung.js';

const FUELLWOERTER = new Set(['der', 'die', 'das', 'des', 'dem', 'den', 'und', 'oder', 'von', 'vom', 'für', 'mit', 'zur', 'zum', 'nach',
  'sowie', 'bei', 'als', 'aus', 'ggf', 'z.b', 'vorhandene', 'vorhandener', 'angaben', 'angabe', 'optional', 'hinweise', 'test']);

function norm(s) {
  return String(s || '').toLowerCase().replace(/[()„“"]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Stichwörter eines Feldes oder einer Tabellenspalte: ausdrückliche + Wörter des Namens (ab 4 Buchstaben).
export function stichwoerter(feld) {
  const eigene = (feld.stichwoerter || []).map(norm);
  const ausLabel = norm(feld.label).split(/[\s/,.:;-]+/).filter((w) => w.length >= 4 && !FUELLWOERTER.has(w));
  return [...new Set([...eigene, ...ausLabel])].filter(Boolean);
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
    const re = new RegExp(`^((?:\\S+\\s+){0,2}?)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|:)`, 'iu');
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
export function werteAus(text, felder) {
  const kandidaten = felder.filter((f) => !f.aus && !['tabelle', ...OHNE_DIKTAT].includes(f.art))
    .map((f) => ({ f, w: stichwoerter(f) }));
  const tabellen = felder.filter((f) => f.art === 'tabelle' && !f.aus);
  const vorschlaege = [];
  for (const satz of zerlege(text)) {
    const offen = [];
    for (const abschnitt of satz) {
      let best = null;
      for (const k of kandidaten) {
        const t = treffer(abschnitt, k.w);
        if (t && (!best || t.laenge > best.t.laenge)) best = { k, t };
      }
      const wert = best ? wertFuerFeld(best.k.f, best.t.rest) : null;
      if (wert) vorschlaege.push({ typ: 'feld', feldId: best.k.f.id, ...wert, quelle: abschnitt });
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
  return vorschlaege;
}
