// Etappe 6: Word- und PDF-Ausgabe.
import { test, gleich, wahr } from './harness.js';
import * as G from '../js/gliederung.js';
import { erzeugeWord, absatzText, istKursiv } from '../js/word.js';
import { pdfBeschreibung, erzeugePdf } from '../js/pdf.js';
import { fuelleVorlage, feldAusgabe, betreff, dateiname, offenePunkte, ladeSkript } from '../js/ausgabe.js';

await ladeSkript(new URL('../lib/jszip.min.js', import.meta.url).href);
const testG = await (await fetch('../gliederung/test-gliederung.json', { cache: 'reload' })).json();
const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

// ---------- Hilfen ----------
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const p = (t, { kursiv = false, fett = false } = {}) => `<w:p><w:r>${kursiv || fett ? `<w:rPr>${fett ? '<w:b/>' : ''}${kursiv ? '<w:i/>' : ''}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
const zelle = (inhalt) => `<w:tc>${inhalt || '<w:p/>'}</w:tc>`;
const tab = (zeilen) => `<w:tbl>${zeilen.map((z) => `<w:tr>${z.map((c) => zelle(c)).join('')}</w:tr>`).join('')}</w:tbl>`;
async function testDocx() {
  const body = [
    p('Testhinweisseite Anfang'), p('Hinweis 2'), p('Testhinweisseite Ende'),
    p('für'), p('', { fett: true }),
    tab([[p('Test-Länge:'), p('z.B. 5 m', { kursiv: true })], [p('Test-Auswahl:'), ''], [p('Test-Ja/Nein:'), p('□ ja     /     □ nein')]]),
    p('Testblock:'), tab([['']]),
    p('Normaler Satz der Vorlage, bleibt unverändert.'),
    p('Kursiver Hinweis, wird entfernt.', { kursiv: true }),
    tab([[p('Nr.'), p('Bezeichnung')], ['', p('z.B. Beispielzeile', { kursiv: true })], ['', '']]),
    p('Testfoto:'), tab([[p('Foto einfügen', { kursiv: true })]]),
    tab([[p('Teilbauwerke'), ''], [p('Testbecken'), ''], [p('Testwand'), ''], ['', '']]),
    p('T 1 Testüberschrift', { fett: true }),
    p('Testende'),
  ].join('');
  const zip = new window.JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr/></w:body></w:document>`);
  return zip.generateAsync({ type: 'blob' });
}
async function pngBlob() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 3;
  c.getContext('2d').fillRect(0, 0, 4, 3);
  return new Promise((r) => c.toBlob(r, 'image/png'));
}
const fakeBilder = async () => {
  const b = await pngBlob();
  const bytes = new Uint8Array(await b.arrayBuffer());
  return async (key) => (key.startsWith('protokoll:')
    // Schadensfoto mit Bezug zum Prüfpunkt (wie bildquelle.js)
    ? [{ bytes, blob: b, ext: 'png', breite: 4, hoehe: 3, punkt: 'A.2', foto: { id: 'f-7', nr: 7, bezug: 'A 2' }, unterschrift: 'Foto 7 – zu A 2 Testpunkt: Testschaden (28.11.2026)' }]
    : [{ bytes, blob: b, ext: 'png', breite: 4, hoehe: 3, unterschrift: 'Foto 1: Testbild' }]);
};
async function lesen(blob) {
  const zip = await window.JSZip.loadAsync(blob);
  const xml = await zip.file('word/document.xml').async('string');
  return { zip, xml, doc: new DOMParser().parseFromString(xml, 'application/xml') };
}
const absaetze = (doc) => Array.from(doc.getElementsByTagNameNS(W, 'p')).map((x) => absatzText(x).replace(/\s+/g, ' ').trim());
const kursivRuns = (doc) => Array.from(doc.getElementsByTagNameNS(W, 'r')).filter(istKursiv).length;

function testBuch() {
  const b = G.neuesBeckenbuch(testG, {}, { name: 'Testanlage', teilbauwerke: ['testbecken'] });
  const setze = (k, w, x = {}) => { b.werte[k] = { wert: w, status: null, ...x }; };
  setze('DECK.name', 'Testanlage'); // Testgliederung hat kein Deckblatt-Kapitel
  setze('T1.pflichttext', 'Testwert Pflicht');
  setze('T1.laenge', '12,5 m', { mass: { art: 'zahl', zahl: 12.5, einheit: 'm' }, herkunft: 'gemessen' });
  setze('T1.janein', true);
  setze('T2.tabelle', [{ id: 'z1', nr: '1', text: 'Erste' }, { id: 'z2', nr: '2', text: 'Zweite' }, { id: 'z3', nr: '3', text: 'Dritte' }]);
  setze('T2.foto', ['f-x']);
  b.zugeschaltet = ['T3'];
  setze('T3.notiz', 'Testnotiz im Zusatzkapitel');
  setze('T5.kontrolle', { datum: '2026-11-28', punkte: { 'A.1': { ergebnis: 'ok' }, 'A.2': { ergebnis: 'schaden', schaden: 'Testschaden', fotos: ['f-7'] } } });
  return b;
}

// ---------- Werte ----------
test('Ausgabe: Platzhalter, leere Felder „nicht erfasst“ bzw. Status, Zeilen ohne Wert entfallen', () => {
  const b = testBuch();
  gleich(fuelleVorlage(testG, b, '{T1.pflichttext}'), 'Testwert Pflicht');
  gleich(fuelleVorlage(testG, b, '{T1.langtext}'), 'nicht erfasst');
  b.werte['T1.datum'] = { wert: '', status: 'aus_akten' };
  gleich(fuelleVorlage(testG, b, '{T1.datum}'), 'aus den Akten nachzutragen');
  gleich(fuelleVorlage(testG, b, ['{T1.pflichttext}', 'Länge: {T1.langtext}']), 'Testwert Pflicht');
  gleich(feldAusgabe(testG, b, 'T1', testG.kapitel[0].felder.find((f) => f.id === 'laenge')), '12,5 m – gemessen');
  gleich(betreff(b), 'Beckenbuch Testanlage');
  gleich(dateiname(b, 'pdf'), 'Beckenbuch_Testanlage.pdf');
});

// ---------- Word mit Testvorlage ----------
test('Word: Testvorlage wird ausgefüllt, Hinweisseite und Kursivhinweise entfernt, Normaltext bleibt', async () => {
  const { blob, bericht } = await erzeugeWord(await testDocx(), testG, testBuch(), { bilder: await fakeBilder() });
  gleich(bericht.nichtGefunden, [], 'nicht gefundene Stellen');
  const { doc, zip, xml } = await lesen(blob);
  const t = absaetze(doc);
  wahr(!t.some((x) => x.startsWith('Testhinweisseite')), 'Hinweisseite nicht entfernt');
  wahr(t.includes('Testwert Pflicht'), 'Wert nach „für“ fehlt');
  wahr(t.includes('12,5 m – gemessen'), 'Kursives Beispiel nicht durch Wert ersetzt');
  wahr(t.includes('nicht erfasst'), 'leeres Feld nicht als „nicht erfasst“ markiert');
  wahr(t.some((x) => x.includes('☒ ja') && x.includes('□ nein')), 'Kästchen nicht angekreuzt');
  wahr(t.includes('Normaler Satz der Vorlage, bleibt unverändert.'), 'Normaltext verändert');
  wahr(!xml.includes('Kursiver Hinweis') && !xml.includes('Beispielzeile') && !xml.includes('Foto einfügen'), 'Kursivhinweis übrig');
  gleich(kursivRuns(doc), 0, 'kursive Runs');
  wahr(t.includes('Erste') && t.includes('Dritte'), 'Tabellenzeilen fehlen');
  const tbl = Array.from(doc.getElementsByTagNameNS(W, 'tbl')).find((x) => absatzText(x).startsWith('Nr.'));
  gleich(tbl.getElementsByTagNameNS(W, 'tr').length, 4, 'Kopf + 3 Zeilen');
  wahr(xml.includes('<w:drawing') && Object.keys(zip.files).some((n) => n.startsWith('word/media/beckenbuch_')), 'Bild fehlt');
  const ct = await zip.file('[Content_Types].xml').async('string');
  wahr(ct.includes('Extension="png"'), 'Inhaltstyp PNG fehlt');
  wahr(t.includes('Foto 1: Testbild'), 'Bildunterschrift fehlt');
  const kreuz = Array.from(doc.getElementsByTagNameNS(W, 'tr')).filter((tr) => absatzText(tr).startsWith('Testbecken'))[0];
  wahr(absatzText(kreuz).includes('X'), 'Teilbauwerk nicht angekreuzt');
  wahr(t.includes('T 3. Testkapitel zuschaltbar') && t.includes('Testnotiz im Zusatzkapitel'), 'zugeschaltetes Kapitel fehlt');
});

test('Word: nicht gefundene Stelle wird gemeldet, nicht verschwiegen', async () => {
  const g = structuredClone(testG);
  g.word = [...g.word, { op: 'eintragen', zeile: 'Gibt es nicht:', wert: '{T1.pflichttext}' }];
  const { bericht } = await erzeugeWord(await testDocx(), g, testBuch(), { bilder: await fakeBilder() });
  gleich(bericht.nichtGefunden.map((o) => o.zeile), ['Gibt es nicht:']);
});

test('Word: Gliederungsprüfung kennt die Anweisungen', () => {
  const g = structuredClone(testG);
  g.word.push({ op: 'unbekannt' }, { op: 'eintragen', zeile: 'x', wert: '{T9.nix}' });
  const f = G.pruefeGliederung(g).join(' | ');
  wahr(f.includes('unbekannte Anweisung') && f.includes('{T9.nix}'), f);
});

// ---------- PDF ----------
test('PDF: Gliederung, Verzeichnisse, Seitenzahlen; Datei entsteht', async () => {
  const b = testBuch();
  const bilder = await fakeBilder();
  const d = await pdfBeschreibung(testG, b, bilder, { erfasser: 'Testerfasser' });
  const texte = JSON.stringify(d.content);
  for (const t of ['Testanlage', 'T 1 Testkapitel Allgemein', 'Fotoverzeichnis', 'Offene Punkte', 'Aus den Akten nachzutragen', 'nicht erfasst', 'Testwert Pflicht', 'Inhaltsverzeichnis']) wahr(texte.includes(t), `„${t}“ fehlt`);
  wahr(!texte.includes('Test-Merkmal'), 'Feld mit ausgabe:false erscheint im PDF');
  gleich(d.footer(2, 5).columns[1].text, 'Seite 2 von 5');
  const { blob } = await erzeugePdf(testG, b, bilder, {});
  const kopf = new TextDecoder().decode(new Uint8Array(await blob.slice(0, 5).arrayBuffer()));
  gleich(kopf, '%PDF-');
  wahr(blob.size > 2000, `PDF zu klein (${blob.size})`);
});

test('Fotobezug: Schaden nennt seine Fotos, Foto nennt seinen Prüfpunkt (PDF)', async () => {
  const d = await pdfBeschreibung(testG, testBuch(), await fakeBilder(), {});
  const t = JSON.stringify(d.content);
  wahr(t.includes('Testschaden (Foto 7)'), 'Schadenszeile ohne Fotonummer');
  wahr(t.includes('Foto 7 – zu A 2 Testpunkt: Testschaden'), 'Bildunterschrift ohne Bezug');
  wahr(t.includes('Fotos zu den Schäden'), 'Überschrift der Schadensfotos fehlt');
  wahr(t.includes('"Bezug"'), 'Spalte „Bezug“ im Fotoverzeichnis fehlt');
});

test('Offene Punkte: Pflicht leer, Status offen, Maß zur Prüfung', () => {
  const b = testBuch();
  b.werte['T1.pflichttext'] = { wert: '' };
  b.werte['T1.langtext'] = { wert: '', status: 'offen' };
  b.werte['T1.laenge'] = { wert: 'etwa so', mass: null };
  const o = offenePunkte(testG, b).map((x) => `${x.feld.id}:${x.grund}`);
  wahr(o.includes('pflichttext:Pflichtangabe fehlt') && o.includes('langtext:offen') && o.includes('laenge:Maß zur Prüfung'), o.join(','));
});

// ---------- Echte Vorlage (nur lokal) ----------
const echt = await fetch('../vorlagen_intern/gliederung_bestandsanlage.json', { cache: 'reload' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const echtDocx = await fetch('../vorlagen_intern/Beckenbuch_Bestandsanlage_Vorlage.docx', { cache: 'reload' }).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
if (echt && echtDocx) {
  const kursivFrei = (doc) => kursivRuns(doc) === 0;
  const echtBuch = () => {
    const b = G.neuesBeckenbuch(echt, { meisterei: 'Teststraßenmeisterei', meisterei_tel: '0000 000-1' }, { name: 'Testbecken Word', bauwerksnr: '0000000', teilbauwerke: ['absetzbecken', 'rrb', 'tauchwand'] });
    const s = (k, w, x = {}) => { b.werte[k] = { wert: w, status: null, ...x }; };
    s('A1.strasse_nr', 'B 0000'); s('A1.oelrueckhaltung', true); s('A1.art_bauwerk', 'Absetzbecken, Regenrückhaltebecken');
    s('A4_1.eingriffsstellen', [{ id: 'e1', nr: '1', stelle: 'Testschieber', wirkung: 'Testwirkung' }]);
    s('A8.sofortmassnahmen', 'Testsofortmaßnahme');
    s('C2.erstkontrolle', { punkte: { 'A.1': { ergebnis: 'ok' }, 'A.2': { ergebnis: 'schaden', schaden: 'Testschaden', behebung: 'AM/ SM', fotos: ['f-7'] } }, datum: '2026-11-28', art: 'Sicht- und Funktionskontrolle', anlagenarten: ['Absetzbecken'] });
    b.zugeschaltet = ['A4_2'];
    s('A4_2.wirkungsweise', 'Testwirkungsweise');
    b.notizen = { A1: 'Testnotiz A1' };
    return b;
  };

  test('Echte Vorlage: alle Stellen gefunden, keine Kursivhinweise, Werte und „nicht erfasst“ eingetragen', async () => {
    const { blob, bericht } = await erzeugeWord(echtDocx, echt, echtBuch(), { bilder: await fakeBilder() });
    gleich(bericht.nichtGefunden.map((o) => `${o.op}:${o.zeile || o.zelleMit || o.absatzMit || o.nach || o.kopf || ''}${o.fehler ? ` (${o.fehler})` : ''}`), []);
    const { doc, xml } = await lesen(blob);
    wahr(kursivFrei(doc), `${kursivRuns(doc)} kursive Runs übrig`);
    const t = absaetze(doc).join('\n');
    for (const x of ['Testbecken Word', 'B 0000', '☒ ja', 'Testschieber', 'Testsofortmaßnahme', 'nicht erfasst', 'Teststraßenmeisterei', 'Erstkontrolle bei der Bestandsaufnahme am 28.11.2026', 'Testschaden (Foto 7)', 'Foto 7 – zu A 2 Testpunkt: Testschaden', 'Fotos zu den Schäden der Erstkontrolle:', 'A 4.2 Anlagenteile und Funktion', 'Testwirkungsweise', 'Notiz: Testnotiz A1']) wahr(t.includes(x), `„${x}“ fehlt`);
    wahr(!/\[[A-Z0-9_]+\.[a-z0-9_]+\?\]/.test(xml), 'unaufgelöster Platzhalter');
    wahr(!t.includes('Diese Seite dient nur der Erstellung'), 'Hinweisseite nicht entfernt');
  });

  test('Echte Vorlage: Normaltext der Vorlage bleibt unverändert erhalten', async () => {
    const orig = new DOMParser().parseFromString(await (await window.JSZip.loadAsync(echtDocx)).file('word/document.xml').async('string'), 'application/xml');
    const { blob } = await erzeugeWord(echtDocx, echt, echtBuch(), { bilder: await fakeBilder() });
    const neu = absaetze((await lesen(blob)).doc);
    const alle = neu.join('\n').replace(/☒/g, '□'); // angekreuzte Kästchen zählen als unverändert
    const ps = Array.from(orig.getElementsByTagNameNS(W, 'p'));
    const ende = ps.findIndex((x) => absatzText(x).includes('Diese Seite dient nur der Erstellung'));
    const fehlen = [];
    for (const x of ps.slice(ende + 1)) {
      const normal = Array.from(x.getElementsByTagNameNS(W, 'r')).filter((r) => !istKursiv(r)).map((r) => Array.from(r.getElementsByTagNameNS(W, 't')).map((tt) => tt.textContent).join('')).join('').replace(/\s+/g, ' ').trim();
      if (normal.length < 4 || /^\d+$/.test(normal)) continue;
      if (!alle.includes(normal)) fehlen.push(normal);
    }
    gleich(fehlen, [], 'Normaltext fehlt');
  });

  test('Echte Gliederung: jedes ausgegebene Feld hat eine Stelle in der Word-Vorlage', () => {
    const json = JSON.stringify(echt.word);
    const kapitelOps = new Set(echt.word.filter((o) => o.op === 'kapitel').map((o) => o.kapitel));
    const ohne = [];
    for (const k of echt.kapitel) {
      if (kapitelOps.has(k.id)) continue;
      for (const f of k.felder) {
        if (f.ausgabe === false) continue;
        const key = `${k.id}.${f.id}`;
        if (!json.includes(`{${key}}`) && !json.includes(`"${key}"`)) ohne.push(key);
      }
    }
    gleich(ohne, []);
  });
} else {
  test('Echte Word-Vorlage (übersprungen – nicht vorhanden)', () => {});
}
