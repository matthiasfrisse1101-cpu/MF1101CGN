import { test, gleich, wahr } from './harness.js';
import * as S from '../js/skizzenlogik.js';
import { zielgroesse } from '../js/bilder.js';
import * as db from '../js/db.js';

let zaehler = 0;
const neueId = () => `z-test-${++zaehler}`;

test('Marken: nächste freie Nummer füllt Lücken', () => {
  gleich(S.naechsteMarkenNr([]), 1);
  gleich(S.naechsteMarkenNr([1, 2, 3]), 4);
  gleich(S.naechsteMarkenNr([1, 3]), 2);
  gleich(S.naechsteMarkenNr([2]), 1);
});

test('Marken: Nummern über mehrere Skizzen eines Feldes', () => {
  const a = { elemente: [{ typ: 'marke', nr: 2 }, { typ: 'strich', punkte: [] }] };
  const b = { elemente: [{ typ: 'marke', nr: 1 }, { typ: 'text', text: 'x' }] };
  gleich(S.markenNummern([a, b]), [1, 2]);
});

test('Eingriffsstellen: Abgleich Skizze ↔ Tabelle', () => {
  const zeilen = [{ nr: '1', stelle: 'Schieber' }, { nr: '3', stelle: 'Tor' }, { nr: '', stelle: 'ohne Nr.' }, { nr: '4', _vorschlag: true }];
  gleich(S.eingriffsAbgleich([1, 2], zeilen), { ohneZeile: [2], ohneMarke: [3] });
});

test('Eingriffsstellen: neue Marke legt Zeile an, vorhandene bleiben unverändert', () => {
  const zeilen = [{ id: 'a', nr: '1', stelle: 'Schieber Zulauf', wirkung: 'Becken abgesperrt' }];
  const neu = S.zeilenFuerMarken([1, 2], zeilen, neueId);
  gleich(neu.length, 2);
  gleich(neu[0], zeilen[0]);
  gleich(neu[1].nr, '2');
  wahr(!('stelle' in neu[1]), 'neue Zeile darf keinen erfundenen Text enthalten');
  // zweiter Aufruf ändert nichts
  gleich(S.zeilenFuerMarken([1, 2], neu, neueId).length, 2);
});

test('Eingriffsstellen: Marke löschen entfernt nur leere Zeile', () => {
  const zeilen = [{ id: 'a', nr: '1', stelle: 'Schieber' }, { id: 'b', nr: '2' }, { id: 'c', nr: '3', stelle: '', wirkung: ' ' }];
  gleich(S.zeileZuMarkeEntfernen(1, zeilen).length, 3, 'Zeile mit Inhalt bleibt');
  gleich(S.zeileZuMarkeEntfernen(2, zeilen).map((z) => z.id), ['a', 'c']);
  gleich(S.zeileZuMarkeEntfernen(3, zeilen).map((z) => z.id), ['a', 'b']);
});

test('Trefferprüfung: Marke, Text, Strich, daneben', () => {
  const el = [
    { typ: 'strich', farbe: '#000', dicke: 4, punkte: [[0, 0], [100, 0]] },
    { typ: 'text', text: 'Zulauf', x: 300, y: 300 },
    { typ: 'marke', nr: 1, x: 500, y: 500 },
  ];
  const m = S.masse({ breite: 1600, hoehe: 1200 });
  gleich(S.elementBei(el, 50, 5, m), 0);
  gleich(S.elementBei(el, 320, 280, m), 1);
  gleich(S.elementBei(el, 510, 490, m), 2);
  gleich(S.elementBei(el, 900, 900, m), -1);
  gleich(S.elementBei(el, 50, 5, m, 24, true), -1, 'Striche sind nicht verschiebbar');
});

test('Strich ausdünnen behält Anfang und Ende', () => {
  const p = [[0, 0], [0.5, 0], [1, 0], [5, 0], [5.5, 0], [10, 0]];
  const r = S.duenneAus(p, 2);
  gleich(r[0], [0, 0]);
  gleich(r[r.length - 1], [10, 0]);
  wahr(r.length < p.length, 'nicht ausgedünnt');
});

test('Neue Skizze: leere Fläche bzw. Größe des Fotos', () => {
  const leer = S.neueSkizze({ id: 's1', buchId: 'b', feldKey: 'A4_1.funktionsskizze' });
  gleich([leer.breite, leer.hoehe, leer.elemente.length], [S.LEER_BREITE, S.LEER_HOEHE, 0]);
  const foto = S.neueSkizze({ id: 's2', buchId: 'b', feldKey: 'k', grundlage: { blob: null, breite: 1500, hoehe: 2000 } });
  gleich([foto.breite, foto.hoehe], [1500, 2000]);
});

test('Skizze zeichnen: Marke erscheint an der angegebenen Stelle', () => {
  const s = S.neueSkizze({ id: 's', buchId: 'b', feldKey: 'k' });
  s.elemente.push({ typ: 'marke', nr: 7, x: 400, y: 300 });
  const c = document.createElement('canvas');
  c.width = s.breite; c.height = s.hoehe;
  const ctx = c.getContext('2d');
  S.zeichne(ctx, s, null, {});
  const rand = ctx.getImageData(400 + S.masse(s).radius, 300, 1, 1).data; // auf dem roten Kreis
  wahr(rand[0] > 150 && rand[1] < 80, `kein roter Kreis (${[...rand]})`);
  const weit = ctx.getImageData(100, 100, 1, 1).data;
  gleich([...weit], [255, 255, 255, 255], 'Hintergrund nicht weiß');
});

test('Größen von Marken und Strichen wachsen mit der Skizze', () => {
  const klein = S.masse({ breite: 800, hoehe: 600 }), gross = S.masse({ breite: 1600, hoehe: 1200 });
  gleich(gross.radius, 2 * klein.radius);
  wahr(gross.dick > gross.duenn, 'dick nicht dicker als dünn');
});

test('Fußzeile kennzeichnet Handskizze', () => {
  gleich(S.fussText({}, 'Testerfasser', '21.11.2026'), 'Handskizze, nicht maßstäblich · 21.11.2026 · Erfasser: Testerfasser');
  gleich(S.fussText({}, '', ''), 'Handskizze, nicht maßstäblich');
});

test('Fotos: Zielgröße behält Seitenverhältnis, vergrößert nicht', () => {
  gleich(zielgroesse(4000, 3000, 2000), { breite: 2000, hoehe: 1500 });
  gleich(zielgroesse(3000, 4000, 2000), { breite: 1500, hoehe: 2000 });
  gleich(zielgroesse(800, 600, 2000), { breite: 800, hoehe: 600 });
});

test('Speicher: Foto (Blob) wird vollständig gespeichert und gelesen', async () => {
  const bytes = new Uint8Array(300000).map((_, i) => i % 251);
  const foto = { id: 'f-test', buchId: 'b-test', nr: 1, blob: new Blob([bytes], { type: 'image/jpeg' }), unterschrift: 'Testfoto' };
  db.speichere('fotos', foto);
  await db.allesGespeichert();
  const r = await db.lese('fotos', 'f-test');
  gleich(r.blob.size, 300000);
  const zurueck = new Uint8Array(await r.blob.arrayBuffer());
  gleich(zurueck[1000], 1000 % 251);
  await db.loesche('fotos', 'f-test');
});
