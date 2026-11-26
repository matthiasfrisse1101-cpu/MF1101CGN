# Etappe 7 – Sicherung, Wiedereinlesen, Kurzanleitung (Bericht, 28.11.2026) – Abschluss

## Gebaut
- **Sicherung erstellen** (Kapitelübersicht → Abschnitt „Sicherung“, oder Einstellungen → „Alle … Beckenbücher sichern“):
  - Es entsteht eine ZIP-Datei, z. B. `Sicherung_5099_901_RRB_Am_Lindenfelder_Bach_2026-11-28.zip`. Sie enthält:
    - das Beckenbuch mit allen Werten, Status, Maßen samt Wortlaut und Herkunft, Notizen, offenem Sammeldiktat, Lageplan-Symbolen;
    - die verwendete Gliederung;
    - **alle Fotos** (Originalgröße wie gespeichert, mit Vorschau, Nummer, Unterschrift, Zeit, Standort) und **alle Skizzen** (Elemente, Hintergrund, fertige Grafik, Maßstab).
  - Die Word-Vorlage ist nicht enthalten; sie wird auf jedem Gerät einmal geladen.
  - Speichern über „Herunterladen“ oder „Teilen“ (z. B. an die eigene Mail oder einen Dienstordner). Danach gilt das Buch als gesichert, und der Hinweis „Weder gesichert noch versendet“ verschwindet. Im Abschnitt steht „Zuletzt gesichert: … – seitdem geändert“.
- **Sicherung einlesen** (Einstellungen → „📂 Sicherung einlesen …“):
  - **Neue Bücher** werden übernommen.
  - **Vorhandene Bücher** nur nach Rückfrage: ersetzen, als Kopie anlegen (neue IDs, Name „(Kopie)“) oder nicht einlesen.
  - Die App sagt dabei, ob die Sicherung neuer ist oder – mit Warnung – **das Buch auf dem Gerät neuer** ist als die Sicherung.
  - Fehlt die Gliederung auf dem Gerät, wird sie aus der Sicherung übernommen.
  - Falsche oder beschädigte Dateien werden mit verständlicher Meldung abgewiesen (keine ZIP-Datei, fehlende Fotos, neuere App-Version).
  - Erst werden die Bilder gespeichert, dann das Buch – so verweist ein Buch nie auf fehlende Bilder.
- **Weg zum Dienst-PC:** Sicherung am Handy erstellen → am PC die App im Browser öffnen → Vorlagenpaket laden → Sicherung einlesen → „Aus den Akten“ nachtragen → Word-Datei erstellen.
- **Kurzanleitung auf einer Seite:** `anleitung.html`, offline verfügbar, in den Einstellungen verlinkt, druckbar auf DIN A4. Sechs Abschnitte: Einrichten, Neues Beckenbuch, Vor Ort erfassen, Skizzen, Ausgabe/Versand, Sichern/PC.

## Wie getestet
- **135 automatische Tests, alle bestanden.** Neu:
  - Verweise auf Fotos und Skizzen werden vollständig gefunden (Felder, Tabellenzeilen, Protokoll).
  - **Hin und zurück ohne Verlust:** sichern → vom Gerät löschen → einlesen. Werte (mit Umlauten und Anführungszeichen), Notizen, Sammeldiktat, Fotozähler, **Fotos und Skizzen bitgenau**, Skizzenelemente, Maßstab und Lageplanlinien sind wieder da.
  - **Konflikte:** gleich, Sicherung neuer, Gerät neuer.
  - **Überspringen** lässt ein auf dem Gerät weiterbearbeitetes Buch unverändert. Eine **Kopie** bekommt neue IDs für Buch, Fotos und Zeilenfotos; das Original bleibt unberührt.
  - Abweisung falscher, unvollständiger und zu neuer Dateien.
- **In der Oberfläche** (Handygröße):
  - Sicherung des Beispielbuchs erstellt (286 kB).
  - Über die Einstellungen eingelesen: Rückfrage „schon im selben Stand vorhanden“ → „Als Kopie“ → Kopie mit allen Skizzen und dem Lageplan in der Liste. Danach wieder gelöscht.
- **Kurzanleitung** im Browser angesehen.
- **Nicht getestet** (geht nur am echten Gerät): Speichern bzw. Teilen der ZIP-Datei am Handy, Einlesen am Dienst-PC (Erreichbarkeit von github.io, Browser des Dienst-PCs), Verhalten nach Neuinstallation der App.

## Prüfliste für dein Handy (bzw. den Dienst-PC)
1. Beckenbuch → „💾 Sicherung erstellen“ → „Teilen“ an die eigene Mail: Kommt die ZIP-Datei an? Wie groß ist sie mit Fotos?
2. Danach: Ist der Hinweis „Weder gesichert noch versendet“ weg?
3. Am Dienst-PC die App öffnen (Adresse von GitHub Pages bzw. am Mac `http://localhost:8123`): Funktioniert sie dort?
4. Am PC: Vorlagenpaket laden, „Sicherung einlesen“: Ist alles da, auch Fotos und Skizzen?
5. Am PC: Word-Datei erstellen und in Word öffnen.
6. Dieselbe Sicherung noch einmal einlesen: Kommt die Rückfrage? „Nicht einlesen“ wählen.
7. Am Handy weiterarbeiten, dann eine **ältere** Sicherung einlesen: Kommt die Warnung „Gerät neuer“?
8. Kurzanleitung ausdrucken: Passt sie auf eine Seite? Fehlt etwas?
9. App-Symbol testweise löschen und neu installieren, dann die Sicherung einlesen – sind die Daten wieder da?
10. Wie oft willst du sichern? (Die App erinnert über den Hinweis in der Liste.)

## Nachtrag: Fotos und Mängel im Bericht verknüpft (Version 0.7.1)
Auf deinen Hinweis: Im Bericht war nicht zu erkennen, welches Foto zu welchem Mangel gehört.
- **Schadenszeile nennt ihre Fotos:** In der Erstkontrolle steht beim Schaden „… (Foto 3, 4)“, in PDF und Word.
- **Bildunterschrift nennt den Bezug:** „Foto 3 – zu B 1 Wasserstand (ausr. ü. UK Tauchwand): Ölfilm an der Tauchwand – eigene Unterschrift (Datum)“. Die Schadensfotos stehen in der Reihenfolge der Prüfpunkte unter „Fotos zu den Schäden“.
- **Fotos aus Tabellenzeilen** (B 1/B 4-Unterlagen, B 2-Typenschilder) nennen Abschnitt und Zeile, z. B. „zu B 2 Bauteile – Absperrschieber Zulauf“.
- **Fotoverzeichnis** im PDF mit neuer Spalte **„Bezug“** (Kapitel und Feld, Prüfpunkt oder Tabellenzeile).
- Damit der Bezug entsteht, das Foto **direkt beim Schaden** aufnehmen (Erstkontrolle → Prüfpunkt → „Schaden“ → 📷).
- Getestet: 136 automatische Tests (neu: Fotonummer am Schaden und Bezug unter dem Foto in PDF und Word mit der echten Vorlage) sowie ein Durchlauf mit echtem Foto am Prüfpunkt D 2 im Beispielbuch.

## Stand des Projekts nach Etappe 7
Alle Etappen des Auftrags v1.3 sind umgesetzt (0–7, dazu 4a sowie Objekt- und Winkelfang). Offen bleibt, was nur am echten Gerät oder bei dir zu klären ist:
- **Veröffentlichung:** GitHub Pages einschalten (Settings → Pages → main / root), Stände 4a–7 hochladen (GitHub Desktop → „Push origin“).
- **Prüflisten** der Etappen 2–7 am Handy durchgehen, vor allem Kamera, Diktat, Zeichnen, Kompass, Teilen, Installation, dauerhafter Speicher.
- **Angaben von dir:** Handymodell und Android-Version, Postfachgrenze, ob der Dienst-PC github.io erreicht.
- **Zu bestätigen:** Hauptmaße A 4.2, Zusätze in Klammern bei „Art des Bauwerks“, Vorschläge aus Etappe 0 (Wasserschutzzone, C 1-Intervalle), Fußzeile der Handskizzen.
- **Word:** Das Ergebnis in Word ansehen (`vorlagen_intern/ausgabe_beispiel/`); das statische Inhaltsverzeichnis der Vorlage nennt eingefügte Abschnitte nicht.
- [BELEG FEHLT]: Betreffübernahme der Mail-App, Offline-Diktat am Gerät, Löschverhalten von Android/Chrome für die Daten der installierten App.
