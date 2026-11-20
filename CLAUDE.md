# Beckenbuch-App – Projektgedächtnis

Vollständiger Auftrag: `vorlagen_intern/Prompt_Beckenbuch-App_v1.3.md` (nicht im Repository). Diese Datei fasst Rahmen, Entscheidungen und offene Punkte zusammen und wird nach jeder Etappe aktualisiert.

## Rahmen (Kurzfassung)
- Handy-App zur Vor-Ort-Erfassung bestehender Entwässerungsanlagen an Straßen (NRW), Ergebnis: Beckenbuch nach Vorlage „Beckenbuch Bestandsanlage – Mindestumfang gem. ARV Nr. 2 HA 4, Abschnitt II“.
- Nutzer: ein Bauingenieur (GSB, Abteilung Betrieb), kein Programmierer → einfache, gut kommentierte Lösung, wenige Abhängigkeiten, alles lokal eingebunden.
- Gerät: dienstliches Android-Smartphone, Web-Apps frei installierbar. Modell, Android-Version, Browser: **offen**.
- Offline, einhändig, große Schaltflächen, hoher Kontrast, Hochformat, Oberfläche Deutsch.
- Daten und Fotos bleiben auf dem Gerät. Keine Konten, kein Tracking, keine fremden Dienste ohne Zustimmung.
- Etappen 0–7, nach jeder Etappe anhalten und auf „weiter“ warten; jeder Etappenstand ein Commit.
- „Läuft“ heißt selbst ausgeführt und geprüft; Kamera, Diktat, Zeichnen, Teilen, Installation am echten Handy → Prüfliste des Nutzers.
- Keine erfundenen Pflichtangaben, Intervalle, Grenzwerte; Protokoll A 5.2 unverändert; eigene Vorschläge als Vorschlag kennzeichnen.

## Unterlagen
- `vorlagen_intern/` ist per `.gitignore` ausgeschlossen: Vorlage (docx), Musterbeckenbuch (doc), ARV Nr. 2, Auftrag.
- Abgeleitete Gliederung (Entwurf): `docs/etappe0_gliederung.md`.
- Konzept mit Quellen: `docs/etappe1_konzept.md`.
- Etappenberichte: `docs/etappe2_bericht.md`.
- Echte Gliederung: `vorlagen_intern/gliederung_bestandsanlage.json` (nur lokal).

## Technik (Kurz)
- Kein Build. `js/app.js` (Bildschirme), `js/gliederung.js` (reine Logik, testbar), `js/db.js` (IndexedDB, Warteschlange, durability strict), `js/zahlen.js`, `sw.js` (Cache; auf localhost network-first).
- Tests: `tests/run.html` im Browser (eigener Mini-Rahmen `tests/harness.js`), solange Node fehlt.
- Lokaler Server: `python3 -m http.server 8123 --bind 127.0.0.1` im App-Ordner (Desktop-Zugriff: aus der Bash starten, nicht über launch.json).
- Beispielzeilen aus `vorschlagZeilen` tragen `_vorschlag: true` und zählen erst nach Bestätigung.
- VERSION in `js/version.js` und `sw.js` gleich halten.

## Entscheidungen
| Datum | Entscheidung | Begründung |
|---|---|---|
| 20.11.2026 | Gerät Android; iOS nicht berücksichtigen | Dienstgeräte sind Android |
| 20.11.2026 | Fotomessung gestrichen; Lageplan-/Schnittskizzen aus vor Ort gemessenen und diktierten Maßen bleiben | Wunsch des Nutzers |
| 20.11.2026 | App-Code auf öffentlichem Webspace (z. B. GitHub Pages). **Vorlagenpaket** (Vorlage-docx + Gliederungsdatei mit Vorlagentexten) wird einmal auf dem Gerät in die App geladen und liegt nie im Repository | Vorlage ist dienstlich; öffentliches Hosting kostenlos. Im Repository nur eine Test-Gliederung mit erkennbaren Testdaten |
| 20.11.2026 | PDF entsteht auf dem Handy; Word-Datei am Rechner aus der Sicherungsdatei – mit derselben Web-App im Desktop-Browser, Vorlagenpaket dort ebenfalls geladen | Wunsch des Nutzers; eine Codebasis für beide Wege |
| 20.11.2026 | Anlagenart: Teilbauwerke auf dem Deckblatt sind führend; A 1 „Art des Bauwerks“ und A 5.2 „Art der Anlage“ werden als Vorschlag daraus abgeleitet und bestätigt | Wunsch des Nutzers |
| 20.11.2026 | Optionale Abschnitte A 3, A 4.2, B 2 nach Musterbeckenbuch zuschaltbar | Auftrag v1.3 |
| 20.11.2026 | Etappe 1 freigegeben: Web-App ohne Build-Schritt; Bibliotheken pdfmake (PDF), easy-template-x (Word), JSZip (Sicherung) lokal; Speicher IndexedDB mit dauerhaftem Speicher; keine Browser-Spracherkennung; Sicherung per Download statt Teilen; Hosting GitHub Pages; Tests mit Node (eingebauter Test-Runner) | s. docs/etappe1_konzept.md |

## Offene Punkte
- Handymodell, Android-Version, Browser.
- Größengrenze des Postfachs (Warnschwelle Dateigröße).
- Node.js ist auf dem Mac nicht installiert (kein Homebrew). Nutzer installiert LTS-Version per .pkg von nodejs.org.
- GitHub-Konto für GitHub Pages (legt der Nutzer an); Git-Autor auf noreply-Adresse stellen.
- Ob der Dienst-PC github.io erreicht (für Word am Rechner).
- [BELEG FEHLT]-Punkte aus dem Konzept: Daten nach Entfernen des App-Symbols, Betreff-Übernahme der Mail-App, IndexedDB-Dauerhaftigkeit, Offline-Diktat Deutsch am Gerät.
- Vorschläge aus `docs/etappe0_gliederung.md` (Unklarheiten 2–5) bestätigen lassen: C 1-Intervall aus Teilbauwerken vorschlagen, beliebig viele Eingriffsstellen, hydraulische Daten als vorgeschlagene Zeilen, Feld „Wasserschutzzone“ als Vorschlag.
- Beispiel eines fertig ausgefüllten Beckenbuchs (falls vorhanden).

## Stand
- Etappe 0 abgeschlossen (20.11.2026).
- Etappe 1 abgeschlossen und freigegeben (20.11.2026).
- Etappe 2 abgeschlossen (20.11.2026), wartet auf „weiter“. Nächster Schritt: Etappe 3 – Fotos und Skizzen.
