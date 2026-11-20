// Beckenbuch-App – Bildschirme und Ablauf.
import * as db from './db.js';
import * as G from './gliederung.js';
import { h, leere, meldung, bestaetigen, datumDE, mitwachsen } from './ui.js';
import { leseDezimal } from './zahlen.js';
import { VERSION } from './version.js';

const app = document.getElementById('app');
const zustand = {
  einstellungen: null, // { id, erfasser, stammdaten: {}, aktiveVorlage }
  testGliederung: null,
};

// ---------- Start ----------
async function start() {
  db.beiSpeicherFehler((e) => meldung(`Speichern fehlgeschlagen: ${e.message || e}`, 'fehler'));
  db.beiSpeicherZustand((n) => {
    const el = document.getElementById('speicheranzeige');
    if (el) el.textContent = n > 0 ? 'speichert …' : 'gespeichert ✓';
  });
  window.addEventListener('beforeunload', (ev) => {
    if (db.anzahlOffen() > 0) { ev.preventDefault(); ev.returnValue = ''; }
  });

  zustand.einstellungen = (await db.lese('einstellungen', 'einstellungen')) || {
    id: 'einstellungen', erfasser: '', stammdaten: {}, aktiveVorlage: null,
  };
  zustand.testGliederung = await (await fetch('gliederung/test-gliederung.json')).json();

  // Dauerhaften Speicher beantragen (Chrome entscheidet ohne Rückfrage).
  db.dauerhaftBeantragen().catch(() => {});

  window.addEventListener('hashchange', zeige);
  zeige();
  registriereServiceWorker();
}

// Aktive Gliederung: geladenes Vorlagenpaket oder die eingebaute Test-Gliederung.
async function aktiveGliederung() {
  const id = zustand.einstellungen.aktiveVorlage;
  if (id) {
    const v = await db.lese('vorlagen', id);
    if (v) return v.gliederung;
  }
  return zustand.testGliederung;
}

// Gliederung, mit der ein Beckenbuch angelegt wurde.
async function gliederungFuer(buch) {
  const id = vorlagenId(buch.vorlage.name, buch.vorlage.version);
  const v = await db.lese('vorlagen', id);
  if (v) return { g: v.gliederung, passt: true };
  const t = zustand.testGliederung;
  if (t.vorlage === buch.vorlage.name && t.version === buch.vorlage.version) return { g: t, passt: true };
  return { g: await aktiveGliederung(), passt: false };
}

function vorlagenId(name, version) {
  return `${name}@${version}`;
}

function speichereEinstellungen() {
  return db.speichere('einstellungen', zustand.einstellungen);
}

// ---------- Router ----------
async function zeige() {
  const teile = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  try {
    if (teile.length === 0) await bildschirmListe();
    else if (teile[0] === 'neu') await bildschirmNeu();
    else if (teile[0] === 'einstellungen') await bildschirmEinstellungen();
    else if (teile[0] === 'buch' && teile[2] === 'kapitel') await bildschirmKapitel(teile[1], teile[3]);
    else if (teile[0] === 'buch' && teile[2] === 'akten') await bildschirmAkten(teile[1]);
    else if (teile[0] === 'buch') await bildschirmBuch(teile[1]);
    else location.hash = '#/';
  } catch (e) {
    console.error(e);
    leere(app);
    app.append(kopf('Fehler', '#/'), h('main', {}, h('p', { class: 'fehlertext' }, String(e.message || e))));
  }
  window.scrollTo(0, 0);
}

function kopf(titel, zurueck, zusatz) {
  return h('header', { class: 'kopf' },
    zurueck ? h('a', { class: 'zurueck', href: zurueck, 'aria-label': 'Zurück' }, '‹') : h('span', { class: 'zurueck-platz' }),
    h('h1', {}, titel),
    h('span', { id: 'speicheranzeige', class: 'speicheranzeige' }, db.anzahlOffen() > 0 ? 'speichert …' : 'gespeichert ✓'),
    zusatz || null,
  );
}

function fuss(...knoepfe) {
  return h('footer', { class: 'fuss' }, ...knoepfe);
}

// ---------- Beckenliste ----------
async function bildschirmListe() {
  const g = await aktiveGliederung();
  const buecher = (await db.alle('buecher')).sort((a, b) => (b.geaendert || '').localeCompare(a.geaendert || ''));
  leere(app);
  const main = h('main', {});
  if (g.testdaten) {
    main.append(h('div', { class: 'hinweis warnung' },
      h('strong', {}, 'Testvorlage aktiv. '),
      'Für echte Beckenbücher unter ', h('a', { href: '#/einstellungen' }, 'Einstellungen'), ' das Vorlagenpaket laden.'));
  }
  if (buecher.length === 0) {
    main.append(h('p', { class: 'leer' }, 'Noch kein Beckenbuch angelegt.'));
  }
  for (const b of buecher) {
    main.append(h('a', { class: 'karte', href: `#/buch/${encodeURIComponent(b.id)}` },
      h('div', { class: 'karte-titel' }, G.buchName(b)),
      h('div', { class: 'karte-zeile' }, G.buchBauwerksnr(b) ? `Bauwerksnr. ${G.buchBauwerksnr(b)}` : 'Bauwerksnr. fehlt'),
      h('div', { class: 'karte-zeile' },
        h('span', { class: `stand stand-${b.stand}` }, G.BUCH_STAND[b.stand] || b.stand),
        ' · geändert ', datumDE(b.geaendert)),
      b.vorlage.testdaten ? h('div', { class: 'marke' }, 'Testvorlage') : null,
      G.brauchtSicherung(b) ? h('div', { class: 'marke warnmarke' }, 'Weder gesichert noch versendet') : null,
    ));
  }
  app.append(
    kopf('Beckenbücher', null),
    main,
    fuss(
      h('a', { class: 'knopf', href: '#/einstellungen' }, 'Einstellungen'),
      h('a', { class: 'knopf primaer', href: '#/neu' }, '+ Neues Beckenbuch'),
    ),
  );
}

// ---------- Neues Beckenbuch ----------
async function bildschirmNeu() {
  const g = await aktiveGliederung();
  const angaben = { name: '', bauwerksnr: '', teilbauwerke: [], freieTeilbauwerke: [] };
  leere(app);
  const main = h('main', {},
    g.testdaten ? h('div', { class: 'hinweis warnung' }, 'Es wird mit der Testvorlage angelegt.') : null,
    h('label', { class: 'feld' }, h('span', { class: 'feld-label' }, 'Name der Anlage'),
      h('input', { type: 'text', autocomplete: 'off', oninput: (e) => { angaben.name = e.target.value; } })),
    h('label', { class: 'feld' }, h('span', { class: 'feld-label' }, 'Bauwerksnummer'),
      h('input', { type: 'text', autocomplete: 'off', oninput: (e) => { angaben.bauwerksnr = e.target.value; } })),
    teilbauwerkAuswahl(g, angaben, () => {}),
  );
  app.append(
    kopf('Neues Beckenbuch', '#/'),
    main,
    fuss(
      h('a', { class: 'knopf', href: '#/' }, 'Abbrechen'),
      h('button', {
        class: 'knopf primaer',
        onclick: async () => {
          if (!angaben.name.trim()) { meldung('Bitte einen Namen eingeben.', 'fehler'); return; }
          await vorlageSicherstellen(g);
          const buch = G.neuesBeckenbuch(g, zustand.einstellungen.stammdaten, angaben);
          await db.speichere('buecher', buch);
          location.hash = `#/buch/${encodeURIComponent(buch.id)}`;
        },
      }, 'Anlegen'),
    ),
  );
}

// Die Testvorlage wird beim ersten Anlegen ebenfalls gespeichert, damit das Beckenbuch
// auch nach einem Update der App seine Gliederung findet.
async function vorlageSicherstellen(g) {
  const id = vorlagenId(g.vorlage, g.version);
  if (!(await db.lese('vorlagen', id))) {
    await db.speichere('vorlagen', { id, gliederung: g, geladen: new Date().toISOString() });
  }
}

function teilbauwerkAuswahl(g, ziel, beiAenderung) {
  const gewaehlt = new Set(ziel.teilbauwerke);
  const box = h('fieldset', { class: 'gruppe' }, h('legend', {}, 'Teilbauwerke (Zutreffendes ankreuzen)'));
  for (const t of g.teilbauwerke || []) {
    const cb = h('input', {
      type: 'checkbox', checked: gewaehlt.has(t.id),
      onchange: (e) => {
        if (e.target.checked) gewaehlt.add(t.id); else gewaehlt.delete(t.id);
        ziel.teilbauwerke = (g.teilbauwerke || []).map((x) => x.id).filter((id) => gewaehlt.has(id));
        beiAenderung('haken');
      },
    });
    box.append(h('label', { class: 'option' }, cb, h('span', {}, t.label)));
  }
  const anzahlFrei = g.freieTeilbauwerke || 0;
  for (let i = 0; i < anzahlFrei; i++) {
    box.append(h('input', {
      type: 'text', class: 'frei', placeholder: 'weiteres Teilbauwerk', value: (ziel.freieTeilbauwerke || [])[i] || '',
      oninput: (e) => { ziel.freieTeilbauwerke = ziel.freieTeilbauwerke || []; ziel.freieTeilbauwerke[i] = e.target.value; beiAenderung('text'); },
    }));
  }
  return box;
}

// ---------- Beckenbuch: Kapitelübersicht ----------
async function ladeBuch(id) {
  const buch = await db.lese('buecher', id);
  if (!buch) throw new Error('Dieses Beckenbuch gibt es nicht (mehr).');
  return buch;
}

function aendern(buch) {
  buch.geaendert = new Date().toISOString();
  return db.speichere('buecher', buch);
}

async function bildschirmBuch(id) {
  const buch = await ladeBuch(id);
  const { g, passt } = await gliederungFuer(buch);
  leere(app);
  const main = h('main', {});
  if (!passt) {
    main.append(h('div', { class: 'hinweis warnung' },
      `Die Vorlage dieses Beckenbuchs (${buch.vorlage.name}, ${buch.vorlage.version}) ist auf diesem Gerät nicht geladen. Angezeigt wird die aktive Vorlage; Felder können fehlen.`));
  }

  // Stand
  const standBox = h('div', { class: 'segment' });
  for (const s of ['in_arbeit', 'vor_ort_fertig', 'vollstaendig']) {
    standBox.append(h('button', {
      class: buch.stand === s ? 'aktiv' : '',
      onclick: async () => { buch.stand = s; await aendern(buch); zeige(); },
    }, G.BUCH_STAND[s]));
  }
  main.append(h('div', { class: 'abschnitt' }, h('h2', {}, 'Stand'), standBox,
    buch.versendet ? h('p', {}, `Versendet am ${datumDE(buch.versendet)}`) : null));

  // Mindestumfang
  const mu = G.mindestumfang(g, buch);
  if (mu.length) {
    const fehlt = mu.filter((m) => !m.erfuellt).length;
    main.append(h('details', { class: 'abschnitt', open: fehlt > 0 },
      h('summary', {}, h('h2', {}, `Mindestumfang ARV Nr. 2: ${fehlt === 0 ? 'vollständig' : `${fehlt} fehlen`}`)),
      h('ul', { class: 'mindest' }, mu.map((m) => h('li', { class: m.erfuellt ? 'ok' : 'fehlt' }, m.erfuellt ? '✓ ' : '✗ ', m.label))),
    ));
  }

  // Kapitel
  const liste = h('div', { class: 'abschnitt' }, h('h2', {}, 'Kapitel'));
  for (const k of G.sichtbareKapitel(g, buch)) {
    const f = G.kapitelFortschritt(g, buch, k);
    const teile = [`${f.geklaert}/${f.gesamt} geklärt`];
    if (f.offen) teile.push(`${f.offen} offen`);
    if (f.aus_akten) teile.push(`${f.aus_akten} aus Akten`);
    liste.append(h('a', { class: `kapitel-zeile ${f.geklaert === f.gesamt ? 'fertig' : ''}`, href: `#/buch/${encodeURIComponent(buch.id)}/kapitel/${encodeURIComponent(k.id)}` },
      h('span', { class: 'kap-nr' }, k.nr || ''),
      h('span', { class: 'kap-titel' }, k.titel, f.pflichtLeer ? h('span', { class: 'pflicht-marke' }, ` · ${f.pflichtLeer} Pflicht leer`) : null),
      h('span', { class: 'kap-stand' }, teile.join(' · ')),
    ));
  }
  main.append(liste);

  // Zuschaltbare Abschnitte
  const zuschaltbar = g.kapitel.filter((k) => k.zuschaltbar && G.istSichtbar(k, buch));
  if (zuschaltbar.length) {
    const box = h('div', { class: 'abschnitt' }, h('h2', {}, 'Zusätzliche Abschnitte'));
    for (const k of zuschaltbar) {
      const an = (buch.zugeschaltet || []).includes(k.id);
      box.append(h('label', { class: 'option' },
        h('input', {
          type: 'checkbox', checked: an,
          onchange: async (e) => {
            const set = new Set(buch.zugeschaltet || []);
            if (e.target.checked) set.add(k.id); else set.delete(k.id);
            buch.zugeschaltet = g.kapitel.map((x) => x.id).filter((x) => set.has(x));
            await aendern(buch);
            zeige();
          },
        }),
        h('span', {}, `${k.nr} ${k.titel}`, k.quelle ? h('small', {}, ` (aus ${k.quelle})`) : null)));
    }
    main.append(box);
  }

  const akten = G.akteneintraege(g, buch);
  main.append(h('div', { class: 'abschnitt' },
    h('a', { class: 'knopf breit', href: `#/buch/${encodeURIComponent(buch.id)}/akten` }, `Aus den Akten nachzutragen (${akten.length})`),
    h('button', {
      class: 'knopf gefahr breit',
      onclick: async () => {
        const ok = await bestaetigen(`„${G.buchName(buch)}“ endgültig löschen? Das lässt sich nicht rückgängig machen. Ohne Sicherungsdatei sind die Daten verloren.`, 'Endgültig löschen', 'Abbrechen', true);
        if (!ok) return;
        await db.loesche('buecher', buch.id);
        meldung('Beckenbuch gelöscht.');
        location.hash = '#/';
      },
    }, 'Beckenbuch löschen'),
  ));

  app.append(kopf(G.buchName(buch), '#/'), main);
}

// ---------- Aus den Akten ----------
async function bildschirmAkten(id) {
  const buch = await ladeBuch(id);
  const { g } = await gliederungFuer(buch);
  const liste = G.akteneintraege(g, buch);
  leere(app);
  const main = h('main', {},
    h('p', {}, 'Felder mit Status „aus Akten“ und leere Felder, die laut Vorlage aus den Akten kommen.'),
    liste.length === 0 ? h('p', { class: 'leer' }, 'Nichts nachzutragen.') : null,
    liste.map((e) => h('a', { class: 'kapitel-zeile', href: `#/buch/${encodeURIComponent(buch.id)}/kapitel/${encodeURIComponent(e.kapitel.id)}` },
      h('span', { class: 'kap-nr' }, e.kapitel.nr || ''),
      h('span', { class: 'kap-titel' }, e.feld.label),
      h('span', { class: 'kap-stand' }, G.STATUS[e.status]))),
  );
  app.append(kopf('Aus den Akten', `#/buch/${encodeURIComponent(buch.id)}`), main);
}

// ---------- Kapitel erfassen ----------
async function bildschirmKapitel(buchId, kapId) {
  const buch = await ladeBuch(buchId);
  const { g } = await gliederungFuer(buch);
  const kapitelListe = G.sichtbareKapitel(g, buch);
  const idx = kapitelListe.findIndex((k) => k.id === kapId);
  if (idx < 0) { location.hash = `#/buch/${encodeURIComponent(buchId)}`; return; }
  const kap = kapitelListe[idx];
  const zurUebersicht = `#/buch/${encodeURIComponent(buch.id)}`;

  leere(app);
  const main = h('main', {});
  if (kap.hinweis) {
    main.append(h('details', { class: 'hinweis' }, h('summary', {}, 'Hinweis der Vorlage'), h('p', {}, kap.hinweis)));
  }
  for (const t of kap.festtext || []) main.append(h('p', { class: 'festtext' }, t));

  if (kap.id === 'DECK' || (g.testdaten && idx === 0)) {
    main.append(teilbauwerkAuswahl(g, buch, async (art) => {
      await aendern(buch);
      // Ändern sich die Teilbauwerke, können Felder dieses Kapitels ein- oder ausgeblendet werden.
      if (art === 'haken' && (kap.felder || []).some((f) => f.sichtbarWenn)) {
        const y = window.scrollY;
        await bildschirmKapitel(buchId, kapId);
        window.scrollTo(0, y);
      }
    }));
  }

  for (const feld of G.sichtbareFelder(kap, buch)) main.append(feldBlock(g, buch, kap, feld));

  const naechstes = kapitelListe[idx + 1];
  app.append(
    kopf(`${kap.nr ? kap.nr + ' ' : ''}${kap.titel}`, zurUebersicht),
    main,
    fuss(
      h('a', { class: 'knopf', href: zurUebersicht }, 'Übersicht'),
      naechstes
        ? h('a', { class: 'knopf primaer', href: `#/buch/${encodeURIComponent(buch.id)}/kapitel/${encodeURIComponent(naechstes.id)}` }, `Weiter: ${naechstes.nr || naechstes.titel} ›`)
        : h('a', { class: 'knopf primaer', href: zurUebersicht }, 'Fertig'),
    ),
  );
}

function eintrag(buch, key) {
  if (!buch.werte[key]) buch.werte[key] = { wert: undefined, status: null, geaendert: null };
  return buch.werte[key];
}

function feldBlock(g, buch, kap, feld) {
  const key = G.feldKey(kap.id, feld.id);
  const block = h('section', { class: 'feldblock', id: `feld-${key}` });
  const statusZeile = h('div', { class: 'statuszeile' });

  const marken = [];
  if (feld.pflicht) marken.push(h('span', { class: 'marke pflicht' }, 'Pflicht'));
  if (feld.vorschlag) marken.push(h('span', { class: 'marke' }, 'Vorschlag der App'));
  if (feld.ort === 'akten') marken.push(h('span', { class: 'marke' }, 'Akten'));
  if (feld.ort === 'stammdaten') marken.push(h('span', { class: 'marke' }, 'aus Stammdaten'));

  block.append(h('div', { class: 'feld-kopf' }, h('span', { class: 'feld-label' }, feld.label, feld.einheit ? ` [${feld.einheit}]` : ''), ...marken));
  if (feld.hinweis) block.append(h('p', { class: 'feld-hinweis' }, feld.hinweis));

  // Feld, das nur einen anderen Wert anzeigt
  if (feld.aus) {
    const w = G.wertVon(g, buch, kap.id, feld);
    block.append(h('p', { class: 'uebernommen' }, w ? String(w) : '(noch leer)', h('small', {}, ' – wird automatisch übernommen')));
    return block;
  }

  const e = eintrag(buch, key);
  const aktualisiereStatus = () => {
    leere(statusZeile);
    const st = G.feldStatus(g, buch, kap.id, feld);
    statusZeile.append(h('span', { class: `status status-${st}` }, G.STATUS[st]));
    for (const s of G.HAND_STATUS) {
      statusZeile.append(h('button', {
        class: `chip ${e.status === s ? 'aktiv' : ''}`,
        onclick: () => {
          e.status = e.status === s ? null : s;
          e.geaendert = new Date().toISOString();
          aendern(buch);
          aktualisiereStatus();
        },
      }, G.STATUS[s]));
    }
  };

  // Bei Eingabe eines Werts wird ein von Hand gesetzter Status aufgehoben.
  const setzeWert = (wert) => {
    e.wert = wert;
    if (!G.istLeer(feld, wert)) e.status = null;
    e.geaendert = new Date().toISOString();
    aendern(buch);
    aktualisiereStatus();
  };

  block.append(eingabe(g, buch, kap, feld, e, setzeWert));
  block.append(statusZeile);
  aktualisiereStatus();
  return block;
}

function eingabe(g, buch, kap, feld, e, setzeWert) {
  switch (feld.art) {
    case 'text':
    case 'datum': {
      const inp = h('input', {
        type: feld.art === 'datum' ? 'date' : 'text', value: e.wert ?? '', autocomplete: 'off',
        oninput: (ev) => setzeWert(ev.target.value),
      });
      const box = h('div', {}, inp);
      if (feld.vorschlagAus) {
        const v = G.vorschlagAusTeilbauwerken(g, buch, feld);
        if (v && v !== e.wert) {
          box.append(h('div', { class: 'vorschlag' }, `Vorschlag: ${v} `,
            h('button', { class: 'knopf klein', onclick: (ev) => { inp.value = v; setzeWert(v); ev.target.parentElement.remove(); } }, 'Übernehmen')));
        }
      }
      return box;
    }
    case 'langtext':
      return mitwachsen(h('textarea', { rows: 3, oninput: (ev) => setzeWert(ev.target.value) }, e.wert ?? ''));
    case 'zahl': {
      const warn = h('div', { class: 'feld-warnung' });
      const pruefe = (t) => { warn.textContent = t.trim() && leseDezimal(t) === null ? 'Keine Zahl erkannt – bitte prüfen (Dezimalkomma, z. B. 2,40).' : ''; };
      const inp = h('input', {
        type: 'text', inputmode: 'decimal', value: e.wert ?? '', autocomplete: 'off',
        oninput: (ev) => { pruefe(ev.target.value); setzeWert(ev.target.value); },
      });
      pruefe(String(e.wert ?? ''));
      return h('div', { class: 'zahl-zeile' }, inp, feld.einheit ? h('span', { class: 'einheit' }, feld.einheit) : null, warn);
    }
    case 'auswahl': {
      const box = h('div', { class: 'optionen' });
      const zeichne = () => {
        leere(box);
        for (const o of feld.optionen) {
          box.append(h('button', {
            class: `option-knopf ${e.wert === o ? 'aktiv' : ''}`,
            onclick: () => { setzeWert(e.wert === o ? undefined : o); zeichne(); },
          }, o));
        }
      };
      zeichne();
      return box;
    }
    case 'mehrfach': {
      const box = h('div', { class: 'optionen' });
      const zeichne = () => {
        leere(box);
        const set = new Set(e.wert || []);
        for (const o of feld.optionen) {
          box.append(h('button', {
            class: `option-knopf ${set.has(o) ? 'aktiv' : ''}`,
            onclick: () => {
              if (set.has(o)) set.delete(o); else set.add(o);
              setzeWert(feld.optionen.filter((x) => set.has(x)));
              zeichne();
            },
          }, set.has(o) ? `☑ ${o}` : `☐ ${o}`));
        }
      };
      zeichne();
      return box;
    }
    case 'janein': {
      const box = h('div', { class: 'optionen zwei' });
      const zeichne = () => {
        leere(box);
        for (const [w, t] of [[true, 'Ja'], [false, 'Nein']]) {
          box.append(h('button', {
            class: `option-knopf ${e.wert === w ? 'aktiv' : ''}`,
            onclick: () => { setzeWert(e.wert === w ? undefined : w); zeichne(); },
          }, t));
        }
      };
      zeichne();
      return box;
    }
    case 'tabelle':
      return tabelle(feld, e, setzeWert);
    case 'foto':
    case 'skizze':
      return h('p', { class: 'platzhalter' }, feld.art === 'foto' ? 'Fotos folgen in Etappe 3.' : 'Skizzen folgen in Etappe 3.');
    default:
      return h('p', { class: 'fehlertext' }, `Unbekannte Feldart: ${feld.art}`);
  }
}

function tabelle(feld, e, setzeWert) {
  const box = h('div', { class: 'tabelle' });
  const zeilen = () => (Array.isArray(e.wert) ? e.wert : []);
  const zeichne = () => {
    leere(box);
    zeilen().forEach((z, i) => {
      const karte = h('div', { class: `zeile-karte ${z._vorschlag ? 'vorschlagszeile' : ''}` }, h('div', { class: 'zeile-nr' }, `Zeile ${i + 1}`,
        z._vorschlag ? h('span', { class: 'marke' }, 'Beispiel der Vorlage – bestätigen, ändern oder löschen') : null));
      for (const s of feld.spalten) {
        karte.append(h('label', { class: 'feld klein' }, h('span', { class: 'feld-label' }, s.label),
          h('input', {
            type: 'text', value: z[s.id] ?? '', inputmode: s.art === 'zahl' ? 'decimal' : 'text', autocomplete: 'off',
            oninput: (ev) => {
              z[s.id] = ev.target.value;
              if (z._vorschlag) { delete z._vorschlag; karte.classList.remove('vorschlagszeile'); karte.querySelector('.zeile-nr .marke')?.remove(); karte.querySelector('.bestaetigen')?.remove(); }
              setzeWert([...zeilen()]);
            },
          })));
      }
      if (z._vorschlag) {
        karte.append(h('button', {
          class: 'knopf klein bestaetigen',
          onclick: () => { delete z._vorschlag; setzeWert([...zeilen()]); zeichne(); },
        }, 'Übernehmen'), ' ');
      }
      karte.append(h('button', {
        class: 'knopf klein gefahr',
        onclick: async () => {
          if (G.zeileHatInhalt(feld, z) && !(await bestaetigen(`Zeile ${i + 1} löschen?`, 'Löschen', 'Abbrechen', true))) return;
          setzeWert(zeilen().filter((x) => x !== z));
          zeichne();
        },
      }, 'Zeile löschen'));
      box.append(karte);
    });
    box.append(h('button', {
      class: 'knopf breit',
      onclick: () => {
        const neu = { id: G.neueZeilenId() };
        if (feld.spalten.some((s) => s.id === 'nr')) neu.nr = String(zeilen().length + 1);
        setzeWert([...zeilen(), neu]);
        zeichne();
        const felder = box.querySelectorAll('.zeile-karte:last-of-type input');
        if (felder[1] || felder[0]) (felder[1] || felder[0]).focus();
      },
    }, '+ Zeile hinzufügen'));
  };
  zeichne();
  return box;
}

// ---------- Einstellungen ----------
async function bildschirmEinstellungen() {
  const g = await aktiveGliederung();
  const es = zustand.einstellungen;
  const vorlagen = await db.alle('vorlagen');
  const speicher = await db.speicherStatus();
  leere(app);
  const main = h('main', {});

  // Erfasser und Stammdaten
  const stamm = h('div', { class: 'abschnitt' }, h('h2', {}, 'Erfasser und Stammdaten'),
    h('p', { class: 'feld-hinweis' }, 'Werden in jedes neue Beckenbuch übernommen und können dort geändert werden. Sie bleiben nur auf diesem Gerät.'),
    h('label', { class: 'feld' }, h('span', { class: 'feld-label' }, 'Erfasser'),
      h('input', { type: 'text', value: es.erfasser || '', oninput: (ev) => { es.erfasser = ev.target.value; speichereEinstellungen(); } })));
  for (const s of g.stammdaten || []) {
    if (s.art === 'tabelle') {
      const e = { wert: es.stammdaten[s.id] || [] };
      stamm.append(h('div', { class: 'feld' }, h('span', { class: 'feld-label' }, s.label),
        tabelle(s, e, (w) => { es.stammdaten[s.id] = w; speichereEinstellungen(); })));
    } else {
      stamm.append(h('label', { class: 'feld' }, h('span', { class: 'feld-label' }, s.label),
        h('input', { type: 'text', value: es.stammdaten[s.id] || '', oninput: (ev) => { es.stammdaten[s.id] = ev.target.value; speichereEinstellungen(); } })));
    }
  }
  main.append(stamm);

  // Vorlage
  const dateiInput = h('input', {
    type: 'file', accept: '.json,application/json', class: 'versteckt',
    onchange: async (ev) => {
      const datei = ev.target.files[0];
      if (!datei) return;
      try {
        const gl = JSON.parse(await datei.text());
        const fehler = G.pruefeGliederung(gl);
        if (fehler.length) { meldung(`Vorlage fehlerhaft: ${fehler.slice(0, 3).join(' ')}`, 'fehler'); return; }
        const id = vorlagenId(gl.vorlage, gl.version);
        await db.speichere('vorlagen', { id, gliederung: gl, geladen: new Date().toISOString() });
        es.aktiveVorlage = id;
        await speichereEinstellungen();
        meldung(`Vorlage geladen: ${gl.vorlage} (${gl.version})`);
        zeige();
      } catch (e) {
        meldung(`Datei konnte nicht gelesen werden: ${e.message}`, 'fehler');
      }
    },
  });
  const vorlageBox = h('div', { class: 'abschnitt' }, h('h2', {}, 'Vorlage'),
    h('p', {}, 'Aktiv: ', h('strong', {}, g.vorlage), ` (Version ${g.version})`),
    g.testdaten ? h('div', { class: 'hinweis warnung' }, 'Das ist die eingebaute Testvorlage.') : null,
    dateiInput,
    h('button', { class: 'knopf breit', onclick: () => dateiInput.click() }, 'Vorlagenpaket laden …'));
  const echte = vorlagen.filter((v) => !v.gliederung.testdaten);
  if (echte.length > 1 || (echte.length && g.testdaten)) {
    vorlageBox.append(h('p', { class: 'feld-hinweis' }, 'Geladene Vorlagen – für neue Beckenbücher verwenden:'));
    for (const v of vorlagen) {
      vorlageBox.append(h('label', { class: 'option' },
        h('input', { type: 'radio', name: 'vorlage', checked: es.aktiveVorlage === v.id || (!es.aktiveVorlage && v.gliederung.testdaten),
          onchange: async () => { es.aktiveVorlage = v.gliederung.testdaten ? null : v.id; await speichereEinstellungen(); zeige(); } }),
        h('span', {}, `${v.gliederung.vorlage} (${v.gliederung.version})`)));
    }
  }
  main.append(vorlageBox);

  // Speicher
  main.append(h('div', { class: 'abschnitt' }, h('h2', {}, 'Speicher auf diesem Gerät'),
    h('p', {}, 'Dauerhafter Speicher: ', h('strong', {}, speicher.dauerhaft === true ? 'gewährt' : speicher.dauerhaft === false ? 'nicht gewährt' : 'unbekannt')),
    speicher.dauerhaft === false ? h('p', { class: 'feld-hinweis' }, 'Chrome gewährt ihn meist erst, wenn die App auf dem Startbildschirm installiert ist. Bis dahin regelmäßig sichern.') : null,
    speicher.belegtMB !== null ? h('p', {}, `Belegt: ${speicher.belegtMB} MB von ca. ${speicher.verfuegbarMB} MB`) : null,
    h('button', { class: 'knopf breit', onclick: async () => { const ok = await db.dauerhaftBeantragen(); meldung(ok ? 'Dauerhafter Speicher gewährt.' : 'Nicht gewährt – App installieren und erneut versuchen.'); zeige(); } }, 'Dauerhaften Speicher beantragen'),
  ));

  main.append(h('p', { class: 'version' }, `App-Version ${VERSION}`));
  app.append(kopf('Einstellungen', '#/'), main);
}

// ---------- Offline-Betrieb ----------
function registriereServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const neu = reg.installing;
      neu && neu.addEventListener('statechange', () => {
        if (neu.state === 'installed' && navigator.serviceWorker.controller) {
          const leiste = document.getElementById('update');
          leiste.hidden = false;
          leiste.onclick = async () => {
            await db.allesGespeichert();
            neu.postMessage('skipWaiting');
          };
        }
      });
    });
  }).catch((e) => console.warn('Service Worker nicht registriert', e));
  let neuGeladen = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (neuGeladen) return;
    neuGeladen = true;
    location.reload();
  });
}

start();
