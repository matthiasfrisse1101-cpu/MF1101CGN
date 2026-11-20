# Beckenbuch – Bestandserfassung

Web-App fürs Handy (Android/Chrome), mit der bestehende Entwässerungsanlagen an Straßen vor Ort aufgenommen werden. Ergebnis ist ein Beckenbuch nach der Vorlage der Dienststelle. Läuft offline, speichert alles auf dem Gerät, ohne Konto und ohne fremde Dienste.

**Stand:** Etappe 2 (Grundgerüst). Fotos, Skizzen, Diktat-Auswertung, PDF, Word und Sicherung folgen.

## Ordner
| Ordner/Datei | Inhalt |
|---|---|
| `index.html`, `css/`, `js/` | die App selbst – ohne Übersetzungsschritt, der Browser liest die Dateien direkt |
| `js/gliederung.js` | Regeln: Sichtbarkeit, Status, Fortschritt, Mindestumfang |
| `js/db.js` | Speicher auf dem Gerät (IndexedDB), jede Eingabe wird sofort geschrieben |
| `js/app.js` | Bildschirme |
| `gliederung/test-gliederung.json` | **Test**-Gliederung mit erfundenen Feldern |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-Betrieb und Installation |
| `tests/` | automatische Tests (`tests/run.html` im Browser öffnen) |
| `vorlagen_intern/` | dienstliche Vorlagen und echte Gliederung – **nicht im Repository** |

## Lokal starten
```bash
python3 -m http.server 8123 --bind 127.0.0.1
```
Dann im Browser `http://localhost:8123/` öffnen; Tests unter `http://localhost:8123/tests/run.html`.

## Gliederungsdatei (Vorlage ändern ohne Programmierung)
Die Vorlage steckt in einer JSON-Datei: Kapitel → Felder. Jedes Feld hat `id`, `label`, `art` (`text`, `langtext`, `zahl`, `datum`, `auswahl`, `mehrfach`, `janein`, `foto`, `skizze`, `tabelle`) und optional `einheit`, `pflicht`, `ort` (`vor_ort`, `akten`, `stammdaten`), `stichwoerter`, `hinweis`, `sichtbarWenn: { "teilbauwerk": [...] }`, `vorschlag: true` (Vorschlag der App, nicht aus der Vorlage). Kapitel können `zuschaltbar` sein. Beim Laden prüft die App die Datei und meldet Fehler im Klartext. Ausführliches Beispiel: `gliederung/test-gliederung.json`.

## Neue Version veröffentlichen
`VERSION` in `js/version.js` **und** `sw.js` erhöhen (ein Test prüft das). Neue Dateien in die Liste in `sw.js` aufnehmen.
