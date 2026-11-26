// Oberfläche der Skizze aus Maßen (Feldart "massskizze"): Zeichnung, Maßliste, Symbole, Prüfung.
// Die Zeichnung entsteht jedes Mal neu aus den Maßen; gespeichert werden nur Symbole und die Prüfung.
import { h, leere, sprungziel } from './ui.js';
import { feldIndex } from './gliederung.js';
import * as M from './massskizze.js';

// g: Gliederung, buch, kap, feld, e: Eintrag des Feldes, setzeWert(wert)
export function massskizzenFeld({ g, buch, feld, e, setzeWert }) {
  const index = feldIndex(g);
  const wert = () => (e.wert && typeof e.wert === 'object' ? e.wert : { symbole: [], geprueft: false, stand: '' });
  let modus = null;      // Symbolart, die beim nächsten Tippen gesetzt wird
  let auswahl = -1;      // angetipptes Symbol

  const box = h('div', { class: 'massskizze' });
  const bild = h('div', { class: 'massskizze-bild', role: 'img', 'aria-label': feld.label });
  const masseListe = h('div', { class: 'massskizze-masse' });
  const werkzeuge = h('div', { class: 'optionen massskizze-symbole' });
  const auswahlLeiste = h('div', { class: 'optionen zwei' });
  const pruefung = h('div', {});
  box.append(bild, werkzeuge, auswahlLeiste, masseListe, pruefung);

  let eigene = false; // true, während dieses Feld selbst speichert
  const speichere = (aenderung) => {
    eigene = true;
    try { setzeWert({ ...wert(), ...aenderung }); } finally { eigene = false; }
  };

  function zeichne() {
    const { masse, hinweise } = M.ergaenze(M.holeMasse(feld, buch, index));
    const w = wert();
    bild.innerHTML = M.skizzeSvg(feld, masse, w.symbole || [], { auswahl }); // SVG aus eigener Erzeugung, Texte maskiert
    const svg = bild.querySelector('svg');
    svg.removeAttribute('width'); svg.removeAttribute('height');
    svg.addEventListener('click', tippen);

    // Werkzeuge
    leere(werkzeuge);
    for (const [typ, d] of Object.entries(M.SYMBOLE)) {
      werkzeuge.append(h('button', {
        class: `option-knopf ${modus === typ ? 'aktiv' : ''}`,
        onclick: () => { modus = modus === typ ? null : typ; auswahl = -1; zeichne(); },
      }, `+ ${d.label}`));
    }
    leere(auswahlLeiste);
    if (modus) auswahlLeiste.append(h('p', { class: 'feld-hinweis' }, `Jetzt in die Skizze tippen, um „${M.SYMBOLE[modus].label}“ zu setzen.`));
    if (auswahl >= 0) {
      auswahlLeiste.append(
        h('button', { class: 'knopf', onclick: () => {
          const sy = [...w.symbole]; sy[auswahl] = { ...sy[auswahl], winkel: ((sy[auswahl].winkel || 0) + 45) % 360 };
          speichere({ symbole: sy }); zeichne();
        } }, 'Drehen ↻ 45°'),
        h('button', { class: 'knopf gefahr', onclick: () => {
          const sy = w.symbole.filter((_, i) => i !== auswahl); auswahl = -1;
          speichere({ symbole: sy }); zeichne();
        } }, 'Symbol löschen'),
      );
    }

    // Maßliste
    leere(masseListe);
    const ul = h('ul', { class: 'massliste' });
    for (const k of M.noetigeMasse(feld)) {
      const label = M.MASSE[k];
      const m = masse[k];
      const ziel = (feld.masse || {})[k];
      const text = m.zahl === null ? 'fehlt' : M.massBeschriftung(m, k === 'neigung' ? 'n' : 'm') + (m.quelle === 'errechnet' ? ' (errechnet)' : '');
      const li = h('li', { class: m.zahl === null ? 'fehlt' : '' }, h('span', {}, label), h('strong', {}, text));
      if (ziel && index.get(ziel) && m.quelle !== 'errechnet') {
        const [kapId] = ziel.split('.');
        li.append(h('a', {
          href: `#/buch/${encodeURIComponent(buch.id)}/kapitel/${encodeURIComponent(kapId)}`,
          onclick: () => { sprungziel.key = ziel; },
        }, m.zahl === null ? 'eintragen' : 'ändern'));
      }
      ul.append(li);
    }
    masseListe.append(h('details', { open: M.fehlendeMasse(feld, masse).length > 0 }, h('summary', {}, 'Maße für diese Skizze'), ul,
      ...hinweise.map((t) => h('p', { class: 'hinweis warnung' }, t)),
      h('p', { class: 'feld-hinweis' }, 'Es zählen nur bestätigte Maße. Fehlende Maße erscheinen als „?“, errechnete mit „≈“.')));

    // Prüfung
    leere(pruefung);
    const jetzt = M.stand(masse);
    if (w.geprueft && w.stand !== jetzt) {
      pruefung.append(h('p', { class: 'hinweis warnung' }, 'Die Maße wurden nach der Prüfung geändert – bitte die Skizze erneut ansehen und bestätigen.'));
    }
    pruefung.append(h('button', {
      class: `knopf breit ${w.geprueft && w.stand === jetzt ? 'primaer' : ''}`,
      onclick: () => {
        const neu = !(w.geprueft && w.stand === jetzt);
        speichere({ geprueft: neu, stand: neu ? jetzt : '' }); zeichne();
      },
    }, w.geprueft && w.stand === jetzt ? '✓ Skizze geprüft (antippen zum Zurücknehmen)' : 'Skizze geprüft – so übernehmen'));
  }

  // Tippen in die Zeichnung: Symbol setzen oder auswählen.
  function tippen(ev) {
    const svg = ev.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const w = wert();
    const sy = [...(w.symbole || [])];
    if (modus) {
      sy.push({ typ: modus, x: Math.round(p.x), y: Math.round(p.y), winkel: 0 });
      modus = null; auswahl = sy.length - 1;
      speichere({ symbole: sy });
    } else {
      auswahl = M.symbolBei(sy, p.x, p.y);
    }
    zeichne();
  }

  // Ändert sich ein Maß (auch im selben Kapitel), wird die Skizze neu gezeichnet.
  // Eigene Änderungen (Symbole, Prüfung) zeichnen schon selbst; daher nur bei fremden Änderungen.
  const beiAenderung = () => {
    if (!box.isConnected) { document.removeEventListener('beckenbuch-geaendert', beiAenderung); return; }
    if (!eigene) zeichne();
  };
  document.addEventListener('beckenbuch-geaendert', beiAenderung);

  zeichne();
  return box;
}
