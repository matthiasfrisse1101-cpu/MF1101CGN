# Zwischenetappe 4a – Beckenarten und Bauformen (Bericht, 26.11.2026)

## Gebaut
- **Sichtbarkeit nach Antworten:** `sichtbarWenn` kann jetzt zusätzlich vom Wert anderer Felder abhängen (`felder: [{ feld, ist }]`), dazu `alle`, `eines`, `nicht`. Alle Angaben gelten zusammen (UND).
  - Ist das Bezugsfeld selbst ausgeblendet, bleibt die Folgefrage aus.
  - Ausgeblendete Felder zählen nicht zum Fortschritt, ihr Wert bleibt gespeichert.
  - Ändert man eine Antwort, baut sich das Kapitel sofort neu auf.
- **Hilfe zu den Teilbauwerken:** Bei Absetzbecken, Tauchwand, Leichtflüssigkeitsabscheider, RRB, Retentions-Bodenfilter, Versickerungsbecken und unterirdischer Beckenanlage gibt es einen Knopf **„Woran erkenne ich das?“** mit deinem Text, unverändert übernommen.
- **Bauform in A 1:** 14 neue Felder direkt vor „Art des Bauwerks“ unter der Zwischenüberschrift **„Bauform (Vorschlag der App)“**.
  - Alle sind als Vorschlag gekennzeichnet, „vor Ort“, keine Pflichtfelder, ohne „unbekannt“, mit Stichwörtern fürs Sammeldiktat.
  - Mit `ausgabe: false` erscheinen sie später nicht im Beckenbuch. In der Sicherung bleiben sie erhalten.
  - „Entleerung“ erscheint nur bei Absetzbecken **und** „ohne Dauerstau“.
- **Vorschläge, nie automatisch eingetragen:**
  - **Art des Bauwerks:** Hauptanlagen in der Reihenfolge des Deckblatts, Merkmale in Klammern. Beispiel: „Absetzbecken mit Leichtflüssigkeitsrückhaltung (zwei Kammern, Dauerstau), Regenrückhaltebecken (fällt trocken)“.
  - **Ölrückhaltung:** „Ja“ bei Tauchwand oder Leichtflüssigkeitsabscheider, sonst kein Vorschlag, auch nicht „Nein“.
  - **Fließfolge:** angekreuzte Teilbauwerke mit „→“, freie Teilbauwerke hinten angehängt.
  - **Art der Anlage im Protokoll A 5.2:** nach deiner Tabelle. Bei RRB mit Absetz- oder Abscheidefunktion kommt nur der Hinweis „Die Vorlage hat dafür keinen Eintrag, bitte selbst wählen“. Ein Abscheider als eigenes Bauwerk wird zu „Sonstiges: Leichtflüssigkeitsabscheider“. „Regenklärbecken“ wird nie vorgeschlagen.
  - Ein übernommener oder von Hand geänderter Wert wird nie überschrieben. Weicht der neu berechnete Vorschlag ab, steht dort „Vorschlag weicht ab – übernehmen?“.
- **Regeln stehen in der Gliederungsdatei, nicht im Programmcode.** Die Bezeichnungen aus der Vorlage bleiben so außerhalb des öffentlichen Repositorys, und die Mechanik (Bedingungen, Regeln, Bausteine) ist für andere Gliederungen nutzbar. Beschrieben in `README.md`, Abschnitt Gliederungsdatei.
- **Gliederungsprüfung:** Sie meldet im Klartext:
  - unbekannte Felder oder Angaben,
  - Werte, die es in den Optionen nicht gibt,
  - `true`/`false` bei Feldern, die keine Ja/Nein-Felder sind,
  - ein leeres `ist`,
  - Selbst- und Kreisbezüge,
  - Regelwerte, die nicht zum Feld passen,
  - Anlagenarten, die nicht in der Liste stehen,
  - Hilfetexte, die keine Texte sind.
- **Echte Gliederung:** Version **2026-11-26**, bitte auf dem Handy bzw. im Desktop-Browser neu laden. Die Liste der Teilbauwerke, das Protokoll A 5.2 und Kapitel A 4.2 sind unverändert.
- **Beispiel-Beckenbuch** (nur lokal, `vorlagen_intern/beispiel.html`) mit Bauform neu angelegt.

## Abweichung vom Plan
- Die Zwischenüberschrift heißt in der Datei `gruppe` und steht an jedem Feld der Gruppe statt nur am ersten. Sonst wäre die Überschrift verschwunden, sobald das erste Feld (Absetzbecken: Dauerstau) ausgeblendet ist.

## Wie getestet
- **102 automatische Tests, alle bestanden.** Neu:
  - Folgefrage nur bei passender Antwort;
  - ausgeblendetes Bezugsfeld blendet die Folgefrage aus, der Wert bleibt erhalten, der Fortschritt zählt richtig;
  - Mehrfachauswahl, Ja/Nein, alle/eines/nicht;
  - Fließfolge mit Pfeilen und freien Teilbauwerken;
  - Regel mit „kein Vorschlag statt Nein“; Bausteine mit Zusätzen;
  - Art der Anlage (Vorschlag, Sonstiges, Hinweis);
  - **altes Buch ohne die neuen Felder**; elf Fehlerfälle der Gliederungsprüfung.
  - Mit der echten Gliederung **jede Ableitungsregel**:
    - Fall 1;
    - Absetzbecken ohne Leichtflüssigkeitsrückhaltung (auch Tauchwand nur im Zulauf);
    - Abscheider als Teil des Absetzbeckens bzw. als eigenes Bauwerk;
    - RRB ohne Angabe / „ohne …“ / mit Absetzfunktion;
    - Versickerung, Bodenfilter, unterirdische Anlage;
    - nie „Regenklärbecken“;
    - Entleerung nur ohne Dauerstau;
    - Hilfetexte und Kennzeichnung der Felder.
- **Im Browser in Handygröße mit der echten Gliederung durchgespielt:**
  1. **Absetzbecken mit Tauchwand vor dem Ablauf, zwei Kammern, Dauerstau, dahinter RRB:**
     - Vorschlag „Absetzbecken mit Leichtflüssigkeitsrückhaltung (zwei Kammern, Dauerstau), Regenrückhaltebecken (fällt trocken)“; Ölrückhaltung „Ja“.
     - Übernommen, dann Kammern/Dauerstau geändert → der Wert blieb, „Vorschlag weicht ab – übernehmen?“ erschien, „Entleerung“ wurde sichtbar.
     - Protokoll: „Regenrückhaltebecken (ohne Absetz- u. Abscheiderfunktion), Absetzbecken mit Leichtflüssigkeitsrückhaltung“ übernommen, ohne zusätzliches „Absetzbecken“.
  2. **Versickerungsbecken ohne erkennbare Vorstufe:**
     - Sichtbar sind nur Vorstufe, Bauweise und Fließfolge.
     - Vorschlag „Versickerungsbecken (ohne erkennbare Vorstufe)“, Ölrückhaltung ohne Vorschlag, Protokoll „Versickerungsbecken“.
  3. **Abscheider als eigenes Bauwerk:**
     - Vorschlag „Leichtflüssigkeitsabscheider“, Ölrückhaltung „Ja“.
     - Protokoll „Sonstiges:“ angekreuzt mit Text „Leichtflüssigkeitsabscheider“.
- **Altes Beckenbuch** (Gliederung vom 24.11.) geöffnet: A 1, C 2 und Übersicht ohne Fehler, ohne Bauform-Abschnitt.
- **Hilfe-Knopf** bei den Teilbauwerken aufgeklappt.
- **Nicht getestet** (geht nur am echten Gerät): Bedienung der neuen Knöpfe mit dem Finger, Sammeldiktat der neuen Stichwörter mit Gboard.

## Prüfliste für dein Handy (bzw. den Mac)
1. Gliederung 2026-11-26 laden (Einstellungen → Vorlagenpaket) bzw. am Mac `http://localhost:8123/vorlagen_intern/beispiel.html` öffnen.
2. Deckblatt: „Woran erkenne ich das?“ bei Absetzbecken und Tauchwand – sind die Texte richtig und verständlich?
3. Neues Beckenbuch mit Absetzbecken, Tauchwand und RRB: A 1 → Bauform beantworten. Stimmt der Vorschlag für „Art des Bauwerks“?
4. „Ohne Dauerstau“ wählen: Erscheint „Entleerung“? Zurück auf „mit Dauerstau“: verschwindet sie wieder?
5. „Art des Bauwerks“ übernehmen, dann die Kammern ändern: Bleibt der Wert, und erscheint „Vorschlag weicht ab“?
6. C 2 → Erstkontrolle: Passt der Vorschlag „Art der Anlage“?
7. Sammeldiktat in A 1: „Kammern zwei Kammern, Dauerstau mit Dauerstau“ – wird es zugeordnet?
8. Fließfolge: Passt die vorgeschlagene Reihenfolge oft genug, oder ist es meist Handarbeit?
9. Fehlt dir ein Merkmal oder eine Auswahl?
10. Sind die Zusätze in Klammern bei „Art des Bauwerks“ so, wie du sie ins Beckenbuch schreiben würdest?

## Offen
- Die Zusätze in Klammern (z. B. „mit Umlaufkanal“, „ohne erkennbare Vorstufe“, „Vorstufe Absetzbecken“) habe ich formuliert. Sie sind ein *Vorschlag der App* – bitte prüfen (Punkt 10).
- Sammeldiktat: Auswahlwerte werden nur erkannt, wenn der Text einer Option darin vorkommt (z. B. „zwei Kammern“).
- GitHub: Etappe 4 liegt im Repository, 4a ist noch nicht hochgeladen (GitHub Desktop → „Push origin“). GitHub Pages ist noch aus.
- Weiterhin offen: Hauptmaße A 4.2, Handymodell, Postfachgrenze, Node.js.
