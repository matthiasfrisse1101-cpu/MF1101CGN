// Skizzen zeichnen: leere Fläche oder Foto (Handskizze, Plan, Anlage) als Grundlage,
// Stift, Text, nummerierte Marken für Eingriffsstellen, Verschieben, Löschen, Rückgängig.
// Jede Änderung wird sofort gespeichert.
import * as db from './db.js';
import * as S from './skizzenlogik.js';
import { h, leere, meldung, bestaetigen, sprungziel } from './ui.js';
import { verkleinere, ladeBild, canvasZuBlob, bildUrl } from './bilder.js';
import { feldIndex, feldKey, neueZeilenId } from './gliederung.js';

export function neueSkizzenId() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function ladeSkizzen(ids) {
  const r = [];
  for (const id of ids || []) {
    const s = await db.lese('skizzen', id);
    if (s) r.push(s);
  }
  return r;
}

// Fertige Grafik (mit Fußleiste) erzeugen und in der Skizze ablegen.
export async function bildErzeugen(skizze, hintergrund) {
  if (skizze.grundlage && !hintergrund) hintergrund = await ladeBild(skizze.grundlage.blob);
  const c = document.createElement('canvas');
  c.width = skizze.breite;
  c.height = skizze.hoehe + S.FUSS_HOEHE;
  const ctx = c.getContext('2d');
  S.zeichne(ctx, skizze, hintergrund, {});
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, skizze.hoehe, skizze.breite, S.FUSS_HOEHE);
  ctx.fillStyle = '#333333';
  ctx.font = '26px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const datum = new Date(skizze.angelegt).toLocaleDateString('de-DE');
  ctx.fillText(S.fussText(skizze, skizze.erfasser, datum), 16, skizze.hoehe + S.FUSS_HOEHE / 2);
  skizze.bild = await canvasZuBlob(c, skizze.grundlage ? 'image/jpeg' : 'image/png', 0.88);
  skizze.bildStand = skizze.geaendert;
  return skizze.bild;
}

// Vorschau mit aktuellem Bild; erzeugt es neu, falls es veraltet ist (z. B. nach Absturz).
async function aktuellesBild(s) {
  if (!s.bild || s.bildStand !== s.geaendert) {
    await bildErzeugen(s);
    await db.speichere('skizzen', s);
  }
  return s.bild;
}

// ---------- Feld im Kapitel ----------
// kontext: { buch, aendern(buch), erfasser }
export function skizzenFeld({ kontext, kap, feld, ids, setzeIds, nurAnzeigen = false, hinweisMarken = '' }) {
  const box = h('div', { class: 'skizzenfeld' });
  const raster = h('div', { class: 'foto-raster' });
  box.append(raster);
  const key = feldKey(kap.id, feld.id);

  (async () => {
    const skizzen = await ladeSkizzen(ids);
    leere(raster);
    if (!skizzen.length) raster.append(h('p', { class: 'leer' }, nurAnzeigen ? '(noch keine Skizze)' : 'Noch keine Skizze.'));
    for (const s of skizzen) {
      const bild = await aktuellesBild(s);
      const marken = S.markenNummern([s]);
      const inhalt = [
        h('img', { src: bildUrl(bild), alt: 'Skizze', class: 'skizzen-vorschau' }),
        h('div', { class: 'foto-nr' }, marken.length ? `Marken: ${marken.join(', ')}` : (s.grundlage ? 'auf Foto' : 'Skizze')),
      ];
      raster.append(nurAnzeigen
        ? h('figure', { class: 'foto-karte' }, ...inhalt)
        : h('a', { class: 'foto-karte', href: `#/buch/${encodeURIComponent(kontext.buch.id)}/skizze/${encodeURIComponent(s.id)}` }, ...inhalt, h('span', { class: 'knopf klein' }, 'Bearbeiten')));
    }
  })();

  if (nurAnzeigen) return box;
  if (hinweisMarken) box.append(h('p', { class: 'feld-hinweis' }, hinweisMarken));

  const anlegen = async (grundlage) => {
    const s = S.neueSkizze({ id: neueSkizzenId(), buchId: kontext.buch.id, feldKey: key, grundlage });
    s.erfasser = kontext.erfasser || '';
    await bildErzeugen(s);
    await db.speichere('skizzen', s);
    await db.allesGespeichert();
    setzeIds([...(ids || []), s.id]);
    await db.allesGespeichert();
    location.hash = `#/buch/${encodeURIComponent(kontext.buch.id)}/skizze/${encodeURIComponent(s.id)}`;
  };
  const mitFoto = async (ev) => {
    const datei = ev.target.files[0];
    ev.target.value = '';
    if (!datei) return;
    try {
      const v = await verkleinere(datei);
      await anlegen({ blob: v.blob, breite: v.breite, hoehe: v.hoehe });
    } catch (e) {
      meldung(`Foto konnte nicht geladen werden: ${e.message}`, 'fehler');
    }
  };
  const kamera = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'versteckt', onchange: mitFoto });
  const galerie = h('input', { type: 'file', accept: 'image/*', class: 'versteckt', onchange: mitFoto });
  box.append(kamera, galerie,
    h('button', { class: 'knopf primaer breit', onclick: () => anlegen(null) }, '✏️ Neue Skizze (leere Fläche)'),
    h('div', { class: 'knopfzeile' },
      h('button', { class: 'knopf', onclick: () => kamera.click() }, '📷 Handskizze/Plan fotografieren'),
      h('button', { class: 'knopf', onclick: () => galerie.click() }, 'Foto aus Galerie')),
    h('p', { class: 'feld-hinweis' }, 'Auf dem Foto kann anschließend gezeichnet und markiert werden.'));
  return box;
}

// ---------- Zeichenbildschirm ----------
// umgebung: { app, kopf, fuss, ladeBuch, gliederungFuer, aendern }
export async function bildschirmSkizze(umgebung, buchId, skizzeId) {
  const { app, kopf, fuss, ladeBuch, gliederungFuer, aendern } = umgebung;
  const buch = await ladeBuch(buchId);
  const { g } = await gliederungFuer(buch);
  const skizze = await db.lese('skizzen', skizzeId);
  if (!skizze) throw new Error('Diese Skizze gibt es nicht (mehr).');
  const ort = feldIndex(g).get(skizze.feldKey);
  if (!ort) throw new Error(`Das Feld ${skizze.feldKey} gibt es in der Vorlage nicht.`);
  const { kapitel: kap, feld } = ort;
  const zurueck = `#/buch/${encodeURIComponent(buch.id)}/kapitel/${encodeURIComponent(kap.id)}`;
  sprungziel.key = skizze.feldKey; // nach der Rückkehr zum Feld scrollen
  const tabellenKey = feld.marken || null; // z. B. "A4_1.eingriffsstellen"
  const tabellenFeld = tabellenKey ? feldIndex(g).get(tabellenKey)?.feld : null;

  const hintergrund = skizze.grundlage ? await ladeBild(skizze.grundlage.blob) : null;
  // Marken der anderen Skizzen desselben Feldes – Nummern bleiben über alle Skizzen eindeutig.
  const andereIds = ((buch.werte[skizze.feldKey] || {}).wert || []).filter((id) => id !== skizze.id);
  const andereMarken = S.markenNummern(await ladeSkizzen(andereIds));

  let modus = 'stift';
  let farbe = S.FARBEN.schwarz;
  const m = S.masse(skizze);
  let dicke = m.duenn;
  let auswahl = -1;
  const rueck = [];
  const vor = [];

  const canvas = h('canvas', { class: 'zeichenflaeche', width: skizze.breite, height: skizze.hoehe });
  const ctx = canvas.getContext('2d');
  let geplant = false;
  let laufenderStrich = null;
  const neuZeichnen = () => {
    if (geplant) return;
    geplant = true;
    requestAnimationFrame(() => {
      geplant = false;
      const anzeigen = laufenderStrich ? { ...skizze, elemente: [...skizze.elemente, laufenderStrich] } : skizze;
      S.zeichne(ctx, anzeigen, hintergrund, { raster: true, auswahl });
    });
  };

  // ----- Speichern -----
  let bildTimer = null;
  const speichern = () => {
    skizze.geaendert = new Date().toISOString();
    db.speichere('skizzen', skizze);
    clearTimeout(bildTimer);
    bildTimer = setTimeout(async () => { await bildErzeugen(skizze, hintergrund); db.speichere('skizzen', skizze); }, 800);
  };
  const tabelle = () => {
    if (!tabellenKey) return null;
    if (!buch.werte[tabellenKey]) buch.werte[tabellenKey] = { wert: [], status: null, geaendert: null };
    return buch.werte[tabellenKey];
  };
  const alleMarken = () => [...andereMarken, ...S.markenNummern([skizze])];
  const tabelleAbgleichen = () => {
    const t = tabelle();
    if (!t) return;
    const alt = JSON.stringify(t.wert || []);
    t.wert = S.zeilenFuerMarken(alleMarken(), t.wert || [], neueZeilenId);
    if (JSON.stringify(t.wert) !== alt) { t.status = null; t.geaendert = new Date().toISOString(); aendern(buch); }
  };
  const merke = () => { rueck.push(JSON.stringify(skizze.elemente)); if (rueck.length > 100) rueck.shift(); vor.length = 0; };
  const geaendert = () => { speichern(); tabelleAbgleichen(); neuZeichnen(); zeichneMarkenListe(); zeichneWerkzeug(); };

  // ----- Eingabe auf der Zeichenfläche -----
  const punkt = (ev) => {
    const r = canvas.getBoundingClientRect();
    return S.begrenze((ev.clientX - r.left) * (skizze.breite / r.width), (ev.clientY - r.top) * (skizze.hoehe / r.height), skizze);
  };
  const toleranz = () => 14 * (skizze.breite / canvas.getBoundingClientRect().width); // ca. 14 Bildschirmpixel
  let ziehen = null;

  canvas.addEventListener('pointerdown', async (ev) => {
    ev.preventDefault();
    const [x, y] = punkt(ev);
    if (modus === 'stift') {
      canvas.setPointerCapture(ev.pointerId);
      laufenderStrich = { typ: 'strich', farbe, dicke, punkte: [[x, y]] };
      neuZeichnen();
    } else if (modus === 'marke') {
      merke();
      skizze.elemente.push({ typ: 'marke', nr: S.naechsteMarkenNr(alleMarken()), x: Math.round(x), y: Math.round(y) });
      geaendert();
    } else if (modus === 'text') {
      const text = await textAbfragen();
      if (!text) return;
      merke();
      skizze.elemente.push({ typ: 'text', text, x: Math.round(x), y: Math.round(y), farbe });
      geaendert();
    } else if (modus === 'verschieben') {
      const i = S.elementBei(skizze.elemente, x, y, m, toleranz(), true);
      auswahl = i;
      if (i >= 0) { canvas.setPointerCapture(ev.pointerId); merke(); ziehen = { i, x, y, bewegt: false }; }
      neuZeichnen();
    } else if (modus === 'loeschen') {
      const i = S.elementBei(skizze.elemente, x, y, m, toleranz());
      if (i < 0) { meldung('Hier ist nichts zum Löschen.'); return; }
      merke();
      const [weg] = skizze.elemente.splice(i, 1);
      if (weg.typ === 'marke' && tabelle()) {
        const t = tabelle();
        t.wert = S.zeileZuMarkeEntfernen(weg.nr, t.wert || []);
        t.geaendert = new Date().toISOString();
        aendern(buch);
      }
      geaendert();
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (laufenderStrich) {
      const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
      for (const e of (evs.length ? evs : [ev])) laufenderStrich.punkte.push(punkt(e));
      neuZeichnen();
    } else if (ziehen) {
      const [x, y] = punkt(ev);
      S.verschiebe(skizze.elemente[ziehen.i], x - ziehen.x, y - ziehen.y);
      ziehen.x = x; ziehen.y = y; ziehen.bewegt = true;
      neuZeichnen();
    }
  });
  const ende = () => {
    if (laufenderStrich) {
      const s = laufenderStrich;
      laufenderStrich = null;
      s.punkte = S.duenneAus(s.punkte);
      merke();
      skizze.elemente.push(s);
      geaendert();
    } else if (ziehen) {
      if (ziehen.bewegt) geaendert(); else rueck.pop();
      ziehen = null;
    }
  };
  canvas.addEventListener('pointerup', ende);
  canvas.addEventListener('pointercancel', ende);

  // ----- Werkzeuge -----
  const werkzeug = h('div', { class: 'werkzeug' });
  const zeichneWerkzeug = () => {
    leere(werkzeug);
    const modusKnopf = (m, text) => h('button', { class: `wz ${modus === m ? 'aktiv' : ''}`, onclick: () => { modus = m; auswahl = -1; neuZeichnen(); zeichneWerkzeug(); } }, text);
    werkzeug.append(h('div', { class: 'wz-zeile' },
      modusKnopf('stift', '✏️ Stift'),
      modusKnopf('text', 'T Text'),
      modusKnopf('marke', tabellenKey ? '① Eingriffsstelle' : '① Marke'),
    ), h('div', { class: 'wz-zeile' },
      modusKnopf('verschieben', '✋ Verschieben'),
      modusKnopf('loeschen', '🧽 Löschen'),
    ));
    if (modus === 'stift' || modus === 'text') {
      const farbKnopf = (name, wert) => h('button', { class: `wz farbe ${farbe === wert ? 'aktiv' : ''}`, style: `--f:${wert}`, onclick: () => { farbe = wert; zeichneWerkzeug(); } }, name);
      const zeile = h('div', { class: 'wz-zeile' }, farbKnopf('schwarz', S.FARBEN.schwarz), farbKnopf('rot', S.FARBEN.rot), farbKnopf('blau', S.FARBEN.blau));
      werkzeug.append(zeile);
      if (modus === 'stift') {
        werkzeug.append(h('div', { class: 'wz-zeile' },
          h('button', { class: `wz ${dicke === m.duenn ? 'aktiv' : ''}`, onclick: () => { dicke = m.duenn; zeichneWerkzeug(); } }, 'dünn'),
          h('button', { class: `wz ${dicke === m.dick ? 'aktiv' : ''}`, onclick: () => { dicke = m.dick; zeichneWerkzeug(); } }, 'dick')));
      }
    }
    const hilfe = {
      stift: 'Mit dem Finger zeichnen.',
      text: 'Auf die Stelle tippen, an der die Beschriftung stehen soll.',
      marke: tabellenKey ? 'Auf die Eingriffsstelle tippen – sie bekommt die nächste Nummer und eine Zeile in der Tabelle.' : 'Auf die Stelle tippen – sie bekommt die nächste Nummer.',
      verschieben: 'Marke oder Text antippen und ziehen.',
      loeschen: 'Strich, Text oder Marke antippen.',
    }[modus];
    werkzeug.append(h('div', { class: 'wz-zeile' },
      h('button', { class: 'wz', disabled: rueck.length === 0, onclick: () => { vor.push(JSON.stringify(skizze.elemente)); skizze.elemente = JSON.parse(rueck.pop()); auswahl = -1; geaendert(); } }, '↶ Rückgängig'),
      h('button', { class: 'wz', disabled: vor.length === 0, onclick: () => { rueck.push(JSON.stringify(skizze.elemente)); skizze.elemente = JSON.parse(vor.pop()); auswahl = -1; geaendert(); } }, '↷ Wiederholen')),
    h('p', { class: 'feld-hinweis' }, hilfe));
  };

  // ----- Liste der Eingriffsstellen (verknüpft mit der Tabelle) -----
  const markenListe = h('div', { class: 'markenliste' });
  const zeichneMarkenListe = () => {
    leere(markenListe);
    if (!tabellenFeld) return;
    const t = tabelle();
    const zeilen = t.wert || [];
    const meine = S.markenNummern([skizze]);
    const abgleich = S.eingriffsAbgleich(alleMarken(), zeilen);
    markenListe.append(h('h2', {}, `${tabellenFeld.label} (${kap.nr || kap.id})`));
    if (!meine.length) markenListe.append(h('p', { class: 'leer' }, 'Noch keine Eingriffsstelle markiert. Werkzeug „① Eingriffsstelle“ wählen und auf die Stelle tippen.'));
    const spalten = tabellenFeld.spalten.filter((s) => s.id !== 'nr');
    for (const nr of meine) {
      const z = zeilen.find((x) => String(x.nr) === String(nr));
      if (!z) continue;
      const karte = h('div', { class: 'zeile-karte' }, h('div', { class: 'zeile-nr' }, h('span', { class: 'marken-kreis' }, String(nr)), ' Eingriffsstelle'));
      for (const s of spalten) {
        karte.append(h('label', { class: 'feld klein' }, h('span', { class: 'feld-label' }, s.label),
          h('input', {
            type: 'text', value: z[s.id] ?? '', autocomplete: 'off',
            oninput: (ev) => { z[s.id] = ev.target.value; delete z._vorschlag; t.status = null; t.geaendert = new Date().toISOString(); aendern(buch); },
          })));
      }
      markenListe.append(karte);
    }
    if (abgleich.ohneMarke.length) {
      markenListe.append(h('div', { class: 'hinweis warnung' }, `In der Tabelle, aber nicht in der Skizze markiert: Nr. ${abgleich.ohneMarke.join(', ')}.`));
    }
  };

  // ----- Aufbau -----
  leere(app);
  const main = h('main', { class: 'skizzen-main' },
    h('div', { class: 'zeichen-rahmen' }, canvas),
    werkzeug,
    markenListe,
    h('button', {
      class: 'knopf gefahr breit',
      onclick: async () => {
        if (!(await bestaetigen('Diese Skizze löschen? Das lässt sich nicht rückgängig machen.', 'Löschen', 'Abbrechen', true))) return;
        clearTimeout(bildTimer);
        const e = buch.werte[skizze.feldKey];
        if (e) { e.wert = (e.wert || []).filter((id) => id !== skizze.id); e.geaendert = new Date().toISOString(); }
        const t = tabelle();
        if (t) for (const nr of S.markenNummern([skizze])) t.wert = S.zeileZuMarkeEntfernen(nr, t.wert || []);
        await aendern(buch);
        await db.loesche('skizzen', skizze.id);
        meldung('Skizze gelöscht.');
        location.hash = zurueck;
      },
    }, 'Skizze löschen'));
  const fertig = async () => {
    clearTimeout(bildTimer);
    await bildErzeugen(skizze, hintergrund);
    await db.speichere('skizzen', skizze);
    location.hash = zurueck;
  };
  app.append(kopf(`Skizze: ${feld.label}`, null), main, fuss(h('button', { class: 'knopf primaer', onclick: fertig }, 'Fertig')));
  // Zurück-Pfeil im Kopf: ebenfalls über „fertig“, damit das Bild aktuell ist.
  const pfeil = h('button', { class: 'zurueck', 'aria-label': 'Zurück', onclick: fertig }, '‹');
  app.querySelector('.zurueck-platz')?.replaceWith(pfeil);

  zeichneWerkzeug();
  zeichneMarkenListe();
  tabelleAbgleichen();
  neuZeichnen();
}

function textAbfragen() {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'text', autocomplete: 'off', placeholder: 'z. B. Zulauf, Drossel, Tor' });
    const fertig = (wert) => { dlg.close(); resolve(wert); };
    const dlg = h('dialog', { class: 'dialog' },
      h('label', { class: 'feld' }, h('span', { class: 'feld-label' }, 'Beschriftung'), inp),
      h('div', { class: 'dialog-knoepfe' },
        h('button', { class: 'knopf', onclick: () => fertig('') }, 'Abbrechen'),
        h('button', { class: 'knopf primaer', onclick: () => fertig(inp.value.trim()) }, 'Einfügen')));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') fertig(inp.value.trim()); });
    dlg.addEventListener('close', () => { dlg.remove(); resolve(''); });
    document.body.append(dlg);
    dlg.showModal();
    inp.focus();
  });
}
