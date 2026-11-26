import { test, gleich, wahr } from './harness.js';
import * as M from '../js/massskizze.js';
import * as G from '../js/gliederung.js';

const testG = await (await fetch('../gliederung/test-gliederung.json')).json();
const index = G.feldIndex(testG);
const feld = (id) => index.get(`T6.${id}`).feld;
const lageplan = feld('lageplan');
const schnitt = feld('schnitt');

// Eintrag wie nach Diktat und Bestätigung
const zahl = (z, einheit = 'm') => ({ wert: String(z), mass: { art: 'zahl', zahl: z, einheit } });
const verh = (n) => ({ wert: `1:${n}`, mass: { art: 'verhaeltnis', a: 1, b: n, zahl: n, einheit: '1:n' } });
const buchMit = (werte) => ({ id: 'b1', werte });

test('Massskizze: Test-Gliederung mit Lageplan und Schnitt ist gültig', () => gleich(G.pruefeGliederung(testG), []));

test('Massskizze: Prüfung erkennt falsche Zuordnung', () => {
  const g = structuredClone(testG);
  const f = g.kapitel.find((k) => k.id === 'T6').felder.find((x) => x.id === 'lageplan');
  f.masse.neigung = 'T6.tiefe';
  f.masse.gibtsNicht = 'T6.tiefe';
  f.ansicht = 'seitlich';
  const fehler = G.pruefeGliederung(g);
  wahr(fehler.some((t) => t.includes('1 : n')), 'Neigungsformat nicht erkannt');
  wahr(fehler.some((t) => t.includes('gibtsNicht')), 'unbekanntes Maß nicht erkannt');
  wahr(fehler.some((t) => t.includes('ansicht')), 'Ansicht nicht erkannt');
});

test('Massskizze: nur bestätigte Maße, Einheit cm wird in m umgerechnet', () => {
  const b = buchMit({
    'T6.laenge_oben': zahl(4000, 'cm'),
    'T6.breite_oben': { wert: 'zwölf Meter ungefähr' , mass: null },
    'T6.neigung': verh(2),
  });
  const m = M.holeMasse(lageplan, b, index);
  gleich(m.laengeOben.zahl, 40);
  gleich(m.breiteOben.zahl, null, 'unbestätigter Wortlaut darf nicht zählen:');
  gleich(m.neigung.zahl, 2);
});

test('Massskizze: Sohle wird aus Oberkante, Neigung und Tiefe errechnet', () => {
  const b = buchMit({ 'T6.laenge_oben': zahl(40), 'T6.breite_oben': zahl(20), 'T6.neigung': verh(2), 'T6.tiefe': zahl(2.5) });
  const { masse, hinweise } = M.ergaenze(M.holeMasse(lageplan, b, index));
  gleich(masse.laengeSohle.zahl, 30);
  gleich(masse.breiteSohle.zahl, 10);
  gleich(masse.breiteSohle.quelle, 'errechnet');
  gleich(M.massBeschriftung(masse.breiteSohle), '≈ 10 m');
  gleich(hinweise, []);
});

test('Massskizze: Tiefe und Neigung werden errechnet', () => {
  const b1 = buchMit({ 'T6.breite_oben': zahl(20), 'T6.breite_sohle': zahl(12), 'T6.neigung': verh(2) });
  gleich(M.ergaenze(M.holeMasse(schnitt, b1, index)).masse.tiefe.zahl, 2);
  const b2 = buchMit({ 'T6.breite_oben': zahl(20), 'T6.breite_sohle': zahl(11), 'T6.tiefe': zahl(3) });
  const m2 = M.ergaenze(M.holeMasse(schnitt, b2, index)).masse;
  gleich(m2.neigung.zahl, 1.5);
  gleich(M.massBeschriftung(m2.neigung, 'n'), '≈ 1 : 1,5');
});

test('Massskizze: Widerspruch wird gemeldet, nicht korrigiert', () => {
  const b = buchMit({ 'T6.breite_oben': zahl(20), 'T6.breite_sohle': zahl(10), 'T6.neigung': verh(2), 'T6.tiefe': zahl(3) });
  const { masse, hinweise } = M.ergaenze(M.holeMasse(schnitt, b, index));
  gleich(masse.breiteOben.zahl, 20, 'gemessener Wert bleibt:');
  gleich(hinweise.length, 1);
  wahr(hinweise[0].includes('22 m'), hinweise[0]);
});

test('Massskizze: keine negativen Maße errechnen', () => {
  const b = buchMit({ 'T6.breite_oben': zahl(4), 'T6.neigung': verh(2), 'T6.tiefe': zahl(3) });
  gleich(M.ergaenze(M.holeMasse(schnitt, b, index)).masse.breiteSohle.zahl, null);
});

test('Massskizze: fehlende Maße als „?“ im Lageplan, Werte im Schnitt', () => {
  const leer = M.ergaenze(M.holeMasse(lageplan, buchMit({}), index)).masse;
  gleich(M.fehlendeMasse(lageplan, leer).length, 6);
  const svg = M.lageplanSvg(leer);
  wahr(svg.startsWith('<svg') && svg.endsWith('</svg>'), 'kein SVG');
  wahr((svg.match(/>\?</g) || []).length >= 4, 'Fragezeichen fehlen');
  const b = buchMit({ 'T6.breite_oben': zahl(20), 'T6.breite_sohle': zahl(12), 'T6.neigung': verh(2) });
  const m = M.ergaenze(M.holeMasse(schnitt, b, index)).masse;
  const s = M.skizzeSvg(schnitt, m, []);
  wahr(s.includes('Querschnitt') && s.includes('20 m') && s.includes('≈ 2 m') && s.includes('1 : 2'), 'Beschriftung fehlt');
  gleich(M.fehlendeMasse(schnitt, m), []);
});

test('Massskizze: Symbole werden gezeichnet, Texte maskiert, Treffer gefunden', () => {
  const m = M.ergaenze(M.holeMasse(lageplan, buchMit({}), index)).masse;
  const sy = [{ typ: 'zulauf', x: 200, y: 300, winkel: 0 }, { typ: 'nord', x: 1400, y: 200, winkel: 45 }];
  const svg = M.lageplanSvg(m, sy, { fuss: 'A <b> & C' });
  wahr(svg.includes('Zulauf') && svg.includes('>N<'), 'Symbole fehlen');
  wahr(svg.includes('A &lt;b&gt; &amp; C'), 'Text nicht maskiert');
  gleich(M.symbolBei(sy, 210, 310), 0);
  gleich(M.symbolBei(sy, 800, 800), -1);
});

test('Massskizze: Status erst nach Prüfung erfasst; Stand erkennt Änderungen', () => {
  gleich(G.istLeer(lageplan, { symbole: [], geprueft: false }), true);
  gleich(G.istLeer(lageplan, { symbole: [], geprueft: true }), false);
  const a = M.holeMasse(lageplan, buchMit({ 'T6.tiefe': zahl(2) }), index);
  const b = M.holeMasse(lageplan, buchMit({ 'T6.tiefe': zahl(2.1) }), index);
  wahr(M.stand(a) !== M.stand(b), 'Änderung nicht erkannt');
});
