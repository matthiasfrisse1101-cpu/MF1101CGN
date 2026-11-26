// Etappe 7: Sicherung und Wiedereinlesen – nichts darf verloren gehen.
import { test, gleich, wahr } from './harness.js';
import * as db from '../js/db.js';
import { sicherungErstellen, sicherungLesen, sicherungEinlesen, vergleich, verweise, alsKopie } from '../js/sicherung.js';

const BUCH = 'bb-test-sicherung';
async function bild(farbe, typ = 'image/jpeg') {
  const c = document.createElement('canvas'); c.width = 30; c.height = 20;
  const x = c.getContext('2d'); x.fillStyle = farbe; x.fillRect(0, 0, 30, 20);
  return new Promise((r) => c.toBlob(r, typ, 0.9));
}
async function testdatenAnlegen() {
  const foto = { id: 'f-test-s1', buchId: BUCH, feldKey: 'T2.foto', nr: 1, blob: await bild('#c00'), vorschau: await bild('#c00'), unterschrift: 'Testfoto Sicherung', aufgenommen: '2026-11-28T08:00:00.000Z', quelle: 'kamera', standort: { lat: 1, lon: 2, genauigkeit: 5 } };
  const zeilenFoto = { ...foto, id: 'f-test-s2', nr: 2, blob: await bild('#0c0'), unterschrift: 'Unterlage' };
  const skizze = { id: 's-test-s1', buchId: BUCH, feldKey: 'T2.skizze', breite: 1600, hoehe: 1200, grundlage: { blob: await bild('#00c'), breite: 30, hoehe: 20 }, elemente: [{ typ: 'marke', nr: 1, x: 10, y: 20 }, { typ: 'strich', farbe: '#111', dicke: 8, punkte: [[0, 0], [100, 50]], linie: true }], angelegt: '2026-11-28', geaendert: '2026-11-28T09:00:00.000Z', bild: await bild('#fff', 'image/png'), bildStand: '2026-11-28T09:00:00.000Z', massstab: 250 };
  const buch = {
    id: BUCH, vorlage: { name: 'TESTVORLAGE – keine echte Dienststellen-Vorlage', version: 'test', testdaten: true }, stand: 'in_arbeit',
    teilbauwerke: ['testbecken'], freieTeilbauwerke: [], zugeschaltet: [], notizen: { T1: 'Testnotiz' }, sammeldiktate: { T1: 'Länge 3 m' },
    werte: {
      'DECK.name': { wert: 'Testbecken Sicherung' }, 'T1.pflichttext': { wert: 'Wert ä ö ü ß – „Test“' },
      'T1.laenge': { wert: '3 m', mass: { art: 'zahl', zahl: 3, einheit: 'm', fuer: '3 m' }, herkunft: 'gemessen' },
      'T2.foto': { wert: ['f-test-s1'] }, 'T2.skizze': { wert: ['s-test-s1'] },
      'T2.tabelle': { wert: [{ id: 'z-1', nr: '1', text: 'Zeile', fotos: ['f-test-s2'] }] },
      'T6.t_skizze': { wert: { massstab: 'auto', elemente: [{ typ: 'linie', punkte: [[0, 0], [1.2, 0]], laenge: true }], nord: { winkel: 20, quelle: 'hand' } } },
    },
    angelegt: '2026-11-28T07:00:00.000Z', geaendert: '2026-11-28T10:00:00.000Z', gesichert: null, versendet: null, fotoZaehler: 2,
  };
  for (const [s, o] of [['fotos', foto], ['fotos', zeilenFoto], ['skizzen', skizze], ['buecher', buch]]) db.speichere(s, o);
  await db.allesGespeichert();
  return { buch, foto, skizze };
}
async function aufraeumen(ids = [BUCH]) {
  for (const s of ['fotos', 'skizzen']) for (const r of await db.alle(s)) if (ids.includes(r.buchId)) await db.loesche(s, r.id);
  for (const id of ids) await db.loesche('buecher', id);
}
const bytes = async (b) => Array.from(new Uint8Array(await b.arrayBuffer()));

test('Sicherung: Verweise auf Fotos und Skizzen werden vollständig gefunden', async () => {
  const { buch } = await testdatenAnlegen();
  const v = verweise(buch);
  gleich(v.fotos.sort(), ['f-test-s1', 'f-test-s2']);
  gleich(v.skizzen, ['s-test-s1']);
  await aufraeumen();
});

test('Sicherung: hin und zurück – Werte, Fotos, Skizzen bitgenau erhalten', async () => {
  const { buch, foto, skizze } = await testdatenAnlegen();
  const blob = await sicherungErstellen([BUCH], { appVersion: 'test' });
  wahr(blob.size > 500, 'Sicherung zu klein');
  await aufraeumen(); // Gerät „leer“
  gleich(await db.lese('buecher', BUCH), undefined);
  const gelesen = await sicherungLesen(blob);
  const bericht = await sicherungEinlesen(gelesen, async () => 'ersetzen');
  gleich(bericht.eingelesen.length, 1);
  const b2 = await db.lese('buecher', BUCH);
  gleich(b2.werte, buch.werte, 'Werte');
  gleich([b2.notizen, b2.sammeldiktate, b2.teilbauwerke, b2.fotoZaehler], [buch.notizen, buch.sammeldiktate, buch.teilbauwerke, buch.fotoZaehler]);
  const f2 = await db.lese('fotos', 'f-test-s1');
  gleich(await bytes(f2.blob), await bytes(foto.blob), 'Foto');
  gleich([f2.unterschrift, f2.nr, f2.standort], [foto.unterschrift, foto.nr, foto.standort]);
  wahr(f2.vorschau && f2.vorschau.size > 0, 'Vorschau fehlt');
  wahr(await db.lese('fotos', 'f-test-s2'), 'Foto der Tabellenzeile fehlt');
  const s2 = await db.lese('skizzen', 's-test-s1');
  gleich(s2.elemente, skizze.elemente, 'Skizzenelemente');
  gleich(await bytes(s2.grundlage.blob), await bytes(skizze.grundlage.blob), 'Skizzen-Hintergrund');
  gleich(await bytes(s2.bild), await bytes(skizze.bild), 'Skizzenbild');
  gleich([s2.massstab, s2.bildStand], [250, skizze.bildStand]);
  await aufraeumen();
});

test('Sicherung: Konflikt erkennen (gleich, Sicherung neuer, Gerät neuer)', () => {
  const a = { geaendert: '2026-11-28T10:00:00Z' };
  gleich(vergleich(null, a), 'neu');
  gleich(vergleich(a, { geaendert: '2026-11-28T10:00:00Z' }), 'gleich');
  gleich(vergleich(a, { geaendert: '2026-11-28T11:00:00Z' }), 'sicherung_neuer');
  gleich(vergleich(a, { geaendert: '2026-11-28T09:00:00Z' }), 'geraet_neuer');
});

test('Sicherung: vorhandenes Buch – überspringen lässt es unverändert, Kopie bekommt neue IDs', async () => {
  await testdatenAnlegen();
  const blob = await sicherungErstellen([BUCH]);
  // auf dem Gerät weiterarbeiten
  const akt = await db.lese('buecher', BUCH); akt.werte['T1.pflichttext'].wert = 'auf dem Gerät geändert'; akt.geaendert = '2026-11-29T00:00:00.000Z';
  await db.speichere('buecher', akt); await db.allesGespeichert();
  let gefragt = null;
  await sicherungEinlesen(await sicherungLesen(blob), async (e, v) => { gefragt = v; return 'ueberspringen'; });
  gleich(gefragt, 'geraet_neuer');
  gleich((await db.lese('buecher', BUCH)).werte['T1.pflichttext'].wert, 'auf dem Gerät geändert');
  const bericht = await sicherungEinlesen(await sicherungLesen(blob), async () => 'kopie');
  const kopie = bericht.eingelesen[0];
  wahr(kopie.id !== BUCH, 'Kopie hat dieselbe ID');
  wahr(kopie.werte['DECK.name'].wert.endsWith('(Kopie)'), 'Kopie nicht benannt');
  const fid = kopie.werte['T2.foto'].wert[0];
  wahr(fid !== 'f-test-s1' && (await db.lese('fotos', fid)).buchId === kopie.id, 'Foto der Kopie falsch');
  const zid = kopie.werte['T2.tabelle'].wert[0].fotos[0];
  wahr(zid !== 'f-test-s2' && await db.lese('fotos', zid), 'Zeilenfoto der Kopie falsch');
  wahr((await db.lese('fotos', 'f-test-s1')).buchId === BUCH, 'Original-Foto verändert');
  await aufraeumen([BUCH, kopie.id]);
});

test('Sicherung: falsche oder beschädigte Dateien werden verständlich abgewiesen', async () => {
  const fehler = async (blob) => { try { await sicherungLesen(blob); return null; } catch (e) { return e.message; } };
  wahr((await fehler(new Blob(['kein zip']))).includes('keine ZIP-Datei'), 'kein ZIP');
  const zip = new window.JSZip(); zip.file('anderes.txt', 'x');
  wahr((await fehler(await zip.generateAsync({ type: 'blob' }))).includes('sicherung.json'), 'ohne sicherung.json');
  const z2 = new window.JSZip(); z2.file('sicherung.json', JSON.stringify({ format: 'beckenbuch-sicherung', version: 1, buecher: [{ buch: { id: 'x' }, fotos: [{ id: 'f-1', nr: 7, datei: 'fotos/f-1.jpg' }], skizzen: [] }] }));
  wahr((await fehler(await z2.generateAsync({ type: 'blob' }))).includes('Foto 7 fehlt'), 'fehlendes Foto');
  const z3 = new window.JSZip(); z3.file('sicherung.json', JSON.stringify({ format: 'beckenbuch-sicherung', version: 99, buecher: [] }));
  wahr((await fehler(await z3.generateAsync({ type: 'blob' }))).includes('neueren App-Version'), 'neueres Format');
});

test('Sicherung: Kopie-Funktion ersetzt alle Verweise', () => {
  const e = { buch: { id: 'b', werte: { 'K.f': { wert: ['f-a'] }, 'K.p': { wert: { punkte: { 'A.1': { fotos: ['f-b'] } } } } } }, fotos: [{ id: 'f-a', buchId: 'b' }, { id: 'f-b', buchId: 'b' }], skizzen: [] };
  const k = alsKopie(e);
  gleich(k.buch.werte['K.f'].wert[0], k.fotos[0].id);
  gleich(k.buch.werte['K.p'].wert.punkte['A.1'].fotos[0], k.fotos[1].id);
  gleich(e.fotos[0].id, 'f-a', 'Original verändert');
});
