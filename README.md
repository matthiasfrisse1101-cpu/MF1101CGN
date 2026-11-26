# Beckenbuch – Bestandserfassung

Web-App fürs Handy (Android/Chrome), mit der bestehende Entwässerungsanlagen an Straßen vor Ort aufgenommen werden. Ergebnis ist ein Beckenbuch nach der Vorlage der Dienststelle. Läuft offline, speichert alles auf dem Gerät, ohne Konto und ohne fremde Dienste.

**Stand:** Etappe 5 (Fotos, Skizzen, Maße mit Diktat, Sammeldiktat, Erstkontrolle, Bauform mit Vorschlägen, Lageplan- und Schnittskizzen aus Maßen). PDF, Word und Sicherung folgen. Skizzen aus Maßen, PDF, Word und Sicherung folgen.

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
| `js/massskizze.js`, `js/massskizze_ui.js` | Lageplan, Quer- und Längsschnitt aus den Maßen (SVG), Maßstab und Raster, Lageplan-Editor |
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
Die Vorlage steckt in einer JSON-Datei: Kapitel → Felder. Jedes Feld hat `id`, `label`, `art` (`text`, `langtext`, `zahl`, `datum`, `auswahl`, `mehrfach`, `janein`, `foto`, `skizze`, `tabelle`) und optional `einheit`, `pflicht`, `ort` (`vor_ort`, `akten`, `stammdaten`), `stichwoerter`, `hinweis`, `sichtbarWenn: { "teilbauwerk": [...] }`, `vorschlag: true` (Vorschlag der App, nicht aus der Vorlage), `aus` (Kopie eines anderen Feldes), bei Skizzen `marken` (Tabelle der nummerierten Marken), bei Tabellen `fotosJeZeile`, `sammelSpalte` und `stichwoerter` je Spalte, bei Zahlfeldern `format` (`verhaeltnis`, `dn`), Feldart `pruefprotokoll` mit `protokoll` (Kapitel mit Prüfpunkten). Kapitel können `zuschaltbar` sein. Beim Laden prüft die App die Datei und meldet Fehler im Klartext. Ausführliches Beispiel: `gliederung/test-gliederung.json`.

### Bedingungen, Vorschläge, Hilfe (seit Etappe 4a)
Eine **Bedingung** hat dieselbe Schreibweise in `sichtbarWenn`, in Vorschlagsregeln und in Protokollregeln. Alle Angaben gelten zusammen (UND):
```json
{ "teilbauwerk": ["absetzbecken"],
  "felder": [ { "feld": "A1.asb_dauerstau", "ist": ["ohne Dauerstau (läuft leer)"] } ],
  "alle": [ … ], "eines": [ … ], "nicht": { … } }
```
- `teilbauwerk`: mindestens eines angekreuzt. `felder`: jedes Feld hat einen der Werte (Mehrfachauswahl: einer gewählt; Ja/Nein: `true`/`false`). Ist das Bezugsfeld selbst ausgeblendet, gilt die Bedingung als nicht erfüllt.
- Ausgeblendete Felder zählen nicht zum Fortschritt; ihr Wert bleibt gespeichert.
- **Vorschläge** (nie automatisch eingetragen, immer „Übernehmen“):
  - `vorschlagRegeln: [ { "wenn": Bedingung, "wert": … } ]` – erste zutreffende Regel; trifft keine zu, gibt es keinen Vorschlag.
  - `vorschlagBausteine: [ { "teilbauwerk", "wenn", "text", "zusaetze": [ { "wenn", "text" } ] } ]` – zutreffende Bausteine in der Reihenfolge der Teilbauwerke, Zusätze in Klammern.
  - `vorschlagAus: "teilbauwerke"` mit `vorschlagTrenner` (z. B. `" → "`) und `vorschlagFreie: true` (freie Teilbauwerke anhängen).
- **Protokoll:** `protokoll.anlagenartRegeln: [ { "wenn", "vorschlag" | "sonstiges" | "hinweis" } ]` – alle zutreffenden Regeln.
- **Teilbauwerke:** `hilfe` (Text für „Woran erkenne ich das?“).
- **Felder:** `gruppe` (Zwischenüberschrift über zusammengehörigen Feldern), `ausgabe: false` (erscheint nicht im fertigen Beckenbuch, bleibt in der Sicherung).
- **Skizze aus Maßen:** Feldart `massskizze` mit `masse` (z. B. `"laengeOben": "A4_2.laenge_ok"`; erlaubt: laengeOben, breiteOben, laengeSohle, breiteSohle, boeschung, tiefe, dauerstau, schlammraum – jeweils Zahlfelder) und optional `funktionsskizze` (Skizzenfeld, für das der Lageplan Grundlage werden kann).
- Die Prüfung meldet unbekannte Felder, Werte außerhalb der Optionen, `true`/`false` bei Nicht-Ja/Nein-Feldern, Selbst- und Kreisbezüge.

## Neue Version veröffentlichen
`VERSION` in `js/version.js` **und** `sw.js` erhöhen (ein Test prüft das). Neue Dateien in die Liste in `sw.js` aufnehmen.
