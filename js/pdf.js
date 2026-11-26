// PDF-Ausgabe mit pdfmake (lib/pdfmake.min.js, lib/vfs_fonts.js): Gliederung wie im Beckenbuch,
// Seitenzahlen, Fotos und Skizzen, Fotoverzeichnis, offene Punkte und „Aus den Akten“.
import * as G from './gliederung.js';
import { feldAusgabe, feldText, ausgabeFelder, offenePunkte, datumDE, blobZuDataUrl, betreff, ladeSkript, NICHT_ERFASST } from './ausgabe.js';

const GRAU = '#666666';
const BREITE = 515; // nutzbare Breite DIN A4 bei 40 pt Rand

function wertKnoten(text, leer) {
  return { text, color: leer ? GRAU : '#000000', italics: !!leer };
}

// Baut die Dokumentbeschreibung für pdfmake. bilder(key) wie in bildquelle.js; Bilder als Data-URL.
export async function pdfBeschreibung(g, buch, bilder, { erfasser = '', stand = new Date() } = {}) {
  const inhalt = [];
  const fotoListe = [];
  const bildKnoten = async (key, breite = 420) => {
    const r = [];
    for (const b of await bilder(key)) {
      if (b.svgText) r.push({ svg: b.svgText, width: BREITE, margin: [0, 4, 0, 8] });
      else r.push({ image: await blobZuDataUrl(b.blob), fit: [breite, 560], margin: [0, 4, 0, 2] });
      if (b.unterschrift) r.push({ text: b.unterschrift, fontSize: 9, color: '#333', margin: [0, 0, 0, 8] });
      if (b.foto) fotoListe.push({ ...b.foto, unterschrift: b.unterschrift });
    }
    return r;
  };
  const leerText = (k, f) => feldText(g, buch, k.id, f) === null;

  // ---------- Deckblatt ----------
  const deck = g.kapitel.find((k) => k.id === 'DECK');
  inhalt.push(
    { text: 'Beckenbuch', style: 'titel', margin: [0, 60, 0, 6] },
    { text: 'für', alignment: 'center' },
    { text: G.buchName(buch), style: 'titel2', margin: [0, 6, 0, 6] },
    { text: `Bauwerksnummer: ${G.buchBauwerksnr(buch) || NICHT_ERFASST}`, alignment: 'center', bold: true },
    { text: 'Bestandsanlage', alignment: 'center', margin: [0, 18, 0, 2], fontSize: 14 },
    { text: g.vorlage, alignment: 'center', fontSize: 10, color: '#333', margin: [0, 0, 0, 18] },
  );
  const gewaehlt = new Set(buch.teilbauwerke || []);
  const tbZeilen = (g.teilbauwerke || []).map((t) => [t.label, { text: gewaehlt.has(t.id) ? 'X' : '', alignment: 'center', bold: true }]);
  for (const f of buch.freieTeilbauwerke || []) if (f && f.trim()) tbZeilen.push([f, { text: 'X', alignment: 'center', bold: true }]);
  inhalt.push({ text: 'Teilbauwerke, die zu der Entwässerungsanlage gehören:', bold: true, margin: [0, 0, 0, 4] },
    { table: { widths: ['*', 40], body: [[{ text: 'Teilbauwerk', bold: true }, { text: 'X', bold: true, alignment: 'center' }], ...tbZeilen] }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 14] });
  if (deck) {
    const ort = deck.felder.find((f) => f.id === 'aufgestellt_ort'), dat = deck.felder.find((f) => f.id === 'aufgestellt_datum');
    const o = ort ? feldText(g, buch, 'DECK', ort) : null, d = dat ? feldText(g, buch, 'DECK', dat) : null;
    inhalt.push({ text: `Aufgestellt durch: ${[o, d].filter(Boolean).join(', ') || NICHT_ERFASST}` });
  }
  const fotoKap = g.kapitel.find((k) => k.id === 'FOTO');
  if (fotoKap) {
    inhalt.push({ text: 'Foto der Anlage:', bold: true, margin: [0, 14, 0, 4], pageBreak: 'before' });
    for (const f of ausgabeFelder(g, buch, fotoKap)) {
      if (f.art === 'foto') {
        const b = await bildKnoten(G.feldKey('FOTO', f.id), BREITE);
        inhalt.push(...(b.length ? b : [wertKnoten(feldAusgabe(g, buch, 'FOTO', f), true)]));
      } else inhalt.push({ text: [{ text: `${f.label}: `, bold: true }, wertKnoten(feldAusgabe(g, buch, 'FOTO', f), leerText(fotoKap, f))], margin: [0, 6, 0, 0] });
    }
  }
  inhalt.push({ toc: { title: { text: 'Inhaltsverzeichnis', style: 'h1' } }, pageBreak: 'before' });

  // ---------- Kapitel ----------
  let teil = null;
  for (const k of G.sichtbareKapitel(g, buch)) {
    if (k.id === 'DECK' || k.id === 'FOTO') continue;
    if (k.teil && k.teil !== teil) {
      teil = k.teil;
      inhalt.push({ text: { A: 'Teil A: Betriebsbuch', B: 'Teil B: Ergänzende Unterlagen', C: 'Teil C: Kontroll- und Wartungsberichte' }[teil] || `Teil ${teil}`, style: 'h1', pageBreak: 'before', tocItem: true });
    }
    inhalt.push({ text: `${k.nr ? `${k.nr} ` : ''}${k.titel}`, style: 'h2', tocItem: true, tocMargin: [12, 0, 0, 0] });
    for (const t of k.festtext || []) inhalt.push({ text: t, margin: [0, 0, 0, 6] });
    let einfach = [];
    const einfachAusgeben = () => {
      if (!einfach.length) return;
      inhalt.push({ table: { widths: [170, '*'], body: einfach }, layout: 'lightHorizontalLines', margin: [0, 2, 0, 8] });
      einfach = [];
    };
    for (const f of ausgabeFelder(g, buch, k)) {
      const key = G.feldKey(k.id, f.id);
      const leer = leerText(k, f);
      if (['text', 'zahl', 'datum', 'auswahl', 'mehrfach', 'janein'].includes(f.art)) {
        einfach.push([{ text: f.label, bold: true }, wertKnoten(feldAusgabe(g, buch, k.id, f), leer)]);
        continue;
      }
      einfachAusgeben();
      inhalt.push({ text: f.label, bold: true, margin: [0, 6, 0, 2] });
      if (f.art === 'langtext') inhalt.push({ ...wertKnoten(feldAusgabe(g, buch, k.id, f), leer), margin: [0, 0, 0, 6] });
      else if (f.art === 'tabelle') {
        const zeilen = (G.wertVon(g, buch, k.id, f) || []).filter((z) => G.zeileHatInhalt(f, z));
        if (zeilen.length) {
          inhalt.push({ table: { headerRows: 1, widths: f.spalten.map(() => '*'), body: [f.spalten.map((s) => ({ text: s.label, bold: true, fontSize: 9 })), ...zeilen.map((z) => f.spalten.map((s) => ({ text: String(z[s.id] ?? ''), fontSize: 9 })))] }, margin: [0, 0, 0, 6] });
          if (f.fotosJeZeile) for (const z of zeilen) inhalt.push(...await bildKnoten(`zeile:${z.id}`, 300));
        } else inhalt.push({ ...wertKnoten(feldAusgabe(g, buch, k.id, f), true), margin: [0, 0, 0, 6] });
      } else if (['foto', 'skizze', 'massskizze'].includes(f.art)) {
        const b = await bildKnoten(f.aus || key, f.art === 'foto' ? 380 : BREITE);
        inhalt.push(...(b.length ? b : [{ ...wertKnoten(feldAusgabe(g, buch, k.id, f), true), margin: [0, 0, 0, 6] }]));
      } else if (f.art === 'pruefprotokoll') {
        inhalt.push(...await protokollKnoten(g, buch, k, f, bildKnoten));
      }
    }
    einfachAusgeben();
    // Protokollvordruck in A 5.2 (unverändert, Kopf vorausgefüllt)
    if (k.protokoll) inhalt.push(...protokollTabelle(k.protokoll, null, 'Protokollvordruck (Sicht- und Funktionskontrolle)'));
    const notiz = ((buch.notizen || {})[k.id] || '').trim();
    if (notiz) inhalt.push({ text: [{ text: 'Notiz: ', bold: true }, notiz], italics: true, margin: [0, 4, 0, 8] });
  }

  // ---------- Verzeichnisse ----------
  inhalt.push({ text: 'Fotoverzeichnis', style: 'h1', pageBreak: 'before', tocItem: true });
  inhalt.push(fotoListe.length
    ? { table: { headerRows: 1, widths: [40, '*', 70], body: [[{ text: 'Nr.', bold: true }, { text: 'Bildunterschrift', bold: true }, { text: 'Datum', bold: true }], ...fotoListe.sort((a, b) => a.nr - b.nr).map((f) => [String(f.nr), f.unterschrift || '', datumDE(String(f.datum).slice(0, 10))])] }, layout: 'lightHorizontalLines' }
    : { text: 'Keine Fotos.', italics: true, color: GRAU });
  const offen = offenePunkte(g, buch);
  inhalt.push({ text: 'Offene Punkte', style: 'h1', margin: [0, 18, 0, 6], tocItem: true });
  inhalt.push(offen.length
    ? { ul: offen.map((o) => `${o.kapitel.nr || o.kapitel.titel} – ${o.feld.label}: ${o.grund}`) }
    : { text: 'Keine offenen Punkte.', italics: true, color: GRAU });
  const akten = G.akteneintraege(g, buch).filter((e) => e.feld.ausgabe !== false);
  inhalt.push({ text: 'Aus den Akten nachzutragen', style: 'h1', margin: [0, 18, 0, 6], tocItem: true });
  inhalt.push(akten.length
    ? { ul: akten.map((e) => `${e.kapitel.nr || e.kapitel.titel} – ${e.feld.label}`) }
    : { text: 'Nichts nachzutragen.', italics: true, color: GRAU });

  const standText = stand.toLocaleDateString('de-DE');
  return {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 50],
    info: { title: betreff(buch), author: erfasser || 'Beckenbuch-App', subject: g.vorlage },
    header: (seite) => (seite === 1 ? null : { text: `${betreff(buch)}`, fontSize: 8, color: GRAU, margin: [40, 20, 40, 0] }),
    footer: (seite, gesamt) => ({ columns: [{ text: `Stand: ${standText}`, fontSize: 8, color: GRAU }, { text: `Seite ${seite} von ${gesamt}`, alignment: 'right', fontSize: 8, color: GRAU }], margin: [40, 10, 40, 0] }),
    content: inhalt,
    styles: {
      titel: { fontSize: 30, bold: true, alignment: 'center' },
      titel2: { fontSize: 20, bold: true, alignment: 'center' },
      h1: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
      h2: { fontSize: 13, bold: true, margin: [0, 14, 0, 6] },
    },
    defaultStyle: { fontSize: 10, lineHeight: 1.15 },
  };
}

function protokollTabelle(p, w, titel) {
  const body = [[{ text: 'Nr.', bold: true }, { text: 'Kontrollgegenstand', bold: true }, { text: 'ok', bold: true }, { text: 'Art des Schadens', bold: true }, { text: 'Behebung durch', bold: true }]];
  for (const gr of p.gruppen) {
    body.push([{ text: gr.id, bold: true }, { text: gr.titel, bold: true, colSpan: 4 }, '', '', '']);
    for (const pt of gr.punkte) {
      const e = (w && w.punkte && w.punkte[`${gr.id}.${pt.nr}`]) || {};
      body.push([`${gr.id} ${pt.nr}`, pt.text, e.ergebnis === 'ok' ? 'ok' : '', e.ergebnis === 'schaden' ? (e.schaden || 'Schaden') : '', e.behebung || '']);
    }
  }
  const r = [];
  if (titel) r.push({ text: titel, bold: true, margin: [0, 8, 0, 4] });
  r.push({ table: { headerRows: 1, widths: [30, '*', 22, 150, 60], body }, fontSize: 8, margin: [0, 0, 0, 4] });
  if (p.fussnote) r.push({ text: p.fussnote, fontSize: 8, margin: [0, 0, 0, 8] });
  return r;
}

async function protokollKnoten(g, buch, k, f, bildKnoten) {
  const w = G.wertVon(g, buch, k.id, f);
  if (!w || G.istLeer(f, w)) return [{ ...wertKnoten(feldAusgabe(g, buch, k.id, f), true), margin: [0, 0, 0, 6] }];
  const pk = g.kapitel.find((x) => x.id === f.protokoll);
  const kopf = [
    ['Protokoll', [w.art, w.artWeil].filter(Boolean).join(' ') || NICHT_ERFASST],
    ['Angaben zur Witterung', [...(w.witterung || []), w.witterungSonst].filter(Boolean).join(', ') || NICHT_ERFASST],
    ['Art der Anlage', [...(w.anlagenarten || []), w.anlageSonst].filter(Boolean).join(', ') || NICHT_ERFASST],
    ['Name Protokollführer', w.protokollfuehrer || NICHT_ERFASST],
    ['Kontrolldatum', datumDE(w.datum) || NICHT_ERFASST],
    ['Mängelbeseitigung veranlasst', w.maengel || '–'],
    ['Wv. am', datumDE(w.wv) || '–'],
  ];
  return [
    { table: { widths: [170, '*'], body: kopf.map(([a, b]) => [{ text: a, bold: true }, b]) }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 6] },
    ...protokollTabelle(pk.protokoll, w, null),
    ...await bildKnoten(`protokoll:${G.feldKey(k.id, f.id)}`, 300),
  ];
}

export async function erzeugePdf(g, buch, bilder, opt = {}) {
  await ladeSkript(new URL('../lib/pdfmake.min.js', import.meta.url).href);
  await ladeSkript(new URL('../lib/vfs_fonts.js', import.meta.url).href);
  const beschreibung = await pdfBeschreibung(g, buch, bilder, opt);
  const pdf = window.pdfMake.createPdf(beschreibung);
  const blob = await new Promise((resolve) => pdf.getBlob(resolve));
  return { blob, beschreibung };
}
