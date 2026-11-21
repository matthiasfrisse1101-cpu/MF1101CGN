# Etappe 3 – Fotos und Skizzen (Bericht, 21.11.2026)

## Gebaut
- **Fotos in jedem Foto-Feld:** „📷 Foto aufnehmen“ öffnet die Kamera, „Aus Galerie“ erlaubt mehrere Bilder auf einmal. Jedes Foto bekommt eine **fortlaufende Nummer je Beckenbuch** (Foto 1, 2, …; gelöschte Nummern werden nicht neu vergeben), Zeit, Bildunterschrift (Tastatur oder Tastaturdiktat). Antippen zeigt das Foto groß mit Zeit, Herkunft, Standort, Größe und „Löschen“ (mit Rückfrage).
- **Standort (auf Wunsch):** Einstellungen → „Standort zu jedem Foto speichern“, Standard **aus**. Ist er an, wird der Standort mit Genauigkeit (± m) gespeichert. Das Foto ist schon vorher gespeichert und wartet nicht auf den Standort.
- **Fotos verkleinert:** Längere Seite höchstens 2000 Pixel, JPEG; dazu ein kleines Vorschaubild. Das Original der Kamera wird **nicht** gespeichert (spart Speicher, ein 12-MP-Foto braucht so etwa ein Zehntel). *Vorschlag der App* – sag Bescheid, falls du Originale brauchst.
- **Unterlagen aus der Akte als Anlage (B 1, B 4):** In den Tabellen „Vorhandene Genehmigungsunterlagen“ und „Folgende Pläne sind als Anlage enthalten“ hat jede Zeile eigene Fotos („Foto der Unterlage“). Ein Foto bestätigt auch eine Beispielzeile der Vorlage.
- **Skizzen in jedem Skizzen-Feld (A 2 Anfahrtsskizze, A 4.1 Funktionsskizze):**
  - (a) Handskizze oder Plan fotografieren bzw. aus der Galerie wählen,
  - (b) mit dem Finger zeichnen – auf leerer Fläche (mit Hilfsraster, das nicht mit ausgegeben wird) oder auf dem Foto,
  - Werkzeuge: Stift (schwarz/rot/blau, dünn/dick), Text (Beschriftung per Tastatur/Diktat), Verschieben, Löschen (Strich, Text oder Marke antippen), Rückgängig/Wiederholen.
- **(c) Eingriffsstellen:** Werkzeug „① Eingriffsstelle“ setzt eine rote, nummerierte Marke. Die App legt in der Tabelle **A 4.1 Eingriffsstellen** sofort eine Zeile mit dieser Nummer an; unter der Skizze kann man „Eingriffsstelle“ und „Wirkung“ direkt eintragen. Wird eine Marke gelöscht, verschwindet die Zeile nur, wenn sie leer ist. Nummern bleiben über mehrere Skizzen eindeutig. Passen Tabelle und Skizze nicht zusammen, steht ein Hinweis über der Tabelle („Nr. 5 ist in der Funktionsskizze nicht markiert“).
- **Kopie in A 8:** Die Funktionsskizze erscheint in A 8 automatisch als Kopie (nur Anzeige, geändert wird in A 4.1).
- **Fertige Grafik je Skizze** mit Fußzeile „Handskizze, nicht maßstäblich · Datum · Erfasser“ für Vorschau und die spätere Ausgabe. Die Fußzeile ist ein *Vorschlag der App*. Maßstabsleiste und Aufmaß-Vermerk gehören zu den Skizzen aus Maßen (Etappe 5).
- **Speichern:** Jedes Foto wird erst gespeichert, dann im Beckenbuch eingetragen. Jede Zeichenbewegung wird beim Loslassen gespeichert. Geht das Vorschaubild einer Skizze verloren (Absturz), erzeugt die App es beim nächsten Öffnen neu.
- **Löschen eines Beckenbuchs** löscht dessen Fotos und Skizzen mit.
- **(d) Lageplanskizze aus Maßen** als Grundlage der Funktionsskizze: Etappe 5.

## Änderungen an der Gliederungsdatei (Vorlagenpaket)
Neue, optionale Angaben – die App prüft sie beim Laden:
- `"marken": "A4_1.eingriffsstellen"` an der Funktionsskizze (Marken ↔ Tabelle mit Spalte `nr`),
- `"fotosJeZeile": true` an B 1 „Unterlagen“ und B 4 „Pläne“,
- neues Feld in A 8: „Funktionsskizze (Kopie aus A 4.1)“ mit `"aus": "A4_1.funktionsskizze"`.

Die echte Gliederung hat jetzt die Version **2026-11-21**. Auf dem Handy diese neue Datei laden. Beckenbücher, die mit der alten Version angelegt wurden, behalten ihre alte Gliederung.

## Wie getestet
- **51 automatische Tests, alle bestanden** (`tests/run.html`), neu u. a.: Markennummern (Lücken, mehrere Skizzen), Abgleich Skizze ↔ Tabelle, neue Marke legt leere Zeile an (ohne erfundenen Text), Löschen entfernt nur leere Zeilen, Trefferprüfung, Größen wachsen mit der Skizze, Marke wird an der richtigen Stelle gezeichnet, Fußzeile, Fotogröße (Seitenverhältnis, keine Vergrößerung), Foto (300 kB) wird vollständig gespeichert und gelesen, Gliederungsprüfung für `marken`/`fotosJeZeile`/Kopien, alle Module im Offline-Speicher.
- **Bedienung im Browser in Handygröße (375 × 812)** mit echter Gliederung und Testdaten („RRB Musterstraße“, 0000000): leere Skizze, Strich, dicke rote Linie, Text, zwei Marken, Verschieben, Löschen, Eingriffsstelle unter der Skizze ausgefüllt → steht in der A 4.1-Tabelle; Marke 2 gelöscht → leere Zeile weg; Kopie in A 8 sichtbar; Skizze auf Foto mit Marke (Nummer läuft weiter); zwei Testbilder (4000 × 3000, 3000 × 4000) über die Galerie-Auswahl → als 2000 × 1500 / 1500 × 2000 gespeichert; Bildunterschrift; Foto gelöscht; Plan-Foto in B 4-Zeile; Hinweis bei Nr. ohne Marke.
- **Kein Datenverlust:** Bildunterschrift getippt und sofort neu geladen → da. Strich gezeichnet und sofort neu geladen → da, Vorschaubild beim nächsten Öffnen neu erzeugt.
- **Offline:** Server gestoppt, App neu geladen → startet mit allen Skizzen.
- **Nicht getestet** (geht nur am echten Handy): Kamera, Zeichnen mit dem Finger, Standort, Tastaturdiktat für Bildunterschriften, Speicherplatz bei vielen Fotos. Die Kamera habe ich im Browser durch untergeschobene Testbilder ersetzt.

## Beim Testen gefunden und behoben
1. Marken, Text und Striche waren auf dem Handy zu klein (Markenradius ca. 7 Pixel) → Größen richten sich jetzt nach der Skizzengröße.
2. Striche lagen über den Marken → Marken werden immer obenauf gezeichnet.
3. Die Zeichenfläche blieb beim Scrollen oben stehen und hätte mit Tastatur die Eingabefelder verdeckt → scrollt jetzt normal mit.
4. In der Foto-Großansicht war „Löschen“ vorausgewählt → jetzt „Schließen“.

## Prüfliste für dein Handy
1. App öffnen, neues Testbuch anlegen, im Kapitel „Foto der Anlage“ **„📷 Foto aufnehmen“**: Öffnet sich die Kamera, erscheint das Foto als „Foto 1“?
2. **„Aus Galerie“** mit drei Bildern auf einmal: Kommen alle drei an, richtig gedreht (Hoch- und Querformat)?
3. Bildunterschrift per **Tastatur-Mikrofon** diktieren, App sofort wegwischen, neu öffnen: Unterschrift noch da?
4. Einstellungen → Standort an, Foto aufnehmen, Foto antippen: Steht ein Standort mit „± … m“ da? Wie groß ist die Genauigkeit draußen?
5. A 4.1 → „Neue Skizze“: Lässt sich mit dem Finger **flüssig** zeichnen, ohne dass die Seite mitscrollt?
6. Drei Eingriffsstellen setzen und unter der Skizze ausfüllen, „Fertig“: Stehen sie in der Tabelle A 4.1, ist die Skizze in A 8 zu sehen?
7. „Handskizze/Plan fotografieren“: Foto einer Papierskizze machen und darauf eine Marke setzen.
8. B 4 → Zeile „Übersichtslageplan“ → Foto eines Plans: Ist der Plan auf dem Foto lesbar (groß antippen)?
9. Ist die Zeichenfläche im Hochformat **groß genug**, oder brauchst du eine Vergrößerung bzw. ein Querformat?
10. Nach 20–30 Fotos: Einstellungen → „Belegt: … MB“ – wie viel ist es?

## Offen
- Veröffentlichung auf GitHub Pages (Repository noch leer; Upload per Token im Terminal steht aus).
- Zoomen in der Zeichenfläche und Querformat gibt es noch nicht – je nach Prüfpunkt 9.
- Aufnahmedatum (Kapitel „Foto der Anlage“) wird noch nicht aus dem Foto vorgeschlagen.
- [BELEG FEHLT] Wie Android den Standort ermittelt (nur GPS oder auch WLAN/Mobilfunk über Google-Dienste) hängt von der Einstellung „Standortgenauigkeit“ des Geräts ab. In der App steht dazu ein Hinweis; deshalb ist die Funktion standardmäßig aus.
- Weiterhin offen: Handymodell, Postfachgrenze, Node.js, Vorschläge aus Etappe 0.
