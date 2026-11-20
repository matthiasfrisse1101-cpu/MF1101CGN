# Etappe 1 – Konzept (noch kein Code)

Stand: 20.11.2026. Quellen am Ende, jeweils am 20.11.2026 abgerufen. **[BELEG FEHLT]** = nicht belegt, wird am Gerät oder in einer späteren Etappe geprüft.

## 1. Technikvarianten

| | A: Web-App ohne Baukasten (Empfehlung) | B: Web-App mit Framework | C: Native Android-App |
|---|---|---|---|
| Aufbau | HTML, CSS, JavaScript-Dateien, die der Browser direkt liest; 3 Bibliotheken als Dateien im Projekt | Vite + Preact/Vue, Übersetzungsschritt („Build“) vor jeder Veröffentlichung | Kotlin bzw. Capacitor, Android Studio |
| Auf das Handy | Adresse öffnen → „Zum Startbildschirm hinzufügen“ | ebenso | APK-Datei installieren (Sideload oder IT) |
| Pflege durch dich | Dateien lesbar, ändern ohne Werkzeugkette möglich | Build-Werkzeuge nötig, viele Abhängigkeiten | Entwicklungsumgebung, Signierschlüssel |
| Kamera, Fotos, Offline, Teilen, PDF | ausreichend (s. Abschnitt 2) | gleich wie A | am stärksten |
| Laufende Kosten | 0 € | 0 € | 0 €, aber mehr Aufwand bei Updates |
| Nachteil | Oberfläche etwas mehr Handarbeit | Komplexität ohne Mehrwert für dich | Aufwand, Installation am Dienstgerät |

**Empfehlung: A.** Alles, was die App braucht, kann Chrome auf Android heute. Ohne Build-Schritt bleibt das Projekt für dich durchschaubar: Was im Ordner liegt, ist die App.

## 2. Was auf deinem Android-Handy geht – und wo die Grenzen liegen
Das Handymodell steht noch aus. Annahme: aktuelles Android mit Chrome.

| Thema | Ergebnis | Folge für die App |
|---|---|---|
| **Speicher** | Chrome erlaubt je Website bis zu 60 % des Gerätespeichers; „dauerhafter Speicher“ wird ohne Rückfrage nach Heuristik vergeben, u. a. wenn die App auf dem Startbildschirm installiert ist. Dann löscht der Browser die Daten nicht von sich aus, nur durch ausdrückliche Nutzeraktion [1][2]. | App beantragt dauerhaften Speicher und zeigt an, ob er gewährt ist. Daten in IndexedDB (Fotos als Dateien darin). |
| **Löschung** | „Website-Daten löschen“ in Chrome oder Zurücksetzen des Handys löscht alles. Ob das Entfernen des App-Symbols die Daten löscht: **[BELEG FEHLT]**. | Sicherungshinweis, solange ein Beckenbuch weder gesichert noch versendet ist (Funktion 10). |
| **Kamera** | Dateiauswahl mit Kamera-Vorgabe (`capture`) öffnet die Kamera-App, Ergebnis kommt als Bild zurück; auch Galerie-Auswahl. Etablierter Standard [7], am Gerät zu prüfen. | Keine eigene Kamerasteuerung nötig → robust. |
| **Standort** | Geolocation liefert Koordinaten mit Genauigkeit in Metern [BELEG FEHLT – Standard, am Gerät prüfen]. | Nur auf Wunsch, Genauigkeit wird angezeigt. |
| **Teilen an die Mail-App** | Web Share kann Dateien teilen; PDF ist in Chromes Liste erlaubter Dateitypen, ZIP ist dort nicht nachweisbar [3][4]. Ob die Mail-App Betreff und Text übernimmt, hängt von der App ab [BELEG FEHLT]. | PDF per Teilen-Dialog. Sicherungsdatei wird **gespeichert** (Download-Ordner), nicht geteilt. |
| **Diktat Tastatur** | Gboard-Spracheingabe: ohne Offline-Sprachpaket gehen Diktate an Google-Server; Offline-Pakete gibt es, für Deutsch laut Nutzerberichten über Einstellungen → Spracheingabe → „Offline-Spracherkennung / Sprache hinzufügen“, offiziell für Deutsch nicht eindeutig bestätigt [5][6]. Samsung-Tastatur: [BELEG FEHLT]. | Standard bleibt Tastaturdiktat. **Prüfliste:** Offline-Paket Deutsch laden, im Flugmodus testen. |
| **Spracherkennung im Browser** | Chrome schickt die Audiodaten standardmäßig an einen Dienst; die Option „lokal verarbeiten“ (`processLocally`) ist für Chrome auf Android laut caniuse nicht unterstützt [8][9]. | **Nicht verwendet.** Kein Mikrofonknopf in der App. |
| **Offline-Betrieb** | Service Worker speichert die App-Dateien; danach startet die App ohne Netz. | Updates nur, wenn Netz da ist; App zeigt Version. |
| **PDF auf dem Handy** | pdfmake: Dokument wird als lesbare Beschreibung (Überschrift, Tabelle, Bild) aufgebaut, aktiv gepflegt, MIT-Lizenz; bei sehr vielen Bildern langsamer [10]. | Fotos vorher verkleinern (z. B. 1600 px, ca. 300 KB). Laufzeit mit 40 Fotos in Etappe 6 messen. |
| **Word am Rechner** | easy-template-x füllt eine Word-Vorlage mit Platzhaltern, kann Tabellenzeilen wiederholen und Bilder einsetzen, läuft im Browser; Lizenz laut Snyk MIT [11][12]. | Ich lege eine **Kopie** der Vorlage mit Platzhaltern an (Layout unverändert). Original bleibt unberührt. |
| **Zeichnen / Skizzen** | Fingereingabe auf Zeichenfläche ist Standard [BELEG FEHLT – am Gerät prüfen]. | Skizzen als Vektorgrafik (SVG), in PDF und Word als Bild. Nordpfeil von Hand gedreht, kein Kompass (Vereinfachung). |

## 3. Datenmodell (auf dem Gerät, IndexedDB)

```
Vorlagenpaket   id, Name, Version, Gliederung (JSON), Word-Vorlage mit Platzhaltern (Datei), geladen am
Einstellungen   Erfasser, Dienststelle, Meisterei, Meldekette A 9, Ansprechpartner A 8, GSB, Bildgröße, Warnschwelle Mail
Beckenbuch      id, Vorlagen-Version, Name, Bauwerksnummer, Stand (in Arbeit / vor Ort fertig / vollständig / versendet),
                Teilbauwerke [], zugeschaltete Abschnitte [], angelegt, geändert, zuletzt gesichert, zuletzt versendet
  Feldwert      Feld-ID → { Wert, Einheit, Status (erfasst / nicht vorhanden / nicht zugänglich / offen / aus Akten),
                Herkunft (gemessen / geschätzt / abgelesen), Diktat-Wortlaut, zu prüfen ja/nein, geändert }
  Tabellenzeile Gruppe-ID → [ { Zeilen-ID, Feldwerte … } ]      (Eingriffsstellen, Bauteile, Pläne …)
  Notiz         Kapitel-ID → nicht zugeordnetes Sammeldiktat
Foto            id, Beckenbuch, Kapitel/Feld, lfd. Nr., Bilddatei (Original), Bildunterschrift, Zeit, Standort + Genauigkeit
Skizze          id, Beckenbuch, Art (Anfahrt / Funktion / Lageplan / Schnitt), Elemente (Linien, Symbole, Maße), Eingriffsstellen [Nr, x, y]
Erstkontrolle   Beckenbuch, Protokollart, Witterung, Art der Anlage, Datum, Prüfpunkte A1–E4 { ok / Schaden, Art, Foto }
```
Jede Eingabe wird sofort einzeln geschrieben (nicht erst beim Verlassen des Kapitels), zusätzlich beim Wechsel der App in den Hintergrund. Schreibvorgänge mit „strikter“ Dauerhaftigkeit, damit ein leerer Akku nichts kostet [BELEG FEHLT – Verhalten in Etappe 2 belegen und testen].

## 4. Aufbau der Gliederungsdatei (Beispiel, Testdaten)

```json
{
  "vorlage": "Beckenbuch Bestandsanlage",
  "version": "2026-11-20",
  "teilbauwerke": ["Zulaufbauwerk", "Absetzbecken", "Regenrückhaltebecken", "Tauchwand", "…"],
  "kapitel": [
    {
      "id": "A1",
      "titel": "A 1 Allgemeine Daten",
      "hinweis": "Angaben eintragen, soweit sie bekannt sind …",
      "felder": [
        { "id": "strasse_nr", "label": "Straßen-Nr.", "art": "text", "ort": "vor Ort",
          "stichwoerter": ["straße", "straßennummer"] },
        { "id": "oelrueckhaltung", "label": "Ölrückhaltung", "art": "janein", "ort": "vor Ort" },
        { "id": "baujahr", "label": "Baujahr", "art": "zahl", "ort": "Akten" }
      ]
    },
    {
      "id": "A4_1",
      "titel": "A 4.1 Funktionsskizze",
      "felder": [
        { "id": "funktionsskizze", "label": "Funktionsskizze", "art": "skizze", "pflicht": true },
        { "id": "eingriffsstellen", "label": "Eingriffsstellen für Notfälle", "art": "tabelle",
          "spalten": [
            { "id": "nr", "label": "Nr. in der Skizze", "art": "zahl" },
            { "id": "stelle", "label": "Eingriffsstelle", "art": "text", "stichwoerter": ["schieber"] },
            { "id": "wirkung", "label": "Abgesperrter Anlagenteil / Wirkung", "art": "text" }
          ] }
      ]
    },
    {
      "id": "B2", "titel": "B 2 Bestandsliste der Bauteile", "zuschaltbar": true,
      "sichtbarWenn": { "teilbauwerk": "Schachtbauwerke" }
    }
  ]
}
```
Feldarten: `text`, `langtext`, `zahl` (mit `einheit`), `datum`, `auswahl`, `mehrfach`, `janein`, `foto`, `skizze`, `tabelle`. Die echte Gliederung mit den Vorlagentexten liegt nur in `vorlagen_intern/` und kommt als Vorlagenpaket aufs Handy; im Repository liegt eine Test-Gliederung.

## 5. Bildschirme
1. **Beckenliste** – Becken mit Stand, Sicherungshinweis, „Neues Beckenbuch“
2. **Neues Beckenbuch** – Name, Bauwerksnummer, Teilbauwerke ankreuzen
3. **Kapitelübersicht** – alle Kapitel mit Fortschritt, Anzeige „Mindestumfang ARV Nr. 2: fehlt noch …“
4. **Kapitel erfassen** – Felder mit Status, Kamera-Knopf je Feld, Feld für Sammeldiktat, Hinweistexte aufklappbar
5. **Sammeldiktat zuordnen** – Vorschläge „Wert → Feld“ bestätigen / ändern, Rest als Notiz
6. **Maß bestätigen** – Wortlaut, erkannter Wert, Einheit, Herkunft per Tipp
7. **Fotos** – Übersicht je Beckenbuch, Detail mit Nummer, Unterschrift, Zeit, Standort
8. **Skizze zeichnen** – Anfahrt, Funktionsskizze, nummerierte Eingriffsstellen
9. **Lageplan- und Schnittskizze** – aus den Maßen, Symbole setzen, offene Maße mit „?“
10. **Erstkontrolle A 5.2** – Prüfpunkte als große Ok/Schaden-Schalter
11. **Ausgabe** – PDF erzeugen, Größe, Warnung, Teilen
12. **Sicherung** – speichern, einlesen
13. **Einstellungen** – Stammdaten, Vorlagenpaket laden, Speicherstatus, Version
14. **Word erzeugen** (am Rechner) – Sicherungsdatei einlesen → Word-Datei herunterladen

## 6. Versand: Varianten
| | Teilen-Dialog (Empfehlung) | Automatischer Versand |
|---|---|---|
| Ablauf | App übergibt PDF an Mail-App, du tippst „Senden“ | App schickt selbst an feste Adresse |
| Technik | im Browser vorhanden | eigener Server oder Cloud-Funktion + Mail-Dienst |
| Kosten | 0 € | ca. 0–20 €/Monat, Einrichtung 1–2 Tage [Schätzung] |
| Datenschutz | Daten gehen nur über dein dienstliches Postfach | Daten laufen über fremden Server → Auftragsverarbeitung, Freigabe durch IT/Datenschutz nötig |
| Offline | Mail bleibt im Postausgang, bis Netz da ist | Warteschlange in der App nötig |

## 7. Weg aufs Handy und Kosten
- **Entwicklung am Mac:** Node.js (für automatische Tests und einen kleinen Testserver) ist nicht installiert. Empfehlung: Installationsprogramm (.pkg) von nodejs.org, LTS-Version (laut Zeitplan seit 28.10.2026 Version 26, Version 24 noch bis 04/2028 gepflegt) [13][14]. Die Installation fragt nach deinem Mac-Passwort, die führst du selbst aus. Kosten 0 €.
- **Testen am Handy und dauerhafter Betrieb:** GitHub-Konto (kostenlos) → öffentliches Repository → GitHub Pages liefert die App unter einer https-Adresse aus. Auf dem Handy die Adresse in Chrome öffnen → „App installieren“ / „Zum Startbildschirm“. Danach offline nutzbar. Kosten 0 €/Monat. Das Konto und die Veröffentlichung legst du selbst an; ich bereite alles vor.
- **Im öffentlichen Repository:** nur Programmcode und Test-Gliederung. Keine Vorlage, keine Stammdaten, kein Name ohne deine Zustimmung (Git-Autor auf GitHub-„noreply“-Adresse stellen).
- **Vorlagenpaket:** erzeuge ich als eine Datei in `vorlagen_intern/`; du kopierst sie aufs Handy (Kabel, Mail an dich selbst) und lädst sie einmal in der App.
- **Word am Rechner:** dieselbe Adresse im Browser des Dienst-PCs (Chrome/Edge). Ob das Dienstnetz github.io erreichen lässt: [BELEG FEHLT] – bitte prüfen.

## 8. Risiken
1. Offline-Diktat Deutsch hängt vom Gerät und der Tastatur ab → Prüfliste.
2. Löschen der Browserdaten löscht alle Beckenbücher → Sicherungshinweis, Speicherstatus.
3. PDF-Erzeugung mit vielen Fotos auf älteren Handys langsam → Bildgröße einstellbar, Messung in Etappe 6.
4. Vorlage ändert sich → neue Gliederung + neue Word-Vorlage mit Platzhaltern; Beckenbücher merken sich ihre Vorlagen-Version.

## Quellen (abgerufen 20.11.2026)
1. web.dev, Persistent storage – https://web.dev/articles/persistent-storage
2. web.dev, Storage for the web – https://web.dev/articles/storage-for-the-web
3. web.dev, Web Share API – https://web.dev/articles/web-share
4. Chromium-Quelltext share_service_impl.cc (Liste erlaubter Endungen) – https://sources.debian.org/src/chromium/139.0.7258.127-1/chrome/browser/webshare/share_service_impl.cc
5. Gboard-Hilfe, Erweiterte Spracheingabe – https://support.google.com/gboard/answer/11197787
6. GrapheneOS-Forum, Nutzerberichte Offline-Spracheingabe – https://discuss.grapheneos.org/d/278-voice-to-text/56
7. MDN, HTML-Attribut capture – https://developer.mozilla.org/docs/Web/HTML/Attributes/capture (nicht heute geprüft)
8. MDN, SpeechRecognition.processLocally – https://developer.mozilla.org/docs/Web/API/SpeechRecognition/processLocally
9. caniuse, processLocally – https://caniuse.com/mdn-api_speechrecognition_processlocally
10. PkgPulse, pdf-lib vs jsPDF vs pdfmake 2026 – https://www.pkgpulse.com/guides/pdf-lib-vs-jspdf-vs-pdfmake-pdf-generation-nodejs-2026
11. npm, easy-template-x – https://npmjs.com/package/easy-template-x
12. Snyk, easy-template-x – https://security.snyk.io/package/npm/easy-template-x
13. Node.js, Evolving the release schedule – https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule
14. Node.js Release Working Group – https://github.com/nodejs/release
