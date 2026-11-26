// Oberfläche für Sicherung und Wiedereinlesen.
import * as db from './db.js';
import { h, leere, meldung, datumDE } from './ui.js';
import { groesseText } from './bilder.js';
import * as G from './gliederung.js';
import { sicherungErstellen, sicherungLesen, sicherungEinlesen } from './sicherung.js';
import { VERSION } from './version.js';

function dateiname(buecher) {
  const d = new Date().toISOString().slice(0, 10);
  if (buecher.length === 1) {
    const b = buecher[0];
    return `Sicherung_${[G.buchBauwerksnr(b), G.buchName(b)].filter(Boolean).join('_')}_${d}.zip`.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_');
  }
  return `Sicherung_Beckenbuecher_${d}.zip`;
}

function herunterladen(blob, name) {
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

// Auswahl mit mehreren großen Knöpfen. optionen: [[wert, text, art?]] → Promise<wert>
export function waehlen(text, optionen) {
  return new Promise((resolve) => {
    let fertig = false;
    const dlg = h('dialog', { class: 'dialog' }, h('p', {}, text),
      h('div', { class: 'dialog-spalte' }, optionen.map(([wert, t, art]) => h('button', {
        class: `knopf breit ${art || ''}`, onclick: () => { fertig = true; dlg.close(); resolve(wert); },
      }, t))));
    dlg.addEventListener('close', () => { dlg.remove(); if (!fertig) resolve(optionen[optionen.length - 1][0]); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

// Bereich „Sicherung“ für ein oder mehrere Beckenbücher.
// buecher: Liste der Bücher; aendern(buch) speichert; nachher(): nach dem Sichern neu zeichnen
export function sicherungAbschnitt({ buecher, aendern, titel = 'Sicherung', nachher = () => {} }) {
  const box = h('div', { class: 'abschnitt sicherung' }, h('h2', {}, titel));
  const ergebnis = h('div', {});
  if (buecher.length === 1) {
    const b = buecher[0];
    box.append(h('p', { class: G.brauchtSicherung(b) ? 'hinweis warnung' : 'feld-hinweis' },
      b.gesichert ? `Zuletzt gesichert: ${datumDE(b.gesichert)}${G.brauchtSicherung(b) ? ' – seitdem geändert.' : '.'}` : 'Noch nie gesichert.'));
  }
  box.append(h('p', { class: 'feld-hinweis' }, 'Die Sicherungsdatei enthält das Beckenbuch mit allen Fotos und Skizzen. Damit lässt es sich auf einem anderen Gerät (z. B. am Dienst-PC für die Word-Datei) wieder einlesen. Die Datei bitte außerhalb des Handys ablegen.'));
  const knopf = h('button', { class: 'knopf breit primaer' }, buecher.length === 1 ? '💾 Sicherung erstellen' : `💾 Alle ${buecher.length} Beckenbücher sichern`);
  knopf.onclick = async () => {
    if (!buecher.length) { meldung('Keine Beckenbücher vorhanden.'); return; }
    knopf.disabled = true; const alt = knopf.textContent; knopf.textContent = 'Sicherung wird erstellt …';
    try {
      await db.allesGespeichert();
      const blob = await sicherungErstellen(buecher.map((b) => b.id), { appVersion: VERSION });
      const name = dateiname(buecher);
      const datei = new File([blob], name, { type: 'application/zip' });
      const merken = async () => {
        const jetzt = new Date().toISOString();
        for (const b of buecher) { const akt = await db.lese('buecher', b.id); if (akt) { akt.gesichert = jetzt; await db.speichere('buecher', akt); b.gesichert = jetzt; } }
        await db.allesGespeichert();
      };
      leere(ergebnis);
      ergebnis.append(h('div', { class: 'zeile-karte' },
        h('div', { class: 'feld-label dateiname' }, name),
        h('div', {}, `Größe: ${groesseText(blob.size)}`),
        h('div', { class: 'knopfzeile' },
          h('button', { class: 'knopf primaer', onclick: async () => { herunterladen(blob, name); await merken(); meldung('Sicherung heruntergeladen.'); nachher(); } }, 'Herunterladen'),
          navigator.canShare && navigator.canShare({ files: [datei] })
            ? h('button', { class: 'knopf', onclick: async () => { try { await navigator.share({ files: [datei], title: name }); await merken(); nachher(); } catch (e) { if (e.name !== 'AbortError') meldung(`Teilen fehlgeschlagen: ${e.message}`, 'fehler'); } } }, 'Teilen')
            : null)));
    } catch (e) {
      console.error(e); meldung(`Sicherung fehlgeschlagen: ${e.message}`, 'fehler');
    }
    knopf.disabled = false; knopf.textContent = alt;
  };
  box.append(knopf, ergebnis);
  return box;
}

// Knopf „Sicherung einlesen …“
export function einlesenKnopf({ fertig = () => {} } = {}) {
  const inp = h('input', {
    type: 'file', accept: '.zip,application/zip', class: 'versteckt',
    onchange: async (ev) => {
      const datei = ev.target.files[0];
      ev.target.value = '';
      if (!datei) return;
      try {
        const gelesen = await sicherungLesen(datei);
        const anzahl = gelesen.inhalt.buecher.length;
        const bericht = await sicherungEinlesen(gelesen, (eintrag, v) => {
          const name = G.buchName(eintrag.buch);
          const text = {
            gleich: `„${name}“ ist auf diesem Gerät schon im selben Stand vorhanden.`,
            sicherung_neuer: `„${name}“ ist schon vorhanden. Die Sicherung ist NEUER (Stand ${datumDE(eintrag.buch.geaendert)}).`,
            geraet_neuer: `„${name}“ ist schon vorhanden. Achtung: Das Beckenbuch auf diesem Gerät ist NEUER als die Sicherung (Sicherung: ${datumDE(eintrag.buch.geaendert)}).`,
          }[v];
          return waehlen(text, [
            ['ersetzen', v === 'geraet_neuer' ? 'Trotzdem durch die Sicherung ersetzen' : 'Durch die Sicherung ersetzen', v === 'geraet_neuer' ? 'gefahr' : 'primaer'],
            ['kopie', 'Als Kopie zusätzlich anlegen'],
            ['ueberspringen', 'Nicht einlesen'],
          ]);
        });
        const teile = [`${bericht.eingelesen.length} von ${anzahl} Beckenbuch/-büchern eingelesen`];
        if (bericht.uebersprungen.length) teile.push(`${bericht.uebersprungen.length} übersprungen`);
        if (bericht.vorlagen.length) teile.push('Gliederung aus der Sicherung übernommen (Word-Vorlage bei Bedarf unter Einstellungen laden)');
        meldung(`${teile.join(' · ')}.`);
        fertig(bericht);
      } catch (e) {
        meldung(e.message, 'fehler');
      }
    },
  });
  return h('div', {}, inp, h('button', { class: 'knopf breit', onclick: () => inp.click() }, '📂 Sicherung einlesen …'));
}
