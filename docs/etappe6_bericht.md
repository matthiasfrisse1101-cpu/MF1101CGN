# Etappe 6 – Word, PDF und Versand (Bericht, 28.11.2026)

## Gebaut
- **Bibliotheken** (mit deiner Zustimmung heruntergeladen, lokal in `lib/`, MIT-Lizenz, laufen ohne Internet): pdfmake 0.2.10 mit Schrift Roboto (PDF) und JSZip 3.10.1 (Word-Datei lesen und schreiben). Sie werden erst beim Erstellen geladen, damit die App schnell startet.
- **Word aus der Original-Vorlage:**
  - Die App füllt deine `Beckenbuch_Bestandsanlage_Vorlage.docx` **unverändert als Vorlage** aus. Eine vorbereitete Platzhalter-Kopie gibt es nicht.
  - Die Zuordnung, welcher Wert wohin kommt, steht als Liste `word` in der Gliederungsdatei (57 Anweisungen). Jede Anweisung findet ihre Stelle über den Text der Vorlage, etwa „Straßen-Nr.:“, „Name GSB:“ oder die Tabelle mit „Nr. in der Skizze“.
  - **Ausgefüllt** werden:
    - Deckblatt (Name, Bauwerksnummer, **Kreuze bei den Teilbauwerken**, freie Teilbauwerke, Ort/Datum, Foto, Aufnahmedatum);
    - alle Zeilen von A 1, darunter „☒ ja“ bei der Ölrückhaltung, Genehmigung, Bemerkungen mit Wasserschutzzone;
    - Wegbeschreibung, Anfahrts- und Funktionsskizze, Eingriffsstellen-Tabelle;
    - **Protokollkopf A 5.2** (Meisterei, Name, Lage, Bauwerks-Nr., Art der Anlage aus der Erstkontrolle) – das Protokoll selbst bleibt unverändert;
    - A 8 mit Kopie der Funktionsskizze und Kontaktliste; A 9 mit Meldewegen, Telefonnummern und GSB;
    - B 1 und B 4 samt **Fotos der Unterlagen als Anlagen**; C 1 (die Kontrollübersicht der Vorlage bleibt, solange nichts eingetragen ist).
  - **Zugeschaltete Abschnitte** (A 3, A 4.2, B 2) werden in der Gestaltung der Vorlage an der richtigen Stelle eingefügt, A 4.2 mit **Lageplan und Schnitten als Vektorgrafik (SVG)** und PNG-Ersatz für ältere Word-Versionen.
  - **Erstkontrolle:** eine ausgefüllte Kopie des Protokolls unter C 2 („Erstkontrolle bei der Bestandsaufnahme am …“). Angekreuzt sind Protokollart, Witterung und Art der Anlage; „ok“ steht zeilengenau, Schäden mit Nr., Art und Behebung.
  - **Notizen** der Kapitel stehen als „Notiz: …“ am Ende des jeweiligen Kapitels.
  - **Leere Felder** zeigen „nicht erfasst“ bzw. ihren Status („aus den Akten nachzutragen“, „nicht vorhanden“, „offen“).
  - **Alle Kursivhinweise werden entfernt.** Die Hinweisseite am Anfang entfällt („Diese Seite dient nur der Erstellung und kann anschließend entfernt werden“).
  - Findet eine Anweisung ihre Stelle nicht (z. B. bei einer geänderten Vorlage), **meldet die App das**, statt es zu verschweigen.
- **PDF auf dem Handy:**
  - Deckblatt mit Teilbauwerken, Foto der Anlage, **Inhaltsverzeichnis mit Seitenzahlen**.
  - Kapitel in der Gliederung der Vorlage, Tabellen, Fotos mit Unterschrift, Skizzen, Maßskizzen als Vektorgrafik, Protokollvordruck in A 5.2, Erstkontrolle.
  - **Fotoverzeichnis**, **Liste der offenen Punkte** (Pflichtangaben, Status „offen“, Maße zur Prüfung) und **„Aus den Akten nachzutragen“**.
  - Kopfzeile mit Betreff, Fußzeile „Stand“ und „Seite x von y“.
- **Versand:**
  - Abschnitt **„Ausgabe und Versand“** in der Kapitelübersicht: PDF bzw. Word erstellen, **Dateigröße**, **Warnung oberhalb der Grenze** (Einstellungen → Versand; Vorschlag 10 MB, bis deine Postfachgrenze bekannt ist).
  - **„📤 Teilen (Mail)“** öffnet den Teilen-Dialog des Handys mit Betreff „Beckenbuch [Bauwerksnummer] [Name]“ und kurzem Text. Ohne Teilen-Funktion (z. B. am Mac) wird heruntergeladen.
  - Nach dem Teilen fragt die App „Wurde das Beckenbuch verschickt?“. Bei Ja steht das Buch auf „versendet“.
- **Fotos** werden für die Ausgabe verkleinert (PDF 1400 px, Word 1600 px, JPEG).
- **Vorlagenpaket:** Unter Einstellungen lädt „Vorlagenpaket laden …“ jetzt die **Gliederung (.json) und die Word-Vorlage (.docx)**, auch beide auf einmal. Die Word-Vorlage gilt auch für spätere Gliederungsversionen. Bücher mit älterer Gliederung nutzen die Word-Zuordnung der neuesten Version.
- **Echte Gliederung:** Version **2026-11-28** (Zuordnung `word`; „Frühere Prüfprotokolle“ als `ausgabe: false`, wie in deinem Hinweis zum Feld vorgesehen).

## Wie getestet
- **129 automatische Tests, alle bestanden.** Neu:
  - Werte, Status und „nicht erfasst“; Betreff und Dateiname;
  - Word an einer **künstlichen Testvorlage**: Hinweisseite entfernt, Werte eingetragen, kursives Beispiel ersetzt, Kästchen angekreuzt, Tabellenzeilen ergänzt, Bild mit Inhaltstyp eingefügt, Teilbauwerk angekreuzt, Zusatzkapitel mit Notiz, **keine kursiven Runs übrig**, **Normaltext unverändert**;
  - nicht gefundene Stellen werden gemeldet;
  - Gliederungsprüfung der Anweisungen;
  - PDF-Inhalt (Kapitel, Verzeichnisse, „nicht erfasst“, ohne Bauform-Felder, „Seite 2 von 5“) und eine echte PDF-Datei (beginnt mit „%PDF-“);
  - offene Punkte.
- **Mit der echten Vorlage** (nur lokal), genau wie im Auftrag gefordert:
  1. **Normaltext der Vorlage bleibt unverändert:** Jeder Normaltext-Absatz nach der Hinweisseite steht wieder im Ergebnis. Angekreuzte Kästchen zählen als unverändert.
  2. **Alle Felder befüllt oder „nicht erfasst“:** Alle 57 Stellen wurden gefunden, und jedes ausgegebene Feld der Gliederung hat eine Stelle in der Vorlage oder ein eingefügtes Kapitel.
  3. **Keine Kursivhinweise übrig:** null kursive Runs.
- **Beispielbuch durchgespielt** (am Mac, Handygröße):
  - Word in 0,24 s (720 kB), PDF in 0,37 s (344 kB). Den Word-Text habe ich vollständig gegengelesen, die 15 PDF-Seiten als Bilder angesehen.
  - Ausgabe-Abschnitt, Einstellungen (Vorlage, Grenze) und Größenwarnung (mit 0,1 MB getestet) geprüft.
- **Ablage der Beispielausgaben** (nur lokal, nicht im Repository): `vorlagen_intern/ausgabe_beispiel/` – bitte die Word-Datei in Word öffnen (Prüfpunkt 2).
- **Nicht getestet** (geht nur am echten Gerät bzw. in Word):
  - der **Teilen-Dialog an die Mail-App** und ob Gmail den Betreff übernimmt [BELEG FEHLT];
  - das Aussehen in **Microsoft Word**, insbesondere die SVG-Skizzen. Ich konnte die Datei nur als Text und Struktur prüfen, Word ist hier nicht installiert.
  - die Dauer auf dem Handy.

## Beim Testen gefunden und behoben
1. Eine Stelle in A 9 wurde nicht gefunden, weil der Absatz mit dem kursiven Wort „Zuständige Behörde“ beginnt.
2. In der Erstkontrolle wurde auch die gleichlautende **Überschrift** „Sicht- und Funktionskontrolle“ angekreuzt → jetzt nur Aufzählungspunkte.
3. Im Ausgabe-Abschnitt stand „null“, und der lange Dateiname lief über den Rand.
4. Das untere „A“ der Schnittlinie überlappte im Lageplan die Maßkette der Sohle.

## Prüfliste für dein Handy (bzw. Mac und Word)
1. Einstellungen → „Vorlagenpaket laden …“: Gliederung 2026-11-28 **und** `Beckenbuch_Bestandsanlage_Vorlage.docx` laden.
2. `vorlagen_intern/ausgabe_beispiel/…docx` in **Word** öffnen: Stimmen Layout, Kreuze, Tabellen, Skizzen? Sind die Maßskizzen scharf, wenn man hineinzoomt?
3. Dieselbe Word-Datei: Fehlt etwas aus der Vorlage, oder steht etwas an der falschen Stelle?
4. Am Handy ein Beckenbuch → „📄 PDF erstellen“ → „📤 Teilen (Mail)“: Öffnet sich die Mail-App mit Anhang? Ist der **Betreff** gesetzt?
5. Wie lange dauert das PDF am Handy mit 20–30 Fotos? Wie groß wird es?
6. „📝 Word-Datei erstellen“ am Handy – klappt das, oder lieber nur am Rechner?
7. Trag deine **Postfachgrenze** unter Einstellungen → Versand ein (oder nenn sie mir).
8. Ist das PDF für die Feuerwehr bzw. Meisterei so brauchbar (Kapitel A 8/A 9)?
9. Soll das PDF die Hinweise der Vorlage („Kursivtexte“) ebenfalls weglassen? Es zeigt derzeit nur die Festtexte.
10. Nach „Verschickt? Ja“: Steht das Buch in der Liste auf „versendet“?

## Offen
- Das statische Inhaltsverzeichnis der Word-Vorlage nennt die eingefügten Abschnitte A 3, A 4.2 und B 2 nicht. Ein automatisches Verzeichnis gibt es in der Vorlage nicht.
- Im Word-Protokoll steht „ok“ zeilengenau. Schadenstexte stehen untereinander und können bei langen Texten gegenüber den Prüfpunkten verrutschen.
- Für die Word-Ausgabe am Dienst-PC muss das Beckenbuch dorthin kommen → **Etappe 7 (Sicherung und Wiedereinlesen)**.
- GitHub: Stände 4a bis 6 sind noch nicht hochgeladen. Die Bibliotheken (`lib/`, ca. 2,3 MB) kommen mit hoch.
- Weiterhin offen: Handymodell, Postfachgrenze, Node.js.
