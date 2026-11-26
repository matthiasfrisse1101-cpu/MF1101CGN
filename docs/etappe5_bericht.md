# Etappe 5 – Lageplan- und Schnittskizzen aus Maßen

Stand: 26.11.2026 · Version 0.5.0

## Was neu ist
- **Neue Feldart `massskizze`**: Die App zeichnet aus den vor Ort gemessenen und bestätigten Hauptmaßen
  - einen **Lageplan** (Draufsicht): Böschungsoberkante außen, Sohle innen (blau), Böschungsschraffur, Maßketten, Tiefe und Neigung;
  - einen **Schnitt** quer oder längs: Trapez mit Gelände, Oberbreite, Sohlbreite, Tiefe und Neigung.
- **Nur bestätigte Maße zählen.** Ein Wortlaut, den die App nicht sicher erkannt hat, bleibt „?“.
- **Fehlende Maße** erscheinen rot als **„?“**. Unter „Maße für diese Skizze“ steht, was fehlt, mit Sprung zum Feld („eintragen“).
- **Errechnete Maße** sind mit **„≈“** gekennzeichnet. Grundlage ist reine Trapezgeometrie: *oben = Sohle + 2 · n · Tiefe*. So ergibt sich z. B. die Sohlbreite aus Oberbreite, Neigung und Tiefe. Gemessene Werte werden nie überschrieben.
- **Widersprüche** werden nur gemeldet, nicht bewertet: Sind alle vier Maße einer Seite gemessen und passen sie rechnerisch nicht zusammen, nennt die App beide Werte. Ab 1 cm Unterschied, das ist die Rundung der Anzeige; eine Toleranz ist nicht festgelegt.
- **Symbole per Tippen**: Zulauf, Ablauf, Notüberlauf (Pfeile), Schacht, Nordpfeil. Antippen wählt ein Symbol aus, dann *Drehen ↻ 45°* oder *Löschen*. ***Vorschlag der App***, nicht aus der Vorlage.
- **Prüfung**: Das Feld gilt als *erfasst*, wenn Sie „Skizze geprüft – so übernehmen“ tippen. Ändert sich danach ein Maß, erscheint „bitte erneut ansehen“.
- Die Skizze zeichnet sich **sofort neu**, wenn Sie im selben Kapitel ein Maß ändern.
- Fußzeile: „Skizze aus Maßen, nicht maßstäblich“. Das Seitenverhältnis folgt den Maßen, wird aber für die Lesbarkeit begrenzt; Schnitte werden nötigenfalls überhöht oder gestaucht und so beschriftet. ***Vorschlag der App.***
- Test-Gliederung: neues Kapitel **T 6 „Testkapitel Maße und Skizzen“** mit sechs Maßfeldern, Lageplan und Querschnitt.
- Desktop-Testversion neu erzeugt (`desktop/Beckenbuch-Desktop-Test.html`).

## Selbst geprüft
- 86 automatische Tests bestanden (10 neue für die Skizzen aus Maßen).
- Durchgeklickt am nachgebildeten Pixel 7 und in der Desktop-Testversion:
  1. Maße eingegeben: „40 m“, „20 m“, „1 zu 2“, „zwei Komma fünf Meter“ (bestätigt).
  2. Lageplan zeigt 40 m, 20 m, ≈ 30 m, ≈ 10 m, Tiefe 2,5 m, Böschung 1 : 2.
  3. Zulauf und Nordpfeil gesetzt und gedreht, Skizze als geprüft bestätigt, Status „erfasst“.
  4. Nach dem Neuladen sind Symbole und Prüfung noch da.
  5. Tiefe auf 3 m geändert: Die Sohle wird sofort neu errechnet (≈ 28 m / ≈ 8 m), und der Hinweis „erneut ansehen“ erscheint.
  6. Keine Fehlermeldungen.

## Für Ihre echte Gliederung (nur lokal)
Die echte Gliederung (`vorlagen_intern/gliederung_bestandsanlage.json`) liegt nur auf Ihrem Mac. Dort fehlen die beiden Skizzenfelder noch. Sie gehören in das Kapitel mit den Hauptmaßen (A 4.2). Die Feld-IDs unten sind **Platzhalter**: Ersetzen Sie sie durch die IDs Ihrer Hauptmaß-Felder. Sobald die echte Gliederung erreichbar ist, kann ich das übernehmen.

```json
{ "id": "lageplan_masse", "label": "Lageplanskizze aus Maßen", "art": "massskizze", "ansicht": "lageplan", "ort": "vor_ort", "vorschlag": true,
  "masse": { "laengeOben": "A4_2.LAENGE_OBEN", "breiteOben": "A4_2.BREITE_OBEN", "laengeSohle": "A4_2.LAENGE_SOHLE",
             "breiteSohle": "A4_2.BREITE_SOHLE", "neigung": "A4_2.NEIGUNG", "tiefe": "A4_2.TIEFE" } },
{ "id": "querschnitt_masse", "label": "Querschnitt aus Maßen", "art": "massskizze", "ansicht": "schnitt", "richtung": "quer", "ort": "vor_ort", "vorschlag": true,
  "masse": { "breiteOben": "A4_2.BREITE_OBEN", "breiteSohle": "A4_2.BREITE_SOHLE", "neigung": "A4_2.NEIGUNG", "tiefe": "A4_2.TIEFE" } }
```
Beim Laden prüft die App die Zuordnung und meldet Tippfehler im Klartext.

## Prüfliste für Ihr Handy
1. In T 6 Maße diktieren: Erscheinen sie in Lageplan und Schnitt?
2. Sind die Zeichnungen und Beschriftungen am Handy gut lesbar?
3. Symbol setzen: Trifft der Finger die gewünschte Stelle? Lassen sich Symbole drehen und löschen?
4. Fehlen Ihnen Symbole, zum Beispiel Drosselbauwerk, Tauchwand, Zufahrt oder Rampe?
5. Reichen Lageplan und Querschnitt, oder brauchen Sie auch einen Längsschnitt (`"richtung": "laengs"`, schon möglich)?

## Offen
- **Hauptmaße A 4.2 bestätigen** (Vorschlag aus Etappe 4). Davon hängen die Skizzen ab. Typische Ergänzungen wären Zu- und Ablaufhöhen, Dammbreite oder Freibord. Diese würde ich erst nach Ihrer Bestätigung zeichnen.
- Die Symbolliste ist ein Vorschlag der App. Bitte bestätigen oder ergänzen.
- Ein Symbol lässt sich bisher nicht verschieben, nur löschen und neu setzen. Vorschlag: Verschieben ergänze ich, falls Sie es am Gerät brauchen.
- Skizzen als Bild in PDF und Word: Etappe 6.
