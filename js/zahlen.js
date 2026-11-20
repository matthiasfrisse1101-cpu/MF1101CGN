// Zahlen lesen. Etappe 2: nur einfache Dezimalzahlen. Etappe 4 erweitert das um Diktat
// (Zahlwörter, „1 zu 2“, DN-Angaben, Einheiten).

// Liefert eine Zahl oder null. Keine stille Korrektur: Ist die Eingabe mehrdeutig, kommt null zurück.
export function leseDezimal(text) {
  if (text === undefined || text === null) return null;
  // Leerzeichen innerhalb der Zahl werden nicht entfernt („2 40“ könnte 2,40 oder 240 heißen).
  const t = String(text).trim();
  if (t === '') return null;
  // Komma oder Punkt als Dezimaltrenner, aber nicht beides und höchstens einmal.
  if (!/^[-+]?\d+([.,]\d+)?$/.test(t)) return null;
  return Number(t.replace(',', '.'));
}

export function zahlDE(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return String(n).replace('.', ',');
}
