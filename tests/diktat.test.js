import { test, gleich, wahr } from './harness.js';
import { bewerteMassEingabe, massZustand, massAnzeige, erwarteteArt } from '../js/masse.js';
import { zerlege, werteAus, stichwoerter } from '../js/sammeldiktat.js';

const laenge = { id: 'laenge', label: 'Länge Böschungsoberkante', art: 'zahl', einheit: 'm', stichwoerter: ['länge'] };
const breite = { id: 'breite', label: 'Breite Böschungsoberkante', art: 'zahl', einheit: 'm', stichwoerter: ['breite'] };
const boeschung = { id: 'boeschung', label: 'Böschungsneigung', art: 'zahl', format: 'verhaeltnis', einheit: '1:n', stichwoerter: ['böschung', 'neigung'] };
const flaeche = { id: 'ae', label: 'AE', art: 'zahl', einheit: 'ha', stichwoerter: ['ae'] };
const oel = { id: 'oel', label: 'Ölrückhaltung', art: 'janein', stichwoerter: ['ölrückhaltung'] };
const zone = { id: 'zone', label: 'Wasserschutzzone', art: 'auswahl', optionen: ['keine', 'Zone III', 'Zone II', 'unbekannt'] };
const zulauf = { id: 'zulauf', label: 'Zulauf', art: 'langtext', stichwoerter: ['zulauf'] };

test('Maßeingabe: Ziffern mit passender Einheit werden ohne Rückfrage übernommen', () => {
  const b = bewerteMassEingabe('32 m', laenge);
  gleich([b.zustand, b.mass.zahl, b.mass.einheit], ['auto', 32, 'm']);
  gleich(bewerteMassEingabe('32', laenge).mass.einheit, 'm', 'ohne Einheit gilt die des Feldes');
});

test('Maßeingabe: Zahlwörter und „2 Meter 40“ werden zur Bestätigung angezeigt', () => {
  gleich(bewerteMassEingabe('zweiunddreißig Meter', laenge).zustand, 'bestaetigen');
  gleich(bewerteMassEingabe('2 Meter 40', laenge).zustand, 'bestaetigen');
});

test('Maßeingabe: andere Einheit → keine stille Umrechnung, Angebot zur Umrechnung', () => {
  const b = bewerteMassEingabe('240 cm', laenge);
  gleich(b.zustand, 'umrechnen');
  gleich(b.mass.zahl, 240, 'diktierter Wert bleibt unverändert');
  gleich([b.umgerechnet.zahl, b.umgerechnet.einheit, b.umgerechnet.umgerechnetAus], [2.4, 'm', '240 cm']);
});

test('Maßeingabe: unpassende Einheit oder Art → Rückfrage', () => {
  gleich(bewerteMassEingabe('3 ha', laenge).zustand, 'fremd');
  gleich(bewerteMassEingabe('1 zu 2', laenge).zustand, 'fremd');
  gleich(bewerteMassEingabe('5 m', boeschung).zustand, 'fremd');
});

test('Maßeingabe: Böschung „1 zu 2“ und Nennweite', () => {
  gleich(erwarteteArt(boeschung), 'verhaeltnis');
  const b = bewerteMassEingabe('1 zu 2', boeschung);
  gleich([b.zustand, b.mass.a, b.mass.b], ['auto', 1, 2]);
  const dn = { id: 'dn', label: 'Drossel', art: 'zahl', format: 'dn' };
  gleich(bewerteMassEingabe('DN 150', dn).zustand, 'auto');
});

test('Maßeingabe: nicht erkannt bleibt Text, Zustand „zur Prüfung“', () => {
  gleich(bewerteMassEingabe('etwa so lang wie der Zaun', laenge).zustand, 'unerkannt');
  gleich(massZustand(laenge, { wert: 'etwa so lang wie der Zaun', mass: null }), 'pruefen');
  gleich(massZustand(laenge, { wert: '32 m', mass: { art: 'zahl', zahl: 32, einheit: 'm' } }), 'ok');
  gleich(massZustand(laenge, { wert: '' }), 'leer');
});

test('Maßanzeige mit Herkunft und Umrechnung', () => {
  gleich(massAnzeige({ mass: { art: 'zahl', zahl: 2.4, einheit: 'm', umgerechnetAus: '240 cm' }, herkunft: 'gemessen' }), '2,4 m (umgerechnet aus 240 cm) – gemessen');
  gleich(massAnzeige({ mass: { art: 'verhaeltnis', a: 1, b: 2, zahl: 2 }, herkunft: 'geschaetzt' }), '1 : 2 – geschätzt');
});

test('Sammeldiktat: Zerlegen in Sätze und Abschnitte, Dezimalkomma bleibt', () => {
  gleich(zerlege('Länge 32 Meter, Breite 14,5 Meter. Böschung 1 zu 2'), [['Länge 32 Meter', 'Breite 14,5 Meter'], ['Böschung 1 zu 2']]);
  gleich(zerlege('Tiefe ca. 2,40 m, Zulauf DN 300'), [['Tiefe ca. 2,40 m', 'Zulauf DN 300']]);
});

test('Sammeldiktat: Beispiel aus dem Auftrag „Länge 32 Meter, Breite 14 Meter, Böschung 1 zu 2“', () => {
  const v = werteAus('Länge 32 Meter, Breite 14 Meter, Böschung 1 zu 2', [laenge, breite, boeschung]);
  gleich(v.map((x) => [x.typ, x.feldId, x.wert]), [['feld', 'laenge', '32 Meter'], ['feld', 'breite', '14 Meter'], ['feld', 'boeschung', '1 zu 2']]);
  gleich(v[2].bewertung.mass.b, 2);
});

test('Sammeldiktat: Satzende nach Zahl, Stichwörter in anderer Reihenfolge', () => {
  gleich(zerlege('Böschung 1 zu 2. Tiefe 3 m'), [['Böschung 1 zu 2'], ['Tiefe 3 m']]);
  gleich(zerlege('Tiefe 2.40 m'), [['Tiefe 2.40 m']]);
  const lSohle = { id: 'laenge_sohle', label: 'Länge an der Sohle', art: 'zahl', einheit: 'm', stichwoerter: ['länge sohle'] };
  const v = werteAus('Sohle Länge 24 m, Länge 32 m', [laenge, lSohle]);
  gleich(v.map((x) => [x.feldId, x.wert]), [['laenge_sohle', '24 m'], ['laenge', '32 m']]);
});

test('Sammeldiktat: Ja/Nein, Auswahl, Text, Fläche', () => {
  const v = werteAus('Ölrückhaltung nicht vorhanden, Wasserschutzzone Zone III, Zulauf über Mulde von Norden, AE 1,2 Hektar', [oel, zone, zulauf, flaeche]);
  gleich(v.map((x) => [x.feldId, x.wert]), [['oel', false], ['zone', 'Zone III'], ['zulauf', 'über Mulde von Norden'], ['ae', '1,2 Hektar']]);
});

test('Sammeldiktat: Unzuordenbares wird Notiz, nichts wird erfunden', () => {
  const v = werteAus('Länge 32 Meter. Zaun stark beschädigt', [laenge, breite]);
  gleich(v.length, 2);
  gleich(v[1], { typ: 'notiz', text: 'Zaun stark beschädigt' });
});

test('Sammeldiktat: Satz wird Tabellenzeile (Bestandsliste)', () => {
  const tab = { id: 'bauteile', art: 'tabelle', label: 'Bauteile', sammelSpalte: 'abmessungen', spalten: [
    { id: 'bauteil', label: 'Bauteil', art: 'text' },
    { id: 'hersteller', label: 'Hersteller', art: 'text', stichwoerter: ['hersteller', 'firma'] },
    { id: 'abmessungen', label: 'Abmessungen', art: 'text' },
  ] };
  const v = werteAus('Schacht 2 Drosselschacht, Drossel DN 150, Tiefe 2,40 Meter, Hersteller Testfirma', [tab]);
  gleich(v.length, 1);
  gleich(v[0].typ, 'zeile');
  gleich(v[0].zeile, { bauteil: 'Schacht 2 Drosselschacht', abmessungen: 'Drossel DN 150; Tiefe 2,40 Meter', hersteller: 'Testfirma' });
});

test('Stichwörter aus Feldname ohne Füllwörter', () => {
  const w = stichwoerter({ label: 'Länge der Böschungsoberkante', stichwoerter: ['Länge'] });
  wahr(w.includes('länge') && w.includes('böschungsoberkante') && !w.includes('der'), w.join(','));
});
