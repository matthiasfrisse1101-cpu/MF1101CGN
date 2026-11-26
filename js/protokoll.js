// Erstkontrolle mit dem Protokoll A 5.2 – Inhalt (Prüfpunkte, Optionen) kommt unverändert aus der Gliederung.
// Je Prüfpunkt: ok oder Schaden (Art des Schadens, Behebung durch, Fotos). Abgelegt im Feld unter C 2.
//
// Wert: { art, artWeil, witterung: [], witterungSonst, anlagenarten: [], anlageSonst, protokollfuehrer, datum,
//         punkte: { 'A.1': { ergebnis: 'ok'|'schaden', schaden, behebung, fotos: [] } }, maengel, wv }
import { h, leere } from './ui.js';
import { fotoFeld } from './fotos.js';
import { feldKey, wertVon, sichtbareFelder, anlagenartVorschlag } from './gliederung.js';

// Vorschlag „Art der Anlage“: aus den Regeln der Gliederung ("anlagenartRegeln"); ältere Gliederungen ohne Regeln
// gleichen wie bisher die Bezeichnungen der Teilbauwerke ab. Ergebnis: { arten, sonstiges, hinweise }
export function anlagenartVorschlaege(protokoll, g, buch) {
  if (Array.isArray(protokoll.anlagenartRegeln)) return anlagenartVorschlag(protokoll, g, buch);
  return { arten: vorschlagAnlagenarten(protokoll, g, buch), sonstiges: [], hinweise: [] };
}

export function vorschlagAnlagenarten(protokoll, g, buch) {
  const labels = (g.teilbauwerke || []).filter((t) => (buch.teilbauwerke || []).includes(t.id)).map((t) => t.label.toLowerCase());
  // Gleiche Bezeichnung; ein Klammerzusatz der Vorlage („… (ohne Absetz- u. Abscheiderfunktion)“) zählt nicht mit.
  return (protokoll.anlagenarten || []).filter((o) => labels.includes(o.toLowerCase().replace(/\s*\(.*\)\s*$/, '').trim()));
}

// Anzahl ok / Schaden / offen
export function protokollStand(protokoll, wert) {
  const r = { ok: 0, schaden: 0, offen: 0 };
  for (const gr of protokoll.gruppen) {
    for (const p of gr.punkte) {
      const e = ((wert || {}).punkte || {})[`${gr.id}.${p.nr}`];
      if (e && e.ergebnis === 'ok') r.ok++;
      else if (e && e.ergebnis === 'schaden') r.schaden++;
      else r.offen++;
    }
  }
  return r;
}

export function protokollFeld({ g, buch, kap, feld, e, setzeWert, kontext, erfasser }) {
  const pk = g.kapitel.find((k) => k.id === feld.protokoll);
  const p = pk.protokoll;
  const box = h('div', { class: 'protokoll' });
  const w = () => (e.wert && typeof e.wert === 'object' ? e.wert : null);
  const speichern = (aenderung) => {
    const neu = { punkte: {}, ...(w() || {}), ...aenderung };
    setzeWert(neu);
  };

  const start = () => {
    leere(box);
    if (!w()) {
      box.append(h('p', { class: 'feld-hinweis' }, 'Noch keine Erstkontrolle. Sie ist freiwillig.'),
        h('button', {
          class: 'knopf breit',
          onclick: () => { speichern({ protokollfuehrer: erfasser || '', datum: new Date().toISOString().slice(0, 10) }); start(); },
        }, `Erstkontrolle beginnen (${p.titel || 'Protokoll'})`));
      return;
    }
    formular();
  };

  const auswahl = (titel, optionen, wertListe, mehrfach, beiAenderung) => {
    const fs = h('fieldset', { class: 'gruppe' }, h('legend', {}, titel));
    const set = new Set(wertListe || []);
    for (const o of optionen) {
      fs.append(h('label', { class: 'option' },
        h('input', {
          type: mehrfach ? 'checkbox' : 'radio', name: `${feld.id}-${titel}`, checked: set.has(o),
          onchange: (ev) => {
            if (!mehrfach) set.clear();
            if (ev.target.checked) set.add(o); else set.delete(o);
            beiAenderung(optionen.filter((x) => set.has(x)));
          },
        }), h('span', {}, o)));
    }
    return fs;
  };
  const textfeld = (label, wert, beiAenderung, typ = 'text') => h('label', { class: 'feld klein' }, h('span', { class: 'feld-label' }, label),
    h('input', { type: typ, value: wert || '', autocomplete: 'off', oninput: (ev) => beiAenderung(ev.target.value) }));

  const formular = () => {
    const v = w();
    // Kopf: Werte aus dem Kapitel des Protokolls (A 5.2), nur Anzeige
    const kopf = h('div', { class: 'protokoll-kopf' });
    for (const f of sichtbareFelder(pk, buch, g)) {
      const x = wertVon(g, buch, pk.id, f);
      kopf.append(h('div', {}, h('span', { class: 'feld-label' }, `${f.label}: `), x ? String(x) : h('em', {}, '(noch leer – in ' + (pk.nr || pk.id) + ')')));
    }
    box.append(kopf);

    box.append(auswahl('Protokoll', p.arten || [], v.art ? [v.art] : [], false, (l) => { speichern({ art: l[0] || null }); formularNeu(); }));
    if (v.art && /weil\s*$/.test(v.art)) box.append(textfeld('… weil', v.artWeil, (t) => speichern({ artWeil: t })));
    box.append(auswahl('Angaben zur Witterung', p.witterung || [], v.witterung, true, (l) => { speichern({ witterung: l }); formularNeu(); }));
    if ((v.witterung || []).some((x) => /^sonstige/i.test(x))) box.append(textfeld('Sonstige Witterung', v.witterungSonst, (t) => speichern({ witterungSonst: t })));

    const av = anlagenartVorschlaege(p, g, buch);
    const sonstOption = (p.anlagenarten || []).find((o) => /^sonstiges/i.test(o));
    const vor = av.arten.filter((o) => !(v.anlagenarten || []).includes(o));
    const sonstText = av.sonstiges.join(', ');
    const sonstFehlt = sonstText && sonstOption && !((v.anlagenarten || []).includes(sonstOption) && (v.anlageSonst || '').includes(sonstText));
    if (vor.length || sonstFehlt) {
      const teile = [...vor, ...(sonstFehlt ? [`${sonstOption} ${sonstText}`] : [])];
      box.append(h('div', { class: 'vorschlag' }, `Vorschlag aus Deckblatt und Bauform: ${teile.join(', ')} `,
        h('button', {
          class: 'knopf klein',
          onclick: () => {
            const neu = new Set([...(v.anlagenarten || []), ...vor, ...(sonstFehlt ? [sonstOption] : [])]);
            const aend = { anlagenarten: p.anlagenarten.filter((o) => neu.has(o)) };
            if (sonstFehlt) aend.anlageSonst = v.anlageSonst ? `${v.anlageSonst}, ${sonstText}` : sonstText;
            speichern(aend); formularNeu();
          },
        }, 'Übernehmen')));
    }
    for (const t of av.hinweise) box.append(h('div', { class: 'hinweis' }, t));
    box.append(auswahl('Art der Anlage (Mehrfachnennung möglich)', p.anlagenarten || [], v.anlagenarten, true, (l) => { speichern({ anlagenarten: l }); formularNeu(); }));
    if ((v.anlagenarten || []).some((x) => /^sonstiges/i.test(x))) box.append(textfeld('Sonstiges', v.anlageSonst, (t) => speichern({ anlageSonst: t })));

    box.append(textfeld('Name Protokollführer', v.protokollfuehrer, (t) => speichern({ protokollfuehrer: t })));
    box.append(textfeld('Kontrolldatum', v.datum, (t) => speichern({ datum: t }), 'date'));

    // Prüfpunkte
    for (const gr of p.gruppen) {
      const sec = h('div', { class: 'pruef-gruppe' }, h('h3', {}, `${gr.id} ${gr.titel}`));
      for (const pt of gr.punkte) sec.append(pruefpunkt(gr, pt));
      box.append(sec);
    }
    box.append(textfeld('Mängelbeseitigung veranlasst', v.maengel, (t) => speichern({ maengel: t })));
    box.append(textfeld('Wv. am', v.wv, (t) => speichern({ wv: t }), 'date'));
    if (p.fussnote) box.append(h('p', { class: 'feld-hinweis' }, p.fussnote));
    box.append(h('p', { class: 'feld-hinweis' }, 'Unterschriften (Prüfer, AM-/SM-Leiter) erfolgen auf dem Ausdruck.'));
  };
  const formularNeu = () => { const y = window.scrollY; leere(box); formular(); window.scrollTo(0, y); };

  const pruefpunkt = (gr, pt) => {
    const key = `${gr.id}.${pt.nr}`;
    const zeile = h('div', { class: 'pruef-punkt' });
    const zeichne = () => {
      leere(zeile);
      const v = w();
      const e2 = (v.punkte || {})[key] || {};
      const setze = (aend) => {
        const punkte = { ...(w().punkte || {}) };
        const neu = { ...(punkte[key] || {}), ...aend }; // aktueller Stand, nicht der beim Zeichnen
        // Ohne Ergebnis entfällt der Punkt – außer er hat schon Schadenstext oder Fotos (nichts geht verloren).
        if (!neu.ergebnis && !neu.schaden && !(neu.fotos || []).length) delete punkte[key]; else punkte[key] = neu;
        speichern({ punkte });
        zeichne();
      };
      zeile.append(h('div', { class: 'pruef-text' }, h('strong', {}, `${gr.id} ${pt.nr}`), ` ${pt.text}`));
      zeile.append(h('div', { class: 'optionen zwei' },
        h('button', { class: `option-knopf ${e2.ergebnis === 'ok' ? 'aktiv' : ''}`, onclick: () => setze({ ergebnis: e2.ergebnis === 'ok' ? null : 'ok' }) }, 'ok'),
        h('button', { class: `option-knopf ${e2.ergebnis === 'schaden' ? 'aktiv schaden' : ''}`, onclick: () => setze({ ergebnis: e2.ergebnis === 'schaden' ? null : 'schaden' }) }, 'Schaden')));
      if (e2.ergebnis === 'schaden') {
        zeile.append(h('label', { class: 'feld klein' }, h('span', { class: 'feld-label' }, 'Art des Schadens'),
          h('input', { type: 'text', value: e2.schaden || '', autocomplete: 'off', oninput: (ev) => { const punkte = { ...w().punkte }; punkte[key] = { ...punkte[key], schaden: ev.target.value }; speichern({ punkte }); } })));
        const beh = h('div', { class: 'herkunft' }, h('span', { class: 'feld-label' }, 'Behebung durch: '));
        for (const b of p.behebung || []) {
          beh.append(h('button', { class: `chip ${e2.behebung === b ? 'aktiv' : ''}`, onclick: () => setze({ behebung: e2.behebung === b ? null : b }) }, b));
        }
        zeile.append(beh);
        zeile.append(fotoFeld({
          kontext, feldKey: feldKey(kap.id, feld.id), ids: e2.fotos || [],
          setzeIds: (ids) => { const punkte = { ...w().punkte }; punkte[key] = { ...punkte[key], fotos: ids }; speichern({ punkte }); },
        }));
      }
    };
    zeichne();
    return zeile;
  };

  start();
  return box;
}
