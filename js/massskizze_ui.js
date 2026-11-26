// Oberfläche für die Skizzen aus den Maßen: Vorschau im Kapitel und Lageplan-Editor
// (Symbole setzen, verschieben, drehen, löschen; Zaun; Nordpfeil; Maßstab; am Raster ausrichten).
import * as db from './db.js';
import * as M from './massskizze.js';
import { h, leere, meldung, bestaetigen } from './ui.js';
import { feldIndex, neueId } from './gliederung.js';
import { canvasZuBlob } from './bilder.js';
import { bildErzeugen } from './skizzen.js';
import { neueSkizze } from './skizzenlogik.js';

const NAMEN = {
  laengeOben: 'Länge Oberkante', breiteOben: 'Breite Oberkante', laengeSohle: 'Länge Sohle', breiteSohle: 'Breite Sohle',
  boeschung: 'Böschungsneigung', tiefe: 'Tiefe', dauerstau: 'Dauerstau', schlammraum: 'Schlammraum',
};

export function heute() {
  return new Date().toLocaleDateString('de-DE');
}

function svgBild(svg, alt) {
  return h('img', { class: 'massskizze-bild', src: M.svgDatenUrl(svg), alt });
}

// SVG → PNG (für die Funktionsskizze als Zeichengrundlage)
export async function svgZuPng(svg, breite, hoehe) {
  const img = new Image();
  img.src = M.svgDatenUrl(svg);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = breite; c.height = hoehe;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, breite, hoehe);
  ctx.drawImage(img, 0, 0, breite, hoehe);
  return canvasZuBlob(c, 'image/png');
}

// ---------- Feld im Kapitel ----------
export function massskizzeFeld({ g, buch, kap, feld, e, setzeWert, erfasser, aendern }) {
  const box = h('div', { class: 'massskizze' });
  const masse = M.leseMasse(buch, feld.masse);
  const info = { datum: heute(), erfasser };
  const lp = M.lageplanSvg(masse, e.wert || {}, { ...info, titel: 'Lageplanskizze' });
  if (!lp) {
    box.append(h('p', { class: 'leer' }, 'Noch keine Länge oder Breite erfasst. Sobald ein Hauptmaß eingetragen und bestätigt ist, entsteht hier die Skizze.'));
    return box;
  }
  const fehlend = Object.entries(M.ergaenze(masse)).filter(([, v]) => v.fehlt).map(([k, v]) => `${NAMEN[k] || k}${v.pruefen ? ' (zur Prüfung)' : ''}`);
  const berechnet = Object.entries(M.ergaenze(masse)).filter(([, v]) => v.berechnet).map(([k]) => NAMEN[k] || k);
  if (fehlend.length) box.append(h('p', { class: 'feld-hinweis' }, `Offen (mit „?“ dargestellt): ${fehlend.join(', ')}.`));
  if (berechnet.length) box.append(h('p', { class: 'feld-hinweis' }, `Aus anderen Maßen berechnet (strichpunktiert): ${berechnet.join(', ')}.`));

  box.append(h('div', { class: 'massskizze-karte' }, svgBild(lp.svg, 'Lageplanskizze'),
    h('div', { class: 'feld-hinweis' }, `M 1:${lp.massstab} · 1 Kästchen = ${M.mDE(lp.rasterM, lp.rasterM % 1 ? 1 : 0)} m`)));
  const quer = M.schnittSvg(masse, 'quer', info);
  const laengs = M.schnittSvg(masse, 'laengs', info);
  if (quer) box.append(h('div', { class: 'massskizze-karte' }, svgBild(quer.svg, 'Querschnitt'), h('div', { class: 'feld-hinweis' }, `Querschnitt A–A, M 1:${quer.massstab}`)));
  if (laengs) box.append(h('div', { class: 'massskizze-karte' }, svgBild(laengs.svg, 'Längsschnitt'), h('div', { class: 'feld-hinweis' }, `Längsschnitt B–B, M 1:${laengs.massstab}`)));

  const key = `${kap.id}.${feld.id}`;
  const knoepfe = h('div', {});
  if (!e.wert) {
    knoepfe.append(h('button', {
      class: 'knopf primaer breit',
      onclick: () => setzeWert({ massstab: 'auto', elemente: [], schnitte: true, uebernommen: new Date().toISOString() }),
    }, 'Skizzen ins Beckenbuch übernehmen'));
  }
  knoepfe.append(h('a', { class: 'knopf breit', href: `#/buch/${encodeURIComponent(buch.id)}/lageplan/${encodeURIComponent(key)}`,
    onclick: () => { if (!e.wert) setzeWert({ massstab: 'auto', elemente: [], schnitte: true, uebernommen: new Date().toISOString() }); },
  }, '✏️ Lageplan bearbeiten (Zulauf, Ablauf, Schächte, Zaun, Nordpfeil …)'));

  if (feld.funktionsskizze) {
    knoepfe.append(h('button', {
      class: 'knopf breit',
      onclick: async () => {
        const ziel = feldIndex(g).get(feld.funktionsskizze);
        if (!ziel) return;
        const neu = M.lageplanSvg(masse, e.wert || {}, { ...info, titel: 'Funktionsskizze (Grundlage: Lageplanskizze)' });
        const blob = await svgZuPng(neu.svg, M.BREITE, M.LP_HOEHE + M.FUSS);
        const s = neueSkizze({ id: `s-${neueId()}`, buchId: buch.id, feldKey: feld.funktionsskizze, grundlage: { blob, breite: M.BREITE, hoehe: M.LP_HOEHE + M.FUSS } });
        s.erfasser = erfasser || '';
        s.massstab = neu.massstab;
        s.ausLageplan = true;
        await bildErzeugen(s);
        await db.speichere('skizzen', s);
        const fe = buch.werte[feld.funktionsskizze] || (buch.werte[feld.funktionsskizze] = { wert: [], status: null });
        fe.wert = [...(Array.isArray(fe.wert) ? fe.wert : []), s.id];
        fe.status = null; fe.geaendert = new Date().toISOString();
        await aendern(buch);
        await db.allesGespeichert();
        meldung('Funktionsskizze angelegt – jetzt Eingriffsstellen markieren.');
        location.hash = `#/buch/${encodeURIComponent(buch.id)}/skizze/${encodeURIComponent(s.id)}`;
      },
    }, `Als Grundlage für die ${ziel(g, feld.funktionsskizze)} verwenden`));
  }
  box.append(knoepfe);
  return box;
}

function ziel(g, key) {
  const t = feldIndex(g).get(key);
  return t ? `${t.feld.label} (${t.kapitel.nr || t.kapitel.id})` : key;
}

// ---------- Kompass ----------
// Liefert die Himmelsrichtung, in die die Oberkante des Handys zeigt (Grad, 0 = Nord, im Uhrzeigersinn).
function kompassRichtung(zeitlimit = 6000) {
  return new Promise((resolve, reject) => {
    const fertig = (wert, fehler) => {
      window.removeEventListener('deviceorientationabsolute', ereignis);
      window.removeEventListener('deviceorientation', ereignis);
      clearTimeout(t);
      if (fehler) reject(fehler); else resolve(wert);
    };
    const ereignis = (ev) => {
      if (typeof ev.webkitCompassHeading === 'number') fertig(ev.webkitCompassHeading);
      else if ((ev.absolute || ev.type === 'deviceorientationabsolute') && typeof ev.alpha === 'number') fertig((360 - ev.alpha) % 360);
    };
    const t = setTimeout(() => fertig(null, new Error('Kein Kompass verfügbar')), zeitlimit);
    window.addEventListener('deviceorientationabsolute', ereignis);
    window.addEventListener('deviceorientation', ereignis);
  });
}

// ---------- Lageplan-Editor ----------
// umgebung: { app, kopf, fuss, ladeBuch, gliederungFuer, aendern, erfasser }
export async function bildschirmLageplan(umgebung, buchId, key) {
  const { app, kopf, fuss, ladeBuch, gliederungFuer, aendern, erfasser } = umgebung;
  const buch = await ladeBuch(buchId);
  const { g } = await gliederungFuer(buch);
  const ort = feldIndex(g).get(key);
  if (!ort) throw new Error(`Das Feld ${key} gibt es in der Vorlage nicht.`);
  const { kapitel: kap, feld } = ort;
  const zurueck = `#/buch/${encodeURIComponent(buch.id)}/kapitel/${encodeURIComponent(kap.id)}`;
  const e = buch.werte[key] || (buch.werte[key] = { wert: null, status: null });
  if (!e.wert) e.wert = { massstab: 'auto', elemente: [], schnitte: true, uebernommen: new Date().toISOString() };
  const w = e.wert;
  w.elemente = w.elemente || [];
  const masse = M.leseMasse(buch, feld.masse);

  let modus = 'linie';
  let fang = true;
  let auswahl = -1;
  let zaun = null;
  const rueck = [];
  const merke = () => { rueck.push(JSON.stringify({ elemente: w.elemente, nord: w.nord || null, massstab: w.massstab })); if (rueck.length > 80) rueck.shift(); };
  const speichern = () => { e.geaendert = new Date().toISOString(); e.status = null; aendern(buch); };

  const flaeche = h('div', { class: 'lageplan-flaeche' });
  const infoZeile = h('div', { class: 'feld-hinweis' });
  let aktuell = null;
  const zeichne = () => {
    aktuell = M.lageplanSvg(masse, w, { titel: 'Lageplanskizze', datum: heute(), erfasser });
    if (!aktuell) { flaeche.innerHTML = '<p class="leer">Keine Hauptmaße erfasst.</p>'; return; }
    flaeche.innerHTML = aktuell.svg;
    if (auswahl >= 0 && w.elemente[auswahl] && w.elemente[auswahl].typ === 'symbol') {
      const el = w.elemente[auswahl];
      const [x, y] = M.lpPunkt(el.x, el.y, aktuell.massstab);
      flaeche.querySelector('svg').insertAdjacentHTML('beforeend', `<circle cx="${x}" cy="${y}" r="46" fill="none" stroke="#ffb000" stroke-width="5" stroke-dasharray="12 8"/>`);
    }
    infoZeile.textContent = `M 1:${aktuell.massstab}${w.massstab === 'auto' ? ' (automatisch)' : ''} · 1 Kästchen = ${M.mDE(aktuell.rasterM, aktuell.rasterM % 1 ? 1 : 0)} m${fang ? ' · Objektfang 10 cm' : ''}`;
  };
  const fangM = () => M.FANG_M; // Objektfang im Rasterpunkt: 10 cm
  const punktM = (ev) => {
    const r = flaeche.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (M.BREITE / r.width);
    const py = (ev.clientY - r.top) * (M.BREITE / r.width);
    let [x, y] = M.lpMeter(px, py, aktuell.massstab);
    let art = 'frei';
    if (fang) {
      // Objektfang: zuerst Enden von Linien und Zaunecken (ca. 20 Bildschirmpixel), sonst Rasterpunkt
      const tol = 20 * (M.BREITE / r.width) / M.pxProM(aktuell.massstab);
      let best = null;
      for (const el of w.elemente) {
        if ((el.typ === 'linie' || el.typ === 'zaun') && el !== laufend) {
          for (const q of el.punkte) { const d = Math.hypot(q[0] - x, q[1] - y); if (d <= tol && (!best || d < best.d)) best = { q, d }; }
        }
      }
      if (best) { [x, y] = best.q; art = 'endpunkt'; } else { x = M.amRaster(x, fangM()); y = M.amRaster(y, fangM()); art = 'raster'; }
    }
    return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000, px, py, art };
  };
  let laufend = null; // Linie, die gerade gezogen wird
  let laengeBeschriften = true;
  const treffer = (px, py) => {
    for (let i = w.elemente.length - 1; i >= 0; i--) {
      const el = w.elemente[i];
      if (el.typ === 'symbol') {
        const [x, y] = M.lpPunkt(el.x, el.y, aktuell.massstab);
        if (Math.hypot(px - x, py - y) < 50) return i;
      } else if (el.typ === 'zaun' || el.typ === 'linie') {
        const pts = el.punkte.map(([a, b]) => M.lpPunkt(a, b, aktuell.massstab));
        for (let j = 1; j < pts.length; j++) {
          const [x1, y1] = pts[j - 1], [x2, y2] = pts[j];
          const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
          const t = l2 ? Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2)) : 0;
          if (Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1))) < 24) return i;
        }
      }
    }
    return -1;
  };

  let ziehen = null;
  flaeche.addEventListener('pointerdown', async (ev) => {
    if (!aktuell) return;
    ev.preventDefault();
    const p = punktM(ev);
    if (modus.startsWith('setzen:')) {
      const art = modus.slice(7);
      let beschriftung = '';
      if (art === 'text' || art === 'schacht' || art === 'schieber') {
        beschriftung = await textAbfragen(art === 'text' ? 'Beschriftung' : `Bezeichnung (optional, z. B. „${art === 'schacht' ? 'Drosselschacht' : 'Schieber Zulauf'}“)`);
        if (art === 'text' && !beschriftung) return;
      }
      merke();
      w.elemente.push({ typ: 'symbol', art, x: p.x, y: p.y, winkel: 0, ...(beschriftung ? { text: beschriftung } : {}) });
      auswahl = w.elemente.length - 1;
      speichern(); zeichne();
    } else if (modus === 'linie') {
      merke();
      laufend = { typ: 'linie', punkte: [[p.x, p.y], [p.x, p.y]], laenge: laengeBeschriften };
      w.elemente.push(laufend);
      flaeche.setPointerCapture(ev.pointerId);
      zeichne();
    } else if (modus === 'zaun') {
      if (!zaun) { merke(); zaun = { typ: 'zaun', punkte: [] }; w.elemente.push(zaun); }
      zaun.punkte.push([p.x, p.y]);
      speichern(); zeichne(); werkzeug();
    } else if (modus === 'verschieben') {
      const i = treffer(p.px, p.py);
      auswahl = i;
      if (i >= 0 && w.elemente[i].typ === 'symbol') { merke(); ziehen = { i, bewegt: false }; flaeche.setPointerCapture(ev.pointerId); }
      zeichne();
    } else if (modus === 'drehen') {
      const i = treffer(p.px, p.py);
      if (i >= 0 && w.elemente[i].typ === 'symbol') { merke(); w.elemente[i].winkel = ((w.elemente[i].winkel || 0) + 45) % 360; auswahl = i; speichern(); zeichne(); }
    } else if (modus === 'loeschen') {
      const i = treffer(p.px, p.py);
      if (i < 0) { meldung('Hier ist kein Element.'); return; }
      merke(); w.elemente.splice(i, 1); auswahl = -1; speichern(); zeichne();
    }
  });
  flaeche.addEventListener('pointermove', (ev) => {
    if (laufend) {
      const p = punktM(ev);
      laufend.punkte[1] = [p.x, p.y];
      zeichne();
      const [a, b] = laufend.punkte;
      infoZeile.textContent = `Linie: ${M.mDE(Math.hypot(b[0] - a[0], b[1] - a[1]))} m${p.art === 'endpunkt' ? ' · gefangen am Linienende' : ' · Rasterpunkt 10 cm'}`;
      return;
    }
    if (!ziehen) return;
    const p = punktM(ev);
    const el = w.elemente[ziehen.i];
    if (el.x !== p.x || el.y !== p.y) { el.x = p.x; el.y = p.y; ziehen.bewegt = true; zeichne(); }
  });
  const ende = () => {
    if (laufend) {
      const [a, b] = laufend.punkte;
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) { w.elemente = w.elemente.filter((x) => x !== laufend); rueck.pop(); }
      laufend = null;
      speichern(); zeichne();
      return;
    }
    if (ziehen) { if (ziehen.bewegt) speichern(); else rueck.pop(); ziehen = null; }
  };
  flaeche.addEventListener('pointerup', ende);
  flaeche.addEventListener('pointercancel', ende);

  // ----- Werkzeuge -----
  const wz = h('div', { class: 'werkzeug' });
  const werkzeug = () => {
    leere(wz);
    const mk = (m, t) => h('button', { class: `wz ${modus === m ? 'aktiv' : ''}`, onclick: () => { if (modus === 'zaun' && m !== 'zaun') zaun = null; modus = m; werkzeug(); } }, t);
    wz.append(h('div', { class: 'wz-zeile' }, mk('linie', '📏 Linie im Raster'), mk('verschieben', '✋ Verschieben')),
      h('div', { class: 'wz-zeile' }, mk('drehen', '↻ Drehen'), mk('loeschen', '🧽 Löschen')));
    if (modus === 'linie') {
      wz.append(h('p', { class: 'feld-hinweis' }, 'Am Anfangspunkt aufsetzen, zum Endpunkt ziehen, loslassen. Objektfang: Rasterpunkte alle 10 cm, Enden von Linien und Zaunecken.'),
        h('label', { class: 'option' }, h('input', { type: 'checkbox', checked: laengeBeschriften, onchange: (ev) => { laengeBeschriften = ev.target.checked; } }), h('span', {}, 'Länge an die Linie schreiben')));
    }
    const sym = h('div', { class: 'symbol-raster' });
    for (const [art, d] of Object.entries(M.SYMBOLE)) sym.append(mk(`setzen:${art}`, d.name));
    sym.append(h('button', { class: `wz ${modus === 'zaun' ? 'aktiv' : ''}`, onclick: () => { modus = 'zaun'; zaun = null; werkzeug(); } }, 'Zaun'));
    wz.append(sym);
    if (modus === 'zaun') {
      wz.append(h('p', { class: 'feld-hinweis' }, 'Zaun: nacheinander die Eckpunkte antippen.'),
        h('button', { class: 'knopf klein', onclick: () => { zaun = null; modus = 'verschieben'; werkzeug(); } }, zaun && zaun.punkte.length ? 'Zaun fertig' : 'Abbrechen'));
    }
    const hilfe = modus.startsWith('setzen:') ? `${M.SYMBOLE[modus.slice(7)].name}: Stelle im Lageplan antippen.` : { verschieben: 'Symbol antippen und ziehen.', drehen: 'Symbol antippen – dreht um 45°.', loeschen: 'Symbol, Linie oder Zaun antippen.', zaun: '' }[modus];
    if (hilfe) wz.append(h('p', { class: 'feld-hinweis' }, hilfe));
    // Maßstab und Raster
    const sel = h('select', { class: 'ziel-auswahl', onchange: (ev) => { merke(); w.massstab = ev.target.value === 'auto' ? 'auto' : Number(ev.target.value); speichern(); zeichne(); } },
      h('option', { value: 'auto', selected: w.massstab === 'auto' }, 'Maßstab automatisch (passend zum Becken)'),
      M.MASSSTAEBE.map((m) => h('option', { value: m, selected: w.massstab === m }, `M 1:${m} (1 Kästchen = ${M.mDE(M.rasterWaehlen(m), M.rasterWaehlen(m) % 1 ? 1 : 0)} m)`)));
    wz.append(sel,
      h('label', { class: 'option' }, h('input', { type: 'checkbox', checked: fang, onchange: (ev) => { fang = ev.target.checked; zeichne(); } }), h('span', {}, 'Objektfang (Rasterpunkte 10 cm, Linienenden)')),
      h('label', { class: 'option' }, h('input', { type: 'checkbox', checked: w.schnitte !== false, onchange: (ev) => { w.schnitte = ev.target.checked; speichern(); zeichne(); } }), h('span', {}, 'Schnittlinien A–A und B–B zeigen')));
    // Nordpfeil
    const nord = h('div', { class: 'wz-zeile' },
      h('button', {
        class: 'wz', onclick: async () => {
          meldung('Handy flach halten, Oberkante entlang der Längsseite in die Richtung, die in der Skizze nach rechts zeigt …');
          try {
            const richtung = await kompassRichtung();
            merke(); w.nord = { winkel: Math.round((90 - richtung + 360) % 360), quelle: 'kompass' };
            speichern(); zeichne(); werkzeug(); meldung('Nordpfeil gesetzt (ungefähr).');
          } catch {
            meldung('Kein Kompass verfügbar – Nordpfeil bitte von Hand drehen.', 'fehler');
            if (!w.nord) { merke(); w.nord = { winkel: 0, quelle: 'hand' }; speichern(); zeichne(); werkzeug(); }
          }
        },
      }, '🧭 Nordpfeil aus Kompass'),
      w.nord ? h('button', { class: 'wz', onclick: () => { merke(); w.nord = { winkel: ((w.nord.winkel || 0) + 345) % 360, quelle: 'hand' }; speichern(); zeichne(); } }, '↺ 15°') : null,
      w.nord ? h('button', { class: 'wz', onclick: () => { merke(); w.nord = { winkel: ((w.nord.winkel || 0) + 15) % 360, quelle: 'hand' }; speichern(); zeichne(); } }, '↻ 15°') : null);
    wz.append(nord);
    if (!w.nord) wz.append(h('button', { class: 'knopf klein', onclick: () => { merke(); w.nord = { winkel: 0, quelle: 'hand' }; speichern(); zeichne(); werkzeug(); } }, 'Nordpfeil von Hand setzen'));
    else wz.append(h('button', { class: 'knopf klein gefahr', onclick: () => { merke(); delete w.nord; speichern(); zeichne(); werkzeug(); } }, 'Nordpfeil entfernen'));
    wz.append(h('div', { class: 'wz-zeile' },
      h('button', { class: 'wz', disabled: !rueck.length, onclick: () => { const z = JSON.parse(rueck.pop()); w.elemente = z.elemente; w.massstab = z.massstab; if (z.nord) w.nord = z.nord; else delete w.nord; zaun = null; auswahl = -1; speichern(); zeichne(); werkzeug(); } }, '↶ Rückgängig')));
  };

  leere(app);
  const main = h('main', { class: 'skizzen-main' },
    h('p', { class: 'feld-hinweis' }, 'Becken und Maßketten kommen aus den Hauptmaßen; ändern dort. Hier werden Zulauf, Ablauf, Schächte, Zaun, Tor, Zufahrt und Nordpfeil ergänzt.'),
    flaeche, infoZeile, wz,
    h('button', {
      class: 'knopf gefahr breit',
      onclick: async () => {
        if (!(await bestaetigen('Alle Symbole, Zaun und Nordpfeil dieses Lageplans löschen? Das Becken aus den Maßen bleibt.', 'Löschen', 'Abbrechen', true))) return;
        merke(); w.elemente = []; delete w.nord; speichern(); zeichne(); werkzeug();
      },
    }, 'Alle Symbole entfernen'));
  app.append(kopf(`Lageplan: ${feld.label}`, zurueck), main, fuss(h('a', { class: 'knopf primaer', href: zurueck }, 'Fertig')));
  zeichne();
  werkzeug();
}

function textAbfragen(label) {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'text', autocomplete: 'off' });
    let erledigt = false;
    const fertig = (wert) => { if (erledigt) return; erledigt = true; dlg.close(); resolve(wert); };
    const dlg = h('dialog', { class: 'dialog' },
      h('label', { class: 'feld' }, h('span', { class: 'feld-label' }, label), inp),
      h('div', { class: 'dialog-knoepfe' },
        h('button', { class: 'knopf', onclick: () => fertig('') }, 'Ohne'),
        h('button', { class: 'knopf primaer', onclick: () => fertig(inp.value.trim()) }, 'Übernehmen')));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') fertig(inp.value.trim()); });
    dlg.addEventListener('close', () => { dlg.remove(); if (!erledigt) { erledigt = true; resolve(''); } });
    document.body.append(dlg);
    dlg.showModal();
    inp.focus();
  });
}
