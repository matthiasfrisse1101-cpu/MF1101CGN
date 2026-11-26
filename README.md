# Beckenbuch – Bestandserfassung

Web-App fürs Handy (Android/Chrome), mit der bestehende Entwässerungsanlagen an Straßen vor Ort aufgenommen werden. Ergebnis ist ein Beckenbuch nach der Vorlage der Dienststelle. Läuft offline, speichert alles auf dem Gerät, ohne Konto und ohne fremde Dienste.

**Stand:** Etappe 4 (Fotos, Skizzen, Maße mit Diktat, Sammeldiktat, Erstkontrolle). Skizzen aus Maßen, PDF, Word und Sicherung folgen.

## Ordner
| Ordner/Datei | Inhalt |
|---|---|
| `index.html`, `css/`, `js/` | die App selbst – ohne Übersetzungsschritt, der Browser liest die Dateien direkt |
| `js/gliederung.js` | Regeln: Sichtbarkeit, Status, Fortschritt, Mindestumfang |
| `js/db.js` | Speicher auf dem Gerät (IndexedDB), jede Eingabe wird sofort geschrieben |
| `js/app.js` | Bildschirme |
| `js/fotos.js`, `js/bilder.js` | Fotos aufnehmen, verkleinern, anzeigen |
| `js/skizzen.js`, `js/skizzenlogik.js` | Zeichnen, Marken für Eingriffsstellen, Abgleich mit der Tabelle |
| `js/zahlen.js`, `js/masse.js`, `js/sammeldiktat.js`, `js/diktat.js` | Zahlen/Maße erkennen, Sammeldiktat zuordnen, Oberfläche dazu |
| `js/protokoll.js` | Erstkontrolle mit dem Protokoll A 5.2 |
| `gliederung/test-gliederung.json` | **Test**-Gliederung mit erfundenen Feldern |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline-Betrieb und Installation |
| `tests/` | automatische Tests (`tests/run.html` im Browser öffnen) |
| `vorlagen_intern/` | dienstliche Vorlagen und echte Gliederung – **nicht im Repository** |

## Desktop-Testversion (ohne Server)
`desktop/Beckenbuch-Desktop-Test.html` herunterladen und per Doppelklick in Chrome oder Edge öffnen. Enthält die ganze App mit der Test-Gliederung in einer Datei; Daten bleiben im Browser dieses Rechners. Neu erzeugen nach Änderungen: `python3 tools/desktop_bauen.py`.

## Lokal starten
```bash
python3 -m http.server 8123 --bind 127.0.0.1
```
Dann im Browser `http://localhost:8123/` öffnen; Tests unter `http://localhost:8123/tests/run.html`.

## Gliederungsdatei (Vorlage ändern ohne Programmierung)
Die Vorlage steckt in einer JSON-Datei: Kapitel → Felder. Jedes Feld hat `id`, `label`, `art` (`text`, `langtext`, `zahl`, `datum`, `auswahl`, `mehrfach`, `janein`, `foto`, `skizze`, `tabelle`) und optional `einheit`, `pflicht`, `ort` (`vor_ort`, `akten`, `stammdaten`), `stichwoerter`, `hinweis`, `sichtbarWenn: { "teilbauwerk": [...] }`, `vorschlag: true` (Vorschlag der App, nicht aus der Vorlage), `aus` (Kopie eines anderen Feldes), bei Skizzen `marken` (Tabelle der nummerierten Marken), bei Tabellen `fotosJeZeile`, `sammelSpalte` und `stichwoerter` je Spalte, bei Zahlfeldern `format` (`verhaeltnis`, `dn`), Feldart `pruefprotokoll` mit `protokoll` (Kapitel mit Prüfpunkten). Kapitel können `zuschaltbar` sein. Beim Laden prüft die App die Datei und meldet Fehler im Klartext. Ausführliches Beispiel: `gliederung/test-gliederung.json`.

## Neue Version veröffentlichen
`VERSION` in `js/version.js` **und** `sw.js` erhöhen (ein Test prüft das). Neue Dateien in die Liste in `sw.js` aufnehmen.
