import { test, gleich } from './harness.js';
import { vorschlagAnlagenarten, protokollStand } from '../js/protokoll.js';

const p = {
  anlagenarten: ['Regenrückhaltebecken (ohne Absetz- u. Abscheiderfunktion)', 'Absetzbecken', 'Absetzbecken mit Leichtflüssigkeitsrückhaltung', 'Sonstiges:'],
  gruppen: [{ id: 'A', titel: 'Test', punkte: [{ nr: '1', text: 'x' }, { nr: '2', text: 'y' }] }, { id: 'B', titel: 'Test', punkte: [{ nr: '1', text: 'z' }] }],
};
const g = { teilbauwerke: [{ id: 'rrb', label: 'Regenrückhaltebecken' }, { id: 'ab', label: 'Absetzbecken' }] };

test('Erstkontrolle: Art der Anlage aus dem Deckblatt – nur gleiche Bezeichnung', () => {
  gleich(vorschlagAnlagenarten(p, g, { teilbauwerke: ['rrb', 'ab'] }), ['Regenrückhaltebecken (ohne Absetz- u. Abscheiderfunktion)', 'Absetzbecken']);
  gleich(vorschlagAnlagenarten(p, g, { teilbauwerke: [] }), []);
});

test('Erstkontrolle: Stand ok / Schaden / offen', () => {
  gleich(protokollStand(p, { punkte: { 'A.1': { ergebnis: 'ok' }, 'B.1': { ergebnis: 'schaden' } } }), { ok: 1, schaden: 1, offen: 1 });
  gleich(protokollStand(p, null), { ok: 0, schaden: 0, offen: 3 });
});
