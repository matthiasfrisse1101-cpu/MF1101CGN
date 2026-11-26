// Etappe 5: Skizzen aus Maßen – erzeugte Abmessungen entsprechen den eingegebenen Maßen, fehlende erscheinen offen.
import { test, gleich, wahr } from './harness.js';
import * as M from '../js/massskizze.js';
import { rasterSchrittPx, fussText, fangPunkt, fangSchrittPx, laengeM } from '../js/skizzenlogik.js';
import * as G from '../js/gliederung.js';

window.__testG = await (await fetch('../gliederung/test-gliederung.json', { cache: 'reload' })).json();

const gem = (wert, herkunft = 'gemessen') => ({ wert, herkunft });
const voll = () => ({
  laengeOben: gem(42), breiteOben: gem(18), laengeSohle: gem(34), breiteSohle: gem(10), boeschung: gem(2), tiefe: gem(2),
});
const r = (z) => Math.round(z * 10) / 10;
const ohne = (m, ...k) => { const x = { ...m }; for (const s of k) x[s] = { fehlt: true }; return x; };

test('Maßstab: passend zum Becken, Raster in runden Metern', () => {
  gleich(M.massstabWaehlen(42, 18, 1150, 720), 250);
  gleich(M.massstabWaehlen(12, 6, 1150, 720), 100);
  gleich(M.massstabWaehlen(120, 60, 1150, 720), 1000);
  gleich(M.rasterWaehlen(250), 5);
  gleich(M.rasterWaehlen(100), 2);
  gleich(M.rasterWaehlen(500), 10);
  gleich(M.amRaster(12.4, 1), 12);
  gleich(M.amRaster(12.6, 0.5), 12.5);
});

test('Lageplan: Umriss in Pixeln entspricht genau den Maßen (Oberkante und Sohle)', () => {
  const lp = M.lageplanSvg(voll(), {}, {});
  const p = M.pxProM(lp.massstab);
  gleich(lp.massstab, 250);
  const cx = M.BREITE / 2, cy = M.LP_HOEHE / 2;
  // Oberkante 42 × 18 m
  wahr(lp.svg.includes(`x1="${r(cx - 21 * p)}" y1="${r(cy - 9 * p)}" x2="${r(cx + 21 * p)}" y2="${r(cy - 9 * p)}"`), 'Oberkante Länge falsch');
  wahr(lp.svg.includes(`x1="${r(cx - 21 * p)}" y1="${r(cy - 9 * p)}" x2="${r(cx - 21 * p)}" y2="${r(cy + 9 * p)}"`), 'Oberkante Breite falsch');
  // Sohle 34 × 10 m
  wahr(lp.svg.includes(`x1="${r(cx - 17 * p)}" y1="${r(cy - 5 * p)}" x2="${r(cx + 17 * p)}" y2="${r(cy - 5 * p)}"`), 'Sohle falsch');
  for (const t of ['Oberkante 42,00 m', 'Oberkante 18,00 m', 'Sohle 34,00 m', 'Sohle 10,00 m', 'Böschung 1 : 2']) wahr(lp.svg.includes(t), `„${t}“ fehlt`);
  wahr(!lp.svg.includes('Maß fehlt'), 'Hinweis „Maß fehlt“ trotz vollständiger Maße');
});

test('Lageplan: fehlende Maße bleiben offen mit „?“ und grauer Linie', () => {
  const lp = M.lageplanSvg(ohne(voll(), 'breiteSohle', 'tiefe'), {}, {});
  wahr(lp.svg.includes('Sohle ?'), 'offene Maßlinie „?“ fehlt');
  wahr(lp.svg.includes('Maß fehlt'), 'Hinweis „Maß fehlt“ fehlt');
  wahr(lp.svg.includes('stroke="#9aa0a6"'), 'graue Linie fehlt');
  wahr(lp.svg.includes('Oberkante 42,00 m'), 'vorhandenes Maß fehlt');
});

test('Lageplan: Maß „zur Prüfung“ (nicht bestätigt) gilt als offen', () => {
  const buch = { werte: { 'X.l': { wert: 'etwa wie der Zaun', mass: null }, 'X.b': { wert: '18 m', mass: { art: 'zahl', zahl: 18, einheit: 'm' }, herkunft: 'gemessen' } } };
  const m = M.leseMasse(buch, { laengeOben: 'X.l', breiteOben: 'X.b' });
  gleich(m.laengeOben, { fehlt: true, pruefen: true });
  gleich(m.breiteOben, { wert: 18, herkunft: 'gemessen' });
  wahr(M.lageplanSvg(m, {}, {}).svg.includes('? (zur Prüfung)'), 'Kennzeichnung „zur Prüfung“ fehlt');
});

test('Berechnet aus erfassten Maßen: Sohle = Oberkante − 2·n·t, gekennzeichnet', () => {
  const m = M.ergaenze(ohne(voll(), 'breiteSohle'));
  gleich(m.breiteSohle, { wert: 10, berechnet: true });
  const lp = M.lageplanSvg(ohne(voll(), 'breiteSohle'), {}, {});
  wahr(lp.svg.includes('Sohle 10,00 m (berechnet)'), 'Kennzeichnung „berechnet“ fehlt');
  wahr(lp.svg.includes('stroke-dasharray="22 8 4 8"'), 'strichpunktierte Linie fehlt');
  // Neigung aus Breiten und Tiefe
  gleich(M.ergaenze(ohne(voll(), 'boeschung')).boeschung, { wert: 2, berechnet: true });
  // Ohne Tiefe wird nichts berechnet – keine angenommenen Werte
  gleich(M.ergaenze(ohne(voll(), 'breiteSohle', 'tiefe')).breiteSohle, { fehlt: true });
});

test('Geschätzte Maße: gestrichelt und „ca.“', () => {
  const m = voll(); m.laengeOben = gem(42, 'geschaetzt');
  const lp = M.lageplanSvg(m, {}, {});
  wahr(lp.svg.includes('Oberkante ca. 42,00 m'), '„ca.“ fehlt');
  wahr(lp.svg.includes('stroke-dasharray="18 10"'), 'gestrichelte Linie fehlt');
});

test('Ohne Länge und Breite entsteht keine Skizze', () => {
  gleich(M.lageplanSvg({ laengeOben: { fehlt: true }, breiteOben: { fehlt: true } }, {}, {}), null);
  gleich(M.schnittSvg({ tiefe: gem(2) }, 'quer', {}), null);
});

test('Querschnitt: Böschung, Sohle und Tiefe entsprechen den Maßen', () => {
  const s = M.schnittSvg(voll(), 'quer', {});
  const p = M.pxProM(s.massstab);
  const cx = M.BREITE / 2, y0 = 200;
  wahr(s.svg.includes(`x1="${r(cx - 9 * p)}" y1="${y0}" x2="${r(cx - 5 * p)}" y2="${r(y0 + 2 * p)}"`), 'Böschungslinie falsch');
  wahr(s.svg.includes(`x1="${r(cx - 5 * p)}" y1="${r(y0 + 2 * p)}" x2="${r(cx + 5 * p)}" y2="${r(y0 + 2 * p)}"`), 'Sohle falsch');
  for (const t of ['Querschnitt A–A', 'Oberkante 18,00 m', 'Sohle 10,00 m', 'Tiefe 2,00 m', 'Böschung 1 : 2']) wahr(s.svg.includes(t), `„${t}“ fehlt`);
  const l = M.schnittSvg(voll(), 'laengs', {});
  wahr(l.svg.includes('Längsschnitt B–B') && l.svg.includes('Oberkante 42,00 m'), 'Längsschnitt falsch');
});

test('Querschnitt: Dauerstau und Schlammraum nur, wenn erfasst; fehlende Tiefe offen', () => {
  const m = { ...voll(), dauerstau: gem(1.2), schlammraum: gem(0.4) };
  const s = M.schnittSvg(m, 'quer', {}).svg;
  wahr(s.includes('Dauerstau 1,20 m über Sohle') && s.includes('Schlammraum 0,40 m'), 'Dauerstau/Schlammraum fehlt');
  const ohneWasser = M.schnittSvg(voll(), 'quer', {}).svg;
  wahr(!ohneWasser.includes('Dauerstau') && !ohneWasser.includes('Schlammraum'), 'nicht erfasstes Wasser gezeichnet');
  const offen = M.schnittSvg(ohne(voll(), 'tiefe'), 'quer', {}).svg;
  wahr(offen.includes('Tiefe ?') && offen.includes('Maß fehlt'), 'fehlende Tiefe nicht offen');
});

test('Kennzeichnung: Maßstabsleiste, Datum, Erfasser, Vermerk; Schnittlinien und Nordpfeil', () => {
  const lp = M.lageplanSvg(voll(), { nord: { winkel: 30, quelle: 'kompass' } }, { datum: '27.11.2026', erfasser: 'Testerfasser' });
  for (const t of [M.VERMERK, 'M 1:250', '27.11.2026', 'Erfasser: Testerfasser', '(ca., Kompass)', '>A<', '>B<', 'Raster 5 m']) wahr(lp.svg.includes(t), `„${t}“ fehlt`);
  const q = M.schnittSvg(voll(), 'quer', { datum: '27.11.2026', erfasser: 'Testerfasser' });
  wahr(q.svg.includes(M.VERMERK) && q.svg.includes(`M 1:${q.massstab}`), 'Kennzeichnung Schnitt fehlt');
  const leiste = M.massstabsleiste(250);
  wahr(leiste.laengePx >= 150 && leiste.laengePx <= 420, `Leiste ${leiste.laengePx} px`);
});

test('Symbole: Lage in Metern bleibt beim Maßstabswechsel erhalten', () => {
  const [x, y] = M.lpPunkt(10, -4, 250);
  const [xm, ym] = M.lpMeter(x, y, 250);
  gleich([Math.round(xm * 1000) / 1000, Math.round(ym * 1000) / 1000], [10, -4]);
  const w = { massstab: 500, elemente: [{ typ: 'symbol', art: 'schacht', x: 10, y: -4, winkel: 0, text: 'Drosselschacht' }, { typ: 'zaun', punkte: [[-25, -12], [25, -12]] }] };
  const svg = M.lageplanSvg(voll(), w, {}).svg;
  const [px, py] = M.lpPunkt(10, -4, 500);
  wahr(svg.includes(`translate(${r(px)} ${r(py)})`) && svg.includes('Drosselschacht'), 'Symbol falsch platziert');
  wahr(svg.includes('<polyline'), 'Zaun fehlt');
});

test('Freie Skizze im Raster: Kästchen = runde Meter, Fußzeile mit Maßstab', () => {
  gleich(Math.round(rasterSchrittPx({ massstab: 250, breite: 1600 }) * 100) / 100, Math.round(5 * M.pxProM(250) * 100) / 100);
  gleich(rasterSchrittPx({ breite: 1600 }), 100);
  wahr(fussText({ massstab: 250 }, '', '').includes('M 1:250 (1 Kästchen = 5 m)'), 'Fußzeile ohne Maßstab');
});

test('Gliederungsprüfung: Maßskizze braucht gültige Zuordnung', () => {
  const testG = structuredClone(window.__testG);
  const f = testG.kapitel.find((k) => k.id === 'T6').felder.find((x) => x.id === 't_skizze');
  f.masse.hoehe = 'T6.t_t';
  f.masse.tiefe = 'T1.langtext';
  const fehler = G.pruefeGliederung(testG).join(' | ');
  wahr(fehler.includes('unbekanntes Maß "hoehe"'), 'unbekanntes Maß nicht erkannt');
  wahr(fehler.includes('muss auf ein Zahlfeld zeigen'), 'Nicht-Zahlfeld nicht erkannt');
});

test('Objektfang im Raster: Rasterpunkte alle 10 cm in der Natur, Länge in Metern', () => {
  const sk = { breite: 1600, hoehe: 1200, massstab: 250, elemente: [] };
  const schritt = fangSchrittPx(sk);
  gleich(Math.round(schritt * 1000) / 1000, Math.round(0.1 * M.pxProM(250) * 1000) / 1000);
  const a = fangPunkt(401.3, 299.2, sk, 20);
  gleich(a.art, 'raster');
  wahr(Math.abs(a.x / schritt - Math.round(a.x / schritt)) < 0.01 && Math.abs(a.y / schritt - Math.round(a.y / schritt)) < 0.01, 'nicht auf Rasterpunkt');
  // 4,30 m waagerecht von einem Rasterpunkt aus
  const b = fangPunkt(a.x + 4.3 * M.pxProM(250) + 0.6, a.y - 0.5, sk, 20);
  gleich(laengeM([a.x, a.y], [b.x, b.y], sk), 4.3);
});

test('Objektfang: Linienende hat Vorrang vor dem Rasterpunkt; ohne Maßstab 10-px-Raster', () => {
  const sk = { breite: 1600, hoehe: 1200, massstab: 250, elemente: [{ typ: 'strich', punkte: [[100.5, 100.5], [300.7, 100.5]] }] };
  gleich(fangPunkt(305, 104, sk, 20), { x: 300.7, y: 100.5, art: 'endpunkt' });
  gleich(fangPunkt(500, 500, sk, 20).art, 'raster');
  const ohne = { breite: 1600, hoehe: 1200, elemente: [] };
  gleich(fangSchrittPx(ohne), 10);
  gleich(fangPunkt(104, 96, ohne, 5), { x: 100, y: 100, art: 'raster' });
  gleich(laengeM([0, 0], [100, 0], ohne), null);
});

test('Lageplan: im Raster gezeichnete Linie mit Länge, Fang 10 cm', () => {
  gleich(M.amRaster(3.14, M.FANG_M), 3.1);
  gleich(M.amRaster(-7.26, M.FANG_M), -7.3);
  const svg = M.lageplanSvg(voll(), { elemente: [{ typ: 'linie', punkte: [[-20, 12], [-7.7, 12]], laenge: true }] }, {}).svg;
  const [x1, y1] = M.lpPunkt(-20, 12, 250), [x2] = M.lpPunkt(-7.7, 12, 250);
  wahr(svg.includes(`x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}"`), 'Linie falsch platziert');
  wahr(svg.includes('12,30 m'), 'Länge fehlt');
});

test('Winkelfang: nahe waagerecht/senkrecht wird exakt, Länge rastet auf 10 cm', () => {
  const w = M.winkelFang([0, 0], [8.04, 0.6], { schritt: 90, toleranz: 10, laengenSchritt: 0.1 });
  gleich([w.gefangen, w.x, w.y, w.winkel], [true, 8, 0, 0]);
  const s = M.winkelFang([5, 5], [5.5, -2.96], { schritt: 90, toleranz: 10, laengenSchritt: 0.1 });
  gleich([s.gefangen, s.x, s.y, s.winkel], [true, 5, -3, 270]);
});

test('Winkelfang: schräg bleibt frei; 45° nur, wenn gewählt', () => {
  gleich(M.winkelFang([0, 0], [5, 3], { schritt: 90 }).gefangen, false);
  const d = M.winkelFang([0, 0], [5, 4.6], { schritt: 45, toleranz: 10, laengenSchritt: 0.1 });
  gleich([d.gefangen, d.winkel], [true, 45]);
  wahr(Math.abs(d.x - d.y) < 0.001, 'nicht diagonal');
  gleich(M.winkelFang([0, 0], [5, 4.6], { schritt: 0 }).gefangen, false);
});
