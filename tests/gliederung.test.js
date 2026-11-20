import { test, gleich, wahr } from './harness.js';
import * as G from '../js/gliederung.js';

const testG = await (await fetch('../gliederung/test-gliederung.json')).json();
const kap = (g, id) => g.kapitel.find((k) => k.id === id);
const feld = (g, k, f) => kap(g, k).felder.find((x) => x.id === f);
const leeresBuch = (extra = {}) => ({ teilbauwerke: [], zugeschaltet: [], werte: {}, ...extra });

test('Test-Gliederung ist fehlerfrei', () => gleich(G.pruefeGliederung(testG), []));

test('Prüfung erkennt Fehler', () => {
  const kaputt = structuredClone(testG);
  kaputt.kapitel[0].felder.push({ id: 'pflichttext', label: 'doppelt', art: 'unbekannt' });
  kaputt.mindestumfang.push({ label: 'x', felder: ['T9.nichts'] });
  const f = G.pruefeGliederung(kaputt);
  wahr(f.some((t) => t.includes('doppelt')), 'doppeltes Feld nicht erkannt');
  wahr(f.some((t) => t.includes('unbekannte Feldart')), 'Feldart nicht erkannt');
  wahr(f.some((t) => t.includes('T9.nichts')), 'Mindestumfang-Verweis nicht erkannt');
});

test('Prüfung: unbekanntes Teilbauwerk in sichtbarWenn', () => {
  const g = structuredClone(testG);
  g.kapitel[0].felder[0].sichtbarWenn = { teilbauwerk: ['gibtsnicht'] };
  wahr(G.pruefeGliederung(g).some((t) => t.includes('gibtsnicht')));
});

test('Sichtbarkeit: Kapitel nur bei Teilbauwerk', () => {
  gleich(G.sichtbareKapitel(testG, leeresBuch()).map((k) => k.id), ['T1', 'T2']);
  gleich(G.sichtbareKapitel(testG, leeresBuch({ teilbauwerke: ['testschacht'] })).map((k) => k.id), ['T1', 'T2', 'T4']);
});

test('Sichtbarkeit: zuschaltbares Kapitel', () => {
  gleich(G.sichtbareKapitel(testG, leeresBuch({ zugeschaltet: ['T3'] })).map((k) => k.id), ['T1', 'T2', 'T3']);
});

test('Sichtbarkeit: Feld nur bei Testwand', () => {
  const ohne = G.sichtbareFelder(kap(testG, 'T1'), leeresBuch()).map((f) => f.id);
  const mit = G.sichtbareFelder(kap(testG, 'T1'), leeresBuch({ teilbauwerke: ['testwand'] })).map((f) => f.id);
  wahr(!ohne.includes('wandfeld') && mit.includes('wandfeld'));
});

test('Leer-Erkennung je Feldart', () => {
  gleich(G.istLeer({ art: 'text' }, '  '), true);
  gleich(G.istLeer({ art: 'text' }, 'x'), false);
  gleich(G.istLeer({ art: 'janein' }, false), false, 'Nein ist ein Wert:');
  gleich(G.istLeer({ art: 'janein' }, undefined), true);
  gleich(G.istLeer({ art: 'mehrfach' }, []), true);
  const tab = { art: 'tabelle', spalten: [{ id: 'a' }] };
  gleich(G.istLeer(tab, [{ id: 'z1' }]), true, 'Zeile ohne Inhalt:');
  gleich(G.istLeer(tab, [{ id: 'z1', a: 'x' }]), false);
  gleich(G.istLeer(tab, [{ id: 'z1', a: 'x', _vorschlag: true }]), true, 'Beispielzeile:');
});

test('Status: erfasst, Handstatus, leer', () => {
  const f = feld(testG, 'T1', 'pflichttext');
  const b = leeresBuch();
  gleich(G.feldStatus(testG, b, 'T1', f), 'leer');
  b.werte['T1.pflichttext'] = { wert: '', status: 'nicht_zugaenglich' };
  gleich(G.feldStatus(testG, b, 'T1', f), 'nicht_zugaenglich');
  b.werte['T1.pflichttext'] = { wert: 'abc', status: null };
  gleich(G.feldStatus(testG, b, 'T1', f), 'erfasst');
});

test('Fortschritt zählt nur sichtbare Felder', () => {
  const b = leeresBuch();
  b.werte['T1.pflichttext'] = { wert: 'x' };
  b.werte['T1.laenge'] = { wert: '', status: 'offen' };
  b.werte['T1.datum'] = { wert: '', status: 'aus_akten' };
  const r = G.kapitelFortschritt(testG, b, kap(testG, 'T1'));
  gleich([r.gesamt, r.geklaert, r.offen, r.aus_akten, r.pflichtLeer], [9, 1, 1, 1, 0]);
});

test('Mindestumfang', () => {
  const b = leeresBuch();
  gleich(G.mindestumfang(testG, b).map((m) => m.erfuellt), [false, false]);
  b.werte['T1.pflichttext'] = { wert: 'x' };
  b.werte['T2.tabelle'] = { wert: [{ id: 'z', text: 'a' }] };
  gleich(G.mindestumfang(testG, b).map((m) => m.erfuellt), [true, true]);
});

test('Neues Beckenbuch: Name, Stammdaten, Vorschlagszeilen', () => {
  const b = G.neuesBeckenbuch(testG, { test_meisterei: 'Testmeisterei Nord' }, { name: 'RRB Teststraße', bauwerksnr: '0000000', teilbauwerke: ['testbecken'] }, '2026-11-20T10:00:00.000Z');
  gleich(b.werte['T1.meisterei'].wert, 'Testmeisterei Nord');
  gleich(b.werte['T2.tabelle'].wert.length, 1);
  gleich(b.werte['T2.tabelle'].wert[0].text, 'Testvorschlag 1');
  gleich(b.werte['T2.tabelle'].wert[0]._vorschlag, true);
  gleich(G.mindestumfang(testG, b)[1].erfuellt, false, 'Beispielzeile darf Mindestumfang nicht erfüllen:');
  gleich(b.teilbauwerke, ['testbecken']);
  gleich(b.vorlage.testdaten, true);
  gleich(b.stand, 'in_arbeit');
});

test('Vorschlag aus Teilbauwerken', () => {
  const f = feld(testG, 'T1', 'art');
  gleich(G.vorschlagAusTeilbauwerken(testG, leeresBuch({ teilbauwerke: ['testbecken', 'testwand'] }), f), 'Testbecken, Testwand');
  gleich(G.vorschlagAusTeilbauwerken(testG, leeresBuch(), f), '');
});

test('Sicherungshinweis', () => {
  gleich(G.brauchtSicherung({ geaendert: '2026-11-20T10:00', gesichert: null, versendet: null }), true);
  gleich(G.brauchtSicherung({ geaendert: '2026-11-20T10:00', gesichert: '2026-11-20T11:00', versendet: null }), false);
  gleich(G.brauchtSicherung({ geaendert: '2026-11-20T12:00', gesichert: '2026-11-20T11:00', versendet: null }), true);
});

test('Aus-den-Akten-Liste', () => {
  const b = leeresBuch();
  b.werte['T1.laenge'] = { wert: '', status: 'aus_akten' };
  const ids = G.akteneintraege(testG, b).map((e) => `${e.kapitel.id}.${e.feld.id}`);
  gleich(ids, ['T1.laenge', 'T1.datum'], 'Reihenfolge wie in der Gliederung:');
});

// Echte Gliederung – nur lokal vorhanden (vorlagen_intern ist nicht im Repository).
const echt = await fetch('../vorlagen_intern/gliederung_bestandsanlage.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
if (echt) {
  test('Echte Gliederung ist fehlerfrei', () => gleich(G.pruefeGliederung(echt), []));
  test('Echte Gliederung: Pflichtkapitel des Mindestumfangs vorhanden', () => {
    const ids = echt.kapitel.map((k) => k.id);
    for (const id of ['DECK', 'FOTO', 'A1', 'A2', 'A4_1', 'A5_2', 'A8', 'A9', 'B1', 'B4', 'C1', 'C2']) wahr(ids.includes(id), `${id} fehlt`);
  });
  test('Echte Gliederung: Musterbeckenbuch-Abschnitte sind zuschaltbar', () => {
    for (const id of ['A3', 'A4_2', 'B2']) wahr(echt.kapitel.find((k) => k.id === id).zuschaltbar, `${id} nicht zuschaltbar`);
  });
  test('Echte Gliederung: Vorschlag Art des Bauwerks ohne Tauchwand/Schacht', () => {
    const f = echt.kapitel.find((k) => k.id === 'A1').felder.find((x) => x.id === 'art_bauwerk');
    gleich(G.vorschlagAusTeilbauwerken(echt, { teilbauwerke: ['rrb', 'tauchwand', 'schacht', 'absetzbecken'] }, f), 'Absetzbecken, Regenrückhaltebecken');
  });
} else {
  test('Echte Gliederung (übersprungen – nicht vorhanden)', () => {});
}
