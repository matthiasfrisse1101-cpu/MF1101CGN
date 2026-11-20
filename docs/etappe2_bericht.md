# Etappe 2 – Grundgerüst (Bericht, 20.11.2026)

## Gebaut
- **Beckenliste**: Becken mit Stand, Bauwerksnummer, letzter Änderung, Hinweis „Weder gesichert noch versendet“, Hinweis bei Testvorlage.
- **Neues Beckenbuch**: Name, Bauwerksnummer, Teilbauwerke ankreuzen (+ 2 freie Zeilen). Stammdaten werden als Kopie übernommen.
- **Kapitelübersicht**: Stand (in Arbeit / vor Ort fertig / vollständig), Mindestumfang ARV Nr. 2 mit ✓/✗, Fortschritt je Kapitel („geklärt / offen / aus Akten / Pflicht leer“), zuschaltbare Abschnitte A 3, A 4.2, B 2, Liste „Aus den Akten“, Löschen mit Rückfrage.
- **Erfassen**: alle Feldarten außer Foto/Skizze (Platzhalter bis Etappe 3); je Feld Status *erfasst / nicht vorhanden / nicht zugänglich / offen / aus Akten / noch leer*; Hinweise der Vorlage aufklappbar; Normaltext der Vorlage grau; Vorschlag „Art des Bauwerks“ aus den Teilbauwerken zum Übernehmen; Felder aus dem Deckblatt (Name, Bauwerks-Nr.) werden im Protokollkopf A 5.2 automatisch angezeigt.
- **Beispielzeilen der Vorlage** (z. B. „Planfeststellungsbeschluss (Auszug)“) erscheinen gestrichelt und zählen erst nach „Übernehmen“ oder Bearbeiten.
- **Zahlen**: Dezimalkomma oder -punkt; bei mehrdeutiger Eingabe (z. B. „2 40“, „1.234,5“) Warnung statt stiller Korrektur.
- **Einstellungen**: Erfasser, Stammdaten (Meisterei, Telefonnummern, Behörde, GSB, Kontaktliste A 8), Vorlage laden (JSON, mit Prüfung), Speicherstatus, dauerhaften Speicher beantragen.
- **Speichern**: jede Eingabe sofort, Schreibvorgänge mit „strikter“ Dauerhaftigkeit, schnelle Folgen werden zusammengefasst.
- **Offline**: Service Worker, Manifest, App-Symbole. Hinweisleiste bei neuer Version.
- **Echte Gliederung** aus der Vorlage: `vorlagen_intern/gliederung_bestandsanlage.json` (nicht im Repository).

## Wie getestet
- **33 automatische Tests, alle bestanden** (`tests/run.html`): Zahlen, Gliederungsprüfung, Sichtbarkeit, Status, Fortschritt, Mindestumfang, neues Beckenbuch, Vorschläge, Sicherungshinweis, Aktenliste, echte Gliederung fehlerfrei, Offline-Dateiliste vollständig, Versionen gleich, Speicher-Warteschlange.
- **Bedienung im Browser in Handygröße (375 × 812)** mit echter Gliederung und Testdaten: Beckenbuch angelegt, Teilbauwerke, Vorschlag übernommen, Status-Knöpfe, Beispielzeile übernommen.
- **Kein Datenverlust**: Wert eingetippt und die Seite *sofort* neu geladen → Wert war da.
- **Offline**: Server gestoppt, Seite neu geladen → App startete aus dem Speicher mit allen Daten.
- **Nicht getestet** (geht nur am echten Handy): Installation auf dem Startbildschirm, dauerhafter Speicher, Tastaturdiktat, Verhalten bei Anruf/leerem Akku/Neustart.
- Node.js fehlt weiterhin; die Tests laufen deshalb im Browser.

## Fehler beim Testen gefunden und behoben
1. Beispielzeilen der Vorlage galten als erfasst und erfüllten den Mindestumfang → jetzt erst nach Bestätigung.
2. „19 80“ wurde still zu 1980 → jetzt Warnung.

## Prüfliste für dein Handy (sobald die App auf GitHub Pages liegt)
1. Adresse in Chrome öffnen → Menü → „App installieren“ / „Zum Startbildschirm“.
2. App vom Startbildschirm öffnen: läuft sie ohne Adressleiste im Hochformat?
3. Einstellungen → „Dauerhafter Speicher: gewährt“?
4. Vorlagenpaket (`gliederung_bestandsanlage.json`) aufs Handy kopieren und unter Einstellungen laden.
5. Stammdaten eintragen, neues Beckenbuch anlegen: Sind Telefonnummern in A 8/A 9 übernommen?
6. In ein Textfeld per Tastatur-Mikrofon diktieren – funktioniert es im **Flugmodus**?
7. Wert eintippen, sofort App wegwischen, neu öffnen: Wert noch da?
8. Während der Eingabe anrufen lassen bzw. Handy neu starten: Wert noch da?
9. Flugmodus an, App öffnen: startet sie?
10. Sind Schrift und Knöpfe draußen in der Sonne gut lesbar und mit einer Hand bedienbar?

## Offen
- GitHub-Konto und Veröffentlichung (für Prüfliste nötig), Node.js, Handymodell, Postfachgrenze.
- Vorschläge aus Etappe 0 (C 1-Intervall, Wasserschutzzone) sind als „Vorschlag der App“ umgesetzt – bitte bestätigen oder streichen.
- Vorlagenpaket ist vorerst nur die JSON-Datei; die Word-Vorlage kommt in Etappe 6 dazu.
