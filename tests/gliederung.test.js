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
  gleich(G.sichtbareKapitel(testG, leeresBuch()).map((k) => k.id), ['T1', 'T2', 'T5', 'T6']);
  gleich(G.sichtbareKapitel(testG, leeresBuch({ teilbauwerke: ['testschacht'] })).map((k) => k.id), ['T1', 'T2', 'T4', 'T5', 'T6']);
});

test('Sichtbarkeit: zuschaltbares Kapitel', () => {
  gleich(G.sichtbareKapitel(testG, leeresBuch({ zugeschaltet: ['T3'] })).map((k) => k.id), ['T1', 'T2', 'T3', 'T5', 'T6']);
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
  gleich([r.gesamt, r.geklaert, r.offen, r.aus_akten, r.pflichtLeer], [13, 1, 1, 1, 0]);
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

test('Prüfung: Marken einer Skizze brauchen Tabelle mit Spalte nr', () => {
  const g = structuredClone(testG);
  feld(g, 'T2', 'skizze').marken = 'T1.pflichttext';
  wahr(G.pruefeGliederung(g).some((t) => t.includes('Spalte "nr"')), 'falsches Ziel nicht erkannt');
  feld(g, 'T2', 'skizze').marken = 'T2.gibtsnicht';
  wahr(G.pruefeGliederung(g).some((t) => t.includes('zeigt auf kein Feld')), 'fehlendes Ziel nicht erkannt');
});

test('Prüfung: Kopie einer Skizze muss auf Skizze zeigen', () => {
  const g = structuredClone(testG);
  feld(g, 'T2', 'skizze_kopie').aus = 'T2.foto';
  wahr(G.pruefeGliederung(g).some((t) => t.includes('derselben Art')));
});

test('Foto/Skizze: leer bis eine ID eingetragen ist; Kopie zeigt Werte der Quelle', () => {
  const b = leeresBuch();
  gleich(G.feldStatus(testG, b, 'T2', feld(testG, 'T2', 'foto')), 'leer');
  b.werte['T2.foto'] = { wert: ['f-1'], status: null };
  b.werte['T2.skizze'] = { wert: ['s-1'], status: null };
  gleich(G.feldStatus(testG, b, 'T2', feld(testG, 'T2', 'foto')), 'erfasst');
  gleich(G.wertVon(testG, b, 'T2', feld(testG, 'T2', 'skizze_kopie')), ['s-1']);
  gleich(G.kapitelFortschritt(testG, b, kap(testG, 'T2')).gesamt, 3, 'Kopie zählt nicht als eigenes Feld');
});

test('Tabellenzeile mit Foto der Unterlage zählt als Inhalt', () => {
  const f = feld(testG, 'T2', 'tabelle');
  wahr(!G.zeileHatInhalt(f, { id: 'z', fotos: [] }));
  wahr(G.zeileHatInhalt(f, { id: 'z', fotos: ['f-1'] }));
});

test('Prüfung: Prüfprotokoll braucht Kapitel mit Protokoll', () => {
  const g = structuredClone(testG);
  feld(g, 'T5', 'kontrolle').protokoll = 'T1';
  wahr(G.pruefeGliederung(g).some((t) => t.includes('Protokoll')), 'fehlendes Protokoll nicht erkannt');
});

test('Prüfprotokoll: leer bis ein Punkt oder das Datum erfasst ist', () => {
  const f = feld(testG, 'T5', 'kontrolle');
  wahr(G.istLeer(f, { punkte: {} }), 'leeres Protokoll gilt nicht als leer');
  wahr(!G.istLeer(f, { punkte: { 'A.1': { ergebnis: 'ok' } } }), 'Punkt zählt nicht');
  wahr(!G.istLeer(f, { datum: '2026-11-24', punkte: {} }), 'Datum zählt nicht');
});

test('Fortschritt: Zahlfelder mit nicht bestätigtem Wert sind „zur Prüfung“', () => {
  const b = leeresBuch();
  b.werte['T1.laenge'] = { wert: 'etwa wie der Zaun', mass: null };
  b.werte['T1.neigung'] = { wert: '1 zu 2', mass: { art: 'verhaeltnis', a: 1, b: 2, zahl: 2 } };
  const r = G.kapitelFortschritt(testG, b, kap(testG, 'T1'));
  gleich(r.pruefen, 1);
  gleich(G.feldStatus(testG, b, 'T1', feld(testG, 'T1', 'laenge')), 'erfasst', 'Wortlaut bleibt als erfasster Text');
});

// Echte Gliederung – nur lokal vorhanden (vorlagen_intern ist nicht im Repository).
const echt = await fetch('../vorlagen_intern/gliederung_bestandsanlage.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
if (echt) {
  test('Echte Gliederung ist fehlerfrei', () => gleich(G.pruefeGliederung(echt), []));
  test('Echte Gliederung: Pflichtkapitel des Mindestumfangs vorhanden', () => {
    const ids = echt.kapitel.map((k) => k.id);
    for (const id of ['DECK', 'FOTO', 'A1', 'A2', 'A4_1', 'A5_2', 'A8', 'A9', 'B1', 'B4', 'C1', 'C2']) wahr(ids.includes(id), `${id} fehlt`);
  });
  test('Echte Gliederung: Funktionsskizze mit Eingriffsstellen verknüpft, Kopie in A 8, Anlagenfotos B 1/B 4', () => {
    const f = (k, id) => echt.kapitel.find((x) => x.id === k).felder.find((x) => x.id === id);
    gleich(f('A4_1', 'funktionsskizze').marken, 'A4_1.eingriffsstellen');
    gleich(f('A8', 'funktionsskizze_kopie').aus, 'A4_1.funktionsskizze');
    wahr(f('B1', 'unterlagen').fotosJeZeile && f('B4', 'plaene').fotosJeZeile, 'Fotos je Zeile fehlen');
  });
  test('Echte Gliederung: Protokoll A 5.2 mit Prüfpunkten A 1 bis E 4, Erstkontrolle in C 2', () => {
    const p = echt.kapitel.find((k) => k.id === 'A5_2').protokoll;
    gleich(p.gruppen.map((x) => `${x.id}${x.punkte.length}`), ['A6', 'B3', 'C9', 'D6', 'E4']);
    gleich(echt.kapitel.find((k) => k.id === 'C2').felder.find((f) => f.id === 'erstkontrolle').protokoll, 'A5_2');
  });
  test('Echte Gliederung: Hauptmaße in A 4.2 sind als Vorschlag gekennzeichnet', () => {
    const fs = echt.kapitel.find((k) => k.id === 'A4_2').felder.filter((f) => f.art === 'zahl');
    wahr(fs.length >= 6 && fs.every((f) => f.vorschlag), 'Hauptmaße fehlen oder sind nicht als Vorschlag markiert');
  });
  test('Echte Gliederung: Musterbeckenbuch-Abschnitte sind zuschaltbar', () => {
    for (const id of ['A3', 'A4_2', 'B2']) wahr(echt.kapitel.find((k) => k.id === id).zuschaltbar, `${id} nicht zuschaltbar`);
  });
  test('Echte Gliederung: Vorschlag Art des Bauwerks ohne Tauchwand/Schacht', () => {
    const f = echt.kapitel.find((k) => k.id === 'A1').felder.find((x) => x.id === 'art_bauwerk');
    gleich(G.vorschlagFuerFeld(echt, { teilbauwerke: ['rrb', 'tauchwand', 'schacht', 'absetzbecken'], werte: {} }, f), 'Absetzbecken, Regenrückhaltebecken');
  });
} else {
  test('Echte Gliederung (übersprungen – nicht vorhanden)', () => {});
}
