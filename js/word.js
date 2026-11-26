// Word-Ausgabe: füllt die ORIGINAL-Vorlage (docx) nach der Zuordnungsliste `word` der Gliederungsdatei.
// Die Vorlage wird nicht vorbereitet; jede Anweisung sucht ihre Stelle über den Text der Vorlage.
// Am Ende werden alle kursiven Hinweise entfernt. Ergebnis: { blob, bericht: { nichtGefunden: [...] } }
//
// Anweisungen (op):
//   entfernenBereich { von, bis }                 Absätze von … bis … (z. B. Hinweisseite) entfernen
//   absatzNach       { nach, wert }               Wert in den Absatz nach dem Absatz „nach“ schreiben
//   eintragen        { zeile | zelleMit | absatzMit, spalte?, bereich?, wert | werte }
//                    Kursive Beispiele werden der Reihe nach durch die Werte ersetzt, sonst wird angehängt.
//   voranstellen     { zelleMit, wert }           neuer Absatz am Anfang der Zelle
//   block            { nach, wert }               einzellige Tabelle nach dem Absatz füllen
//   bild             { nach, feld }               Fotos/Skizzen in die Tabelle danach bzw. nach dem Absatz
//   ankreuzen        { zeile | zelleMit, feld, ja, nein }        „□ ja“ → „☒ ja“
//   ankreuzenListe   { zeileMit, quelle, eigenschaft, sonstiges? }  Aufzählung mit Optionen ankreuzen
//   kreuze           { kopf }                     Teilbauwerke ankreuzen, freie Zeilen füllen
//   tabelle          { kopf | nach, feld, spalten, leerVorlageBehalten?, anlagenFotos? }
//   kapitel          { kapitel, vor, stilWie, labelWie }  zugeschaltetes Kapitel einfügen
//   protokollKopie   { tabelleMit, nach, feld, titelWie }  Erstkontrolle als ausgefüllte Kopie des Protokolls
//   notizen          { kapitelUeberschriften }    Notizen vor der Überschrift des folgenden Kapitels
import * as G from './gliederung.js';
import { fuelleVorlage, feldAusgabe, feldNachKey, datumDE, NICHT_ERFASST, ausgabeFelder, ladeSkript } from './ausgabe.js';

const NS = {
  w: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  wp: 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  pic: 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  rel: 'http://schemas.openxmlformats.org/package/2006/relationships',
  ct: 'http://schemas.openxmlformats.org/package/2006/content-types',
};
const W = NS.w;
const EMU_CM = 360000;

const norm = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const el = (k, tag) => Array.from(k.getElementsByTagNameNS(W, tag));
const kinder = (k, tag) => Array.from(k.childNodes).filter((n) => n.nodeType === 1 && n.namespaceURI === W && n.localName === tag);

export function absatzText(p) {
  return el(p, 't').map((t) => t.textContent).join('');
}
export function istKursiv(r) {
  const rPr = kinder(r, 'rPr')[0];
  if (!rPr) return false;
  const i = kinder(rPr, 'i')[0];
  return !!i && i.getAttributeNS(W, 'val') !== '0' && i.getAttribute('w:val') !== 'false';
}

// ---------- Hauptfunktion ----------
// quellen: { bilder: async (key) => [{ bytes, ext, breite, hoehe, unterschrift, svg? }], erfasser }
export async function erzeugeWord(docxBlob, g, buch, quellen = {}) {
  if (!window.JSZip) await ladeSkript(new URL('../lib/jszip.min.js', import.meta.url).href);
  const JSZip = window.JSZip;
  const zip = await JSZip.loadAsync(docxBlob);
  const xml = await zip.file('word/document.xml').async('string');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Die Word-Vorlage konnte nicht gelesen werden.');
  const ctx = await bildRegister(zip, doc);
  const bericht = { nichtGefunden: [], ausgefuehrt: 0 };
  const w = new Bearbeiter(doc, g, buch, quellen, ctx, bericht);
  for (const op of g.word || []) {
    try {
      const ok = await w.ausfuehren(op);
      if (ok === false) bericht.nichtGefunden.push(op);
      else bericht.ausgefuehrt++;
    } catch (e) {
      bericht.nichtGefunden.push({ ...op, fehler: e.message });
    }
  }
  w.kursivEntfernen();
  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc));
  await ctx.speichern();
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
  return { blob, bericht };
}

// ---------- Bilder (Medien, Beziehungen, Inhaltstypen) ----------
async function bildRegister(zip, doc) {
  const relPfad = 'word/_rels/document.xml.rels';
  const rels = new DOMParser().parseFromString(await zip.file(relPfad).async('string'), 'application/xml');
  const ct = new DOMParser().parseFromString(await zip.file('[Content_Types].xml').async('string'), 'application/xml');
  let max = 0;
  for (const r of Array.from(rels.getElementsByTagNameNS(NS.rel, 'Relationship'))) {
    const n = parseInt(String(r.getAttribute('Id')).replace(/\D/g, ''), 10);
    if (n > max) max = n;
  }
  let nr = 0;
  let docPr = 1000;
  const endungen = new Set(Array.from(ct.getElementsByTagNameNS(NS.ct, 'Default')).map((d) => d.getAttribute('Extension')));
  const typen = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', svg: 'image/svg+xml' };
  return {
    neu(bytes, ext) {
      nr++; max++;
      const name = `beckenbuch_${nr}.${ext}`;
      zip.file(`word/media/${name}`, bytes);
      const r = rels.createElementNS(NS.rel, 'Relationship');
      r.setAttribute('Id', `rId${max}`);
      r.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image');
      r.setAttribute('Target', `media/${name}`);
      rels.documentElement.appendChild(r);
      if (!endungen.has(ext)) {
        const d = ct.createElementNS(NS.ct, 'Default');
        d.setAttribute('Extension', ext); d.setAttribute('ContentType', typen[ext]);
        ct.documentElement.insertBefore(d, ct.documentElement.firstChild);
        endungen.add(ext);
      }
      return `rId${max}`;
    },
    docPrId() { return ++docPr; },
    async speichern() {
      zip.file(relPfad, new XMLSerializer().serializeToString(rels));
      zip.file('[Content_Types].xml', new XMLSerializer().serializeToString(ct));
    },
  };
}

class Bearbeiter {
  constructor(doc, g, buch, quellen, bilder, bericht) {
    Object.assign(this, { doc, g, buch, quellen, bilder, bericht });
    this.body = el(doc, 'body')[0];
  }

  // ----- Suchen -----
  absaetze(bereich = this.body) { return el(bereich, 'p'); }
  absatzMit(text, bereich, genau = false) {
    const t = norm(text);
    return this.absaetze(bereich).find((p) => (genau ? norm(absatzText(p)) === t : norm(absatzText(p)).startsWith(t))) || null;
  }
  bereich(op) {
    if (!op.bereich) return this.body;
    const p = this.absatzMit(op.bereich);
    return p ? this.vorfahr(p, 'tbl') || this.body : null;
  }
  vorfahr(n, tag) {
    for (let x = n.parentNode; x; x = x.parentNode) if (x.namespaceURI === W && x.localName === tag) return x;
    return null;
  }
  zellen(tr) { return kinder(tr, 'tc'); }
  zeileMitErsterZelle(text, bereich = this.body) {
    const t = norm(text);
    return el(bereich, 'tr').find((tr) => { const c = this.zellen(tr)[0]; return c && norm(absatzText(c)).startsWith(t); }) || null;
  }
  naechstesElement(n) {
    let x = n.nextSibling;
    while (x && x.nodeType !== 1) x = x.nextSibling;
    return x;
  }
  tabelleNach(text) {
    const p = this.absatzMit(text, this.body, true) || this.absatzMit(text);
    if (!p) return null;
    let x = p.parentNode === this.body ? p : p;
    for (let n = this.naechstesElement(x); n; n = this.naechstesElement(n)) {
      if (n.localName === 'tbl') return n;
      if (n.localName === 'p' && norm(absatzText(n)) && !this.ganzKursiv(n)) return null; // anderer Text dazwischen
    }
    return null;
  }
  tabelleMitKopf(text) {
    const t = norm(text);
    return el(this.body, 'tbl').find((tb) => { const tr = el(tb, 'tr')[0]; const c = tr && this.zellen(tr)[0]; return c && norm(absatzText(c)).startsWith(t); }) || null;
  }

  // ----- Bausteine -----
  rPrVorlage(bereich, ohneFett = false) {
    const runs = el(bereich, 'r');
    const r = runs.find((x) => !istKursiv(x)) || runs[0];
    const rPr = r && kinder(r, 'rPr')[0];
    if (!rPr) return null;
    const k = rPr.cloneNode(true);
    for (const tag of ['i', 'iCs', ...(ohneFett ? ['b', 'bCs'] : [])]) for (const x of kinder(k, tag)) k.removeChild(x);
    return k;
  }
  run(text, rPr) {
    const r = this.doc.createElementNS(W, 'w:r');
    if (rPr) r.appendChild(rPr.cloneNode(true));
    String(text).split('\n').forEach((zeile, i) => {
      if (i) r.appendChild(this.doc.createElementNS(W, 'w:br'));
      const t = this.doc.createElementNS(W, 'w:t');
      t.setAttribute('xml:space', 'preserve');
      t.textContent = zeile;
      r.appendChild(t);
    });
    return r;
  }
  absatz(text, pPr, rPr) {
    const p = this.doc.createElementNS(W, 'w:p');
    if (pPr) p.appendChild(pPr.cloneNode(true));
    if (text !== undefined && text !== null) p.appendChild(this.run(text, rPr));
    return p;
  }
  runsLeeren(p) { for (const r of kinder(p, 'r')) p.removeChild(r); }
  ganzKursiv(p) { const rs = el(p, 'r').filter((r) => norm(el(r, 't').map((t) => t.textContent).join(''))); return rs.length > 0 && rs.every(istKursiv); }
  zelleFuellen(tc, inhalt) {
    // inhalt: Text oder Liste von Absätzen
    const ps = kinder(tc, 'p');
    const pPr = ps[0] && kinder(ps[0], 'pPr')[0];
    const rPr = this.rPrVorlage(tc);
    for (const x of Array.from(tc.childNodes)) if (x.nodeType === 1 && x.localName !== 'tcPr') tc.removeChild(x);
    const neu = typeof inhalt === 'string' ? [this.absatz(inhalt, pPr ? this.ohneNummer(pPr) : null, rPr)] : inhalt;
    for (const p of neu) tc.appendChild(p);
    if (!neu.length) tc.appendChild(this.absatz(null, pPr));
  }
  ohneNummer(pPr) { const k = pPr.cloneNode(true); for (const n of kinder(k, 'numPr')) k.removeChild(n); return k; }
  wert(op) { return op.werte ? op.werte.map((v) => fuelleVorlage(this.g, this.buch, v)) : [fuelleVorlage(this.g, this.buch, op.wert)]; }

  // ----- Anweisungen -----
  async ausfuehren(op) {
    const f = this[`op_${op.op}`];
    if (!f) throw new Error(`Unbekannte Anweisung „${op.op}“`);
    return f.call(this, op);
  }

  op_entfernenBereich(op) {
    const von = this.absatzMit(op.von), bis = this.absatzMit(op.bis);
    if (!von || !bis || von.parentNode !== this.body) return false;
    let n = von;
    while (n) {
      const naechster = n.nextSibling;
      this.body.removeChild(n);
      if (n === bis) break;
      n = naechster;
    }
    return true;
  }

  op_absatzNach(op) {
    const p = this.absatzMit(op.nach, this.body, true);
    const z = p && this.naechstesElement(p);
    if (!z || z.localName !== 'p') return false;
    const rPr = this.rPrVorlage(z);
    this.runsLeeren(z);
    z.appendChild(this.run(this.wert(op)[0], rPr));
    return true;
  }

  ziel(op) {
    const ber = this.bereich(op);
    if (!ber) return null;
    if (op.zeile) {
      const tr = this.zeileMitErsterZelle(op.zeile, ber);
      return tr ? this.zellen(tr)[op.spalte ?? 1] || null : null;
    }
    if (op.zelleMit) { const p = this.absatzMit(op.zelleMit, ber); return p ? this.vorfahr(p, 'tc') : null; }
    if (op.absatzMit) return this.absatzMit(op.absatzMit, ber);
    return null;
  }

  op_eintragen(op) {
    const z = this.ziel(op);
    if (!z) return false;
    const werte = this.wert(op);
    const kursiv = el(z, 'r').filter((r) => istKursiv(r) && norm(el(r, 't').map((t) => t.textContent).join('')));
    if (kursiv.length) {
      kursiv.forEach((r, i) => {
        if (i < werte.length) {
          const rPr = this.rPrVorlage(r.parentNode, true) || kinder(r, 'rPr')[0];
          const neu = this.run(i === kursiv.length - 1 ? werte.slice(i).join('\n') : werte[i], rPr && (() => { const k = rPr.cloneNode(true); for (const t of ['i', 'iCs']) for (const x of kinder(k, t)) k.removeChild(x); return k; })());
          r.parentNode.replaceChild(neu, r);
        } else r.parentNode.removeChild(r);
      });
      // Absätze, die nur aus Beispielen bestanden, entfallen
      for (const p of (z.localName === 'p' ? [] : kinder(z, 'p'))) if (!norm(absatzText(p)) && kinder(z, 'p').length > 1) z.removeChild(p);
      return true;
    }
    if (z.localName === 'tc' && !norm(absatzText(z))) { this.zelleFuellen(z, werte.join('\n')); return true; }
    const p = z.localName === 'p' ? z : kinder(z, 'p').pop();
    const rPr = this.rPrVorlage(p, true);
    const zuletzt = absatzText(p);
    p.appendChild(this.run(`${/\s$/.test(zuletzt) ? '' : ' '}${werte.join('\n')}`, rPr));
    return true;
  }

  op_voranstellen(op) {
    const p0 = this.absatzMit(op.zelleMit);
    const tc = p0 && this.vorfahr(p0, 'tc');
    if (!tc) return false;
    const pPr = kinder(p0, 'pPr')[0];
    const neu = this.absatz(this.wert(op)[0], pPr, this.rPrVorlage(p0, true));
    tc.insertBefore(neu, p0);
    return true;
  }

  op_block(op) {
    const tb = this.tabelleNach(op.nach);
    const tc = tb && el(tb, 'tc')[0];
    if (!tc) return false;
    this.zelleFuellen(tc, this.wert(op)[0]);
    return true;
  }

  async bildAbsaetze(key, pPrVorlage, rPrVorlage, opt = {}) {
    const liste = this.quellen.bilder ? await this.quellen.bilder(key) : [];
    const ps = [];
    for (const b of liste) {
      ps.push(this.bildAbsatz(b, pPrVorlage, opt.breiteCm));
      if (b.unterschrift) ps.push(this.absatz(b.unterschrift, pPrVorlage, rPrVorlage));
    }
    return ps;
  }

  bildAbsatz(b, pPr, breiteCm = 15.5) {
    const rId = this.bilder.neu(b.bytes, b.ext);
    const svgId = b.svg ? this.bilder.neu(b.svg, 'svg') : null;
    const cx = Math.round(breiteCm * EMU_CM);
    let cy = Math.round((cx * b.hoehe) / b.breite);
    const maxCy = 21 * EMU_CM;
    let cxx = cx;
    if (cy > maxCy) { cxx = Math.round((cx * maxCy) / cy); cy = maxCy; }
    const id = this.bilder.docPrId();
    const ext = svgId ? `<a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="${svgId}"/></a:ext></a:extLst>` : '';
    const xml = `<w:r xmlns:w="${NS.w}" xmlns:r="${NS.r}" xmlns:wp="${NS.wp}" xmlns:a="${NS.a}" xmlns:pic="${NS.pic}"><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cxx}" cy="${cy}"/><wp:docPr id="${id}" name="Bild ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="Bild ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}">${ext}</a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cxx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    const frag = new DOMParser().parseFromString(xml, 'application/xml').documentElement;
    const p = this.doc.createElementNS(W, 'w:p');
    if (pPr) p.appendChild(this.ohneNummer(pPr));
    p.appendChild(this.doc.importNode(frag, true));
    return p;
  }

  async op_bild(op) {
    const p = this.absatzMit(op.nach, this.body, true) || this.absatzMit(op.nach);
    if (!p) return false;
    const t = this.feld(op.feld);
    const tb = this.tabelleNach(op.nach);
    const einzel = tb && el(tb, 'tc').length === 1 ? el(tb, 'tc')[0] : null;
    const pPr = einzel ? kinder(kinder(einzel, 'p')[0] || this.doc.createElementNS(W, 'w:p'), 'pPr')[0] : kinder(p, 'pPr')[0];
    const rPr = this.rPrVorlage(einzel || p, true);
    const bilder = await this.bildAbsaetze(t ? (t.feld.aus || op.feld) : op.feld, pPr, rPr);
    const inhalt = bilder.length ? bilder : [this.absatz(t ? feldAusgabe(this.g, this.buch, t.kapitel.id, t.feld) : NICHT_ERFASST, pPr && this.ohneNummer(pPr), rPr)];
    if (einzel) this.zelleFuellen(einzel, inhalt);
    else { let nachP = p; for (const x of inhalt) { nachP.parentNode.insertBefore(x, nachP.nextSibling); nachP = x; } }
    return true;
  }

  feld(key) { return feldNachKey(this.g, key); }

  op_ankreuzen(op) {
    const z = this.ziel(op);
    const t = this.feld(op.feld);
    if (!z || !t) return false;
    const w = G.wertVon(this.g, this.buch, t.kapitel.id, t.feld);
    const label = w === true ? op.ja : w === false ? op.nein : null;
    if (!label) return true; // nicht erfasst – Kästchen bleiben leer
    for (const tt of el(z, 't')) {
      tt.textContent = tt.textContent.replace(new RegExp(`□(\\s*)${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '☒$1' + label);
    }
    return true;
  }

  op_ankreuzenListe(op) {
    const tr = el(this.body, 'tr').find((x) => this.zellen(x).some((c) => norm(absatzText(c)).startsWith(norm(op.zeileMit))));
    if (!tr) return false;
    const t = this.feld(op.quelle);
    const wert = t ? G.wertVon(this.g, this.buch, t.kapitel.id, t.feld) : null;
    const gewaehlt = (wert && wert[op.eigenschaft]) || [];
    this.listeAnkreuzen(tr, gewaehlt, op.sonstiges && wert ? wert[op.sonstiges] : '');
    return true;
  }

  listeAnkreuzen(bereich, gewaehlt, sonstText) {
    const ziele = new Set(gewaehlt.map(norm));
    for (const p of el(bereich, 'p')) {
      const txt = norm(absatzText(p));
      if (!txt || !ziele.has(txt)) continue;
      if (!el(p, 'numPr').length) continue; // nur Aufzählungspunkte (Kästchen), keine gleichlautenden Überschriften
      const rPr = this.rPrVorlage(p);
      const erster = kinder(p, 'r')[0];
      p.insertBefore(this.run('☒ ', rPr), erster || null);
      if (/^sonstige/i.test(txt) && sonstText) p.appendChild(this.run(` ${sonstText}`, rPr));
    }
  }

  op_kreuze(op) {
    const tb = this.tabelleMitKopf(op.kopf);
    if (!tb) return false;
    const gewaehlt = new Set(this.buch.teilbauwerke || []);
    const labels = new Map((this.g.teilbauwerke || []).map((t) => [norm(t.label), t.id]));
    const frei = [...(this.buch.freieTeilbauwerke || [])].filter((x) => x && x.trim());
    for (const tr of el(tb, 'tr').slice(1)) {
      const [c0, c1] = this.zellen(tr);
      if (!c1) continue;
      const name = norm(absatzText(c0));
      if (name && labels.has(name)) {
        if (gewaehlt.has(labels.get(name))) this.zelleFuellen(c1, 'X');
      } else if (!name && frei.length) {
        this.zelleFuellen(c0, frei.shift());
        this.zelleFuellen(c1, 'X');
      }
    }
    return true;
  }

  async op_tabelle(op) {
    const tb = op.kopf ? this.tabelleMitKopf(op.kopf) : this.tabelleNach(op.nach);
    const t = this.feld(op.feld);
    if (!tb || !t) return false;
    const zeilen = (G.wertVon(this.g, this.buch, t.kapitel.id, t.feld) || []).filter((z) => G.zeileHatInhalt(t.feld, z));
    const trs = el(tb, 'tr');
    if (!zeilen.length && op.leerVorlageBehalten) return true;
    const vorlage = trs[1] ? trs[1].cloneNode(true) : null;
    if (!vorlage) return false;
    for (const tr of trs.slice(1)) tr.parentNode.removeChild(tr);
    const tbl = trs[0].parentNode;
    const daten = zeilen.length ? zeilen : [null];
    for (const z of daten) {
      const tr = vorlage.cloneNode(true);
      const zs = this.zellen(tr);
      zs.forEach((c, i) => {
        let text = '';
        if (!z) text = i === 0 ? feldAusgabe(this.g, this.buch, t.kapitel.id, t.feld) : '';
        else if (op.spalten[i]) text = z[op.spalten[i]] !== undefined ? String(z[op.spalten[i]]) : '';
        this.zelleFuellen(c, text);
      });
      tbl.appendChild(tr);
    }
    // Fotos der Zeilen (z. B. abfotografierte Unterlagen) als Anlagen hinter der Tabelle
    if (op.anlagenFotos && this.quellen.bilder) {
      let nach = tb;
      const pPr = null;
      for (const z of zeilen) {
        if (!(z.fotos || []).length) continue;
        const titel = this.absatz(`Anlage ${z.anlage_nr || ''}: ${op.spalten.slice(1).map((s) => z[s]).filter(Boolean).join(', ')}`.replace(/\s+:/, ':'), pPr, this.rPrVorlage(tb));
        nach.parentNode.insertBefore(titel, nach.nextSibling); nach = titel;
        for (const p of await this.bildAbsaetze(`zeile:${z.id}`, pPr, this.rPrVorlage(tb, true))) { nach.parentNode.insertBefore(p, nach.nextSibling); nach = p; }
      }
    }
    return true;
  }

  // Neue Tabelle mit Rahmen (für eingefügte Kapitel)
  neueTabelle(kopf, zeilen, rPr) {
    const d = this.doc;
    const tbl = d.createElementNS(W, 'w:tbl');
    const tblPr = d.createElementNS(W, 'w:tblPr');
    const tw = d.createElementNS(W, 'w:tblW'); tw.setAttribute('w:w', '5000'); tw.setAttribute('w:type', 'pct'); tblPr.appendChild(tw);
    const b = d.createElementNS(W, 'w:tblBorders');
    for (const s of ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']) {
      const x = d.createElementNS(W, `w:${s}`); x.setAttribute('w:val', 'single'); x.setAttribute('w:sz', '4'); x.setAttribute('w:space', '0'); x.setAttribute('w:color', '000000'); b.appendChild(x);
    }
    tblPr.appendChild(b); tbl.appendChild(tblPr);
    const grid = d.createElementNS(W, 'w:tblGrid');
    for (let i = 0; i < kopf.length; i++) grid.appendChild(d.createElementNS(W, 'w:gridCol'));
    tbl.appendChild(grid);
    const zeile = (werte, fett) => {
      const tr = d.createElementNS(W, 'w:tr');
      for (const v of werte) {
        const tc = d.createElementNS(W, 'w:tc');
        const r = rPr ? rPr.cloneNode(true) : d.createElementNS(W, 'w:rPr');
        if (fett) r.appendChild(d.createElementNS(W, 'w:b'));
        tc.appendChild(this.absatz(String(v ?? ''), null, r));
        tr.appendChild(tc);
      }
      tbl.appendChild(tr);
    };
    zeile(kopf, true);
    for (const z of zeilen) zeile(z, false);
    return tbl;
  }

  async kapitelInhalt(kap, labelPPr, labelRPr, wertRPr) {
    const els = [];
    for (const f of ausgabeFelder(this.g, this.buch, kap)) {
      const key = G.feldKey(kap.id, f.id);
      els.push(this.absatz(`${f.label}:`, labelPPr, labelRPr));
      if (['foto', 'skizze', 'massskizze'].includes(f.art)) {
        const b = await this.bildAbsaetze(key, null, wertRPr);
        els.push(...(b.length ? b : [this.absatz(feldAusgabe(this.g, this.buch, kap.id, f), null, wertRPr)]));
      } else if (f.art === 'tabelle') {
        const zeilen = (G.wertVon(this.g, this.buch, kap.id, f) || []).filter((z) => G.zeileHatInhalt(f, z));
        if (zeilen.length) els.push(this.neueTabelle(f.spalten.map((s) => s.label), zeilen.map((z) => f.spalten.map((s) => z[s.id])), wertRPr), this.absatz('', null, wertRPr));
        else els.push(this.absatz(feldAusgabe(this.g, this.buch, kap.id, f), null, wertRPr));
        if (f.fotosJeZeile) for (const z of zeilen) els.push(...await this.bildAbsaetze(`zeile:${z.id}`, null, wertRPr));
      } else {
        els.push(this.absatz(feldAusgabe(this.g, this.buch, kap.id, f), null, wertRPr));
      }
    }
    return els;
  }

  async op_kapitel(op) {
    const kap = this.g.kapitel.find((k) => k.id === op.kapitel);
    if (!kap) return false;
    if (kap.zuschaltbar && !(this.buch.zugeschaltet || []).includes(kap.id)) return true; // nicht zugeschaltet
    if (!G.istSichtbar(kap, this.buch, this.g)) return true;
    const vor = this.absatzMit(op.vor, this.body, true);
    const stil = this.absatzMit(op.stilWie, this.body, true);
    const lab = this.absatzMit(op.labelWie, this.body, true);
    if (!vor || !stil || !lab) return false;
    const nr = /\./.test(kap.nr.split(' ')[1] || '') ? kap.nr : `${kap.nr}.`;
    const titel = stil.cloneNode(true);
    const rPrT = this.rPrVorlage(stil);
    this.runsLeeren(titel);
    titel.appendChild(this.run(`${nr} ${kap.titel}`, rPrT));
    const inhalt = await this.kapitelInhalt(kap, kinder(lab, 'pPr')[0], this.rPrVorlage(lab), this.rPrVorlage(lab, true));
    const notiz = ((this.buch.notizen || {})[kap.id] || '').trim();
    if (notiz) inhalt.push(this.absatz(`Notiz: ${notiz}`, null, this.rPrVorlage(lab, true)));
    for (const x of [titel, ...inhalt]) vor.parentNode.insertBefore(x, vor);
    return true;
  }

  async op_protokollKopie(op) {
    const t = this.feld(op.feld);
    if (!t) return false;
    const w = G.wertVon(this.g, this.buch, t.kapitel.id, t.feld);
    if (!w || G.istLeer(t.feld, w)) return true; // keine Erstkontrolle
    const quelle = el(this.body, 'tbl').find((tb) => norm(absatzText(tb)).includes(norm(op.tabelleMit)));
    const nach = this.absatzMit(op.nach);
    const stil = this.absatzMit(op.titelWie, this.body, true);
    if (!quelle || !nach || !stil) return false;
    const pk = this.g.kapitel.find((k) => k.id === t.feld.protokoll);
    const p = pk.protokoll;
    const kopie = quelle.cloneNode(true);
    // Protokollart, Witterung, Art der Anlage ankreuzen
    this.listeAnkreuzen(kopie, [w.art, ...(w.witterung || []), ...(w.anlagenarten || [])].filter(Boolean), w.anlageSonst);
    const anhaengen = (beginn, text) => {
      if (!text) return;
      const pp = this.absatzMit(beginn, kopie);
      if (pp) pp.appendChild(this.run(` ${text}`, this.rPrVorlage(pp, true)));
    };
    if (w.artWeil) anhaengen('Außerplanmäßige Kontrolle, weil', w.artWeil);
    if (w.witterungSonst) anhaengen('Sonstige', w.witterungSonst);
    for (const f of pk.felder) {
      const v = G.wertVon(this.g, this.buch, pk.id, f);
      if (v) anhaengen(`${f.label}:`, String(v));
    }
    anhaengen('Name Protokollführer:', w.protokollfuehrer);
    anhaengen('Kontrolldatum:', datumDE(w.datum));
    anhaengen('Mängelbeseitigung veranlasst:', w.maengel);
    anhaengen('Wv. am:', datumDE(w.wv));
    // Prüfpunkte: Zeilen A–E; Spalte „ok“ zeilengenau, Schäden in „zu Nr.“ / „Art des Schadens“ / Behebung
    for (const gr of p.gruppen) {
      const tr = el(kopie, 'tr').find((x) => { const c = this.zellen(x)[0]; return c && norm(absatzText(kinder(c, 'p')[0] || c)) === gr.id; });
      if (!tr) continue;
      const zs = this.zellen(tr);
      const ok = ['', ...gr.punkte.map((pt) => (((w.punkte || {})[`${gr.id}.${pt.nr}`] || {}).ergebnis === 'ok' ? '✓' : ''))];
      const schaeden = gr.punkte.map((pt) => ({ pt, e: (w.punkte || {})[`${gr.id}.${pt.nr}`] || {} })).filter((x) => x.e.ergebnis === 'schaden');
      const rPr = this.rPrVorlage(zs[1], true);
      const pPr = kinder(kinder(zs[1], 'p')[1] || kinder(zs[1], 'p')[0], 'pPr')[0];
      if (zs[2]) this.zelleFuellen(zs[2], ok.map((x) => this.absatz(x, pPr, rPr)));
      if (zs[3]) this.zelleFuellen(zs[3], schaeden.map((x) => this.absatz(`${gr.id} ${x.pt.nr}`, pPr, rPr)));
      if (zs[4]) this.zelleFuellen(zs[4], schaeden.map((x) => this.absatz(x.e.schaden || 'Schaden', pPr, rPr)));
      const beh = (b) => schaeden.map((x) => this.absatz(x.e.behebung === b ? 'X' : '', pPr, rPr));
      if (zs[5] && p.behebung[0]) this.zelleFuellen(zs[5], beh(p.behebung[0]));
      if (zs[6] && p.behebung[1]) this.zelleFuellen(zs[6], beh(p.behebung[1]));
    }
    const titel = stil.cloneNode(true);
    this.runsLeeren(titel);
    titel.appendChild(this.run(`Erstkontrolle bei der Bestandsaufnahme${w.datum ? ` am ${datumDE(w.datum)}` : ''}`, this.rPrVorlage(stil)));
    let hinter = nach;
    for (const x of [titel, kopie]) { hinter.parentNode.insertBefore(x, hinter.nextSibling); hinter = x; }
    // Fotos zu Schäden
    const fotos = await this.bildAbsaetze(`protokoll:${op.feld}`, null, this.rPrVorlage(nach, true));
    for (const x of fotos) { hinter.parentNode.insertBefore(x, hinter.nextSibling); hinter = x; }
    return true;
  }

  op_notizen(op) {
    const reihe = this.g.kapitel.map((k) => k.id).filter((id) => op.kapitelUeberschriften[id]);
    reihe.forEach((id, i) => {
      const text = ((this.buch.notizen || {})[id] || '').trim();
      if (!text) return;
      const folgende = reihe.slice(i + 1).map((x) => this.absatzMit(op.kapitelUeberschriften[x], this.body, true)).find(Boolean);
      const ref = this.absatzMit(op.kapitelUeberschriften[id], this.body, true);
      const rPr = ref ? this.rPrVorlage(ref, true) : null;
      if (rPr) for (const s of ['sz', 'szCs', 'b', 'bCs', 'color']) for (const x of kinder(rPr, s)) rPr.removeChild(x);
      const p = this.absatz(`Notiz: ${text}`, null, rPr);
      if (folgende) folgende.parentNode.insertBefore(p, folgende); else this.body.insertBefore(p, kinder(this.body, 'sectPr')[0] || null);
    });
    return true;
  }

  // ----- Kursive Hinweise entfernen -----
  kursivEntfernen() {
    for (const p of el(this.body, 'p')) {
      const vorher = this.ganzKursiv(p);
      for (const r of kinder(p, 'r')) if (istKursiv(r)) p.removeChild(r);
      // Hyperlinks/Felder mit kursiven Runs
      for (const r of el(p, 'r')) if (istKursiv(r) && r.parentNode) r.parentNode.removeChild(r);
      if (vorher && !norm(absatzText(p)) && !el(p, 'drawing').length) {
        const tc = this.vorfahr(p, 'tc');
        if (tc && kinder(tc, 'p').length === 1) continue; // Zelle braucht mindestens einen Absatz
        p.parentNode.removeChild(p);
      }
    }
  }
}
