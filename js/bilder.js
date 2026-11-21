// Bilder verkleinern und laden. Fotos werden beim Aufnehmen auf eine handliche Größe gebracht,
// damit der Speicher des Handys nicht vollläuft. Für die Ausgabe (Etappe 6) wird nochmals verkleinert.

export const FOTO_MAX_KANTE = 2000;   // Pixel der längeren Seite im Speicher
export const FOTO_QUALITAET = 0.85;
export const VORSCHAU_MAX_KANTE = 360;

// Zielgröße bei gleichem Seitenverhältnis; kleinere Bilder werden nicht vergrößert.
export function zielgroesse(breite, hoehe, maxKante) {
  const lang = Math.max(breite, hoehe);
  if (lang <= maxKante) return { breite, hoehe };
  const f = maxKante / lang;
  return { breite: Math.max(1, Math.round(breite * f)), hoehe: Math.max(1, Math.round(hoehe * f)) };
}

// Datei (Kamera/Galerie) → Bild mit richtiger Drehung (Chrome beachtet die EXIF-Ausrichtung).
export async function ladeBild(blob) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch { /* Fallback unten */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function canvasZuBlob(canvas, typ = 'image/jpeg', qualitaet = FOTO_QUALITAET) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht erzeugt werden.'))), typ, qualitaet);
  });
}

// Liefert { blob, vorschau, breite, hoehe }.
export async function verkleinere(datei, maxKante = FOTO_MAX_KANTE) {
  const bild = await ladeBild(datei);
  const bw = bild.width, bh = bild.height;
  const z = zielgroesse(bw, bh, maxKante);
  const c = document.createElement('canvas');
  c.width = z.breite; c.height = z.hoehe;
  c.getContext('2d').drawImage(bild, 0, 0, z.breite, z.hoehe);
  const blob = await canvasZuBlob(c);
  const v = zielgroesse(z.breite, z.hoehe, VORSCHAU_MAX_KANTE);
  const cv = document.createElement('canvas');
  cv.width = v.breite; cv.height = v.hoehe;
  cv.getContext('2d').drawImage(c, 0, 0, v.breite, v.hoehe);
  const vorschau = await canvasZuBlob(cv, 'image/jpeg', 0.8);
  if (bild.close) bild.close();
  return { blob, vorschau, breite: z.breite, hoehe: z.hoehe };
}

// Objekt-URLs für Vorschaubilder; werden beim Bildschirmwechsel freigegeben.
const urls = new Set();
export function bildUrl(blob) {
  const u = URL.createObjectURL(blob);
  urls.add(u);
  return u;
}
export function urlsFreigeben() {
  for (const u of urls) URL.revokeObjectURL(u);
  urls.clear();
}

export function groesseText(bytes) {
  if (bytes < 1e6) return `${Math.round(bytes / 1e3)} kB`;
  return `${(bytes / 1e6).toFixed(1).replace('.', ',')} MB`;
}
