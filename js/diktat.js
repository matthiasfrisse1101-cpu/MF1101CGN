// Oberfläche für Maße (Zahlfelder) und das Sammeldiktat je Kapitel.
// Diktiert wird mit dem Mikrofon der Handy-Tastatur – die App nimmt selbst nichts auf.
import { h, leere, meldung, mitwachsen } from './ui.js';
import { bewerteMassEingabe, massAnzeige, HERKUNFT } from './masse.js';
import { massText } from './zahlen.js';
import { werteAus, wertFuerFeld } from './sammeldiktat.js';
import { feldKey, neueZeilenId } from './gliederung.js';

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

// ---------- Sammeldiktat: Vorschläge auswerten und übernehmen ----------
// Gemeinsam für den Diktier-Bildschirm. Nichts wird ohne „Übernehmen“ eingetragen.
export function vorschlagWerkzeug({ g, buch, kap, felder, aendern }) {
  const bearbeitbar = felder.filter((f) => !f.aus && !['foto', 'skizze', 'pruefprotokoll', 'massskizze'].includes(f.art));
  const protokolle = felder.filter((f) => f.art === 'pruefprotokoll' && f.protokoll)
    .map((f) => ({ feld: f, protokoll: (g.kapitel.find((k) => k.id === f.protokoll) || {}).protokoll }))
    .filter((x) => x.protokoll);
  const auswerten = (text) => werteAus(text, bearbeitbar, { protokolle });

  const protokollWert = (feldId) => {
    const key = feldKey(kap.id, feldId);
    const e = buch.werte[key] || (buch.werte[key] = { wert: null, status: null });
    if (!e.wert || typeof e.wert !== 'object') e.wert = { punkte: {}, datum: new Date().toISOString().slice(0, 10) };
    e.wert.punkte = e.wert.punkte || {};
    e.status = null; e.geaendert = new Date().toISOString();
    return e.wert;
  };

  // Einen Vorschlag ins Beckenbuch schreiben.
  const anwenden = (v) => {
    const jetzt = new Date().toISOString();
    if (v.ziel === 'verwerfen' || v.ersetzt) return;
    if (v.ziel === 'notiz' || (v.typ === 'notiz' && !v.ziel)) {
      buch.notizen = buch.notizen || {};
      const alt = buch.notizen[kap.id] || '';
      buch.notizen[kap.id] = alt ? `${alt}\n${v.text ?? v.quelle}` : (v.text ?? v.quelle);
      return;
    }
    if (v.typ === 'punkt') {
      const w = protokollWert(v.feldId);
      const alt = w.punkte[v.punkt] || {};
      w.punkte[v.punkt] = v.ergebnis === 'ok' ? { ...alt, ergebnis: 'ok' } : { ...alt, ergebnis: 'schaden', schaden: v.schaden || alt.schaden || '' };
      return;
    }
    if (v.typ === 'restOk') {
      const w = protokollWert(v.feldId);
      const pr = protokolle.find((x) => x.feld.id === v.feldId);
      for (const gr of pr.protokoll.gruppen) for (const pt of gr.punkte) {
        const k = `${gr.id}.${pt.nr}`;
        if (!w.punkte[k] || !w.punkte[k].ergebnis) w.punkte[k] = { ...(w.punkte[k] || {}), ergebnis: 'ok' };
      }
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

  const karte = (v, erledigt) => {
    const k = h('div', { class: `zeile-karte vorschlag-karte ${v.ersetzt ? 'ersetzt' : ''}` });
    const zeichne = () => {
      leere(k);
      k.append(h('div', { class: 'feld-hinweis' }, `„${v.quelle ?? v.text}“`));
      if (v.ersetzt) { k.append(h('div', { class: 'feld-hinweis' }, '↷ durch eine spätere Angabe ersetzt')); return; }
      if (v.typ === 'punkt' || v.typ === 'restOk') {
        const pr = protokolle.find((x) => x.feld.id === v.feldId);
        k.append(h('div', { class: 'vorschlag-wert' }, h('strong', {}, v.typ === 'restOk'
          ? `→ ${pr.feld.label}: alle übrigen Prüfpunkte „ok“`
          : `→ Erstkontrolle ${v.punktText}: ${v.ergebnis === 'ok' ? 'ok' : `Schaden – ${v.schaden || '?'}`}`)));
      } else {
        const sel = h('select', { class: 'ziel-auswahl', onchange: (ev) => {
          v.ziel = ev.target.value;
          const f = bearbeitbar.find((x) => x.id === v.ziel);
          if (f && v.typ !== 'zeile') {
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
        k.append(sel);
        if (v.typ === 'zeile') {
          const tab = bearbeitbar.find((f) => f.id === v.feldId);
          k.append(h('ul', { class: 'zeilen-vorschau' }, tab.spalten.filter((sp) => v.zeile[sp.id]).map((sp) => h('li', {}, `${sp.label}: ${v.zeile[sp.id]}`))));
        } else if (v.typ === 'feld' && v.ziel !== 'notiz' && v.ziel !== 'verwerfen') {
          const f = bearbeitbar.find((x) => x.id === (v.ziel || v.feldId));
          const anzeige = typeof v.wert === 'boolean' ? (v.wert ? 'Ja' : 'Nein') : Array.isArray(v.wert) ? v.wert.join(', ') : String(v.wert);
          k.append(h('div', { class: 'vorschlag-wert' }, h('strong', {}, anzeige)));
          if (f && f.art === 'zahl') {
            const b = bewerteMassEingabe(v.wert, f);
            const t = { auto: '', bestaetigen: `erkannt: ${massText({ erkannt: true, ...b.mass })}`, umrechnen: `${b.hinweis} Wird nicht umgerechnet – im Feld prüfen.`, fremd: b.hinweis, unerkannt: 'keine Zahl erkannt – wird zur Prüfung markiert' }[b.zustand];
            if (t) k.append(h('div', { class: b.zustand === 'bestaetigen' ? 'feld-hinweis' : 'feld-warnung' }, t));
          }
        }
      }
      k.append(h('button', {
        class: 'knopf klein', onclick: () => { anwenden(v); erledigt(v); aendern(buch); k.replaceWith(h('p', { class: 'feld-hinweis' }, `✓ ${v.ziel === 'verwerfen' ? 'verworfen' : 'übernommen'}: „${v.quelle ?? v.text}“`)); },
      }, v.ziel === 'verwerfen' ? 'Verwerfen' : 'Übernehmen'));
    };
    zeichne();
    return k;
  };
  return { bearbeitbar, protokolle, auswerten, anwenden, karte };
}

// Beispielsätze für den Diktier-Bildschirm aus den Feldern des Kapitels.
function beispiele(werkzeug) {
  const r = [];
  const genutzt = new Set();
  const zahlen = ['42 Meter', '18 Meter', '34 Meter', '10 Meter'];
  let zi = 0;
  for (const f of werkzeug.bearbeitbar) {
    if (r.length >= 3) break;
    const wort = (f.stichwoerter && f.stichwoerter[0]) || f.label.split(/[ (:]/)[0];
    const anzeige = wort.charAt(0).toUpperCase() + wort.slice(1);
    if (genutzt.has(wort.toLowerCase()) || f.ausgabe === false) continue;
    if (f.art === 'zahl') r.push(`${anzeige} ${f.format === 'verhaeltnis' ? '1 zu 2' : (f.einheit === 'm' ? zahlen[zi++ % zahlen.length] : `5 ${f.einheit || ''}`.trim())}`);
    else if (f.art === 'janein') r.push(`${anzeige} vorhanden`);
    else if (f.art === 'auswahl' && f.optionen) r.push(`${anzeige} ${f.optionen[0]}`);
    else continue;
    genutzt.add(wort.toLowerCase());
  }
  if (werkzeug.protokolle.length) r.push('Schaden Tor klemmt, Bewuchs auf der Böschung, sonst alles ok');
  return r;
}

// Knopf im Kapitel, der den Diktier-Bildschirm öffnet.
export function sammeldiktatBox({ g, buch, kap, felder }) {
  buch.sammeldiktate = buch.sammeldiktate || {};
  const offen = (buch.sammeldiktate[kap.id] || '').trim();
  return h('a', { class: 'knopf breit diktier-knopf', href: `#/buch/${encodeURIComponent(buch.id)}/diktat/${encodeURIComponent(kap.id)}` },
    offen ? '🎤 Diktieren – Diktat noch nicht übernommen' : '🎤 Diktieren (frei sprechen)');
}

// ---------- Diktier-Bildschirm ----------
// umgebung: { app, kopf, fuss, ladeBuch, gliederungFuer, aendern }
export async function bildschirmDiktat(umgebung, buchId, kapId, sichtbareFelder) {
  const { app, kopf, fuss, ladeBuch, gliederungFuer, aendern } = umgebung;
  const buch = await ladeBuch(buchId);
  const { g } = await gliederungFuer(buch);
  const kap = g.kapitel.find((k) => k.id === kapId);
  if (!kap) throw new Error('Kapitel nicht gefunden.');
  const felder = sichtbareFelder(kap, buch, g);
  const zurueck = `#/buch/${encodeURIComponent(buch.id)}/kapitel/${encodeURIComponent(kap.id)}`;
  buch.sammeldiktate = buch.sammeldiktate || {};
  const wz = vorschlagWerkzeug({ g, buch, kap, felder, aendern });

  const liste = h('div', { class: 'vorschlagsliste' });
  const zaehler = h('div', { class: 'feld-hinweis' });
  let aktuell = [];
  let erledigt = new Set();
  const schonUebernommen = new Set(); // einzeln übernommene Angaben – beim erneuten Auswerten nicht doppelt eintragen
  const zeigeVorschlaege = () => {
    aktuell = wz.auswerten(ta.value);
    erledigt = new Set();
    leere(liste);
    const zuordnungen = aktuell.filter((v) => !v.ersetzt && v.typ !== 'notiz').length;
    zaehler.textContent = ta.value.trim() ? `${zuordnungen} Angabe(n) erkannt${aktuell.some((v) => v.typ === 'notiz') ? ', Rest als Notiz' : ''}` : '';
    for (const v of aktuell) {
      const q = v.quelle ?? v.text;
      if (schonUebernommen.has(q)) { erledigt.add(v); liste.append(h('p', { class: 'feld-hinweis' }, `✓ bereits übernommen: „${q}“`)); continue; }
      liste.append(wz.karte(v, (x) => { erledigt.add(x); schonUebernommen.add(x.quelle ?? x.text); }));
    }
  };
  let timer = null;
  const ta = mitwachsen(h('textarea', {
    class: 'diktat-feld', rows: 6, autofocus: true,
    placeholder: 'Mikrofon auf der Tastatur antippen und frei sprechen …',
    oninput: (ev) => {
      buch.sammeldiktate[kap.id] = ev.target.value;
      aendern(buch);
      clearTimeout(timer);
      timer = setTimeout(zeigeVorschlaege, 450);
    },
  }, buch.sammeldiktate[kap.id] || ''));

  const alleUebernehmen = async () => {
    const offen = aktuell.filter((v) => !erledigt.has(v) && !v.ersetzt);
    if (!offen.length) { meldung('Keine offenen Vorschläge.'); return; }
    for (const v of offen) wz.anwenden(v);
    buch.sammeldiktate[kap.id] = '';
    await aendern(buch);
    meldung(`${offen.length} Angabe(n) übernommen.`);
    location.hash = zurueck;
  };

  leere(app);
  const bsp = beispiele(wz);
  app.append(
    kopf(`🎤 Diktieren: ${kap.nr ? `${kap.nr} ` : ''}${kap.titel}`, zurueck),
    h('main', {},
      h('p', { class: 'feld-hinweis' }, 'Mikrofon auf der Tastatur antippen und alles in einem Rutsch sprechen. Komma oder „und“ zwischen den Angaben hilft, ist aber nicht nötig. Korrektur: „nein, Länge 33 Meter“. Die App ordnet live zu – eingetragen wird erst mit „Übernehmen“.'),
      bsp.length ? h('p', { class: 'feld-hinweis' }, `Beispiel: „${bsp.join(', ')}“`) : null,
      ta, zaehler, liste),
    fuss(
      h('a', { class: 'knopf', href: zurueck }, 'Später'),
      h('button', { class: 'knopf primaer', onclick: alleUebernehmen }, 'Alle übernehmen')),
  );
  if (ta.value.trim()) zeigeVorschlaege();
  setTimeout(() => ta.focus(), 50);
}

// ---------- Notizen zum Kapitel ----------
export function notizBox(buch, kap, aendern) {
  buch.notizen = buch.notizen || {};
  return h('details', { class: 'abschnitt notizen', open: !!buch.notizen[kap.id] },
    h('summary', {}, h('h2', {}, 'Notizen zum Kapitel')),
    h('p', { class: 'feld-hinweis' }, 'Was sich keinem Feld zuordnen ließ. Erscheint in der Ausgabe als Notiz, nicht als Feld der Vorlage.'),
    mitwachsen(h('textarea', { rows: 2, oninput: (ev) => { buch.notizen[kap.id] = ev.target.value; aendern(buch); } }, buch.notizen[kap.id] || '')));
}
