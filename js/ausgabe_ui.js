// Ausgabe und Versand: PDF (Handy) und Word (aus der Original-Vorlage), Größe, Warnschwelle, Teilen.
// Eine Web-App kann keine Mail selbst senden: Die Datei geht über den Teilen-Dialog an die Mail-App.
import * as db from './db.js';
import { h, leere, meldung, bestaetigen } from './ui.js';
import { groesseText } from './bilder.js';
import { betreff, dateiname } from './ausgabe.js';
import { bildQuelle } from './bildquelle.js';
import { erzeugePdf } from './pdf.js';
import { erzeugeWord } from './word.js';

export const STANDARD_GRENZE_MB = 10; // Vorschlag, bis die Postfachgrenze bekannt ist

function mailText(buch) {
  return `Anbei das ${betreff(buch)}.\n\nErstellt mit der Beckenbuch-App (Skizzen nach örtlichem Aufmaß, keine Vermessung).`;
}

async function teilen(datei, buch) {
  const daten = { files: [datei], title: betreff(buch), text: mailText(buch) };
  if (navigator.canShare && navigator.canShare({ files: [datei] })) {
    await navigator.share(daten);
    return true;
  }
  return false;
}

function herunterladen(blob, name) {
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

// Abschnitt in der Kapitelübersicht.
// umgebung: { buch, g, vorlage (Datensatz aus „vorlagen“), einstellungen, aendern, neuZeichnen }
export function ausgabeAbschnitt({ buch, g, vorlage, einstellungen, aendern, neuZeichnen }) {
  const box = h('div', { class: 'abschnitt ausgabe' }, h('h2', {}, 'Ausgabe und Versand'));
  const ergebnis = h('div', {});
  const grenzeMB = Number(einstellungen.mailGrenzeMB) || STANDARD_GRENZE_MB;

  const zeigeDatei = (blob, name, typ, hinweise = []) => {
    leere(ergebnis);
    const datei = new File([blob], name, { type: typ });
    const zuGross = blob.size > grenzeMB * 1e6;
    const karte = h('div', { class: 'zeile-karte' },
      h('div', { class: 'feld-label dateiname' }, name),
      h('div', {}, `Größe: ${groesseText(blob.size)}`),
      zuGross ? h('div', { class: 'hinweis warnung' }, `Größer als ${String(grenzeMB).replace(".", ",")} MB (Grenze aus den Einstellungen). Die Mail könnte abgewiesen werden – Fotos weglassen oder auf mehrere Mails verteilen.`) : null,
      ...hinweise.map((t) => h('div', { class: 'hinweis warnung' }, t)),
      h('div', { class: 'knopfzeile' },
        h('button', {
          class: 'knopf primaer',
          onclick: async () => {
            try {
              const ok = await teilen(datei, buch);
              if (!ok) { herunterladen(blob, name); meldung('Teilen ist hier nicht möglich – Datei wurde heruntergeladen.'); return; }
              if (await bestaetigen('Wurde das Beckenbuch verschickt?', 'Ja, verschickt', 'Noch nicht')) {
                buch.versendet = new Date().toISOString();
                buch.stand = 'versendet';
                await aendern(buch);
                neuZeichnen();
              }
            } catch (e) {
              if (e && e.name === 'AbortError') return; // Teilen abgebrochen
              meldung(`Teilen fehlgeschlagen: ${e.message}`, 'fehler');
            }
          },
        }, '📤 Teilen (Mail)'),
        h('button', { class: 'knopf', onclick: () => herunterladen(blob, name) }, 'Herunterladen')),
      h('p', { class: 'feld-hinweis' }, `Betreff: ${betreff(buch)}`));
    ergebnis.append(karte);
  };

  const mitWarten = (knopf, text, fn) => async () => {
    const alt = knopf.textContent;
    knopf.disabled = true; knopf.textContent = text;
    try { await db.allesGespeichert(); await fn(); } catch (e) { console.error(e); meldung(`Fehler: ${e.message}`, 'fehler'); }
    knopf.disabled = false; knopf.textContent = alt;
  };

  const pdfKnopf = h('button', { class: 'knopf breit' }, '📄 PDF erstellen');
  pdfKnopf.onclick = mitWarten(pdfKnopf, 'PDF wird erstellt …', async () => {
    const quelle = bildQuelle(g, buch, { erfasser: einstellungen.erfasser });
    const { blob } = await erzeugePdf(g, buch, quelle, { erfasser: einstellungen.erfasser });
    zeigeDatei(blob, dateiname(buch, 'pdf'), 'application/pdf');
  });
  const wordKnopf = h('button', { class: 'knopf breit' }, '📝 Word-Datei erstellen');
  wordKnopf.onclick = mitWarten(wordKnopf, 'Word-Datei wird erstellt …', async () => {
    if (!vorlage || !vorlage.docx) { meldung('Die Word-Vorlage fehlt: Einstellungen → Vorlagenpaket laden (docx).', 'fehler'); return; }
    if (!Array.isArray(g.word) || !g.word.length) { meldung('Die Gliederung enthält keine Zuordnung für Word („word“).', 'fehler'); return; }
    const quelle = bildQuelle(g, buch, { erfasser: einstellungen.erfasser, fotoKante: 1600 });
    const { blob, bericht } = await erzeugeWord(vorlage.docx, g, buch, { bilder: quelle, erfasser: einstellungen.erfasser });
    const hinweise = bericht.nichtGefunden.length
      ? [`${bericht.nichtGefunden.length} Stelle(n) der Vorlage nicht gefunden: ${bericht.nichtGefunden.map((o) => o.zeile || o.zelleMit || o.absatzMit || o.nach || o.kopf || o.op).join('; ')}`]
      : [];
    zeigeDatei(blob, dateiname(buch, 'docx'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', hinweise);
  });
  box.append(
    h('p', { class: 'feld-hinweis' }, 'PDF zum Versenden und Ausdrucken. Word-Datei aus der Vorlage zum Fortschreiben (Vorlage muss im Vorlagenpaket geladen sein). Fotos werden für die Ausgabe verkleinert.'),
    pdfKnopf, wordKnopf, ergebnis,
  );
  if (!(vorlage && vorlage.docx)) box.append(h('p', { class: 'feld-hinweis' }, 'Word: Vorlage (docx) noch nicht geladen – unter Einstellungen → „Vorlagenpaket laden …“.'));
  return box;
}
