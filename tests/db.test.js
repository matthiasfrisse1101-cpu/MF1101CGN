import { test, gleich } from './harness.js';
import * as db from '../js/db.js';

test('Speichern: schnelle Folge von Änderungen – letzter Stand bleibt', async () => {
  const obj = { id: 'test-schnell', zaehler: 0 };
  for (let i = 1; i <= 50; i++) { obj.zaehler = i; db.speichere('buecher', obj); }
  await db.allesGespeichert();
  const gelesen = await db.lese('buecher', 'test-schnell');
  gleich(gelesen.zaehler, 50);
  await db.loesche('buecher', 'test-schnell');
});

test('Speichern: spätere Änderung am Objekt verfälscht gespeicherten Stand nicht', async () => {
  const obj = { id: 'test-kopie', wert: 'a' };
  db.speichere('buecher', obj);
  await db.allesGespeichert();
  obj.wert = 'b'; // nicht gespeichert
  gleich((await db.lese('buecher', 'test-kopie')).wert, 'a');
  await db.loesche('buecher', 'test-kopie');
});
