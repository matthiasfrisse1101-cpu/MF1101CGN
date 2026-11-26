// Oberfläche für Maße (Zahlfelder) und das Sammeldiktat je Kapitel.
// Diktiert wird mit dem Mikrofon der Handy-Tastatur – die App nimmt selbst nichts auf.
import { h, leere, meldung, mitwachsen } from './ui.js';
import { bewerteMassEingabe, massAnzeige, HERKUNFT } from './masse.js';
import { massText } from './zahlen.js';
import { werteAus, wertFuerFeld } from './sammeldiktat.js';
import { feldKey, neueZeilenId, OHNE_DIKTAT } from './gliederung.js';

// ---------- Zahlfeld mit Maßerkennung ----------
// e: Eintrag im Beckenbuch, setzeWert(text): speichert (e.mass wird vorher gesetzt).
export function massFeld(feld, e, setzeWert) {
  const info = h('div', { class: 'mass-info' });
  const inp = h('input', {
    type: 'text', inputmode: 'text', value: e.wert ?? '', autocomplete: 'off', enterkeyhint: 'done',
    placeholder: feld.format === 'verhaeltnis' ? 'z. B. 1 zu 2' : feld.einheit ? `z. B. 2,40 ${feld.einheit}` : '',
    oninput: (ev) => eingabe(ev.target.value),
  });

  const uebernehmen = (mass, text) => {
    e.mass = { ...mass, fuer: text };
    setzeWert(text);
    zeige();
  };
  const eingabe = (text) => {
    const b = bewerteMassEingabe(text, feld);
    if (b.zustand === 'auto') e.mass = { ...b.mass, fuer: text.trim() };
    else if (!e.mass || e.mass.fuer !== text.trim()) e.mass = null;
    setzeWert(text);
    zeige();
  };
  const zeige = () => {
    leere(info);
    const text = String(e.wert ?? '').trim();
    if (!text) return;
    const b = bewerteMassEingabe(text, feld);
    if (e.mass && e.mass.fuer === text) {
      info.append(h('div', { class: 'mass-ok' }, `✓ ${massAnzeige({ mass: e.mass })}`));
    } else if (b.zustand === 'bestaetigen') {
      info.append(h('div', { class: 'vorschlag' }, `Erkannt: ${massText({ erkannt: true, ...b.mass })}${b.hinweis ? ` (${b.hinweis})` : ''}`,
        h('button', { class: 'knopf klein', onclick: () => uebernehmen(b.mass, text) }, 'Übernehmen')));
    } else if (b.zustand === 'umrechnen') {
      info.append(h('div', { class: 'vorschlag' }, `${b.hinweis} `,
        h('button', { class: 'knopf klein', onclick: () => uebernehmen(b.umgerechnet, text) }, `Als ${massText({ erkannt: true, ...b.umgerechnet })} übernehmen`)));
    } else if (b.zustand === 'fremd') {
      info.append(h('div', { class: 'feld-warnung' }, `⚠ ${b.hinweis} Bitte prüfen – bleibt so lange als Text stehen.`));
    } else if (b.zustand === 'unerkannt') {
      info.append(h('div', { class: 'feld-warnung' }, `⚠ Keine Zahl erkannt${b.hinweis && b.hinweis !== 'keine Zahl erkannt' ? ` (${b.hinweis})` : ''} – bleibt als Text, zur Prüfung markiert.`));
    }
  };

  // Herkunft des Maßes
  const herkunft = h('div', { class: 'herkunft' });
  const zeigeHerkunft = () => {
    leere(herkunft);
    for (const [k, t] of Object.entries(HERKUNFT)) {
      herkunft.append(h('button', {
        class: `chip ${e.herkunft === k ? 'aktiv' : ''}`,
        onclick: () => { e.herkunft = e.herkunft === k ? null : k; setzeWert(e.wert ?? ''); zeigeHerkunft(); },
      }, t));
    }
  };
  zeige();
  zeigeHerkunft();
  return h('div', {},
    h('div', { class: 'zahl-zeile' }, inp, feld.einheit && feld.einheit !== '1:n' ? h('span', { class: 'einheit' }, feld.einheit) : null),
    info, herkunft);
}

// ---------- Sammeldiktat ----------
// umgebung: { buch, kap, felder (sichtbar), aendern(buch), neuZeichnen() }
export function sammeldiktatBox({ buch, kap, felder, aendern, neuZeichnen }) {
  buch.sammeldiktate = buch.sammeldiktate || {};
  const box = h('details', { class: 'sammeldiktat', open: !!buch.sammeldiktate[kap.id] });
  const liste = h('div', { class: 'vorschlagsliste' });
  const ta = mitwachsen(h('textarea', {
    rows: 3, placeholder: 'Frei diktieren, z. B. „Länge 32 Meter, Breite 14 Meter, Böschung 1 zu 2.“',
    oninput: (ev) => { buch.sammeldiktate[kap.id] = ev.target.value; aendern(buch); },
  }, buch.sammeldiktate[kap.id] || ''));

  const bearbeitbar = felder.filter((f) => !f.aus && !OHNE_DIKTAT.includes(f.art));
  const auswerten = () => {
    leere(liste);
    const vs = werteAus(ta.value, bearbeitbar);
    if (!vs.length) { liste.append(h('p', { class: 'leer' }, 'Nichts erkannt.')); return; }
    const offen = new Set(vs);
    vs.forEach((v) => liste.append(vorschlagKarte(v, () => offen.delete(v))));
    liste.append(h('button', {
      class: 'knopf primaer breit',
      onclick: () => {
        for (const v of offen) anwenden(v);
        offen.clear();
        buch.sammeldiktate[kap.id] = '';
        aendern(buch);
        meldung('Übernommen.');
        neuZeichnen();
      },
    }, 'Alle übernehmen'));
  };

  // Einen Vorschlag ins Beckenbuch schreiben.
  const anwenden = (v) => {
    const jetzt = new Date().toISOString();
    if (v.ziel === 'verwerfen') return;
    if (v.ziel === 'notiz' || (v.typ === 'notiz' && !v.ziel)) {
      buch.notizen = buch.notizen || {};
      const alt = buch.notizen[kap.id] || '';
      buch.notizen[kap.id] = alt ? `${alt}\n${v.text ?? v.quelle}` : (v.text ?? v.quelle);
      return;
    }
    const f = bearbeitbar.find((x) => x.id === (v.ziel || v.feldId));
    if (!f) return;
    const key = feldKey(kap.id, f.id);
    const e = buch.werte[key] || (buch.werte[key] = { wert: undefined, status: null, geaendert: null });
    if (v.typ === 'zeile') {
      e.wert = [...(Array.isArray(e.wert) ? e.wert : []), { id: neueZeilenId(), ...v.zeile }];
    } else if (f.art === 'zahl') {
      const b = bewerteMassEingabe(v.wert, f);
      e.wert = v.wert;
      // Mit „Übernehmen“ bestätigt; unpassende Einheiten werden nicht umgerechnet und bleiben zur Prüfung.
      e.mass = b.zustand === 'auto' || b.zustand === 'bestaetigen' ? { ...b.mass, fuer: String(v.wert).trim() } : null;
    } else if (f.art === 'langtext' || f.art === 'text') {
      const alt = String(e.wert ?? '').trim();
      e.wert = alt ? `${alt}${f.art === 'langtext' ? '\n' : '; '}${v.wert}` : v.wert;
    } else if (f.art === 'mehrfach') {
      const set = new Set([...(e.wert || []), ...v.wert]);
      e.wert = f.optionen.filter((o) => set.has(o));
    } else {
      e.wert = v.wert;
    }
    e.status = null;
    e.geaendert = jetzt;
  };

  const vorschlagKarte = (v, erledigt) => {
    const karte = h('div', { class: 'zeile-karte' });
    const zeichne = () => {
      leere(karte);
      karte.append(h('div', { class: 'feld-hinweis' }, `„${v.quelle ?? v.text}“`));
      // Ziel wählen
      const sel = h('select', { class: 'ziel-auswahl', onchange: (ev) => {
        v.ziel = ev.target.value;
        const f = bearbeitbar.find((x) => x.id === v.ziel);
        if (f && v.typ !== 'zeile') {
          // Notiz einem Feld zuordnen bzw. anderes Feld wählen: Wert für das neue Feld neu lesen.
          v.quelle = v.quelle ?? v.text;
          const text = v.typ === 'feld' && typeof v.wert === 'string' ? v.wert : String(v.quelle);
          v.typ = 'feld';
          const neu = wertFuerFeld(f, text);
          v.wert = neu ? neu.wert : text;
        }
        zeichne();
      } });
      const ziele = v.typ === 'zeile' ? bearbeitbar.filter((f) => f.id === v.feldId) : bearbeitbar.filter((f) => f.art !== 'tabelle');
      for (const f of ziele) sel.append(h('option', { value: f.id, selected: (v.ziel || v.feldId) === f.id }, `→ ${f.label}`));
      sel.append(h('option', { value: 'notiz', selected: v.ziel === 'notiz' || (!v.ziel && v.typ === 'notiz') }, '→ Notiz zum Kapitel'));
      sel.append(h('option', { value: 'verwerfen', selected: v.ziel === 'verwerfen' }, '✗ verwerfen'));
      karte.append(sel);
      // Wert
      if (v.typ === 'zeile') {
        const tab = bearbeitbar.find((f) => f.id === v.feldId);
        karte.append(h('ul', { class: 'zeilen-vorschau' }, tab.spalten.filter((s) => v.zeile[s.id]).map((s) => h('li', {}, `${s.label}: ${v.zeile[s.id]}`))));
      } else if (v.typ === 'feld' && v.ziel !== 'notiz' && v.ziel !== 'verwerfen') {
        const f = bearbeitbar.find((x) => x.id === (v.ziel || v.feldId));
        const anzeige = typeof v.wert === 'boolean' ? (v.wert ? 'Ja' : 'Nein') : Array.isArray(v.wert) ? v.wert.join(', ') : String(v.wert);
        karte.append(h('div', { class: 'vorschlag-wert' }, h('strong', {}, anzeige)));
        if (f && f.art === 'zahl') {
          const b = bewerteMassEingabe(v.wert, f);
          const t = { auto: '', bestaetigen: `erkannt: ${massText({ erkannt: true, ...b.mass })}`, umrechnen: `${b.hinweis} Wird nicht umgerechnet – im Feld prüfen.`, fremd: b.hinweis, unerkannt: 'keine Zahl erkannt – wird zur Prüfung markiert' }[b.zustand];
          if (t) karte.append(h('div', { class: b.zustand === 'bestaetigen' ? 'feld-hinweis' : 'feld-warnung' }, t));
        }
      }
      karte.append(h('button', {
        class: 'knopf klein', onclick: () => { anwenden(v); erledigt(); aendern(buch); karte.replaceWith(h('p', { class: 'feld-hinweis' }, `✓ ${v.ziel === 'verwerfen' ? 'verworfen' : 'übernommen'}: „${v.quelle ?? v.text}“`)); },
      }, v.ziel === 'verwerfen' ? 'Verwerfen' : 'Übernehmen'));
    };
    zeichne();
    return karte;
  };

  box.append(
    h('summary', {}, h('h2', {}, '🎤 Sammeldiktat')),
    h('p', { class: 'feld-hinweis' }, 'Mit dem Mikrofon der Tastatur frei diktieren. „Auswerten“ schlägt vor, was in welches Feld gehört; jeder Vorschlag wird erst nach „Übernehmen“ eingetragen.'),
    ta,
    h('button', { class: 'knopf breit', onclick: auswerten }, 'Auswerten'),
    liste,
  );
  return box;
}

// ---------- Notizen zum Kapitel ----------
export function notizBox(buch, kap, aendern) {
  buch.notizen = buch.notizen || {};
  return h('details', { class: 'abschnitt notizen', open: !!buch.notizen[kap.id] },
    h('summary', {}, h('h2', {}, 'Notizen zum Kapitel')),
    h('p', { class: 'feld-hinweis' }, 'Was sich keinem Feld zuordnen ließ. Erscheint in der Ausgabe als Notiz, nicht als Feld der Vorlage.'),
    mitwachsen(h('textarea', { rows: 2, oninput: (ev) => { buch.notizen[kap.id] = ev.target.value; aendern(buch); } }, buch.notizen[kap.id] || '')));
}
