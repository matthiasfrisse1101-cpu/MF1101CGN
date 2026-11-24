import { test, gleich, wahr } from './harness.js';
import { leseDezimal, zahlDE, zahlwort, leseMass, umrechnen, einheitPasst, massText, normEinheit } from '../js/zahlen.js';

test('Zahl: Dezimalkomma', () => gleich(leseDezimal('2,40'), 2.4));
test('Zahl: Dezimalpunkt', () => gleich(leseDezimal('2.40'), 2.4));
test('Zahl: ganze Zahl mit Leerzeichen', () => gleich(leseDezimal(' 32 '), 32));
test('Zahl: negativ', () => gleich(leseDezimal('-1,5'), -1.5));
test('Zahl: mehrdeutig 1.234,5 → null', () => gleich(leseDezimal('1.234,5'), null));
test('Zahl: Leerzeichen in der Zahl → null (keine stille Korrektur)', () => gleich(leseDezimal('2 40'), null));
test('Zahl: Text → null', () => gleich(leseDezimal('zwei'), null));
test('Zahl: leer → null', () => gleich(leseDezimal(''), null));
test('Zahl: Ausgabe mit Komma', () => gleich(zahlDE(2.4), '2,4'));

test('Zahlwörter', () => {
  const faelle = { null: 0, eins: 1, zwei: 2, zwölf: 12, siebzehn: 17, zwanzig: 20, zweiunddreißig: 32, einundzwanzig: 21,
    hundert: 100, hundertfünfzig: 150, zweihundertvierzig: 240, tausend: 1000, zweitausenddreihundertvierzehn: 2314,
    eineinhalb: 1.5, zweieinhalb: 2.5 };
  for (const [w, z] of Object.entries(faelle)) gleich(zahlwort(w), z, w);
  gleich(zahlwort('schacht'), null);
  gleich(zahlwort('zweiundzwölf'), null, 'unsinnige Zusammensetzung');
});

test('Maß: Zahl mit Einheit (diktiert wie Gboard)', () => {
  gleich(leseMass('32 Meter'), { erkannt: true, art: 'zahl', zahl: 32, einheit: 'm', hinweis: '' });
  gleich(leseMass('2,40 m').zahl, 2.4);
  gleich(leseMass('2,40m').einheit, 'm');
  gleich(leseMass('150 Millimeter').einheit, 'mm');
  gleich(leseMass('1,2 Hektar').einheit, 'ha');
  gleich(leseMass('300 Kubikmeter').einheit, 'm³');
  gleich(leseMass('15 Liter pro Sekunde').einheit, 'l/s');
  gleich(leseMass('5 %').einheit, '%');
  gleich(leseMass('ca. 14 m').zahl, 14);
});

test('Maß: Zahlwörter und „Komma“', () => {
  gleich(leseMass('zwei Komma vier null Meter').zahl, 2.4);
  gleich(leseMass('zwei Komma vier null Meter').einheit, 'm');
  gleich(leseMass('zweiunddreißig Meter').zahl, 32);
  gleich(leseMass('2 Komma 40').zahl, 2.4);
  gleich(leseMass('vierzehn').zahl, 14);
});

test('Maß: „2 Meter 40“ wird als 2,40 m gelesen, mit Hinweis', () => {
  const m = leseMass('2 Meter 40');
  gleich([m.erkannt, m.zahl, m.einheit], [true, 2.4, 'm']);
  wahr(m.hinweis.includes('2,4'), 'Hinweis fehlt');
});

test('Maß: Verhältnis „1 zu 2“', () => {
  for (const t of ['1 zu 2', '1:2', 'eins zu zwei', '1 : 2']) {
    const m = leseMass(t);
    gleich([m.art, m.a, m.b, m.zahl], ['verhaeltnis', 1, 2, 2], t);
  }
  gleich(leseMass('1 zu 1,5').zahl, 1.5);
  gleich(massText(leseMass('1 zu 2')), '1 : 2');
});

test('Maß: Nennweite DN', () => {
  for (const t of ['DN 150', 'DN150', 'D N 150', 'de en 150', 'dn hundertfünfzig']) {
    gleich([leseMass(t).art, leseMass(t).zahl], ['dn', 150], t);
  }
  gleich(massText(leseMass('DN 300')), 'DN 300');
});

test('Maß: Nicht Erkanntes bleibt „nicht erkannt“ (keine stille Korrektur)', () => {
  for (const t of ['2 40', 'zwei vierzig', 'Schacht', '1.234,5 m', 'etwa so breit wie das Tor', '']) {
    gleich(leseMass(t).erkannt, false, t);
  }
  wahr(leseMass('2 40').hinweis.includes('mehrdeutig'), 'Hinweis „mehrdeutig“ fehlt');
});

test('Einheiten: Umrechnung nur auf Wunsch und nur verträglich', () => {
  gleich(umrechnen(240, 'cm', 'm'), 2.4);
  gleich(umrechnen(150, 'mm', 'm'), 0.15);
  gleich(umrechnen(12000, 'm²', 'ha'), 1.2);
  gleich(umrechnen(2, 'm', 'ha'), null);
  gleich(einheitPasst('', 'm'), 'ohne');
  gleich(einheitPasst('m', 'm'), 'gleich');
  gleich(einheitPasst('cm', 'm'), 'umrechenbar');
  gleich(einheitPasst('ha', 'm'), 'fremd');
  gleich(normEinheit('Meter'), 'm');
});
