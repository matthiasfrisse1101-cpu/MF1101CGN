// Skizzen: Datenmodell, Zeichnen, Trefferprüfung, Abgleich der Eingriffsstellen.
// Ohne Bildschirmelemente (außer dem übergebenen Zeichenkontext) – deshalb automatisch testbar.
//
// Eine Skizze ist ein Datensatz im Speicher „skizzen“:
// { id, buchId, feldKey, breite, hoehe, grundlage: null | { blob, breite, hoehe },
//   elemente: [ {typ:'strich', farbe, dicke, punkte:[[x,y],…]} | {typ:'marke', nr, x, y} | {typ:'text', text, x, y, farbe} ],
//   angelegt, geaendert, bild: Blob (fertig gezeichnet, für Vorschau und Ausgabe) }
// Koordinaten sind Pixel der Skizze (breite × hoehe), unabhängig von der Bildschirmgröße.

import { pxProM, rasterWaehlen } from './massskizze.js';

export const LEER_BREITE = 1600;
export const LEER_HOEHE = 1200;
export const FARBEN = { schwarz: '#111111', rot: '#c4001d', blau: '#0047b3' };
export const FUSS_HOEHE = 56; // Leiste unter der Skizze in der fertigen Grafik

// Größen richten sich nach der längeren Seite der Skizze, damit Marken und Text auf
// leerer Fläche und auf Fotos gleich groß wirken (auf dem Handy ca. 13 Pixel Markenradius).
export function masse(skizze) {
  const l = Math.max(skizze.breite, skizze.hoehe);
  return {
    radius: Math.round(l * 0.04),
    text: Math.round(l * 0.04),
    duenn: Math.max(2, Math.round(l * 0.005)),
    dick: Math.max(4, Math.round(l * 0.013)),
  };
}

export function neueSkizze({ id, buchId, feldKey, grundlage = null, jetzt = new Date().toISOString() }) {
  const breite = grundlage ? grundlage.breite : LEER_BREITE;
  const hoehe = grundlage ? grundlage.hoehe : LEER_HOEHE;
  return { id, buchId, feldKey, breite, hoehe, grundlage, elemente: [], angelegt: jetzt, geaendert: jetzt, bild: null };
}

// Kleinste freie Nummer (Lücken werden zuerst gefüllt). `belegt` sind Nummern auch aus anderen Skizzen desselben Feldes.
export function naechsteMarkenNr(belegt) {
  const set = new Set(belegt.map(Number));
  let n = 1;
  while (set.has(n)) n++;
  return n;
}

export function markenNummern(skizzen) {
  const nrn = [];
  for (const s of skizzen) for (const e of s.elemente || []) if (e.typ === 'marke') nrn.push(e.nr);
  return nrn.sort((a, b) => a - b);
}

// ---------- Eingriffsstellen ----------
// Vergleicht die Marken der Skizze mit den Zeilen der Tabelle (Spalte „nr“).
export function eingriffsAbgleich(markenNrn, zeilen) {
  const marken = new Set(markenNrn.map(Number));
  const zeilenNrn = new Set();
  for (const z of zeilen || []) {
    if (z._vorschlag) continue;
    const n = Number(String(z.nr ?? '').trim().replace(',', '.'));
    if (Number.isInteger(n) && n > 0) zeilenNrn.add(n);
  }
  return {
    ohneZeile: [...marken].filter((n) => !zeilenNrn.has(n)).sort((a, b) => a - b),
    ohneMarke: [...zeilenNrn].filter((n) => !marken.has(n)).sort((a, b) => a - b),
  };
}

// Legt für Marken ohne Tabellenzeile eine leere Zeile an. Vorhandene Zeilen bleiben unverändert.
export function zeilenFuerMarken(markenNrn, zeilen, neueZeilenId) {
  const { ohneZeile } = eingriffsAbgleich(markenNrn, zeilen);
  const neu = [...(zeilen || [])];
  for (const n of ohneZeile) neu.push({ id: neueZeilenId(), nr: String(n) });
  return neu.sort((a, b) => (Number(a.nr) || 1e9) - (Number(b.nr) || 1e9));
}

// Entfernt die Zeile zu einer gelöschten Marke nur dann, wenn sie außer der Nummer nichts enthält.
export function zeileZuMarkeEntfernen(nr, zeilen) {
  return (zeilen || []).filter((z) => {
    if (String(z.nr) !== String(nr)) return true;
    return Object.entries(z).some(([k, v]) => !['id', 'nr', '_vorschlag'].includes(k) && v !== undefined && String(v).trim() !== '');
  });
}

// ---------- Trefferprüfung (Löschen, Verschieben) ----------
function abstandZuStrecke(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function textBreite(text, groesse) {
  return String(text).length * groesse * 0.58; // Schätzung, reicht für die Trefferprüfung
}

// Index des obersten Elements an Punkt (x,y) oder -1. `toleranz` in Skizzenpixeln.
// m: Ergebnis von masse(skizze).
export function elementBei(elemente, x, y, m, toleranz = 24, nurVerschiebbar = false) {
  for (let i = elemente.length - 1; i >= 0; i--) {
    const e = elemente[i];
    if (e.typ === 'marke' && Math.hypot(x - e.x, y - e.y) <= m.radius + toleranz) return i;
    if (e.typ === 'text') {
      const b = textBreite(e.text, m.text);
      if (x >= e.x - toleranz && x <= e.x + b + toleranz && y >= e.y - m.text - toleranz && y <= e.y + toleranz) return i;
    }
    if (e.typ === 'strich' && !nurVerschiebbar) {
      const p = e.punkte;
      if (p.length === 1 && Math.hypot(x - p[0][0], y - p[0][1]) <= toleranz + e.dicke) return i;
      for (let j = 1; j < p.length; j++) {
        if (abstandZuStrecke(x, y, p[j - 1][0], p[j - 1][1], p[j][0], p[j][1]) <= toleranz + e.dicke / 2) return i;
      }
    }
  }
  return -1;
}

// Punkte eines Strichs ausdünnen: Punkte näher als `min` Pixel am Vorgänger entfallen (spart Speicher).
export function duenneAus(punkte, min = 2) {
  if (punkte.length <= 2) return punkte.map((p) => [Math.round(p[0]), Math.round(p[1])]);
  const r = [punkte[0]];
  for (let i = 1; i < punkte.length - 1; i++) {
    const l = r[r.length - 1];
    if (Math.hypot(punkte[i][0] - l[0], punkte[i][1] - l[1]) >= min) r.push(punkte[i]);
  }
  r.push(punkte[punkte.length - 1]);
  return r.map((p) => [Math.round(p[0]), Math.round(p[1])]);
}

// ---------- Zeichnen ----------
// ctx: 2D-Kontext, bereits so skaliert, dass 1 Einheit = 1 Skizzenpixel.
// hintergrund: geladenes Bild (ImageBitmap/HTMLImageElement) oder null.
export function zeichne(ctx, skizze, hintergrund, { raster = false, auswahl = -1 } = {}) {
  const { breite, hoehe } = skizze;
  const m = masse(skizze);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, breite, hoehe);
  if (hintergrund) ctx.drawImage(hintergrund, 0, 0, breite, hoehe);
  // Raster: ohne Maßstab nur Zeichenhilfe im Editor; mit Maßstab ein Meterraster, das auch in der fertigen Skizze steht.
  if ((raster || skizze.massstab) && !hintergrund) {
    const schritt = rasterSchrittPx(skizze);
    ctx.strokeStyle = '#e3e8ee';
    ctx.lineWidth = 2;
    for (let x = schritt; x < breite; x += schritt) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, hoehe); ctx.stroke(); }
    for (let y = schritt; y < hoehe; y += schritt) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(breite, y); ctx.stroke(); }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Reihenfolge: Striche unten, darüber Texte, ganz oben die Marken – damit Nummern immer lesbar bleiben.
  const reihe = (e) => (e.typ === 'strich' ? 0 : e.typ === 'text' ? 1 : 2);
  const sortiert = skizze.elemente.map((e, i) => [e, i]).sort((a, b) => reihe(a[0]) - reihe(b[0]) || a[1] - b[1]);
  sortiert.forEach(([e, i]) => {
    if (e.typ === 'strich') {
      ctx.strokeStyle = e.farbe;
      ctx.fillStyle = e.farbe;
      ctx.lineWidth = e.dicke;
      const p = e.punkte;
      if (p.length === 1) {
        ctx.beginPath(); ctx.arc(p[0][0], p[0][1], e.dicke / 2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
        for (let j = 1; j < p.length; j++) ctx.lineTo(p[j][0], p[j][1]);
        ctx.stroke();
      }
    } else if (e.typ === 'marke') {
      ctx.beginPath(); ctx.arc(e.x, e.y, m.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.lineWidth = Math.max(3, m.radius * 0.18); ctx.strokeStyle = FARBEN.rot; ctx.stroke();
      ctx.fillStyle = FARBEN.rot;
      ctx.font = `bold ${Math.round(m.radius * 1.15)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(e.nr), e.x, e.y + 2);
    } else if (e.typ === 'text') {
      ctx.font = `600 ${m.text}px system-ui, sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      // weißer Rand, damit Text auch auf Fotos lesbar ist
      ctx.lineWidth = Math.max(4, m.text * 0.2); ctx.strokeStyle = '#ffffff'; ctx.strokeText(e.text, e.x, e.y);
      ctx.fillStyle = e.farbe || FARBEN.schwarz; ctx.fillText(e.text, e.x, e.y);
    }
    if (i === auswahl) {
      ctx.save();
      ctx.setLineDash([12, 8]); ctx.lineWidth = 4; ctx.strokeStyle = '#ffb000';
      if (e.typ === 'marke') { ctx.beginPath(); ctx.arc(e.x, e.y, m.radius * 1.4, 0, Math.PI * 2); ctx.stroke(); }
      if (e.typ === 'text') ctx.strokeRect(e.x - 10, e.y - m.text - 10, textBreite(e.text, m.text) + 20, m.text + 24);
      ctx.restore();
    }
  });
  ctx.restore();
}

// Fußleiste der fertigen Grafik: Kennzeichnung als Handskizze mit Datum und Erfasser.
// Rasterweite in Pixeln: mit Maßstab runde Meter (z. B. 1 Kästchen = 5 m), sonst 100 px.
export function rasterSchrittPx(skizze) {
  if (!skizze.massstab) return 100;
  return rasterWaehlen(skizze.massstab) * pxProM(skizze.massstab) * (skizze.breite / LEER_BREITE);
}

export function fussText(skizze, erfasser, datumText) {
  const teile = [skizze.ausLageplan ? 'Funktionsskizze auf Grundlage der Lageplanskizze'
    : skizze.massstab ? `Handskizze im Raster M 1:${skizze.massstab} (1 Kästchen = ${String(rasterWaehlen(skizze.massstab)).replace('.', ',')} m), nicht maßstäblich verbindlich`
      : 'Handskizze, nicht maßstäblich'];
  if (datumText) teile.push(datumText);
  if (erfasser) teile.push(`Erfasser: ${erfasser}`);
  return teile.join(' · ');
}

export function verschiebe(element, dx, dy) {
  if (element.typ === 'marke' || element.typ === 'text') {
    element.x = Math.round(element.x + dx);
    element.y = Math.round(element.y + dy);
  }
}

// Hält einen Punkt innerhalb der Zeichenfläche.
export function begrenze(x, y, skizze) {
  return [Math.max(0, Math.min(skizze.breite, x)), Math.max(0, Math.min(skizze.hoehe, y))];
}
