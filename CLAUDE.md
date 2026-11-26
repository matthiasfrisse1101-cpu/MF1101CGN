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
- Abgeleitete Gliederung (Entwurf): `vorlagen_intern/docs/etappe0_gliederung.md` (nur lokal, enthält Vorlagentexte).
- Konzept mit Quellen: `docs/etappe1_konzept.md`.
- Etappenberichte: `docs/etappe2_bericht.md`, `docs/etappe3_bericht.md`, `docs/etappe4_bericht.md`, `docs/etappe4a_bericht.md`, `docs/etappe5_bericht.md`.
- Echte Gliederung: `vorlagen_intern/gliederung_bestandsanlage.json` (nur lokal), Version 2026-11-27.
- Beispiel-Beckenbuch (erfundene, realistische Angaben): `vorlagen_intern/beispiel.html` + `beispiel_beckenbuch.js` (nur lokal), Aufruf `http://localhost:8123/vorlagen_intern/beispiel.html`.

## Technik (Kurz)
- Kein Build. `js/app.js` (Bildschirme), `js/gliederung.js` (reine Logik, testbar), `js/db.js` (IndexedDB, Warteschlange, durability strict), `js/zahlen.js`, `sw.js` (Cache; auf localhost network-first).
- Tests: `tests/run.html` im Browser (eigener Mini-Rahmen `tests/harness.js`), solange Node fehlt.
- Lokaler Server: `python3 -m http.server 8123 --bind 127.0.0.1` im App-Ordner (Desktop-Zugriff: aus der Bash starten, nicht über launch.json).
- Beispielzeilen aus `vorschlagZeilen` tragen `_vorschlag: true` und zählen erst nach Bestätigung.
- VERSION in `js/version.js` und `sw.js` gleich halten.
- Fotos: Store `fotos` (Blob max. 2000 px + Vorschau), Feldwert = Liste der Foto-IDs; Nummer über `buch.fotoZaehler`. Tabellen mit `fotosJeZeile` speichern IDs in `zeile.fotos`.
- Skizzen: Store `skizzen` mit `elemente` (strich/text/marke) in Skizzenpixeln, `grundlage` (Foto) und fertigem `bild`; Logik in `js/skizzenlogik.js` (testbar), Editor `js/skizzen.js`, Route `#/buch/ID/skizze/SID`.
- Maße: Zahlfeld-Eintrag `{ wert: Wortlaut, mass: {art, zahl, einheit, a, b, umgerechnetAus, fuer} | null, herkunft }`; `mass` nur wenn eindeutig/bestätigt (`fuer` = Wortlaut, zu dem es gehört). Logik `js/zahlen.js` (leseMass), `js/masse.js`; Oberfläche `js/diktat.js`.
- Sammeldiktat: `js/sammeldiktat.js` (werteAus, Stichwörter + Feldnamen, Satz→Tabellenzeile, Rest→Notiz); Text in `buch.sammeldiktate[kap]`, Notizen in `buch.notizen[kap]`.
- Erstkontrolle: Feldart `pruefprotokoll` (C2.erstkontrolle) → `kapitel.protokoll` von A5_2 (Prüfpunkte A1–E4 aus der Vorlage); `js/protokoll.js`.
- Service Worker: Installation mit `cache: 'reload'`; auf localhost `no-cache`. Beim Testen im Browser alte Module ggf. mit `fetch(url, {cache:'reload'})` auffrischen.
- Bedingungen (Etappe 4a): `G.bedingungErfuellt(bed, buch, g)` mit teilbauwerk/felder/alle/eines/nicht; `istSichtbar`/`sichtbareFelder` brauchen `g` für Feldbedingungen. Vorschläge: `G.vorschlagFuerFeld` (vorschlagRegeln → vorschlagBausteine → vorschlagAus), Anzeige generisch in `feldBlock`; Kapitel baut sich neu auf, wenn ein Feld aus `G.abhaengigkeitsfelder(g)` geändert wird. Protokoll: `anlagenartRegeln` → `G.anlagenartVorschlag`. Fachliche Regeln und Texte stehen nur in der Gliederungsdatei, nicht im Code.
- Skizzen aus Maßen (Etappe 5): Feldart `massskizze` (A4_2.lageplan) mit `masse` {laengeOben, breiteOben, laengeSohle, breiteSohle, boeschung, tiefe, dauerstau, schlammraum} → Feldkeys und `funktionsskizze`. Logik/SVG `js/massskizze.js` (Maßstab automatisch aus MASSSTAEBE, Raster = runde Meter mit min. 80 px, `ergaenze` berechnet nur eindeutig Ableitbares, fehlend = grau + „?“), Oberfläche/Editor `js/massskizze_ui.js`, Route `#/buch/ID/lageplan/KAP.FELD`. Feldwert `{ massstab: 'auto'|Zahl, elemente: [symbol{art,x,y,winkel,text}|zaun{punkte}] in Metern ab Beckenmitte, nord: {winkel, quelle}, schnitte }`. Freie Skizzen: `skizze.massstab` → Meterraster und Maßstabsleiste. Zeichnen im Raster: Werkzeug „Linie im Raster“ mit Objektfang (Rasterpunkte 10 cm in der Natur = `FANG_M`, Vorrang für Linienenden), `S.fangPunkt`/`S.laengeM`; im Lageplan Element `linie` (Meter) mit optionaler Länge. Winkelfang `M.winkelFang(a, b, {schritt 90|45|0, toleranz 10°, laengenSchritt})`, Endpunktfang geht vor.
- `marken` an einem Skizzenfeld verknüpft Marken mit einer Tabelle (Spalte `nr`); `aus` bei foto/skizze zeigt eine Kopie (A 8).

## Entscheidungen
| Datum | Entscheidung | Begründung |
|---|---|---|
| 20.11.2026 | Gerät Android; iOS nicht berücksichtigen | Dienstgeräte sind Android |
| 20.11.2026 | Fotomessung gestrichen; Lageplan-/Schnittskizzen aus vor Ort gemessenen und diktierten Maßen bleiben | Wunsch des Nutzers |
| 20.11.2026 | App-Code auf öffentlichem Webspace (z. B. GitHub Pages). **Vorlagenpaket** (Vorlage-docx + Gliederungsdatei mit Vorlagentexten) wird einmal auf dem Gerät in die App geladen und liegt nie im Repository | Vorlage ist dienstlich; öffentliches Hosting kostenlos. Im Repository nur eine Test-Gliederung mit erkennbaren Testdaten |
| 20.11.2026 | PDF entsteht auf dem Handy; Word-Datei am Rechner aus der Sicherungsdatei – mit derselben Web-App im Desktop-Browser, Vorlagenpaket dort ebenfalls geladen | Wunsch des Nutzers; eine Codebasis für beide Wege |
| 20.11.2026 | Anlagenart: Teilbauwerke auf dem Deckblatt sind führend; A 1 „Art des Bauwerks“ und A 5.2 „Art der Anlage“ werden als Vorschlag daraus abgeleitet und bestätigt | Wunsch des Nutzers |
| 20.11.2026 | Optionale Abschnitte A 3, A 4.2, B 2 nach Musterbeckenbuch zuschaltbar | Auftrag v1.3 |
| 21.11.2026 | Etappe 3: Fotos auf 2000 px verkleinert, Original nicht gespeichert (Vorschlag); Standort standardmäßig aus; Skizzen-Fußzeile „Handskizze, nicht maßstäblich“ (Vorschlag); Etappe 3 vor Veröffentlichung gebaut | Wunsch des Nutzers: erst Etappe 3, Upload später |
| 24.11.2026 | Etappe 4: Zahlfelder mit Texttastatur (Diktat); Hauptmaße des Beckens in A 4.2 als Vorschlag der App; Erstkontrolle unter C 2 mit unverändertem Protokoll A 5.2; Notizen je Kapitel | Auftrag Funktionen 4–6, Etappe 5 braucht Maße |
| 26.11.2026 | Etappe 4a: Bauform-Merkmale in A 1 (Vorschlag der App, `ausgabe: false`), Sichtbarkeit nach Antworten, Hilfe zu Teilbauwerken, Ableitungen für Art des Bauwerks, Ölrückhaltung und Art der Anlage (A 5.2) als Regeln in der Gliederung; nie automatisch eintragen; freie Teilbauwerke hinten an die Fließfolge | Ergänzungsauftrag 4a des Nutzers |
| 27.11.2026 | Etappe 5: Lageplan, Quer- und Längsschnitt als SVG aus den Hauptmaßen; Maßstab automatisch passend, Raster in runden Metern, Rasterfang; freie Skizzen optional im Raster mit Maßstab; Dauerstau-/Schlammraumhöhe als Vorschlag in A 4.2; Lageplan als Grundlage der Funktionsskizze | Auftrag Funktion 7, Hinweis des Nutzers: im Raster skizzieren, sinnvoller Maßstab |
| 20.11.2026 | Etappe 1 freigegeben: Web-App ohne Build-Schritt; Bibliotheken pdfmake (PDF), easy-template-x (Word), JSZip (Sicherung) lokal; Speicher IndexedDB mit dauerhaftem Speicher; keine Browser-Spracherkennung; Sicherung per Download statt Teilen; Hosting GitHub Pages; Tests mit Node (eingebauter Test-Runner) | s. docs/etappe1_konzept.md |

## Offene Punkte
- Handymodell, Android-Version, Browser.
- Größengrenze des Postfachs (Warnschwelle Dateigröße).
- Node.js ist auf dem Mac nicht installiert (kein Homebrew). Nutzer installiert LTS-Version per .pkg von nodejs.org.
- GitHub-Konto für GitHub Pages (legt der Nutzer an); Git-Autor auf noreply-Adresse stellen.
- Ob der Dienst-PC github.io erreicht (für Word am Rechner).
- [BELEG FEHLT]-Punkte aus dem Konzept: Daten nach Entfernen des App-Symbols, Betreff-Übernahme der Mail-App, IndexedDB-Dauerhaftigkeit, Offline-Diktat Deutsch am Gerät.
- Vorschläge aus `vorlagen_intern/docs/etappe0_gliederung.md` (nur lokal, enthält Vorlagentexte) (Unklarheiten 2–5) bestätigen lassen: C 1-Intervall aus Teilbauwerken vorschlagen, beliebig viele Eingriffsstellen, hydraulische Daten als vorgeschlagene Zeilen, Feld „Wasserschutzzone“ als Vorschlag.
- Beispiel eines fertig ausgefüllten Beckenbuchs (falls vorhanden).
- Hauptmaße A 4.2 (Vorschlag) bestätigen; Gboard-Schreibweise gesprochener Zahlen am Gerät prüfen.

## Stand
- Etappe 0 abgeschlossen (20.11.2026).
- Etappe 1 abgeschlossen und freigegeben (20.11.2026).
- Etappe 2 abgeschlossen (20.11.2026).
- Etappe 3 abgeschlossen (21.11.2026).
- Etappe 4 abgeschlossen (24.11.2026).
- Zwischenetappe 4a (Beckenarten und Bauformen) abgeschlossen (26.11.2026).
- Etappe 5 abgeschlossen (27.11.2026), wartet auf „weiter“. Nächster Schritt: Etappe 6 – Word, PDF und Versand (Felder mit `ausgabe: false` weglassen, SVG-Skizzen einbetten).
- Veröffentlichung: Stand Etappe 4 liegt im Repository (4a und 5 noch nicht gepusht) `matthiasfrisse1101-cpu/MF1101CGN` (hochgeladen mit GitHub Desktop durch den Nutzer). GitHub Pages noch nicht eingeschaltet (Settings → Pages → main / root). Getestet wird vorerst am Mac über `http://localhost:8123` (Server im Terminal-Tab).
