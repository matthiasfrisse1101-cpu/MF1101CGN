// Skizzen aus Maßen (Etappe 5): Lageplan (Draufsicht) und Schnitt eines Beckens,
// erzeugt aus den vor Ort gemessenen und bestätigten Hauptmaßen.
// Reine Logik ohne Bildschirm – liefert die Zeichnung als SVG-Text, deshalb automatisch testbar.
//
// Feld in der Gliederung (Feldart "massskizze"):
//   { "id": "lageplan", "label": "Lageplanskizze", "art": "massskizze", "ansicht": "lageplan",
//     "masse": { "laengeOben": "A4_2.laenge_bok", "breiteOben": "A4_2.breite_bok", ... } }
//   "ansicht": "lageplan" oder "schnitt"; beim Schnitt zusätzlich "richtung": "quer" (über die Breite, Standard)
//   oder "laengs" (über die Länge). "masse" ordnet jedem Maß das Zahlfeld zu, aus dem es kommt –
//   ändern sich die Hauptmaße in der Vorlage, wird nur diese Zuordnung angepasst.
//
// Gespeicherter Wert des Feldes: { symbole: [{ typ, x, y, winkel }], geprueft: true|false, stand: '<Maße bei Prüfung>' }
// Das Feld gilt als erfasst, wenn die Skizze als geprüft bestätigt wurde.

import { umrechnen, zahlDE } from './zahlen.js';

// Maße, die eine Skizze kennt. (Vorschlag der App, s. Etappe 4: Hauptmaße A 4.2)
export const MASSE = {
  laengeOben: 'Länge an der Böschungsoberkante',
  breiteOben: 'Breite an der Böschungsoberkante',
  laengeSohle: 'Länge an der Sohle',
  breiteSohle: 'Breite an der Sohle',
  neigung: 'Böschungsneigung 1 : n',
  tiefe: 'Tiefe (Böschungsoberkante bis Sohle)',
};

// Symbole, die von Hand gesetzt werden. (Vorschlag der App)
export const SYMBOLE = {
  zulauf: { label: 'Zulauf', pfeil: true },
  ablauf: { label: 'Ablauf', pfeil: true },
  ueberlauf: { label: 'Notüberlauf', pfeil: true },
  schacht: { label: 'Schacht', pfeil: false },
  nord: { label: 'Nordpfeil', pfeil: false },
};

export const BREITE = 1600;
export const HOEHE = 1200;
const BLAU = '#0047b3';
const ROT = '#c4001d';
const SOHLE = '#e3eefa';

// ---------- Maße holen ----------
// Liefert je Maß { zahl (in m bzw. n), quelle: 'erfasst'|'errechnet'|null, feldKey, hinweis }.
// Nur bestätigte Maße (eintrag.mass) zählen – ein ungeklärter Wortlaut bleibt „?“.
export function holeMasse(feld, buch, feldIndex) {
  const r = {};
  for (const key of Object.keys(MASSE)) {
    const fk = (feld.masse || {})[key];
    r[key] = { zahl: null, quelle: null, feldKey: fk || null, hinweis: '' };
    if (!fk) continue;
    const e = (buch.werte || {})[fk];
    const ziel = feldIndex.get(fk);
    if (!e || !e.mass || !ziel) continue;
    const m = e.mass;
    if (key === 'neigung') {
      if (m.art === 'verhaeltnis' && m.zahl > 0) Object.assign(r[key], { zahl: m.zahl, quelle: 'erfasst' });
      continue;
    }
    if (m.art !== 'zahl') continue;
    const einheit = m.einheit || ziel.feld.einheit;
    const inMeter = einheit ? umrechnen(m.zahl, einheit, 'm') : null;
    if (inMeter === null) { r[key].hinweis = 'Einheit unklar'; continue; }
    if (inMeter > 0) Object.assign(r[key], { zahl: inMeter, quelle: 'erfasst' });
  }
  return r;
}

const rund = (x) => Math.round(x * 100) / 100;

// Ergänzt fehlende Maße aus den übrigen (Trapez: oben = Sohle + 2 · n · Tiefe).
// Ergebnis: neue Maßliste und Hinweise, wenn alle vier Maße einer Seite erfasst sind und rechnerisch abweichen.
export function ergaenze(masse) {
  const m = structuredClone(masse);
  const hinweise = [];
  const bekannt = (k) => m[k].zahl !== null;
  const setze = (k, wert) => { if (wert > 0 && Number.isFinite(wert)) Object.assign(m[k], { zahl: rund(wert), quelle: 'errechnet' }); };
  for (let runde = 0; runde < 3; runde++) {
    for (const seite of ['laenge', 'breite']) {
      const O = `${seite}Oben`, S = `${seite}Sohle`;
      const o = m[O].zahl, s = m[S].zahl, n = m.neigung.zahl, t = m.tiefe.zahl;
      if (!bekannt(S) && o !== null && n !== null && t !== null) setze(S, o - 2 * n * t);
      else if (!bekannt(O) && s !== null && n !== null && t !== null) setze(O, s + 2 * n * t);
      else if (!bekannt('tiefe') && o !== null && s !== null && n !== null && o > s) setze('tiefe', (o - s) / (2 * n));
      else if (!bekannt('neigung') && o !== null && s !== null && t !== null && o > s) setze('neigung', (o - s) / (2 * t));
    }
  }
  for (const seite of ['laenge', 'breite']) {
    const O = `${seite}Oben`, S = `${seite}Sohle`;
    const alle = [O, S, 'neigung', 'tiefe'].every((k) => masse[k].quelle === 'erfasst');
    if (!alle) continue;
    const soll = rund(masse[S].zahl + 2 * masse.neigung.zahl * masse.tiefe.zahl);
    // Abweichung ab 1 cm (Rundung der Anzeige) wird nur gemeldet, nicht bewertet.
    if (Math.abs(soll - masse[O].zahl) >= 0.01) {
      hinweise.push(`${seite === 'laenge' ? 'Länge' : 'Breite'}: aus Sohle, Neigung und Tiefe ergäben sich oben ${zahlDE(soll)} m, gemessen sind ${zahlDE(rund(masse[O].zahl))} m.`);
    }
  }
  return { masse: m, hinweise };
}

// Text für die Skizze: „12,5 m“, errechnet „≈ 12,5 m“, fehlend „?“.
export function massBeschriftung(eintrag, art = 'm') {
  if (!eintrag || eintrag.zahl === null) return '?';
  const z = art === 'n' ? `1 : ${zahlDE(rund(eintrag.zahl))}` : `${zahlDE(rund(eintrag.zahl))} m`;
  return eintrag.quelle === 'errechnet' ? `≈ ${z}` : z;
}

// Kurzer „Fingerabdruck“ der Maße – zeigt, ob sich Maße nach der Prüfung geändert haben.
export function stand(masse) {
  return Object.keys(MASSE).map((k) => (masse[k].zahl === null ? '-' : rund(masse[k].zahl))).join('|');
}

// Maße, die die jeweilige Ansicht zeigt.
export function noetigeMasse(feld) {
  if (feld.ansicht !== 'schnitt') return Object.keys(MASSE);
  return feld.richtung === 'laengs' ? ['laengeOben', 'laengeSohle', 'neigung', 'tiefe'] : ['breiteOben', 'breiteSohle', 'neigung', 'tiefe'];
}

export function fehlendeMasse(feld, masse) {
  return noetigeMasse(feld).filter((k) => masse[k].zahl === null);
}

// ---------- SVG-Bausteine ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (x) => Math.round(x * 10) / 10;
const linie = (x1, y1, x2, y2, dicke = 3, farbe = '#111') => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${farbe}" stroke-width="${dicke}" stroke-linecap="round"/>`;
function text(x, y, t, { groesse = 40, farbe = '#111', anker = 'middle', drehung = 0, fett = false } = {}) {
  const rot = drehung ? ` transform="rotate(${drehung} ${r1(x)} ${r1(y)})"` : '';
  const f = t === '?' ? ROT : farbe;
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="${groesse}" font-family="system-ui, sans-serif" font-weight="${fett || t === '?' ? 700 : 500}" fill="${f}" text-anchor="${anker}" stroke="#fff" stroke-width="${Math.round(groesse / 6)}" paint-order="stroke"${rot}>${esc(t)}</text>`;
}

// Maßlinie mit Endstrichen und Text; senkrecht, wenn x1 === x2.
function masslinie(x1, y1, x2, y2, beschriftung, seite = -1) {
  const senkrecht = Math.abs(x1 - x2) < 0.5;
  const t = 18;
  let s = linie(x1, y1, x2, y2, 2.5, '#333');
  if (senkrecht) {
    s += linie(x1 - t, y1, x1 + t, y1, 2.5, '#333') + linie(x2 - t, y2, x2 + t, y2, 2.5, '#333');
    // gedrehter Text liegt links seiner Grundlinie – rechts der Linie deshalb weiter abrücken
    s += text(x1 + (seite < 0 ? -22 : 50), (y1 + y2) / 2, beschriftung, { drehung: -90 });
  } else {
    s += linie(x1, y1 - t, x1, y1 + t, 2.5, '#333') + linie(x2, y2 - t, x2, y2 + t, 2.5, '#333');
    s += text((x1 + x2) / 2, y1 + (seite < 0 ? -16 : 46), beschriftung);
  }
  return s;
}

function symbolSvg(sym, ausgewaehlt) {
  const d = SYMBOLE[sym.typ];
  if (!d) return '';
  const w = (sym.winkel || 0) * Math.PI / 180;
  const { x, y } = sym;
  let s = '';
  if (sym.typ === 'nord') {
    // Pfeil nach oben (winkel 0 = Norden oben), mit N
    const p = (dx, dy) => [x + dx * Math.cos(w) - dy * Math.sin(w), y + dx * Math.sin(w) + dy * Math.cos(w)];
    const [sx, sy] = p(0, 60), [tx, ty] = p(0, -60), [lx, ly] = p(-26, -14), [rx, ry] = p(26, -14), [nx, ny] = p(0, -92);
    s += linie(sx, sy, tx, ty, 6) + `<polygon points="${r1(tx)},${r1(ty)} ${r1(lx)},${r1(ly)} ${r1(rx)},${r1(ry)}" fill="#111"/>`;
    s += text(nx, ny + 16, 'N', { groesse: 46, fett: true });
  } else if (d.pfeil) {
    const dx = Math.cos(w), dy = Math.sin(w);
    const [ax, ay, bx, by] = [x - 60 * dx, y - 60 * dy, x + 60 * dx, y + 60 * dy];
    const kopf = (a) => [bx - 34 * Math.cos(w + a), by - 34 * Math.sin(w + a)];
    const [k1x, k1y] = kopf(0.45), [k2x, k2y] = kopf(-0.45);
    s += linie(ax, ay, bx, by, 8, BLAU) + `<polygon points="${r1(bx)},${r1(by)} ${r1(k1x)},${r1(k1y)} ${r1(k2x)},${r1(k2y)}" fill="${BLAU}"/>`;
    s += text(x, y + 66, d.label, { groesse: 34, farbe: BLAU, fett: true });
  } else {
    s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="26" fill="#fff" stroke="${BLAU}" stroke-width="6"/>`;
    s += linie(x - 18, y - 18, x + 18, y + 18, 4, BLAU) + linie(x - 18, y + 18, x + 18, y - 18, 4, BLAU);
    s += text(x, y + 66, d.label, { groesse: 34, farbe: BLAU, fett: true });
  }
  if (ausgewaehlt) s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="80" fill="none" stroke="#ffb000" stroke-width="5" stroke-dasharray="14 9"/>`;
  return `<g class="symbol">${s}</g>`;
}

function rahmen(inhalt, titel, legende, fuss) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BREITE} ${HOEHE}" width="${BREITE}" height="${HOEHE}">`;
  s += `<rect width="${BREITE}" height="${HOEHE}" fill="#fff"/>`;
  s += text(40, 70, titel, { groesse: 48, anker: 'start', fett: true });
  s += inhalt;
  legende.forEach((l, i) => { s += text(40, HOEHE - 120 + i * 40 - (legende.length - 1) * 40, l, { groesse: 30, anker: 'start', farbe: '#444' }); });
  s += linie(0, HOEHE - 56, BREITE, HOEHE - 56, 2, '#999');
  s += text(40, HOEHE - 18, fuss, { groesse: 28, anker: 'start', farbe: '#333' });
  return s + '</svg>';
}

const zwischen = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- Lageplan (Draufsicht) ----------
export function lageplanSvg(masse, symbole = [], { auswahl = -1, fuss = 'Skizze aus Maßen, nicht maßstäblich' } = {}) {
  const L = masse.laengeOben.zahl, B = masse.breiteOben.zahl;
  // Seitenverhältnis aus den Maßen, für die Lesbarkeit begrenzt (deshalb „nicht maßstäblich“).
  const r = zwischen(L && B ? L / B : 1.6, 0.6, 2.6);
  const fw = 1000, fh = 680, fx = 300, fy = 190;
  const w = r > fw / fh ? fw : fh * r, h = r > fw / fh ? fw / r : fh;
  const ox = fx + (fw - w) / 2, oy = fy + (fh - h) / 2;
  const anteil = (s, o) => (s !== null && o ? zwischen(s / o, 0.2, 0.9) : 0.6);
  const ax = anteil(masse.laengeSohle.zahl, L), ay = anteil(masse.breiteSohle.zahl, B);
  const iw = w * ax, ih = h * ay, ix = ox + (w - iw) / 2, iy = oy + (h - ih) / 2;

  let s = `<rect x="${r1(ix)}" y="${r1(iy)}" width="${r1(iw)}" height="${r1(ih)}" fill="${SOHLE}"/>`;
  // Böschungsschraffur: lange und kurze Striche von der Oberkante zur Sohle
  const schraffur = (x1, y1, x2, y2, nx, ny, tiefePx) => {
    const len = Math.hypot(x2 - x1, y2 - y1), schritt = 34;
    let t = '';
    for (let d = schritt, i = 0; d < len - 10; d += schritt, i++) {
      const px = x1 + (x2 - x1) * d / len, py = y1 + (y2 - y1) * d / len;
      const l = tiefePx * (i % 2 ? 0.35 : 0.7);
      t += linie(px, py, px + nx * l, py + ny * l, 2, '#555');
    }
    return t;
  };
  s += schraffur(ox, oy, ox + w, oy, 0, 1, iy - oy) + schraffur(ox, oy + h, ox + w, oy + h, 0, -1, oy + h - (iy + ih));
  s += schraffur(ox, oy, ox, oy + h, 1, 0, ix - ox) + schraffur(ox + w, oy, ox + w, oy + h, -1, 0, ox + w - (ix + iw));
  s += `<rect x="${r1(ox)}" y="${r1(oy)}" width="${r1(w)}" height="${r1(h)}" fill="none" stroke="#111" stroke-width="6"/>`;
  s += `<rect x="${r1(ix)}" y="${r1(iy)}" width="${r1(iw)}" height="${r1(ih)}" fill="none" stroke="#111" stroke-width="4"/>`;
  for (const [a, b, c, d] of [[ox, oy, ix, iy], [ox + w, oy, ix + iw, iy], [ox, oy + h, ix, iy + ih], [ox + w, oy + h, ix + iw, iy + ih]]) s += linie(a, b, c, d, 2.5, '#111');
  // Maße
  s += masslinie(ox, oy - 60, ox + w, oy - 60, massBeschriftung(masse.laengeOben));
  s += masslinie(ox - 60, oy, ox - 60, oy + h, massBeschriftung(masse.breiteOben));
  s += masslinie(ix + 20, iy + 50, ix + iw - 20, iy + 50, massBeschriftung(masse.laengeSohle), 1);
  s += masslinie(ix + 50, iy + 20, ix + 50, iy + ih - 20, massBeschriftung(masse.breiteSohle), 1);
  s += text(ix + iw / 2 + 30, iy + ih / 2 + 30, `Tiefe ${massBeschriftung(masse.tiefe)}`, { groesse: 38 });
  s += text(ox + w / 2, oy + h + 80, `Böschung ${massBeschriftung(masse.neigung, 'n')}`, { groesse: 38 });
  symbole.forEach((sym, i) => { s += symbolSvg(sym, i === auswahl); });
  const legende = ['Außen: Böschungsoberkante · innen (blau): Sohle', '? = Maß fehlt · ≈ = aus anderen Maßen errechnet'];
  return rahmen(s, 'Lageplan', legende, fuss);
}

// ---------- Schnitt ----------
export function schnittSvg(masse, symbole = [], { richtung = 'quer', auswahl = -1, fuss = 'Skizze aus Maßen, nicht maßstäblich' } = {}) {
  const seite = richtung === 'laengs' ? 'laenge' : 'breite';
  const O = masse[`${seite}Oben`], S = masse[`${seite}Sohle`], T = masse.tiefe, N = masse.neigung;
  // Zeichenwerte: echte Maße, wo vorhanden, sonst Platzhalter nur für die Form.
  const o = O.zahl || (S.zahl ? S.zahl * 1.6 : 10);
  const sZ = S.zahl !== null ? S.zahl : o * 0.6;
  const t = T.zahl || (o - sZ) / 2 / (N.zahl || 2) || o * 0.2;
  const sx = 1000 / o;
  const echt = t * sx;
  const hoehe = zwischen(echt, 220, 560);
  const verzerrt = echt < 220 ? 'Höhen überhöht dargestellt' : echt > 560 ? 'Höhen gestaucht dargestellt' : '';
  const gy = 330 + (560 - hoehe) / 2, x0 = 300, x1 = 1300; // flache Schnitte mittig
  const sw = zwischen(sZ * sx, 60, 960);
  const bx0 = 800 - sw / 2, bx1 = 800 + sw / 2, by = gy + hoehe;

  let s = `<polygon points="${x0},${gy} ${r1(bx0)},${r1(by)} ${r1(bx1)},${r1(by)} ${x1},${gy}" fill="${SOHLE}" stroke="none"/>`;
  s += linie(x0 - 200, gy, x0, gy, 5) + linie(x1, gy, x1 + 200, gy, 5);
  for (let x = x0 - 180; x < x0; x += 40) s += linie(x, gy, x - 14, gy - 18, 2, '#3a7d2c');
  for (let x = x1 + 30; x < x1 + 200; x += 40) s += linie(x, gy, x - 14, gy - 18, 2, '#3a7d2c');
  s += `<polyline points="${x0},${gy} ${r1(bx0)},${r1(by)} ${r1(bx1)},${r1(by)} ${x1},${gy}" fill="none" stroke="#111" stroke-width="6" stroke-linejoin="round"/>`;
  s += masslinie(x0, gy - 70, x1, gy - 70, massBeschriftung(O));
  s += masslinie(bx0, by + 50, bx1, by + 50, massBeschriftung(S), 1);
  s += masslinie(x1 + 110, gy, x1 + 110, by, massBeschriftung(T), 1);
  // Neigung an der rechten Böschung
  s += text((x1 + bx1) / 2 + 40, (gy + by) / 2 + 60, massBeschriftung(N, 'n'), { groesse: 38, anker: 'start' });
  symbole.forEach((sym, i) => { s += symbolSvg(sym, i === auswahl); });
  const legende = [`Schnitt ${richtung === 'laengs' ? 'in Längsrichtung' : 'quer zum Becken'}${verzerrt ? ` · ${verzerrt}` : ''}`, '? = Maß fehlt · ≈ = aus anderen Maßen errechnet'];
  return rahmen(s, richtung === 'laengs' ? 'Längsschnitt' : 'Querschnitt', legende, fuss);
}

export function skizzeSvg(feld, masse, symbole, opts = {}) {
  return feld.ansicht === 'schnitt'
    ? schnittSvg(masse, symbole, { ...opts, richtung: feld.richtung || 'quer' })
    : lageplanSvg(masse, symbole, opts);
}

// Index des Symbols nahe (x, y) oder -1.
export function symbolBei(symbole, x, y, toleranz = 75) {
  for (let i = symbole.length - 1; i >= 0; i--) if (Math.hypot(symbole[i].x - x, symbole[i].y - y) <= toleranz) return i;
  return -1;
}

// Prüft die Einträge eines massskizze-Feldes in der Gliederung (für pruefeGliederung).
export function pruefeMassskizzeFeld(f, index, wo) {
  const fehler = [];
  if (!['lageplan', 'schnitt'].includes(f.ansicht)) fehler.push(`${wo}: "ansicht" muss "lageplan" oder "schnitt" sein.`);
  if (f.richtung && !['quer', 'laengs'].includes(f.richtung)) fehler.push(`${wo}: "richtung" muss "quer" oder "laengs" sein.`);
  if (!f.masse || typeof f.masse !== 'object') { fehler.push(`${wo}: "masse" (Zuordnung der Maße zu Zahlfeldern) fehlt.`); return fehler; }
  for (const [k, ziel] of Object.entries(f.masse)) {
    if (!(k in MASSE)) { fehler.push(`${wo}: unbekanntes Maß "${k}" (erlaubt: ${Object.keys(MASSE).join(', ')}).`); continue; }
    const t = index.get(ziel);
    if (!t) fehler.push(`${wo}: Maß "${k}" zeigt auf kein Feld (${ziel}).`);
    else if (t.art !== 'zahl') fehler.push(`${wo}: Maß "${k}" muss auf ein Zahlfeld zeigen.`);
    else if (k === 'neigung' && t.format !== 'verhaeltnis' && t.einheit !== '1:n') fehler.push(`${wo}: "neigung" muss auf ein Feld im Format 1 : n zeigen.`);
  }
  return fehler;
}
