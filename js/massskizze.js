// Skizzen aus den Maßen: Lageplan (Grundriss), Querschnitt, Längsschnitt – als SVG (Vektorgrafik).
// Reine Logik ohne Bildschirm – automatisch testbar.
//
// Grundsätze (Auftrag, Funktion 7):
// - Gezeichnet wird nur, was gemessen, abgelesen oder ausdrücklich geschätzt ist.
// - Fehlende Maße: offene Maßlinie mit „?“, Umriss nur als graue Platzhalterlinie („Maß fehlt“).
// - Geschätzte Maße: gestrichelt und „ca.“. Aus anderen Maßen berechnete: strichpunktiert und „(berechnet)“.
// - Keine Regelquerschnitte, keine typischen Neigungen.
// - Kennzeichnung: Maßstabsleiste, Datum, Erfasser, Vermerk.

export const VERMERK = 'Skizze nach örtlichem Aufmaß, keine Vermessung, nicht maßstäblich verbindlich';
export const MASSSTAEBE = [50, 100, 200, 250, 500, 1000, 2000];
const RASTER_SCHRITTE = [0.5, 1, 2, 5, 10, 20, 50, 100];

// Blatt: Zeichenfläche 1600 px breit entspricht 277 mm (DIN A4 quer abzüglich Rand).
export const BREITE = 1600;
export const PX_PRO_MM = BREITE / 277;
export const FUSS = 110; // Höhe der Kennzeichnungsleiste unter der Zeichnung

export function pxProM(massstab) {
  return (1000 / massstab) * PX_PRO_MM;
}

// Kleinster Maßstab (größte Darstellung), bei dem breite × hoehe (Meter) in die Fläche passt.
export function massstabWaehlen(breiteM, hoeheM, flaecheB, flaecheH) {
  for (const m of MASSSTAEBE) {
    const p = pxProM(m);
    if (breiteM * p <= flaecheB && hoeheM * p <= flaecheH) return m;
  }
  return MASSSTAEBE[MASSSTAEBE.length - 1];
}

// Rasterweite in Metern: kleinster runder Schritt, dessen Kästchen mindestens `minPx` groß ist.
export function rasterWaehlen(massstab, minPx = 80) {
  const p = pxProM(massstab);
  return RASTER_SCHRITTE.find((s) => s * p >= minPx) || RASTER_SCHRITTE[RASTER_SCHRITTE.length - 1];
}

// Am Raster ausrichten (Meter).
export function amRaster(wertM, rasterM) {
  return Math.round(Math.round(wertM / rasterM) * rasterM * 1000) / 1000;
}

// Fang beim Zeichnen im Lageplan: Rasterpunkte alle 10 cm in der Natur.
export const FANG_M = 0.1;

export function mDE(z, stellen = 2) {
  return z.toFixed(stellen).replace('.', ',');
}

// ---------- Maße aus dem Beckenbuch lesen ----------
// zuordnung: { laengeOben: 'A4_2.laenge_ok', breiteOben, laengeSohle, breiteSohle, boeschung, tiefe, dauerstau, schlammraum }
// Ergebnis je Schlüssel: { wert: Zahl, herkunft, quelle: 'mass' } | { fehlt: true, pruefen?: true }
export function leseMasse(buch, zuordnung) {
  const r = {};
  for (const [k, key] of Object.entries(zuordnung || {})) {
    const e = (buch.werte || {})[key];
    if (e && e.mass && typeof e.mass.zahl === 'number' && Number.isFinite(e.mass.zahl)) {
      r[k] = { wert: e.mass.zahl, herkunft: e.herkunft || null };
    } else {
      r[k] = { fehlt: true, pruefen: !!(e && String(e.wert ?? '').trim()) };
    }
  }
  return r;
}

// Maße ergänzen, die sich eindeutig aus anderen erfassten Maßen ergeben (Breite unten = Breite oben − 2·n·t usw.).
// Alles Berechnete wird gekennzeichnet. Nichts wird aus Regelwerten angenommen.
export function ergaenze(m) {
  const x = { ...m };
  const da = (k) => x[k] && !x[k].fehlt;
  const ber = (wert) => ({ wert: Math.round(wert * 1000) / 1000, berechnet: true });
  for (const [oben, unten] of [['breiteOben', 'breiteSohle'], ['laengeOben', 'laengeSohle']]) {
    if (!x[oben] || !x[unten]) continue;
    if (da(oben) && !da(unten) && da('boeschung') && da('tiefe')) {
      const w = x[oben].wert - 2 * x.boeschung.wert * x.tiefe.wert;
      if (w > 0) x[unten] = ber(w);
    } else if (!da(oben) && da(unten) && da('boeschung') && da('tiefe')) {
      x[oben] = ber(x[unten].wert + 2 * x.boeschung.wert * x.tiefe.wert);
    }
  }
  if (x.boeschung && !da('boeschung') && da('tiefe') && x.tiefe.wert > 0) {
    for (const [oben, unten] of [['breiteOben', 'breiteSohle'], ['laengeOben', 'laengeSohle']]) {
      if (da(oben) && da(unten) && !x[oben].berechnet && !x[unten].berechnet && x[oben].wert > x[unten].wert) {
        x.boeschung = ber((x[oben].wert - x[unten].wert) / (2 * x.tiefe.wert));
        break;
      }
    }
  }
  return x;
}

// Beschriftung eines Maßes: „42,00 m“, „ca. 42,00 m“, „34,00 m (berechnet)“, „?“
export function massText(e, einheit = 'm', stellen = 2) {
  if (!e || e.fehlt) return e && e.pruefen ? '? (zur Prüfung)' : '?';
  const z = einheit === '1:n' ? `1 : ${mDE(e.wert, e.wert % 1 ? 1 : 0)}` : `${mDE(e.wert, stellen)} ${einheit}`;
  if (e.berechnet) return `${z} (berechnet)`;
  if (e.herkunft === 'geschaetzt') return `ca. ${z}`;
  return z;
}

// Linienart nach Herkunft
export function linienart(e) {
  if (!e || e.fehlt) return 'fehlt';
  if (e.berechnet) return 'berechnet';
  if (e.herkunft === 'geschaetzt') return 'geschaetzt';
  return 'gemessen';
}
const STRICH = { gemessen: '', geschaetzt: '18 10', berechnet: '22 8 4 8', fehlt: '4 10' };

// ---------- Geometrie Lageplan ----------
// Platzhalter für fehlende Maße dienen nur der Anordnung und werden als „Maß fehlt“ dargestellt.
export function lageplanGeometrie(masse) {
  const m = ergaenze(masse);
  const wert = (e) => (e && !e.fehlt ? e.wert : null);
  const L = wert(m.laengeOben), B = wert(m.breiteOben), Ls = wert(m.laengeSohle), Bs = wert(m.breiteSohle);
  const bekannt = [L, B, Ls, Bs].filter((v) => v !== null);
  if (!bekannt.length) return null;
  const ersatz = Math.max(...bekannt);
  const aussen = {
    l: L ?? (Ls !== null ? Ls * 1.25 : ersatz), b: B ?? (Bs !== null ? Bs * 1.25 : ersatz * 0.5),
    offenL: L === null, offenB: B === null, artL: linienart(m.laengeOben), artB: linienart(m.breiteOben),
  };
  let innen = null;
  if (Ls !== null || Bs !== null) {
    innen = {
      l: Ls ?? aussen.l * 0.8, b: Bs ?? aussen.b * 0.6,
      offenL: Ls === null, offenB: Bs === null, artL: linienart(m.laengeSohle), artB: linienart(m.breiteSohle),
    };
  }
  return { masse: m, aussen, innen };
}

// ---------- SVG-Hilfen ----------
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FARBE = { linie: '#111', fehlt: '#9aa0a6', mass: '#0b3d6b', wasser: '#2a7bd4', raster: '#e3e8ee', rot: '#c4001d', blau: '#0047b3' };

function linie(x1, y1, x2, y2, { farbe = FARBE.linie, dicke = 3, art = 'gemessen', extra = '' } = {}) {
  const d = STRICH[art] ? ` stroke-dasharray="${STRICH[art]}"` : '';
  return `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${art === 'fehlt' ? FARBE.fehlt : farbe}" stroke-width="${dicke}"${d}${extra}/>`;
}
function text(x, y, t, { groesse = 26, farbe = FARBE.linie, anker = 'middle', gewicht = 400, drehen = 0 } = {}) {
  const tr = drehen ? ` transform="rotate(${drehen} ${r(x)} ${r(y)})"` : '';
  return `<text x="${r(x)}" y="${r(y)}" font-family="Arial, Helvetica, sans-serif" font-size="${groesse}" font-weight="${gewicht}" fill="${farbe}" text-anchor="${anker}"${tr}>${esc(t)}</text>`;
}
const r = (z) => Math.round(z * 10) / 10;

// Maßkette (waagerecht oder senkrecht) mit Begrenzungsstrichen und Text.
function masskette(x1, y1, x2, y2, beschriftung, art) {
  const offen = art === 'fehlt';
  const farbe = offen ? FARBE.fehlt : FARBE.mass;
  const senk = Math.abs(x2 - x1) < Math.abs(y2 - y1);
  const t = 12;
  let s = linie(x1, y1, x2, y2, { farbe, dicke: 2, art: offen ? 'fehlt' : (art === 'geschaetzt' || art === 'berechnet' ? art : 'gemessen') });
  s += senk ? linie(x1 - t, y1, x1 + t, y1, { farbe, dicke: 2 }) + linie(x2 - t, y2, x2 + t, y2, { farbe, dicke: 2 })
    : linie(x1, y1 - t, x1, y1 + t, { farbe, dicke: 2 }) + linie(x2, y2 - t, x2, y2 + t, { farbe, dicke: 2 });
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  s += senk ? text(mx - 10, my, beschriftung, { farbe, drehen: -90, gewicht: 600 }) : text(mx, my - 10, beschriftung, { farbe, gewicht: 600 });
  return s;
}

function rechteck(cx, cy, w, h, artL, artB, dicke) {
  const x = cx - w / 2, y = cy - h / 2;
  return linie(x, y, x + w, y, { art: artL, dicke }) + linie(x, y + h, x + w, y + h, { art: artL, dicke })
    + linie(x, y, x, y + h, { art: artB, dicke }) + linie(x + w, y, x + w, y + h, { art: artB, dicke });
}

// Maßstabsleiste: 4 Abschnitte zu runden Metern, Länge höchstens ca. 420 px.
export function massstabsleiste(massstab) {
  const p = pxProM(massstab);
  const schritte = [1, 2, 5, 10, 20, 25, 50, 100, 200];
  // größter runder Abschnitt, bei dem die Leiste nicht länger als ca. 420 px wird
  const s = schritte.filter((x) => x * p * 4 <= 420).pop() || schritte[0];
  return { abschnittM: s, abschnitte: 4, laengePx: s * p * 4 };
}

function kennzeichnung(y0, { titel, massstab, datum, erfasser, rasterM }) {
  const leiste = massstabsleiste(massstab);
  const p = pxProM(massstab);
  let s = `<rect x="0" y="${y0}" width="${BREITE}" height="${FUSS}" fill="#fff"/>`;
  s += linie(0, y0 + 2, BREITE, y0 + 2, { farbe: '#555', dicke: 2 });
  // Leiste
  const x0 = 40, yl = y0 + 50;
  for (let i = 0; i < leiste.abschnitte; i++) {
    const xa = x0 + i * leiste.abschnittM * p;
    s += `<rect x="${r(xa)}" y="${yl}" width="${r(leiste.abschnittM * p)}" height="12" fill="${i % 2 ? '#fff' : '#111'}" stroke="#111" stroke-width="2"/>`;
    s += text(xa, yl + 40, `${i * leiste.abschnittM}`, { groesse: 20 });
  }
  s += text(x0 + leiste.laengePx, yl + 40, `${leiste.abschnitte * leiste.abschnittM} m`, { groesse: 20 });
  s += text(x0, yl - 14, `M 1:${massstab}${rasterM ? ` · Raster ${mDE(rasterM, rasterM % 1 ? 1 : 0)} m` : ''}`, { groesse: 22, anker: 'start', gewicht: 700 });
  const xt = Math.max(x0 + leiste.laengePx + 80, 520);
  s += text(xt, y0 + 40, [titel, datum, erfasser ? `Erfasser: ${erfasser}` : ''].filter(Boolean).join(' · '), { groesse: 24, anker: 'start', gewicht: 700 });
  s += text(xt, y0 + 76, VERMERK, { groesse: 22, anker: 'start' });
  return s;
}

function raster(x0, y0, w, h, cx, cy, schrittPx) {
  let s = '';
  for (let x = cx % schrittPx; x <= w; x += schrittPx) s += `<line x1="${r(x0 + x)}" y1="${y0}" x2="${r(x0 + x)}" y2="${y0 + h}" stroke="${FARBE.raster}" stroke-width="1.5"/>`;
  for (let y = cy % schrittPx; y <= h; y += schrittPx) s += `<line x1="${x0}" y1="${r(y0 + y)}" x2="${x0 + w}" y2="${r(y0 + y)}" stroke="${FARBE.raster}" stroke-width="1.5"/>`;
  return s;
}

// ---------- Symbole ----------
// Kleine Auswahl für den Lageplan. Größe in Pixeln (unabhängig vom Maßstab), Lage in Metern.
export const SYMBOLE = {
  zulauf: { name: 'Zulauf' },
  ablauf: { name: 'Ablauf' },
  drossel: { name: 'Drossel' },
  notueberlauf: { name: 'Notüberlauf' },
  schacht: { name: 'Schacht' },
  schieber: { name: 'Schieber' },
  tor: { name: 'Tor' },
  zufahrt: { name: 'Zufahrt' },
  fliessrichtung: { name: 'Fließrichtung' },
  text: { name: 'Text' },
};

function pfeil(farbe, laenge = 70) {
  return `<line x1="${-laenge / 2}" y1="0" x2="${laenge / 2 - 6}" y2="0" stroke="${farbe}" stroke-width="5"/><polygon points="${laenge / 2},0 ${laenge / 2 - 22},-12 ${laenge / 2 - 22},12" fill="${farbe}"/>`;
}

export function symbolSvg(el) {
  const inhalt = {
    zulauf: () => pfeil(FARBE.blau) + text(0, -22, 'Zulauf', { groesse: 22, farbe: FARBE.blau }),
    ablauf: () => pfeil(FARBE.blau) + text(0, -22, 'Ablauf', { groesse: 22, farbe: FARBE.blau }),
    fliessrichtung: () => pfeil(FARBE.blau, 110),
    drossel: () => `<circle r="20" fill="#fff" stroke="#111" stroke-width="4"/>${text(0, 8, 'D', { groesse: 22, gewicht: 700 })}${text(0, -30, 'Drossel', { groesse: 20 })}`,
    notueberlauf: () => `<polygon points="0,-20 20,16 -20,16" fill="#fff" stroke="${FARBE.blau}" stroke-width="4"/>${text(0, -30, 'Notüberlauf', { groesse: 20, farbe: FARBE.blau })}`,
    schacht: () => `<circle r="18" fill="#fff" stroke="#111" stroke-width="4"/><circle r="5" fill="#111"/>${text(0, -28, el.text || 'Schacht', { groesse: 20 })}`,
    schieber: () => `<polygon points="-20,-14 20,14 20,-14 -20,14" fill="#111" stroke="#111" stroke-width="2"/>${text(0, -24, el.text || 'Schieber', { groesse: 20 })}`,
    tor: () => `<line x1="-40" y1="0" x2="-14" y2="0" stroke="#111" stroke-width="5"/><line x1="14" y1="0" x2="40" y2="0" stroke="#111" stroke-width="5"/><path d="M -14 0 A 28 28 0 0 1 14 -28" fill="none" stroke="#111" stroke-width="3"/>${text(0, -36, 'Tor', { groesse: 20 })}`,
    zufahrt: () => pfeil('#444', 90) + text(0, 30, 'Zufahrt', { groesse: 22, farbe: '#444' }),
    text: () => text(0, 8, el.text || 'Text', { groesse: 26, gewicht: 600 }),
  }[el.art];
  return inhalt ? inhalt() : '';
}

function zaunSvg(punkte) {
  if (punkte.length < 2) return '';
  const pts = punkte.map((p) => `${r(p[0])},${r(p[1])}`).join(' ');
  let s = `<polyline points="${pts}" fill="none" stroke="#2e7d32" stroke-width="3"/>`;
  // kleine Kreuze im Abstand von ca. 40 px
  for (let i = 1; i < punkte.length; i++) {
    const [x1, y1] = punkte[i - 1], [x2, y2] = punkte[i];
    const l = Math.hypot(x2 - x1, y2 - y1);
    for (let d = 20; d < l; d += 40) {
      const x = x1 + (x2 - x1) * (d / l), y = y1 + (y2 - y1) * (d / l);
      s += `<line x1="${r(x - 6)}" y1="${r(y - 6)}" x2="${r(x + 6)}" y2="${r(y + 6)}" stroke="#2e7d32" stroke-width="2.5"/><line x1="${r(x - 6)}" y1="${r(y + 6)}" x2="${r(x + 6)}" y2="${r(y - 6)}" stroke="#2e7d32" stroke-width="2.5"/>`;
    }
  }
  return s;
}

function nordpfeilSvg(x, y, winkel, quelle) {
  return `<g transform="translate(${x} ${y}) rotate(${r(winkel || 0)})"><polygon points="0,-46 18,20 0,8 -18,20" fill="#111"/>${text(0, -54, 'N', { groesse: 30, gewicht: 700 })}</g>`
    + text(x, y + 56, quelle === 'kompass' ? '(ca., Kompass)' : '(ca.)', { groesse: 18 });
}

// ---------- Lageplan ----------
export const LP_HOEHE = 1200;
const LP_FLAECHE = { b: 1150, h: 720 }; // Platz für das Becken; Rest für Maßketten, Symbole, Nordpfeil

export function lageplanMassstab(geo) {
  return massstabWaehlen(geo.aussen.l, geo.aussen.b, LP_FLAECHE.b, LP_FLAECHE.h);
}

// Umrechnung Meter (Mitte des Beckens = 0,0; x nach rechts = Längsrichtung, y nach unten) ↔ Pixel
export function lpPunkt(xM, yM, massstab) {
  const p = pxProM(massstab);
  return [BREITE / 2 + xM * p, LP_HOEHE / 2 + yM * p];
}
export function lpMeter(xPx, yPx, massstab) {
  const p = pxProM(massstab);
  return [(xPx - BREITE / 2) / p, (yPx - LP_HOEHE / 2) / p];
}

// wert: gespeicherter Feldwert { massstab: Zahl|'auto', elemente: [...], nord: { winkel, quelle }, schnitte: true }
export function lageplanSvg(masse, wert = {}, info = {}) {
  const geo = lageplanGeometrie(masse);
  if (!geo) return null;
  const massstab = wert.massstab && wert.massstab !== 'auto' ? wert.massstab : lageplanMassstab(geo);
  const p = pxProM(massstab);
  const cx = BREITE / 2, cy = LP_HOEHE / 2;
  const rasterM = rasterWaehlen(massstab);
  const { aussen, innen, masse: m } = geo;
  const w = aussen.l * p, h = aussen.b * p;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BREITE} ${LP_HOEHE + FUSS}" width="${BREITE}" height="${LP_HOEHE + FUSS}">`;
  s += `<rect width="${BREITE}" height="${LP_HOEHE + FUSS}" fill="#fff"/>`;
  s += raster(0, 0, BREITE, LP_HOEHE, cx, cy, rasterM * p);
  s += text(40, 50, info.titel || 'Lageplanskizze', { groesse: 32, anker: 'start', gewicht: 700 });
  // Umriss
  s += rechteck(cx, cy, w, h, aussen.offenL ? 'fehlt' : aussen.artL, aussen.offenB ? 'fehlt' : aussen.artB, 5);
  if (innen) s += rechteck(cx, cy, innen.l * p, innen.b * p, innen.offenL ? 'fehlt' : innen.artL, innen.offenB ? 'fehlt' : innen.artB, 3);
  if (aussen.offenL || aussen.offenB || (innen && (innen.offenL || innen.offenB))) {
    s += text(cx, cy + h / 2 - 16, 'graue Linien: Maß fehlt', { groesse: 20, farbe: FARBE.fehlt });
  }
  // Maßketten: oben/links Böschungsoberkante, unten/rechts Sohle
  s += masskette(cx - w / 2, cy - h / 2 - 60, cx + w / 2, cy - h / 2 - 60, `Oberkante ${massText(m.laengeOben)}`, linienart(m.laengeOben));
  s += masskette(cx - w / 2 - 60, cy - h / 2, cx - w / 2 - 60, cy + h / 2, `Oberkante ${massText(m.breiteOben)}`, linienart(m.breiteOben));
  if (innen) {
    const wi = innen.l * p, hi = innen.b * p;
    s += masskette(cx - wi / 2, cy + h / 2 + 60, cx + wi / 2, cy + h / 2 + 60, `Sohle ${massText(m.laengeSohle)}`, linienart(m.laengeSohle));
    s += masskette(cx + w / 2 + 60, cy - hi / 2, cx + w / 2 + 60, cy + hi / 2, `Sohle ${massText(m.breiteSohle)}`, linienart(m.breiteSohle));
  }
  if (m.boeschung) s += text(cx, cy + 10, `Böschung ${massText(m.boeschung, '1:n')}`, { groesse: 22, farbe: m.boeschung.fehlt ? FARBE.fehlt : FARBE.mass });
  // Schnittlinien A–A (quer) und B–B (längs)
  if (wert.schnitte !== false) {
    const ex = 34;
    s += linie(cx, cy - h / 2 - ex, cx, cy + h / 2 + ex, { farbe: FARBE.rot, dicke: 2, art: 'berechnet' });
    s += text(cx + 18, cy - h / 2 - ex + 6, 'A', { groesse: 26, farbe: FARBE.rot, gewicht: 700 }) + text(cx + 18, cy + h / 2 + ex + 18, 'A', { groesse: 26, farbe: FARBE.rot, gewicht: 700 });
    s += linie(cx - w / 2 - ex, cy + 40, cx + w / 2 + ex, cy + 40, { farbe: FARBE.rot, dicke: 2, art: 'berechnet' });
    s += text(cx - w / 2 - ex - 20, cy + 48, 'B', { groesse: 26, farbe: FARBE.rot, gewicht: 700 }) + text(cx + w / 2 + ex + 20, cy + 48, 'B', { groesse: 26, farbe: FARBE.rot, gewicht: 700 });
  }
  // Elemente (Symbole, Zaun) – Lage in Metern
  for (const el of wert.elemente || []) {
    if (el.typ === 'zaun') s += zaunSvg((el.punkte || []).map(([x, y]) => lpPunkt(x, y, massstab)));
    else if (el.typ === 'linie' && el.punkte && el.punkte.length === 2) {
      // im Raster gezeichnete Linie (Lage in Metern), auf Wunsch mit Länge
      const [[ax, ay], [bx, by]] = el.punkte;
      const [x1, y1] = lpPunkt(ax, ay, massstab), [x2, y2] = lpPunkt(bx, by, massstab);
      s += linie(x1, y1, x2, y2, { farbe: '#111', dicke: 3 });
      if (el.laenge) {
        const l = Math.hypot(bx - ax, by - ay);
        const w = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        const wl = w > 90 || w < -90 ? w + 180 : w;
        s += text((x1 + x2) / 2, (y1 + y2) / 2 - 10, `${mDE(l)} m`, { groesse: 20, farbe: FARBE.mass, drehen: wl });
      }
    }
    else if (el.typ === 'symbol') {
      const [x, y] = lpPunkt(el.x, el.y, massstab);
      s += `<g transform="translate(${r(x)} ${r(y)}) rotate(${el.winkel || 0})">${symbolSvg(el)}</g>`;
    }
  }
  if (wert.nord) s += nordpfeilSvg(BREITE - 90, 120, wert.nord.winkel, wert.nord.quelle);
  s += kennzeichnung(LP_HOEHE, { titel: info.titel || 'Lageplanskizze', massstab, datum: info.datum, erfasser: info.erfasser, rasterM });
  s += '</svg>';
  return { svg: s, massstab, rasterM, geo };
}

// ---------- Schnitte ----------
export const SCHNITT_HOEHE = 620;

// Geometrie eines Schnitts: oben/unten Breite (bzw. Länge), Tiefe, Dauerstau- und Schlammhöhe – je mit Herkunft.
export function schnittGeometrie(masse, richtung) {
  const m = ergaenze(masse);
  const oben = richtung === 'quer' ? m.breiteOben : m.laengeOben;
  const unten = richtung === 'quer' ? m.breiteSohle : m.laengeSohle;
  const wert = (e) => (e && !e.fehlt ? e.wert : null);
  const o = wert(oben), u = wert(unten), t = wert(m.tiefe);
  if (o === null && u === null) return null;
  const ob = o ?? u * 1.4;
  const ub = u ?? ob * 0.6;
  const tiefe = t ?? ob / 8;
  return {
    oben: { wert: ob, e: oben, offen: o === null }, unten: { wert: ub, e: unten, offen: u === null },
    tiefe: { wert: tiefe, e: m.tiefe, offen: t === null },
    boeschung: m.boeschung, dauerstau: m.dauerstau, schlammraum: m.schlammraum,
  };
}

export function schnittSvg(masse, richtung, info = {}) {
  const g = schnittGeometrie(masse, richtung);
  if (!g) return null;
  const massstab = info.massstab || massstabWaehlen(g.oben.wert, g.tiefe.wert, 1200, 330);
  const p = pxProM(massstab);
  const cx = BREITE / 2, y0 = 200; // Geländeoberkante
  const wo = g.oben.wert * p, wu = g.unten.wert * p, ht = g.tiefe.wert * p;
  const yS = y0 + ht;
  const name = richtung === 'quer' ? 'Querschnitt A–A' : 'Längsschnitt B–B';
  const rasterM = rasterWaehlen(massstab);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BREITE} ${SCHNITT_HOEHE + FUSS}" width="${BREITE}" height="${SCHNITT_HOEHE + FUSS}">`;
  s += `<rect width="${BREITE}" height="${SCHNITT_HOEHE + FUSS}" fill="#fff"/>`;
  s += text(40, 50, name, { groesse: 32, anker: 'start', gewicht: 700 });
  // Wasser und Schlamm (nur wenn erfasst)
  const breiteBei = (hUeberSohle) => wu + (wo - wu) * (hUeberSohle / g.tiefe.wert);
  if (g.dauerstau && !g.dauerstau.fehlt && g.dauerstau.wert > 0) {
    const hd = Math.min(g.dauerstau.wert, g.tiefe.wert), yw = yS - hd * p, bw = breiteBei(hd);
    s += `<polygon points="${r(cx - wu / 2)},${r(yS)} ${r(cx + wu / 2)},${r(yS)} ${r(cx + bw / 2)},${r(yw)} ${r(cx - bw / 2)},${r(yw)}" fill="#cfe3fa"/>`;
    s += linie(cx - bw / 2, yw, cx + bw / 2, yw, { farbe: FARBE.wasser, dicke: 3, art: linienart(g.dauerstau) === 'geschaetzt' ? 'geschaetzt' : 'gemessen' });
    s += text(cx - bw / 2 + 12, yw - 10, `Dauerstau ${massText(g.dauerstau)} über Sohle`, { groesse: 22, farbe: FARBE.wasser, anker: 'start' });
  }
  if (g.schlammraum && !g.schlammraum.fehlt && g.schlammraum.wert > 0) {
    const hs = Math.min(g.schlammraum.wert, g.tiefe.wert), ys = yS - hs * p, bs = breiteBei(hs);
    s += `<defs><pattern id="schraffur" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="#8d6e63" stroke-width="3"/></pattern></defs>`;
    s += `<polygon points="${r(cx - wu / 2)},${r(yS)} ${r(cx + wu / 2)},${r(yS)} ${r(cx + bs / 2)},${r(ys)} ${r(cx - bs / 2)},${r(ys)}" fill="url(#schraffur)" stroke="#8d6e63" stroke-width="2"/>`;
    s += text(cx - bs / 2 - 14, ys + 8, `Schlammraum ${massText(g.schlammraum)}`, { groesse: 22, farbe: '#6d4c41', anker: 'end' });
  }
  // Gelände und Böschungen
  const artO = g.oben.offen ? 'fehlt' : linienart(g.oben.e);
  const artU = g.unten.offen ? 'fehlt' : linienart(g.unten.e);
  const artT = g.tiefe.offen ? 'fehlt' : linienart(g.tiefe.e);
  // Böschungslinie: grau, wenn ein Eckmaß fehlt; sonst nach Herkunft der Neigung (ohne Neigung ergibt sie sich aus den Maßen).
  let artB = 'gemessen';
  if ([artO, artU, artT].includes('fehlt')) artB = 'fehlt';
  else if (g.boeschung && !g.boeschung.fehlt) artB = linienart(g.boeschung);
  else if ([artO, artU, artT].includes('geschaetzt')) artB = 'geschaetzt';
  s += linie(cx - wo / 2 - 140, y0, cx - wo / 2, y0, { dicke: 4 }) + linie(cx + wo / 2, y0, cx + wo / 2 + 140, y0, { dicke: 4 });
  s += text(cx - wo / 2 - 140, y0 - 12, 'Gelände / Böschungsoberkante', { groesse: 20, anker: 'start' });
  s += linie(cx - wo / 2, y0, cx - wu / 2, yS, { dicke: 4, art: artB }) + linie(cx + wo / 2, y0, cx + wu / 2, yS, { dicke: 4, art: artB });
  s += linie(cx - wu / 2, yS, cx + wu / 2, yS, { dicke: 4, art: artU });
  // Maßketten
  s += masskette(cx - wo / 2, y0 - 60, cx + wo / 2, y0 - 60, `Oberkante ${massText(g.oben.offen ? { fehlt: true, pruefen: g.oben.e && g.oben.e.pruefen } : g.oben.e)}`, artO);
  s += masskette(cx - wu / 2, yS + 60, cx + wu / 2, yS + 60, `Sohle ${massText(g.unten.offen ? { fehlt: true, pruefen: g.unten.e && g.unten.e.pruefen } : g.unten.e)}`, artU);
  s += masskette(cx + wo / 2 + 170, y0, cx + wo / 2 + 170, yS, `Tiefe ${massText(g.tiefe.offen ? { fehlt: true, pruefen: g.tiefe.e && g.tiefe.e.pruefen } : g.tiefe.e)}`, artT);
  const bText = `Böschung ${massText(g.boeschung || { fehlt: true }, '1:n')}`;
  s += text(cx - (wo + wu) / 4 - 20, y0 + Math.min(30, (yS - y0) / 2), bText, { groesse: 22, farbe: g.boeschung && !g.boeschung.fehlt ? FARBE.mass : FARBE.fehlt, anker: 'end' });
  if ([artO, artU, artT].includes('fehlt')) s += text(cx, yS + 110, 'graue Linien: Maß fehlt, Darstellung nur zur Anordnung', { groesse: 20, farbe: FARBE.fehlt });
  s += kennzeichnung(SCHNITT_HOEHE, { titel: name, massstab, datum: info.datum, erfasser: info.erfasser, rasterM: null });
  s += '</svg>';
  return { svg: s, massstab, geo: g };
}

export function svgDatenUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
