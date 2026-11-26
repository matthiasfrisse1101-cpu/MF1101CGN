// Etappe 4a: Sichtbarkeit nach Antworten, Vorschlagsregeln, Bausteine, Art der Anlage, Gliederungsprüfung.
import { test, gleich, wahr } from './harness.js';
import * as G from '../js/gliederung.js';
import { anlagenartVorschlaege } from '../js/protokoll.js';

const testG = await (await fetch('../gliederung/test-gliederung.json', { cache: 'reload' })).json();
const kap = (g, id) => g.kapitel.find((k) => k.id === id);
const feld = (g, k, f) => kap(g, k).felder.find((x) => x.id === f);
const buchMit = (teilbauwerke = [], werte = {}, extra = {}) => ({
  teilbauwerke, zugeschaltet: [], freieTeilbauwerke: [], ...extra,
  werte: Object.fromEntries(Object.entries(werte).map(([k, w]) => [k, { wert: w, status: null }])),
});
const sichtbar = (g, b, k) => G.sichtbareFelder(kap(g, k), b, g).map((f) => f.id);

// ---------- Sichtbarkeit nach Antworten (Testgliederung) ----------
test('Sichtbarkeit: Folgefrage erst bei passender Antwort (UND mit Teilbauwerk)', () => {
  wahr(!sichtbar(testG, buchMit([]), 'T1').includes('t_merkmal'), 'ohne Testbecken sichtbar');
  wahr(sichtbar(testG, buchMit(['testbecken']), 'T1').includes('t_merkmal'), 'mit Testbecken unsichtbar');
  wahr(!sichtbar(testG, buchMit(['testbecken'], { 'T1.t_merkmal': 'Variante A' }), 'T1').includes('t_folge'), 'Folgefrage bei Variante A sichtbar');
  wahr(sichtbar(testG, buchMit(['testbecken'], { 'T1.t_merkmal': 'Variante B' }), 'T1').includes('t_folge'), 'Folgefrage bei Variante B unsichtbar');
});

test('Sichtbarkeit: ist das Bezugsfeld ausgeblendet, bleibt die Folgefrage aus – der Wert bleibt gespeichert', () => {
  const b = buchMit([], { 'T1.t_merkmal': 'Variante B', 'T1.t_folge': 'Folge 2' });
  wahr(!sichtbar(testG, b, 'T1').includes('t_folge'), 'Folgefrage trotz ausgeblendetem Bezugsfeld sichtbar');
  gleich(b.werte['T1.t_folge'].wert, 'Folge 2');
  const f = G.kapitelFortschritt(testG, b, kap(testG, 'T1'));
  const mit = G.kapitelFortschritt(testG, { ...b, teilbauwerke: ['testbecken'] }, kap(testG, 'T1'));
  gleich(mit.gesamt - f.gesamt, 2, 'ausgeblendete Felder zählen nicht zum Fortschritt');
});

test('Bedingung: Mehrfachauswahl, Ja/Nein, alle/eines/nicht', () => {
  const b = buchMit(['testwand'], { 'T1.t_lage': ['vorn', 'hinten'], 'T1.janein': false });
  wahr(G.bedingungErfuellt({ felder: [{ feld: 'T1.t_lage', ist: ['hinten'] }] }, b, testG), 'Mehrfachauswahl');
  wahr(G.bedingungErfuellt({ felder: [{ feld: 'T1.janein', ist: [false] }] }, b, testG), 'Ja/Nein = Nein');
  wahr(!G.bedingungErfuellt({ felder: [{ feld: 'T1.janein', ist: [true] }] }, b, testG), 'Ja/Nein = Ja');
  wahr(G.bedingungErfuellt({ eines: [{ teilbauwerk: ['testbecken'] }, { teilbauwerk: ['testwand'] }] }, b, testG), 'eines');
  wahr(!G.bedingungErfuellt({ alle: [{ teilbauwerk: ['testbecken'] }, { teilbauwerk: ['testwand'] }] }, b, testG), 'alle');
  wahr(G.bedingungErfuellt({ nicht: { teilbauwerk: ['testbecken'] } }, b, testG), 'nicht');
  wahr(!G.bedingungErfuellt({ felder: [{ feld: 'T1.t_merkmal', ist: ['Variante A'] }] }, b, testG), 'leeres Feld erfüllt nichts');
});

// ---------- Vorschläge (Testgliederung) ----------
test('Vorschlag: Fließfolge mit Pfeilen, Reihenfolge des Deckblatts, freie Teilbauwerke hinten', () => {
  const b = buchMit(['testwand', 'testbecken'], {}, { freieTeilbauwerke: ['Testrinne'] });
  gleich(G.vorschlagFuerFeld(testG, b, feld(testG, 'T1', 't_reihe')), 'Testbecken → Testwand → Testrinne');
  gleich(G.vorschlagFuerFeld(testG, buchMit([]), feld(testG, 'T1', 't_reihe')), undefined);
});

test('Vorschlag: Regel – zutreffend Ja, sonst kein Vorschlag (auch nicht Nein)', () => {
  gleich(G.vorschlagFuerFeld(testG, buchMit(['testwand']), feld(testG, 'T1', 't_ja')), true);
  gleich(G.vorschlagFuerFeld(testG, buchMit(['testbecken']), feld(testG, 'T1', 't_ja')), undefined);
});

test('Vorschlag: Bausteine mit Zusätzen in Klammern, sortiert nach Deckblatt', () => {
  const f = feld(testG, 'T1', 't_kombi');
  gleich(G.vorschlagFuerFeld(testG, buchMit(['testschacht', 'testbecken']), f), 'Testbecken, Testschacht');
  gleich(G.vorschlagFuerFeld(testG, buchMit(['testbecken', 'testwand'], { 'T1.t_lage': ['hinten'], 'T1.t_merkmal': 'Variante B' }), f), 'Testbecken mit Testwand (Variante B)');
  gleich(G.vorschlagFuerFeld(testG, buchMit([]), f), undefined);
});

test('Vorschlag: gleicher Wert bei Mehrfachauswahl unabhängig von der Reihenfolge', () => {
  wahr(G.gleicherWert(['a', 'b'], ['b', 'a']));
  wahr(!G.gleicherWert('x', undefined));
});

test('Protokoll: Art der Anlage aus Regeln (Vorschlag, Sonstiges, Hinweis)', () => {
  const p = kap(testG, 'T5').protokoll;
  gleich(anlagenartVorschlaege(p, testG, buchMit(['testbecken', 'testwand'], { 'T1.t_merkmal': 'Variante B' })),
    { arten: ['Testbecken (Testart)'], sonstiges: ['Testwand'], hinweise: ['Testhinweis zu Variante B'] });
  gleich(anlagenartVorschlaege(p, testG, buchMit([])), { arten: [], sonstiges: [], hinweise: [] });
});

test('Altes Beckenbuch ohne die neuen Felder läuft weiter', () => {
  const alt = { teilbauwerke: ['testbecken'], zugeschaltet: [], werte: { 'T1.pflichttext': { wert: 'x' } } }; // ohne freieTeilbauwerke, ohne neue Werte
  const f = G.kapitelFortschritt(testG, alt, kap(testG, 'T1'));
  wahr(f.gesamt > 0 && f.geklaert === 1, 'Fortschritt falsch');
  gleich(G.vorschlagFuerFeld(testG, alt, feld(testG, 'T1', 't_reihe')), 'Testbecken');
  gleich(G.mindestumfang(testG, alt).length, 2);
  // Aufruf ohne Gliederung (wie ältere Programmteile) bleibt möglich
  wahr(G.istSichtbar(feld(testG, 'T1', 't_merkmal'), alt), 'istSichtbar ohne Gliederung');
});

// ---------- Gliederungsprüfung ----------
test('Prüfung: Bedingungen werden im Klartext geprüft', () => {
  const pruef = (aendere) => { const g = structuredClone(testG); aendere(g); return G.pruefeGliederung(g).join(' | '); };
  wahr(pruef((g) => { feld(g, 'T1', 't_folge').sichtbarWenn.felder[0].feld = 'T1.gibtsnicht'; }).includes('gibt es nicht'), 'unbekanntes Feld');
  wahr(pruef((g) => { feld(g, 'T1', 't_folge').sichtbarWenn.felder[0].ist = ['Variante C']; }).includes('keine Option'), 'falsche Option');
  wahr(pruef((g) => { feld(g, 'T1', 't_folge').sichtbarWenn.felder[0].ist = [true]; }).includes('nur zu Ja/Nein'), 'true bei Auswahl');
  wahr(pruef((g) => { feld(g, 'T1', 't_folge').sichtbarWenn.felder[0].ist = []; }).includes('mindestens einem Wert'), 'leeres ist');
  wahr(pruef((g) => { feld(g, 'T1', 't_folge').sichtbarWenn.felder[0].feld = 'T1.t_folge'; }).includes('von sich selbst'), 'Selbstbezug');
  wahr(pruef((g) => { feld(g, 'T1', 't_merkmal').sichtbarWenn = { felder: [{ feld: 'T1.t_folge', ist: ['Folge 1'] }] }; }).includes('Kreisbezug'), 'Kreisbezug');
  wahr(pruef((g) => { feld(g, 'T1', 't_folge').sichtbarWenn.feld = 'x'; }).includes('unbekannte Angabe'), 'unbekannte Angabe');
  wahr(pruef((g) => { feld(g, 'T1', 't_ja').vorschlagRegeln[0].wert = 'ja'; }).includes('passt nicht zum Feld'), 'Regelwert');
  wahr(pruef((g) => { kap(g, 'T5').protokoll.anlagenartRegeln[0].vorschlag = 'Gibt es nicht'; }).includes('steht nicht in der Liste'), 'Anlagenart');
  wahr(pruef((g) => { feld(g, 'T1', 't_kombi').vorschlagBausteine[2].teilbauwerk = 'xyz'; }).includes('"xyz"'), 'Baustein-Teilbauwerk');
  wahr(pruef((g) => { g.teilbauwerke[0].hilfe = 5; }).includes('"hilfe"'), 'Hilfe kein Text');
});

// ---------- Echte Gliederung (nur lokal) ----------
const echt = await fetch('../vorlagen_intern/gliederung_bestandsanlage.json', { cache: 'reload' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
if (echt) {
  const art = feld(echt, 'A1', 'art_bauwerk');
  const oel = feld(echt, 'A1', 'oelrueckhaltung');
  const p = kap(echt, 'A5_2').protokoll;
  const av = (b) => anlagenartVorschlaege(p, echt, b);

  test('Echt: Gliederung fehlerfrei, Hilfetexte bei sieben Teilbauwerken', () => {
    gleich(G.pruefeGliederung(echt), []);
    gleich(echt.teilbauwerke.filter((t) => t.hilfe).map((t) => t.id).sort(), ['absetzbecken', 'lfa', 'rbf', 'rrb', 'tauchwand', 'unterirdisch', 'versickerung']);
  });

  test('Echt: Bauform-Felder sind Vorschlag, nicht in der Ausgabe, stehen vor „Art des Bauwerks“', () => {
    const ids = kap(echt, 'A1').felder.map((f) => f.id);
    const neu = ['asb_dauerstau', 'asb_entleerung', 'asb_kammern', 'asb_umlauf', 'tauchwand_lage', 'lfa_bauart', 'rrb_funktion', 'rrb_wasserstand', 'rbf_form', 'rbf_vorstufe', 'vs_vorstufe', 'ui_art', 'bauweise', 'fliessfolge'];
    gleich(ids.slice(ids.indexOf('asb_dauerstau'), ids.indexOf('art_bauwerk')), neu);
    for (const id of neu) {
      const f = feld(echt, 'A1', id);
      wahr(f.vorschlag && f.ausgabe === false && f.ort === 'vor_ort' && !f.pflicht, `${id} falsch gekennzeichnet`);
      wahr(!(f.optionen || []).some((o) => /unbekannt/i.test(o)), `${id} hat „unbekannt“`);
    }
  });

  test('Echt: Entleerung nur bei Absetzbecken ohne Dauerstau', () => {
    wahr(!sichtbar(echt, buchMit(['absetzbecken'], { 'A1.asb_dauerstau': 'mit Dauerstau (ständig gefüllt)' }), 'A1').includes('asb_entleerung'));
    wahr(sichtbar(echt, buchMit(['absetzbecken'], { 'A1.asb_dauerstau': 'ohne Dauerstau (läuft leer)' }), 'A1').includes('asb_entleerung'));
    wahr(!sichtbar(echt, buchMit([], { 'A1.asb_dauerstau': 'ohne Dauerstau (läuft leer)' }), 'A1').includes('asb_entleerung'));
  });

  test('Echt Fall 1: Absetzbecken mit Tauchwand vor dem Ablauf, zwei Kammern, Dauerstau, dahinter RRB (fällt trocken)', () => {
    const b = buchMit(['absetzbecken', 'rrb', 'tauchwand'], {
      'A1.tauchwand_lage': ['vor dem Ablauf'], 'A1.asb_kammern': 'zwei Kammern', 'A1.asb_dauerstau': 'mit Dauerstau (ständig gefüllt)', 'A1.rrb_wasserstand': 'fällt trocken',
    });
    gleich(G.vorschlagFuerFeld(echt, b, art), 'Absetzbecken mit Leichtflüssigkeitsrückhaltung (zwei Kammern, Dauerstau), Regenrückhaltebecken (fällt trocken)');
    gleich(av(b).arten, ['Regenrückhaltebecken (ohne Absetz- u. Abscheiderfunktion)', 'Absetzbecken mit Leichtflüssigkeitsrückhaltung']);
    gleich(G.vorschlagFuerFeld(echt, b, oel), true);
  });

  test('Echt: Absetzbecken ohne Leichtflüssigkeitsrückhaltung → „Absetzbecken“; Tauchwand nur im Zulauf zählt nicht', () => {
    const b = buchMit(['absetzbecken', 'tauchwand'], { 'A1.tauchwand_lage': ['im Zulauf'] });
    gleich(G.vorschlagFuerFeld(echt, b, art), 'Absetzbecken');
    gleich(av(b).arten, ['Absetzbecken']);
  });

  test('Echt: Abscheider als Teil des Absetzbeckens → Absetzbecken mit Leichtflüssigkeitsrückhaltung, kein eigener Abscheider', () => {
    const b = buchMit(['absetzbecken', 'lfa'], { 'A1.lfa_bauart': 'Teil des Absetzbeckens' });
    gleich(G.vorschlagFuerFeld(echt, b, art), 'Absetzbecken mit Leichtflüssigkeitsrückhaltung');
    gleich(av(b), { arten: ['Absetzbecken mit Leichtflüssigkeitsrückhaltung'], sonstiges: [], hinweise: [] });
  });

  test('Echt Fall 3: Abscheider als eigenes Bauwerk → Sonstiges „Leichtflüssigkeitsabscheider“, Ölrückhaltung Ja', () => {
    const b = buchMit(['lfa'], { 'A1.lfa_bauart': 'eigenes Bauwerk (z. B. unterirdisches Fertigteil)' });
    gleich(av(b), { arten: [], sonstiges: ['Leichtflüssigkeitsabscheider'], hinweise: [] });
    gleich(G.vorschlagFuerFeld(echt, b, art), 'Leichtflüssigkeitsabscheider');
    gleich(G.vorschlagFuerFeld(echt, b, oel), true);
  });

  test('Echt: RRB ohne Angabe oder „ohne …“ → Vorschlag; mit Absetz-/Abscheidefunktion → nur Hinweis', () => {
    gleich(av(buchMit(['rrb'])).arten, ['Regenrückhaltebecken (ohne Absetz- u. Abscheiderfunktion)']);
    gleich(av(buchMit(['rrb'], { 'A1.rrb_funktion': 'ohne Absetz- und Abscheidefunktion' })).arten, ['Regenrückhaltebecken (ohne Absetz- u. Abscheiderfunktion)']);
    const mit = av(buchMit(['rrb'], { 'A1.rrb_funktion': 'mit Absetzfunktion' }));
    gleich(mit.arten, []);
    wahr(mit.hinweise[0].includes('Die Vorlage hat dafür keinen Eintrag, bitte selbst wählen'), 'Hinweis fehlt');
  });

  test('Echt Fall 2: Versickerungsbecken ohne erkennbare Vorstufe; Bodenfilter; unterirdische Anlage', () => {
    const b = buchMit(['versickerung'], { 'A1.vs_vorstufe': ['keine erkennbar'] });
    gleich(G.vorschlagFuerFeld(echt, b, art), 'Versickerungsbecken (ohne erkennbare Vorstufe)');
    gleich(av(b).arten, ['Versickerungsbecken']);
    gleich(G.vorschlagFuerFeld(echt, b, oel), undefined, 'kein Vorschlag „Nein“');
    gleich(av(buchMit(['rbf'])).arten, ['Retentions-Bodenfilter']);
    gleich(av(buchMit(['unterirdisch'])).arten, ['Unterirdische Beckenanlage (z.B. Stauraumkanal)']);
  });

  test('Echt: „Regenklärbecken“ wird nie automatisch vorgeschlagen', () => {
    const alle = echt.teilbauwerke.map((t) => t.id);
    wahr(!av(buchMit(alle)).arten.some((a) => /Regenklärbecken/.test(a)));
  });

  test('Echt: Fließfolge mit Pfeilen', () => {
    gleich(G.vorschlagFuerFeld(echt, buchMit(['einleitung', 'absetzbecken', 'rrb']), feld(echt, 'A1', 'fliessfolge')), 'Absetzbecken → Regenrückhaltebecken → Einleitungsbauwerk');
  });
} else {
  test('Echte Gliederung (übersprungen – nicht vorhanden)', () => {});
}
