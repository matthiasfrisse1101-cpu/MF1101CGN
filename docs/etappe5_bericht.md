# Etappe 5 – Lageplan- und Schnittskizzen aus Maßen (Bericht, 27.11.2026)

## Gebaut
- **Neues Feld in A 4.2: „Lageplan- und Schnittskizze aus den Maßen“** (*Vorschlag der App*). Es entsteht aus den Hauptmaßen darüber:
  - **Lageplanskizze (Grundriss):**
    - Böschungsoberkante (dick) und Sohle (dünn).
    - Maßketten: oben/links Oberkante, unten/rechts Sohle.
    - Böschungsneigung in der Mitte.
    - **Schnittlinien A–A und B–B**.
    - Meterraster.
  - **Querschnitt A–A und Längsschnitt B–B:** Oberkante, Sohle, Tiefe und Böschung. **Dauerstau** (blaue Wasserfläche) und **Schlammraum** (schraffiert) erscheinen nur, wenn sie erfasst sind.
- **Dein Hinweis zum Raster und Maßstab:**
  - **Maßstab automatisch passend zum Becken:** Gewählt wird aus 1:50, 1:100, 1:200, 1:250, 1:500, 1:1000 und 1:2000, und zwar der größte Maßstab, bei dem das Becken mit Maßketten aufs Blatt passt. Beispiel 42 × 18 m: Lageplan **1:250**, Querschnitt 1:100, Längsschnitt 1:250. Im Editor lässt er sich von Hand ändern.
  - **Das Raster zeigt runde Meter:** Ein Kästchen ist auf dem Handy etwa fingerbreit, bei 1:250 sind es **5 m**, bei 1:100 2 m, bei 1:500 10 m. Unter der Skizze steht „1 Kästchen = … m“.
  - **Im Raster skizzieren:**
    - Symbole richten sich beim Setzen und Verschieben am Raster aus, bei 1:250 auf 1 m genau; das lässt sich abschalten.
    - **Freie Skizzen** auf leerer Fläche haben jetzt eine Auswahl „Im Raster skizzieren: M 1:…“. Das Raster zeigt dann Meter, die fertige Skizze bekommt Raster und Maßstabsleiste, und die App zeigt, wie groß die Fläche bei diesem Maßstab ist (z. B. „etwa 69 × 52 m“ bei 1:250). So lässt sich ein sinnvoller Maßstab wählen.
    - Die Kennzeichnung lautet „Handskizze im Raster M 1:…, nicht maßstäblich verbindlich“.
- **Lageplan-Editor** (Knopf „Lageplan bearbeiten“):
  - Symbole Zulauf, Ablauf, Drossel, Notüberlauf, Schacht und Schieber (je mit eigener Bezeichnung), Tor, Zufahrt, Fließrichtung, Text und **Zaun** (Eckpunkte antippen).
  - Werkzeuge Verschieben, Drehen (45°), Löschen und Rückgängig.
  - Die Lage der Symbole wird **in Metern** gespeichert, ein Maßstabswechsel verschiebt also nichts.
  - **Nordpfeil:**
    - „aus Kompass“: Das Handy liegt flach, die Oberkante zeigt entlang der Längsseite. Der Pfeil wird als „(ca., Kompass)“ gekennzeichnet.
    - Sonst lässt er sich von Hand in 15°-Schritten drehen, gekennzeichnet als „(ca.)“.
- **Keine Erfindung:**
  - Gezeichnet wird nur, was in A 4.2 **bestätigt** ist. Ein Wert „zur Prüfung“ gilt als offen.
  - **Fehlende Maße:** offene Maßlinie mit „?“; der Umriss erscheint nur als graue Platzhalterlinie mit dem Hinweis „graue Linien: Maß fehlt“.
  - **Geschätzte Maße** (Herkunft „geschätzt“): gestrichelt und „ca.“.
  - **Berechnete Maße:** Lässt sich ein Maß eindeutig aus anderen erfassten Maßen ableiten (Sohle = Oberkante − 2 · n · Tiefe; Neigung aus Breiten und Tiefe), wird es strichpunktiert und mit „(berechnet)“ gezeichnet.
  - Es gibt keine angenommenen Regelwerte. Ohne Tiefe wird zum Beispiel nichts berechnet.
- **Kennzeichnung** jeder Skizze: Maßstabsleiste, „M 1:…“, Raster, Titel, Datum, Erfasser und der Vermerk „Skizze nach örtlichem Aufmaß, keine Vermessung, nicht maßstäblich verbindlich“.
- **Format:** Lageplan und Schnitte sind **SVG (Vektorgrafik)** und bleiben in Word und PDF scharf (Ausgabe in Etappe 6).
- **Grundlage der Funktionsskizze A 4.1:** Der Knopf „Als Grundlage für die Funktionsskizze (A 4.1) verwenden“ legt dort eine neue Skizze mit dem Lageplan als Hintergrund an. Man landet direkt im Zeichnen und setzt die Eingriffsstellen wie gewohnt; die Nummern laufen mit der Tabelle weiter.
- **Neue Maßfelder in A 4.2** (*Vorschlag der App*):
  - „Höhe des Dauerstaus über Sohle“: nur sichtbar, wenn in der Bauform Dauerstau angegeben ist.
  - „Höhe des Schlammraums über Sohle“: nur bei Absetzbecken.
  - Beide nutzen die Sichtbarkeit nach Antworten aus Etappe 4a.
- **Gliederung:** neue Feldart `massskizze` mit `masse` (Zuordnung der Hauptmaße) und `funktionsskizze`; die App prüft beides beim Laden. Echte Gliederung Version **2026-11-27** (bitte neu laden). Das Beispielbuch zeigt einen fertig bestückten Lageplan.

## Nachtrag: Zeichnen im Raster mit Objektfang (27.11.2026)
Auf deinen Hinweis „Raster zeichenbar, Objektfang im Rasterpunkt, 10-cm-Raster“:
- **Werkzeug „📏 Linie im Raster“** im Skizzen-Editor und im Lageplan-Editor: am Anfangspunkt aufsetzen, zum Endpunkt ziehen, loslassen.
  - **Objektfang:** Anfang und Ende rasten an **Rasterpunkten im Abstand von 10 cm in der Natur** ein. Liegt ein vorhandenes Linienende (im Lageplan auch eine Zaunecke) in der Nähe, rastet die Linie dort ein. So schließen Linien genau aneinander an.
  - Beim Ziehen markiert ein Quadrat den Fangpunkt (rot am Linienende, gelb am Rasterpunkt), daneben steht die **Länge in Metern**.
  - Auf Wunsch wird die **Länge an die Linie geschrieben** („12,30 m“).
- Das sichtbare Raster bleibt grob (z. B. 5 m bei 1:250), damit man etwas erkennt. Gefangen wird auf dem unsichtbaren 10-cm-Raster.
- Freie Skizze mit Maßstab: Das Linienwerkzeug ist voreingestellt. Ohne Maßstab rastet es auf 10 Pixel ein und zeigt keine Längen; der Hinweis empfiehlt dann, einen Maßstab zu wählen.
- Im Lageplan richten sich auch Symbole auf 10 cm aus (vorher 1 m). Den Objektfang kann man abschalten.
- **Getestet:**
  - 3 neue automatische Tests: Rasterpunkte 10 cm, Länge 4,30 m exakt, Linienende hat Vorrang, ohne Maßstab 10-px-Raster, Lageplanlinie mit Länge.
  - Im Browser: Lageplan-Linie von −20,00/12,00 bis −7,70/12,00 m, zweite Linie setzt genau am Ende an.
  - Freie Skizze 1:250: 12,30 m und 8,00 m, angeschlossen und beschriftet.
- **Prüfliste ergänzt:** 11. Gelingt das Zeichnen mit dem Finger trotz Fang, oder brauchst du zusätzlich einen Winkelfang (nur waagerecht/senkrecht)?

## Wie getestet
- **118 automatische Tests, alle bestanden** (inkl. Nachtrag). Neu, wie im Auftrag verlangt:
  - **erzeugte Abmessungen entsprechen den eingegebenen Maßen**, nämlich die Pixelkoordinaten von Oberkante (42 × 18 m), Sohle (34 × 10 m) und Böschung/Sohle im Querschnitt;
  - **fehlende Maße erscheinen offen** („?“, graue Linie, „Maß fehlt“), auch bei fehlender Tiefe im Schnitt und bei Werten „zur Prüfung“.
  - Außerdem:
    - Maßstabswahl und Rasterweite;
    - berechnete Maße mit Kennzeichnung, ohne Tiefe keine Berechnung;
    - geschätzt = gestrichelt und „ca.“;
    - Dauerstau und Schlammraum nur, wenn erfasst;
    - Kennzeichnung (Vermerk, Maßstab, Datum, Erfasser, Nordpfeil, Schnittlinien);
    - Symbole behalten beim Maßstabswechsel ihre Lage in Metern;
    - freie Skizze im Raster;
    - Gliederungsprüfung der neuen Feldart.
- **Im Browser in Handygröße** mit der echten Gliederung und dem Beispielbuch:
  - Lageplan, Querschnitt und Längsschnitt angesehen; Überlappungen von Beschriftungen gefunden und behoben.
  - Im Editor eine Drossel gesetzt: Sie landete genau bei 10 m / 0 m (Rasterfang).
  - Gedreht, auf 1:500 umgestellt, neu geladen: Drehung, Maßstab und Lage blieben erhalten.
  - „Als Grundlage für die Funktionsskizze“ → neue Skizze mit Lageplan-Hintergrund, Editor offen.
  - Freie Skizze: Maßstab 1:500 gewählt → 10-m-Raster und Flächenhinweis; danach zurückgestellt.
- **Offline:** Alle neuen Module stehen im Offline-Speicher (automatischer Test). Einen Neustart ohne Server habe ich diesmal nicht wiederholt.
- **Nicht getestet** (geht nur am echten Handy): **Kompass** (Nordpfeil aus Kompass), Antippen und Ziehen der Symbole mit dem Finger, Lesbarkeit draußen.

## Beim Testen gefunden und behoben
1. Die Skizze wurde in Originalgröße angezeigt und lief über den Bildschirm hinaus.
2. Das Raster war zu fein (bei 1:250 etwa 10 Pixel je Kästchen auf dem Handy) → Mindestgröße erhöht, jetzt 5 m bei 1:250.
3. Die Maßstabsleiste war zu lang.
4. Beschriftungen überlappten: „Tor“ mit der Maßkette, „Schlammraum“ mit dem Tiefenmaß.

## Prüfliste für dein Handy (bzw. den Mac)
1. Gliederung 2026-11-27 laden bzw. am Mac `http://localhost:8123/vorlagen_intern/beispiel.html` öffnen.
2. A 4.2 → Lageplan und Schnitte ansehen: Stimmen die Maßketten mit den Maßen überein?
3. Ein Hauptmaß löschen bzw. auf „geschätzt“ setzen: Erscheinen „?“ bzw. „ca.“ und gestrichelte Linien?
4. „Lageplan bearbeiten“: Zulauf, Schacht mit Bezeichnung und Zaun setzen, verschieben, drehen – geht das mit dem Finger?
5. „Nordpfeil aus Kompass“ draußen am Becken: Zeigt der Pfeil ungefähr richtig?
6. Ist der automatisch gewählte Maßstab sinnvoll? Ist „1 Kästchen = 5 m“ eine gute Rastergröße?
7. „Als Grundlage für die Funktionsskizze“ und Eingriffsstellen markieren: Ist der Lageplan als Hintergrund gut lesbar?
8. Freie Skizze → „Im Raster skizzieren: M 1:250“: Hilft das Meterraster beim Skizzieren?
9. Sind Querschnitt und Längsschnitt so, wie du sie im Beckenbuch haben möchtest? Fehlen Höhen (z. B. Zulauf-/Ablaufsohle, Notüberlauf)?
10. Sind die Symbole verständlich, fehlt eines?

## Offen
- Der Längsschnitt nutzt dieselbe Böschungsneigung wie der Querschnitt. Unterschiedliche Neigungen je Seite gibt es noch nicht.
- Höhen von Zulauf, Ablauf, Notüberlauf und Dammkrone sind noch nicht erfasst (Prüfpunkt 9).
- Der Lageplan zeigt ein rechteckiges Becken. Andere Formen lassen sich nur als freie Skizze im Raster zeichnen.
- GitHub: Stand 4a und 5 sind noch nicht hochgeladen (GitHub Desktop → „Push origin“), GitHub Pages ist aus.
- Weiterhin offen: Handymodell, Postfachgrenze, Node.js.
