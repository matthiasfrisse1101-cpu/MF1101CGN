// Fotos: aufnehmen oder aus der Galerie wählen, Bildunterschrift, fortlaufende Nummer, Zeit, Standort (auf Wunsch).
// Ein Foto ist ein Datensatz im Speicher „fotos“:
// { id, buchId, feldKey, nr, blob, vorschau, breite, hoehe, unterschrift, aufgenommen, quelle, standort }
// Das Feld im Beckenbuch enthält nur die Liste der Foto-IDs.
import * as db from './db.js';
import { h, leere, meldung, bestaetigen, datumDE } from './ui.js';
import { verkleinere, bildUrl, groesseText } from './bilder.js';

export function neueFotoId() {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Standort einmalig abfragen. Liefert { lat, lon, genauigkeit, zeit } oder null.
export function standortAbfragen(zeitlimitMs = 15000) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: Math.round(p.coords.latitude * 1e6) / 1e6,
        lon: Math.round(p.coords.longitude * 1e6) / 1e6,
        genauigkeit: Math.round(p.coords.accuracy),
        zeit: new Date(p.timestamp).toISOString(),
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: zeitlimitMs, maximumAge: 30000 },
    );
  });
}

export function standortText(s) {
  if (!s) return 'ohne Standort';
  return `${String(s.lat).replace('.', ',')} / ${String(s.lon).replace('.', ',')} (± ${s.genauigkeit} m)`;
}

// Nimmt Dateien entgegen, verkleinert, speichert. Liefert die neuen Foto-Datensätze.
// kontext: { buch, aendern(buch), standortAn }
export async function fotosAufnehmen(dateien, kontext, feldKey, quelle) {
  const neu = [];
  for (const datei of dateien) {
    if (!datei.type.startsWith('image/')) { meldung(`${datei.name}: kein Bild`, 'fehler'); continue; }
    const v = await verkleinere(datei);
    kontext.buch.fotoZaehler = (kontext.buch.fotoZaehler || 0) + 1;
    const foto = {
      id: neueFotoId(),
      buchId: kontext.buch.id,
      feldKey,
      nr: kontext.buch.fotoZaehler,
      blob: v.blob,
      vorschau: v.vorschau,
      breite: v.breite,
      hoehe: v.hoehe,
      unterschrift: '',
      // Kamera: jetzt. Galerie: Änderungsdatum der Datei (meist Aufnahmezeit).
      aufgenommen: new Date(quelle === 'galerie' && datei.lastModified ? datei.lastModified : Date.now()).toISOString(),
      quelle,
      standort: null,
    };
    // Erst das Foto dauerhaft speichern, dann im Beckenbuch eintragen.
    await db.speichere('fotos', foto);
    neu.push(foto);
  }
  if (neu.length && kontext.standortAn) {
    // Standort im Hintergrund ergänzen – das Foto ist schon gespeichert.
    standortAbfragen().then((s) => {
      for (const f of neu) { f.standort = s; db.speichere('fotos', f); }
      if (!s) meldung('Standort konnte nicht ermittelt werden.');
    });
  }
  return neu;
}

export async function ladeFotos(ids) {
  const r = [];
  for (const id of ids || []) {
    const f = await db.lese('fotos', id);
    if (f) r.push(f);
  }
  return r;
}

// Bedienelement für ein Fotofeld (oder die Fotos einer Tabellenzeile).
// ids: aktuelle Liste, setzeIds(neueListe): speichert im Beckenbuch.
export function fotoFeld({ kontext, feldKey, ids, setzeIds, nurAnzeigen = false }) {
  const box = h('div', { class: 'fotofeld' });
  const raster = h('div', { class: 'foto-raster' });
  let liste = [...(ids || [])];

  const zeichne = async () => {
    const fotos = await ladeFotos(liste);
    leere(raster);
    if (!fotos.length) raster.append(h('p', { class: 'leer' }, nurAnzeigen ? '(noch kein Foto)' : 'Noch kein Foto.'));
    for (const f of fotos) raster.append(fotoKarte(f, nurAnzeigen, async () => {
      liste = liste.filter((x) => x !== f.id);
      setzeIds(liste);
      await db.loesche('fotos', f.id);
      zeichne();
    }));
  };

  box.append(raster);
  if (!nurAnzeigen) {
    const verarbeite = async (ev, quelle) => {
      const dateien = [...ev.target.files];
      ev.target.value = '';
      if (!dateien.length) return;
      meldung(dateien.length > 1 ? `${dateien.length} Fotos werden gespeichert …` : 'Foto wird gespeichert …');
      try {
        const neu = await fotosAufnehmen(dateien, kontext, feldKey, quelle);
        liste = [...liste, ...neu.map((f) => f.id)];
        setzeIds(liste);
        await zeichne();
        if (neu.length) meldung(neu.length > 1 ? `${neu.length} Fotos gespeichert.` : `Foto ${neu[0].nr} gespeichert.`);
      } catch (e) {
        meldung(`Foto konnte nicht gespeichert werden: ${e.message}`, 'fehler');
      }
    };
    const kamera = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'versteckt', onchange: (ev) => verarbeite(ev, 'kamera') });
    const galerie = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'versteckt', onchange: (ev) => verarbeite(ev, 'galerie') });
    box.append(kamera, galerie, h('div', { class: 'knopfzeile' },
      h('button', { class: 'knopf primaer', onclick: () => kamera.click() }, '📷 Foto aufnehmen'),
      h('button', { class: 'knopf', onclick: () => galerie.click() }, 'Aus Galerie')));
  }
  zeichne();
  return box;
}

function fotoKarte(f, nurAnzeigen, loeschen) {
  const karte = h('figure', { class: 'foto-karte' });
  const img = h('img', { src: bildUrl(f.vorschau || f.blob), alt: f.unterschrift || `Foto ${f.nr}`, onclick: () => fotoGross(f, nurAnzeigen, loeschen) });
  karte.append(h('div', { class: 'foto-nr' }, `Foto ${f.nr}`), img);
  if (nurAnzeigen) {
    if (f.unterschrift) karte.append(h('figcaption', {}, f.unterschrift));
  } else {
    karte.append(h('input', {
      type: 'text', class: 'unterschrift', placeholder: 'Bildunterschrift', value: f.unterschrift || '', autocomplete: 'off',
      oninput: (ev) => { f.unterschrift = ev.target.value; db.speichere('fotos', f); },
    }));
  }
  return karte;
}

function fotoGross(f, nurAnzeigen, loeschen) {
  const dlg = h('dialog', { class: 'dialog foto-dialog' },
    h('img', { src: bildUrl(f.blob), alt: f.unterschrift || `Foto ${f.nr}` }),
    h('p', {}, h('strong', {}, `Foto ${f.nr}`), f.unterschrift ? ` – ${f.unterschrift}` : ''),
    h('p', { class: 'feld-hinweis' }, `${datumDE(f.aufgenommen)} · ${f.quelle === 'galerie' ? 'aus Galerie' : 'Kamera'} · ${standortText(f.standort)} · ${f.breite}×${f.hoehe} px, ${groesseText(f.blob.size)}`),
    h('div', { class: 'dialog-knoepfe' },
      nurAnzeigen ? null : h('button', {
        class: 'knopf gefahr',
        onclick: async () => {
          if (!(await bestaetigen(`Foto ${f.nr} löschen?`, 'Löschen', 'Abbrechen', true))) return;
          dlg.close();
          loeschen();
        },
      }, 'Löschen'),
      h('button', { class: 'knopf primaer', autofocus: true, onclick: () => dlg.close() }, 'Schließen')));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}
