// Kleine Hilfsfunktionen für die Oberfläche.

// h('button', { class: 'gross', onclick: fn }, 'Text') erzeugt ein Element.
export function h(tag, attrs = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kind of kinder.flat(Infinity)) {
    if (kind === undefined || kind === null || kind === false) continue;
    el.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return el;
}

export function leere(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

let toastTimer = null;
export function meldung(text, art = 'info') {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.className = `toast sichtbar ${art}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, art === 'fehler' ? 6000 : 2500);
}

// Rückfrage mit großen Schaltflächen. Gibt true/false zurück.
export function bestaetigen(text, jaText = 'Ja', neinText = 'Abbrechen', gefaehrlich = false) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'dialog' },
      h('p', {}, text),
      h('div', { class: 'dialog-knoepfe' },
        h('button', { class: 'knopf', onclick: () => { dlg.close(); resolve(false); } }, neinText),
        h('button', { class: gefaehrlich ? 'knopf gefahr' : 'knopf primaer', onclick: () => { dlg.close(); resolve(true); } }, jaText),
      ),
    );
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
  });
}

export function datumDE(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

// Textfeld wächst mit dem Inhalt mit.
export function mitwachsen(textarea) {
  const anpassen = () => { textarea.style.height = 'auto'; textarea.style.height = `${textarea.scrollHeight + 2}px`; };
  textarea.addEventListener('input', anpassen);
  requestAnimationFrame(anpassen);
  return textarea;
}
