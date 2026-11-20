// Minimaler Test-Rahmen. Läuft im Browser (tests/run.html); später auch mit Node nutzbar.
const faelle = [];
export function test(name, fn) { faelle.push({ name, fn }); }
export function gleich(ist, soll, text = '') {
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  if (a !== b) throw new Error(`${text} erwartet ${b}, erhalten ${a}`);
}
export function wahr(wert, text = 'Bedingung nicht erfüllt') { if (!wert) throw new Error(text); }
export async function ausfuehren(melde) {
  let ok = 0, fehler = 0;
  for (const f of faelle) {
    try { await f.fn(); ok++; melde({ name: f.name, ok: true }); }
    catch (e) { fehler++; melde({ name: f.name, ok: false, fehler: e.message }); }
  }
  return { ok, fehler };
}
