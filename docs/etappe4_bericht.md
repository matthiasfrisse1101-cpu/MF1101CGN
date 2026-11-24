# Etappe 4 – Diktat, Sammeldiktat, Maße, Erstkontrolle (Bericht, 24.11.2026)

## Gebaut
- **Diktat:** wie in Etappe 1 entschieden über das Mikrofon der Handy-Tastatur (Gboard). Die App nimmt selbst nichts auf und nutzt keine Spracherkennung des Browsers. Zahlfelder öffnen jetzt die **Texttastatur** statt des Ziffernblocks, weil der Ziffernblock kein Mikrofon hat.
- **Maße (alle Zahlfelder):**
  - Der getippte oder diktierte **Wortlaut bleibt gespeichert**, darunter steht der erkannte Wert.
  - Eindeutige Eingaben (Ziffern, ggf. mit passender Einheit: „32 m“, „1 zu 2“, „DN 150“) werden sofort übernommen: „✓ 32 m“.
  - Gedeutete Eingaben (Zahlwörter „zweiunddreißig Meter“, „zwei Komma vier null“, „2 Meter 40“) werden **zur Bestätigung** angezeigt: „Erkannt: 2,4 m [Übernehmen]“.
  - **Keine stille Umrechnung:** „240 cm“ in einem Meter-Feld → „Diktiert in cm, das Feld ist in m. [Als 2,4 m übernehmen]“. Erst der Tipp rechnet um, und der Vermerk „umgerechnet aus 240 cm“ bleibt stehen.
  - Unpassende Einheit oder Art (z. B. „3 ha“ in einem Längenfeld, „5 m“ bei der Böschungsneigung) → Warnung, der Wert bleibt Text.
  - Nicht erkannt („etwa so breit wie das Tor“) → bleibt Text und wird **zur Prüfung markiert**. Die Kapitelübersicht zeigt „1 zur Prüfung“.
  - Je Maß ein Tipp für die **Herkunft**: gemessen / geschätzt / vom Schild/Plan abgelesen.
- **Zahlenerkennung:** Dezimalkomma und -punkt, Zahlwörter bis 9999 (auch „eineinhalb“), „Komma“, Einheiten (m, cm, mm, km, ha, m², m³, l/s, %, °), Verhältnisse „1 zu 2“/„1:2“, Nennweiten „DN 150“/„D N 150“. Mehrdeutiges wie „2 40“ wird nicht geraten.
- **Sammeldiktat je Kapitel** (Kasten „🎤 Sammeldiktat“ oben in jedem Kapitel):
  - Frei diktieren, dann „Auswerten“. Die App schlägt für jeden Abschnitt das Feld vor, und zwar anhand der Stichwörter und der Wörter im Feldnamen. Ein KI-Dienst ist nicht beteiligt.
  - Jeder Vorschlag lässt sich einem anderen Feld zuordnen, zur **Notiz** machen oder verwerfen. Eingetragen wird erst nach „Übernehmen“ bzw. „Alle übernehmen“.
  - In Kapiteln mit **einer Tabelle** (z. B. B 2) wird aus einem Satz eine neue Tabellenzeile. Beispiel: „Schacht 2 Drosselschacht, Drossel DN 150, Tiefe 2,40 Meter, Hersteller Testfirma“ ergibt Bauteil „Schacht 2 Drosselschacht“, Hersteller „Testfirma“ und Abmessungen „Drossel DN 150; Tiefe 2,40 Meter“.
  - Was sich nicht zuordnen lässt, wird als **Notiz zum Kapitel** vorgeschlagen. Der diktierte Text bleibt gespeichert, bis er übernommen ist.
- **Notizen zum Kapitel:** neues Textfeld unten in jedem Kapitel. In der Ausgabe erscheint es als Notiz, nicht als Feld der Vorlage.
- **Zuschaltbare Abschnitte A 3, A 4.2, B 2** (aus Etappe 2) ergänzt:
  - **A 4.2 Hauptmaße des Beckens:** Länge/Breite an Böschungsoberkante und Sohle, Böschungsneigung (1 : n), Tiefe. Diese Felder sind ***Vorschlag der App*** (nicht aus Vorlage oder Musterbeckenbuch) und dienen als Grundlage für die Skizzen in Etappe 5. Bitte bestätigen oder ändern.
  - **B 2:** Foto je Zeile (z. B. Typenschild), Stichwörter für Hersteller/Typ/Abmessungen.
  - **A 3:** Stichwörter für AE/Ared.
- **Erstkontrolle mit Protokoll A 5.2 (optional, unter C 2):**
  - Protokollart, Witterung, Art der Anlage (mit Vorschlag aus dem Deckblatt), Protokollführer (aus den Einstellungen), Kontrolldatum.
  - Alle **28 Prüfpunkte A 1–E 4 im Wortlaut der Vorlage**, je Punkt „ok“ oder „Schaden“ mit Art des Schadens, „Behebung durch AM/SM bzw. NL“ und Fotos.
  - Dazu „Mängelbeseitigung veranlasst“, „Wv. am“ und die Fußnote „*: Jährliche Funktionsprüfung“.
  - Der Protokollkopf kommt aus A 5.2. Die Unterschriften erfolgen auf dem Ausdruck. Das Protokoll A 5.2 selbst bleibt unverändert.
- **Service Worker verbessert:** Er holt beim Installieren einer neuen Version die Dateien frisch vom Server. Vorher konnte eine neue Version alte Dateien aus dem Browser-Zwischenspeicher übernehmen; das ist beim Testen aufgefallen.

## Änderungen an der Gliederungsdatei
Neu und von der App geprüft: Feldart `pruefprotokoll` (mit `"protokoll": "A5_2"`), `protokoll` am Kapitel A 5.2 (Optionen und Prüfpunkte aus der Vorlage), `format: "verhaeltnis"`/`"dn"` an Zahlfeldern, `stichwoerter` und `sammelSpalte` an Tabellen. Die echte Gliederung hat jetzt die Version **2026-11-24**; bitte auf dem Handy neu laden.

## Wie getestet
- **81 automatische Tests, alle bestanden.** Neu u. a.:
  - Zahlwörter (0 bis 2314, eineinhalb), Einheiten, „1 zu 2“ in vier Schreibweisen, DN in fünf Schreibweisen;
  - „2 Meter 40“; nicht Erkanntes bleibt unerkannt;
  - Umrechnung nur bei verträglichen Einheiten;
  - Maßbewertung (sofort / bestätigen / umrechnen / unpassend / nicht erkannt);
  - Sammeldiktat mit dem **Beispiel aus dem Auftrag**, mit Ja/Nein, Auswahl, Text und Fläche, Notiz für Unzuordenbares, Satz → Tabellenzeile, Satzende nach Zahl, Stichwörter in anderer Reihenfolge;
  - Protokoll: Prüfpunkte A 1–E 4 vollständig, Vorschlag der Anlagenart, Zählung ok/Schaden/offen;
  - Gliederungsprüfung für die neuen Angaben; Service Worker holt frisch.
- **Bedienung im Browser in Handygröße** mit echter Gliederung und Testdaten („RRB Musterstraße“, 0000000):
  - A 4.2: Sammeldiktat „Länge 32 Meter, Breite 14 Meter, Böschung 1 zu 2. Tiefe zwei Meter vierzig. Sohle Länge 2400 cm. Zulauf von Norden über Rinne“ → sechs richtige Vorschläge, alle übernommen; 2400 cm erst nach Tipp als 24 m; „gemessen“ gesetzt; unklare Angabe → „1 zur Prüfung“ in der Übersicht.
  - B 2: zwei Sätze → zwei Tabellenzeilen mit Fotoknopf.
  - C 2: Erstkontrolle begonnen, Vorschlag Anlagenart, A 1 ok, A 2 Schaden mit Text und „AM/ SM“.
  - A 1: Sammeldiktat → „Ölrückhaltung: Ja“, „Station: 12,345“.
- **Kein Datenverlust:** Sammeldiktat getippt und sofort neu geladen → Text noch da. Maßwerte und Protokoll nach Neuladen vorhanden.
- **Offline:** Server gestoppt, Kapitel A 4.2 neu geladen → startet mit allen Werten.
- **Nicht getestet** (geht nur am echten Handy): das **Diktat selbst** mit Gboard, also was Gboard aus gesprochenen Zahlen macht (Ziffern oder Wörter, „1 zu 2“ oder „1:2“), und ob es offline geht. Ich habe die Texte getippt, so wie Gboard sie vermutlich liefert. [BELEG FEHLT] für Gboards genaue Schreibweise gesprochener Zahlen und Einheiten.

## Beim Testen gefunden und behoben
1. „Böschung 1 zu 2. Tiefe …“ – das Satzende nach einer Zahl wurde nicht erkannt.
2. „Sohle Länge 2400 cm“ landete bei „Länge Oberkante“ – mehrwortige Stichwörter passen jetzt auch in anderer Reihenfolge.
3. Vorschlag „Absetzbecken“ nahm auch „Absetzbecken mit Leichtflüssigkeitsrückhaltung“ mit.
4. In der Erstkontrolle überschrieb der Tipp auf „AM/ SM“ die eben getippte Schadensart.
5. Neue Versionen konnten alte Dateien aus dem Browser-Zwischenspeicher enthalten (siehe Service Worker).

## Prüfliste für dein Handy
1. In ein Maßfeld diktieren: „zwei Komma vier null Meter“ – was schreibt Gboard hin, und zeigt die App „2,4 m“?
2. Diktieren: „Böschung eins zu zwei“ und „DN hundertfünfzig“ – werden sie erkannt?
3. Diktieren: „zweihundertvierzig Zentimeter“ in einem Meter-Feld – kommt die Frage nach der Umrechnung?
4. A 4.2 → Sammeldiktat: „Länge 32 Meter, Breite 14 Meter, Böschung 1 zu 2“ diktieren, „Auswerten“: Stimmen die drei Vorschläge?
5. Klappt das Diktat im **Flugmodus** (Gboard: Einstellungen → Spracheingabe → Offline-Spracherkennung, Deutsch)?
6. B 2 → Sammeldiktat mit einem echten Bauteil, danach in der Zeile ein Foto vom Typenschild.
7. C 2 → Erstkontrolle mit einigen Punkten, einen Schaden mit Foto, App wegwischen, neu öffnen: alles noch da?
8. Sind „ok“/„Schaden“ und die Herkunftsknöpfe draußen gut zu treffen?
9. Sind die Hauptmaße in A 4.2 die richtigen für deine Skizzen, fehlen welche (z. B. Zulauf-/Ablaufhöhen, Dammbreite)?
10. Stört es, dass Zahlfelder die Texttastatur statt des Ziffernblocks öffnen?

## Offen
- Hauptmaße A 4.2 (Vorschlag) bestätigen – sie bestimmen, was Etappe 5 zeichnen kann.
- Veröffentlichung auf GitHub Pages (Upload steht weiter aus).
- „Datum erledigt“ im Protokoll wird erst bei späteren Kontrollen gebraucht und fehlt deshalb in der Erstkontrolle.
- Weiterhin offen: Handymodell, Postfachgrenze, Node.js, Vorschläge aus Etappe 0.
