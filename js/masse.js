// Maße in Zahlfeldern: Wortlaut bleibt gespeichert, der erkannte Wert wird zur Bestätigung angezeigt.
// Reine Logik, ohne Bildschirm – automatisch testbar.
//
// Eintrag eines Zahlfeldes im Beckenbuch:
// { wert: '<Wortlaut>', mass: { art, zahl, einheit, a, b, umgerechnetAus } | null, herkunft: 'gemessen'|'geschaetzt'|'abgelesen'|null }
// `mass` ist nur gesetzt, wenn der Wert eindeutig war oder bestätigt wurde.
import { leseMass, einheitPasst, umrechnen, normEinheit, massText, zahlDE } from './zahlen.js';

export const HERKUNFT = { gemessen: 'gemessen', geschaetzt: 'geschätzt', abgelesen: 'vom Schild/Plan abgelesen' };

// Welche Art von Wert das Feld erwartet.
export function erwarteteArt(feld) {
  if (feld.format === 'verhaeltnis' || normEinheit(feld.einheit) === '1:n') return 'verhaeltnis';
  if (feld.format === 'dn' || feld.einheit === 'DN') return 'dn';
  return 'zahl';
}

// Bewertet eine Eingabe für ein Feld.
// zustand: 'leer' | 'auto' (eindeutig, ohne Rückfrage übernommen) | 'bestaetigen' (erkannt, bitte bestätigen)
//        | 'umrechnen' (Einheit passt, aber andere Größe – Umrechnung nur auf Tipp) | 'fremd' (Einheit/Art passt nicht)
//        | 'unerkannt' (bleibt Text, zur Prüfung)
export function bewerteMassEingabe(text, feld) {
  const t = String(text ?? '').trim();
  if (!t) return { zustand: 'leer', mass: null };
  const m = leseMass(t);
  if (!m.erkannt) return { zustand: 'unerkannt', mass: null, hinweis: m.hinweis };
  const soll = erwarteteArt(feld);
  if (m.art !== soll) {
    return { zustand: 'fremd', mass: m, hinweis: `${massText(m)} passt nicht zu diesem Feld (erwartet: ${soll === 'verhaeltnis' ? 'Verhältnis 1 : n' : soll === 'dn' ? 'Nennweite DN' : 'Zahl'}).` };
  }
  if (m.art === 'zahl') {
    const passt = einheitPasst(m.einheit, feld.einheit);
    if (passt === 'fremd') return { zustand: 'fremd', mass: m, hinweis: `Einheit ${m.einheit} passt nicht zum Feld${feld.einheit ? ` (${feld.einheit})` : ''}.` };
    if (passt === 'umrechenbar') {
      const z = umrechnen(m.zahl, m.einheit, feld.einheit);
      return {
        zustand: 'umrechnen', mass: m,
        umgerechnet: { art: 'zahl', zahl: z, einheit: normEinheit(feld.einheit), umgerechnetAus: massText(m) },
        hinweis: `Diktiert in ${m.einheit}, das Feld ist in ${feld.einheit}.`,
      };
    }
  }
  // Eindeutig nur bei Ziffern (+ Einheit) ohne Deutung; Zahlwörter oder „2 Meter 40“ werden zur Bestätigung angezeigt.
  const nurZiffern = /^[-+]?\d+([.,]\d+)?\s*[a-zA-Zäöü²³/%°]*\.?$/.test(t) || /^\d+\s*(zu|:)\s*\d+([.,]\d+)?$/i.test(t) || /^DN\s?\d+$/i.test(t);
  const mass = { art: m.art, zahl: m.zahl, einheit: m.art === 'zahl' ? (m.einheit || normEinheit(feld.einheit)) : m.einheit, ...(m.art === 'verhaeltnis' ? { a: m.a, b: m.b } : {}) };
  return { zustand: nurZiffern && !m.hinweis ? 'auto' : 'bestaetigen', mass, hinweis: m.hinweis };
}

// Zustand eines gespeicherten Eintrags: 'leer' | 'ok' | 'pruefen'
export function massZustand(feld, eintrag) {
  const t = String((eintrag && eintrag.wert) ?? '').trim();
  if (!t) return 'leer';
  return eintrag.mass ? 'ok' : 'pruefen';
}

// Anzeige des übernommenen Wertes, z. B. „2,4 m (gemessen)“.
export function massAnzeige(eintrag) {
  if (!eintrag || !eintrag.mass) return '';
  const m = eintrag.mass;
  let s = m.art === 'verhaeltnis' ? `${zahlDE(m.a)} : ${zahlDE(m.b)}` : m.art === 'dn' ? `DN ${m.zahl}` : `${zahlDE(m.zahl)}${m.einheit ? ` ${m.einheit}` : ''}`;
  if (m.umgerechnetAus) s += ` (umgerechnet aus ${m.umgerechnetAus})`;
  if (eintrag.herkunft) s += ` – ${HERKUNFT[eintrag.herkunft]}`;
  return s;
}
