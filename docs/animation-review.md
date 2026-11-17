# Animationen: Analyse und Freigabe

Ausgangspunkt: `442feae` auf `main`. Änderungen ausschließlich auf
`fix/software-rendered-animations`. Kein Deployment, kein Merge und kein Auto-Merge.

## Repository und Befunde

Statische Website ohne Build-Schritt oder bisherige Tests. Elf HTML-Dateien:
Start, Projekt, Thesis, Projekte-Platzhalter und 404 jeweils DE/EN sowie die alte
Projekt-Weiterleitung. Gemeinsame Skripte wählen Texte über `html.lang`.
Alle drei CSS-Dateien, Inline-CSS/-Skripte, Asset-Verweise, Sprachumschalter und
Hosting-/Cache-Konfiguration wurden in die Analyse einbezogen. Bilder und PDF
bleiben binär unverändert. Die Windows-Störung selbst konnte nicht reproduziert
werden; die folgenden Defekte sind unabhängig davon im Code nachweisbar.

- Unbedingte `IntersectionObserver`-Konstruktion kann Reveal, Diagramm und die
  weitere Initialisierung (z. B. Kopierbutton auf der Thesis-Seite) abbrechen.
  `.reveal` war auch ohne funktionierendes JavaScript unsichtbar.
- Canvas-Kontexte können `null` liefern oder werfen. Beim Heuhaufen brach das
  bisher auch die folgenden SVG-Visualisierungen und die Lightbox-Initialisierung ab.
- Heuhaufen: Resize zeichnete erneut und plante einen weiteren rAF, ohne die
  vorhandene Schleife abzubrechen. Tausende statische Punkte wurden pro Frame
  einzeln neu gezeichnet. Reduced Motion konnte am Zyklusende ausblenden.
- Agentennetz: Nicht gespeicherte Schritt-Timer konnten nach Szenariowahl,
  Resize oder Sichtbarkeitswechsel zusätzliche Abläufe starten. 25 % Sichtbarkeit
  ist bei einem hohen mobilen Diagramm in einem kleinen Fenster nicht erreichbar.
- Hintergrundnetz: Bewegung hing von der Bildrate ab; bei Resize blieben Pulse
  mit Verweisen auf die alten Knoten erhalten. Kein explizites Pausieren bei
  verborgenem Dokument. Keine Reaktion auf geändertes Reduced Motion.
- Pipeline: Intervall lief auch außerhalb des Viewports weiter. CSS-Reduced-Motion
  erfasste Pseudoelemente (z. B. Ringe und laufende Punkte) bisher nicht.
- CSS enthält außerdem große Verläufe, Körnung/Blend, Schatten, SVG-Filter,
  Backdrop-Blur, 3D-Buchcover und viele kleine Effekte. Diese bleiben erhalten;
  keine pauschale GPU-/Windows-Erkennung und keine Entfernung von Effekten.

## Begrenzte Änderungen

`motion.js` bündelt Capability-Fallbacks, Observer-Hilfen, sichere optionale
Initialisierung, rAF mit Timer-Rückfall und Motion-/Visibility-Benachrichtigungen.
Ohne Observer werden Inhalte/Abläufe sofort aktiviert; ohne Canvas bleiben
Inhalt, CSS-Hintergründe und andere Interaktionen nutzbar. Ohne JS werden Reveals
nicht versteckt. Kein globaler Polyfill ersetzt Browser-APIs.

Jede Canvas-Schleife wird vor einem Neustart abgebrochen. Agentennetz räumt
zusätzlich seinen Timer auf; Pipeline pausiert außerhalb des Viewports bzw.
im Hintergrund und behält manuelles Play/Pause bei. Reduced Motion wird auch
während der Nutzung berücksichtigt; explizites Pipeline-Play bleibt möglich.

Heuhaufen zeichnet das statische Punktfeld in einen wiederverwendeten Canvas.
Der Scan ergänzt nur die betroffenen Punkte und erhält Scan, Fundringe und
Korrekturen. Das Hintergrundnetz rechnet Bewegung und Pulse mit Zeitdeltas
(60 Hz als bisheriger Referenzwert, gedeckeltes Aufholen nach Verzögerung).
Bei 30 anhaltend teuren Zeichenaufrufen (>12 ms, schnelle Frames bauen den
Zähler ab) halbiert sich nur die Canvas-Backing-Auflösung. Knotenanzahl,
Szenarien, Effekte und Pointer-Interaktionen bleiben erhalten. Diese Messung ist
kein GPU-Test: verzögertes Rasterisieren/Compositing kann sie nicht erfassen;
der Schwellenwert und die Bildqualität müssen noch am Zielgerät geprüft werden.

Datenarrays, Übersetzungen, Designs, SVG-Pfade, Bilder, PDF, Hosting und
Erweiterungspunkte bleiben erhalten. HTML lädt die gemeinsame Hilfe vor den
Verbrauchern. Asset-Versionen sind konsistent auf `v=10` erhöht (Wochen-Cache).
`project.css` und `study.css` benötigen keine Regeländerungen.

## Ausgeführte Prüfungen

- `node tests/animations.test.cjs`: **18/18 bestanden**. Keine Dependencies.
  Deterministische DOM-/Canvas-Testdoubles, kein Browser:
  DE/EN, 11 Mesh-Knoten, fünf Szenarien, neun Pipeline-Knoten, Fokus/Blur,
  Szenariowahl, Tastatur-Auswahl und Play/Pause, Lightbox öffnen/schließen,
  Diagrammbreiten und Tooltip, Reduced Motion beim Laden und live,
  Observer vorhanden/fehlend/werfend, Canvas `null`/werfend, rAF-Fallback,
  wiederholter Resize, Hintergrund/Foreground und Zeichenbudget.
- Cache-Prüfung: Bei einem 1000×600-Punktfeld mit 6000 Punkten zeichnet ein
  früher Scan-Frame weniger als 1000 zusätzliche Rechtecke. Das belegt weniger
  Zeichenbefehle, **keinen gemessenen Browser-FPS-Gewinn**.
- Alle elf HTML-Dateien: Inline-Skripte syntaktisch kompiliert, lokale JS-/CSS-
  Referenzen und DE/EN-Ziele vorhanden, Helfer vor Verbrauchern geladen.
- `node --check` für alle vier JS-Dateien; `git diff --check`: bestanden.

## Nicht getestet / manuelle Freigabe

Browser-Vorschau scheiterte mit `listen EPERM: operation not permitted
127.0.0.1:4173`; `sites-preview status` meldete gestoppt. Deshalb **keine**
visuelle Browser-, Screenshot-, FPS- oder echte Interaktionsprüfung. Testdoubles
bilden weder Layout/Intersection-Berechnung noch Rasterisierung, CSS-Animationen,
SVG-Filter, GPU, Browser-Clipboard oder native Dialog-/PDF-Funktionen ab.
Auch ein Chromium-Lauf mit `--disable-gpu` wurde nicht durchgeführt.

Vor Merge jeweils Deutsch und Englisch prüfen:

1. `/`, `/projects/project-agentic-ai/`, `/project/thesis/`, `/projects/`,
   `/404.html` sowie ihre `/en/`-Gegenstücke; alte `/project/`-Weiterleitung.
2. Auf einem verwalteten Windows-Rechner mit deaktivierter Hardwarebeschleunigung
   (Browser nach Änderung neu starten), zusätzlich auf einem beschleunigten Gerät:
   Text jederzeit lesbar, Reveals, Hero-Aufbau/Glanz/Drift, Kartenlicht,
   Netz-Mausanziehung/Klickpulse, Heuhaufen-Scan/Fund/Korrektur und Zähler.
3. Alle fünf Mesh-Szenarien, Tooltips mit Maus und Tastatur, Pipeline-Schritte
   mit Enter/Leertaste, Pause/Play, Bilder-Lightbox inkl. Escape/Schließen.
4. Thesis-Balken und Tooltip, Cover-Hover, Anker/Sprachwechsel,
   Zitat kopieren mit Clipboard und Auswahl-Fallback, PDF-Leseansicht/Download.
5. Reduced Motion vor dem Laden und im laufenden Betrieb ein-/ausschalten;
   Pseudoelemente bleiben dabei ruhig. Manuell gestartete Pipeline prüfen.
6. Desktop/Mobil, kleines Fenster mit hohem Mesh, schnelle Szenariowechsel,
   mehrfacher Resize und Tabwechsel. Keine mehrfachen Abläufe oder Konsolenfehler.
7. In DevTools Observer, rAF oder Canvas-Ausgabe gezielt fehlen lassen und JS
   deaktivieren; Inhalte und unabhängige Controls dürfen nicht verschwinden.
8. Windows Edge/Chrome-Firmenversionen, tatsächlich installierte Richtlinien,
   GPU aus/an sowie High-DPI vergleichen. Framezeit und adaptive Bildqualität
   messen. Cloudflare-Header, Cache-Invalidierung und Redirects nach einer später
   ausdrücklich freigegebenen Veröffentlichung separat prüfen.

Diese ausstehenden Prüfungen sind Freigabekriterien für den Menschen; der PR
wird als Entwurf angelegt. `main` wird nicht verändert.
