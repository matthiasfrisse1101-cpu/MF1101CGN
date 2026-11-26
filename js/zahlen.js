// Zahlen und Maße lesen – getippt oder mit der Tastatur diktiert.
// Grundsatz: keine stille Korrektur, keine stille Umrechnung. Was nicht eindeutig ist,
// wird als „nicht erkannt“ gemeldet und bleibt als Text stehen.

// ---------- einfache Dezimalzahl ----------
// Liefert eine Zahl oder null. Leerzeichen innerhalb der Zahl werden nicht entfernt
// („2 40“ könnte 2,40 oder 240 heißen).
export function leseDezimal(text) {
  if (text === undefined || text === null) return null;
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

// ---------- Zahlwörter ----------
const EINER = {
  null: 0, ein: 1, eins: 1, eine: 1, einen: 1, zwei: 2, zwo: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9,
};
const ZEHN_BIS_NEUNZEHN = {
  zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19,
};
const ZEHNER = { zwanzig: 20, dreißig: 30, dreissig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };

// „zweiunddreißig“, „hundertfünfzig“, „zweitausenddreihundert“, „eineinhalb“ → Zahl, sonst null.
export function zahlwort(wort) {
  let w = String(wort || '').toLowerCase().trim();
  if (!w) return null;
  // „eineinhalb“, „zweieinhalb“ …
  const halb = w.match(/^(.+?)einhalb$/);
  if (halb) {
    const g = zahlwort(halb[1] === 'ein' ? 'eins' : halb[1]);
    return g === null ? null : g + 0.5;
  }
  if (w === 'halb' || w === 'einhalb') return 0.5;
  const unter100 = (s) => {
    if (s === '') return 0;
    if (s in EINER) return EINER[s];
    if (s in ZEHN_BIS_NEUNZEHN) return ZEHN_BIS_NEUNZEHN[s];
    if (s in ZEHNER) return ZEHNER[s];
    const m = s.match(/^(.+)und(.+)$/);
    if (m && m[1] in EINER && m[2] in ZEHNER) return EINER[m[1]] + ZEHNER[m[2]];
    return null;
  };
  const unter1000 = (s) => {
    const i = s.indexOf('hundert');
    if (i < 0) return unter100(s);
    const vor = s.slice(0, i), nach = s.slice(i + 7);
    const h = vor === '' ? 1 : unter100(vor);
    const r = unter100(nach);
    return h === null || r === null || h > 9 ? null : h * 100 + r;
  };
  const i = w.indexOf('tausend');
  if (i < 0) return unter1000(w);
  const t = w.slice(0, i) === '' ? 1 : unter1000(w.slice(0, i));
  const r = unter1000(w.slice(i + 7));
  return t === null || r === null ? null : t * 1000 + r;
}

// Ein Zahl-Teil: „2,40“, „2.4“, „zwei komma vier null“, „2 komma 40“, „zweiunddreißig“.
function lesezahlteil(s) {
  const t = s.trim();
  if (t === '') return null;
  const d = leseDezimal(t);
  if (d !== null) return d;
  const km = t.match(/^(\S+)\s+komma\s+(.+)$/);
  if (km) {
    const ganz = leseDezimal(km[1]) ?? zahlwort(km[1]);
    if (ganz === null || !Number.isInteger(ganz)) return null;
    // Nachkommastellen: Ziffern („40“) oder einzelne Zahlwörter („vier null“)
    let nach = '';
    if (/^\d+$/.test(km[2])) nach = km[2];
    else {
      for (const z of km[2].split(/\s+/)) {
        const n = zahlwort(z);
        if (n === null || n > 9 || !Number.isInteger(n)) return null;
        nach += String(n);
      }
    }
    return Number(`${ganz}.${nach}`);
  }
  if (/^[a-zäöüß]+$/.test(t)) return zahlwort(t);
  return null;
}

// ---------- Einheiten ----------
const EINHEITEN = [
  ['m', ['m', 'meter', 'metern', 'mtr']],
  ['cm', ['cm', 'zentimeter', 'zentimetern']],
  ['mm', ['mm', 'millimeter', 'millimetern']],
  ['km', ['km', 'kilometer', 'kilometern']],
  ['ha', ['ha', 'hektar']],
  ['m²', ['m²', 'm2', 'qm', 'quadratmeter', 'quadratmetern']],
  ['m³', ['m³', 'm3', 'cbm', 'kubikmeter', 'kubikmetern']],
  ['l/s', ['l/s', 'liter pro sekunde', 'liter je sekunde', 'l pro s', 'liter/sekunde']],
  ['%', ['%', 'prozent']],
  ['°', ['°', 'grad']],
];
const EINHEIT_INDEX = new Map();
for (const [norm, namen] of EINHEITEN) for (const n of namen) EINHEIT_INDEX.set(n, norm);

export function normEinheit(e) {
  if (!e) return '';
  const k = String(e).toLowerCase().trim();
  return EINHEIT_INDEX.get(k) || String(e).trim();
}

const FAKTOR = {
  laenge: { mm: 0.001, cm: 0.01, m: 1, km: 1000 },
  flaeche: { 'm²': 1, ha: 10000 },
};

// Umrechnung zwischen verträglichen Einheiten oder null.
export function umrechnen(zahl, von, nach) {
  von = normEinheit(von); nach = normEinheit(nach);
  if (von === nach) return zahl;
  for (const f of Object.values(FAKTOR)) {
    if (von in f && nach in f) return Math.round((zahl * f[von] / f[nach]) * 1e6) / 1e6;
  }
  return null;
}

// ---------- Maß lesen ----------
// Ergebnis: { erkannt, art: 'zahl'|'dn'|'verhaeltnis', zahl, einheit, a, b, hinweis }
// zahl bei Verhältnis 1:n ist n; einheit '' wenn keine diktiert wurde.
export function leseMass(text) {
  const roh = String(text ?? '').trim();
  const nicht = (hinweis) => ({ erkannt: false, art: null, zahl: null, einheit: '', hinweis });
  if (!roh) return nicht('leer');
  let t = roh.toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^(ca\.?|circa|etwa|ungefähr)\s+/, '')
    .replace(/[.!]$/, '')
    .trim();

  // Nennweite: „DN 150“, „D N 150“, „de en 150“, „DN150“
  const dn = t.match(/^(?:d\s?n|de\s?en)\s*(\S+)$/);
  if (dn) {
    const z = lesezahlteil(dn[1]);
    if (z === null || !Number.isInteger(z)) return nicht('Nennweite nicht erkannt');
    return { erkannt: true, art: 'dn', zahl: z, einheit: 'DN', hinweis: '' };
  }

  // Verhältnis: „1 zu 2“, „1:2“, „eins zu zwei“, „1 zu 1,5“
  const vh = t.match(/^(\S+(?:\s+komma\s+\S+)?)\s*(?:zu|:)\s*(\S+(?:\s+komma\s+\S+)?)$/);
  if (vh) {
    const a = lesezahlteil(vh[1]), b = lesezahlteil(vh[2]);
    if (a === null || b === null || a === 0) return nicht('Verhältnis nicht erkannt');
    return { erkannt: true, art: 'verhaeltnis', a, b, zahl: Math.round((b / a) * 1e6) / 1e6, einheit: '1:n', hinweis: '' };
  }

  // „2 Meter 40“ → 2,40 m (gesprochene Zentimeter nach ganzen Metern)
  const mz = t.match(/^(\S+) (?:meter|metern|m) (\S+)$/);
  if (mz) {
    const m = lesezahlteil(mz[1]), cm = lesezahlteil(mz[2]);
    if (m !== null && Number.isInteger(m) && cm !== null && Number.isInteger(cm) && cm < 100) {
      return { erkannt: true, art: 'zahl', zahl: m + cm / 100, einheit: 'm', hinweis: `als ${zahlDE(m + cm / 100)} m gelesen` };
    }
  }

  // Zahl mit optionaler Einheit (längste passende Einheit am Ende)
  let einheit = '';
  let zahlTeil = t;
  const namen = [...EINHEIT_INDEX.keys()].sort((x, y) => y.length - x.length);
  for (const n of namen) {
    if (t === n) break;
    if (t.endsWith(n)) {
      const vor = t.slice(0, t.length - n.length);
      // Einheit muss abgetrennt sein oder direkt an einer Ziffer hängen („2,40m“)
      if (vor.endsWith(' ') || /\d$/.test(vor) || /^[%°]/.test(n)) {
        einheit = EINHEIT_INDEX.get(n);
        zahlTeil = vor.trim();
        break;
      }
    }
  }
  const z = lesezahlteil(zahlTeil);
  if (z === null) return nicht(/\d\s+\d/.test(zahlTeil) ? 'mehrdeutig (Leerzeichen in der Zahl)' : 'keine Zahl erkannt');
  return { erkannt: true, art: 'zahl', zahl: z, einheit, hinweis: '' };
}

// Vergleich der erkannten Einheit mit der Einheit des Feldes.
// 'ohne' (nichts diktiert), 'gleich', 'umrechenbar', 'fremd'
export function einheitPasst(erkannt, feldEinheit) {
  const e = normEinheit(erkannt), f = normEinheit(feldEinheit);
  if (!e) return 'ohne';
  if (!f) return 'fremd';
  if (e === f) return 'gleich';
  return umrechnen(1, e, f) === null ? 'fremd' : 'umrechenbar';
}

// Text für die Anzeige eines erkannten Maßes.
export function massText(m) {
  if (!m || !m.erkannt) return '';
  if (m.art === 'dn') return `DN ${m.zahl}`;
  if (m.art === 'verhaeltnis') return `${zahlDE(m.a)} : ${zahlDE(m.b)}`;
  return `${zahlDE(m.zahl)}${m.einheit ? ` ${m.einheit}` : ''}`;
}

// ---------- Datum lesen (getippt oder diktiert) ----------
// „12.05.2019“, „12.5.19“, „12. Mai 2019“, „12 Mai 2019“, „2019-05-12“, „heute“, „gestern“, „vorgestern“ → „2019-05-12“.
// Nicht Eindeutiges (z. B. nur „Mai 2019“) → null.
const MONATE = { januar: 1, jänner: 1, jan: 1, februar: 2, feb: 2, märz: 3, maerz: 3, mär: 3, april: 4, apr: 4, mai: 5, juni: 6, jun: 6,
  juli: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12 };

function isoDatum(j, m, t) {
  const d = new Date(Date.UTC(j, m - 1, t));
  if (d.getUTCFullYear() !== j || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== t) return null; // z. B. 31.02.
  return `${j}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
}

export function leseDatum(text, heute = new Date()) {
  const t = String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,]$/, '');
  if (!t) return null;
  const tage = { heute: 0, gestern: 1, vorgestern: 2 };
  if (t in tage) {
    const d = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() - tage[t]);
    return isoDatum(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  const jahr = (y) => {
    const n = Number(y);
    if (y.length === 4) return n;
    if (y.length === 2) { const jj = heute.getFullYear() % 100; return n <= jj ? 2000 + n : 1900 + n; }
    return null;
  };
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return isoDatum(Number(m[1]), Number(m[2]), Number(m[3]));
  m = t.match(/^(\d{1,2})\s?[./]\s?(\d{1,2})\s?[./]\s?(\d{2}|\d{4})$/);
  if (m) { const j = jahr(m[3]); return j ? isoDatum(j, Number(m[2]), Number(m[1])) : null; }
  m = t.match(/^(\d{1,2})\.?\s+([a-zäö]+)\.?\s+(\d{2}|\d{4})$/);
  if (m && MONATE[m[2]]) { const j = jahr(m[3]); return j ? isoDatum(j, MONATE[m[2]], Number(m[1])) : null; }
  return null;
}
