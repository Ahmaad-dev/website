# ahmadalsayad.com

Statische Website, ohne Build-Schritt, zweisprachig (Deutsch unter `/`, Englisch unter `/en/`).
Alles, was ausgeliefert wird, liegt in `site/`.
`Artikel/` und `Bachelorarbeit/` sind Quellmaterial: per `.gitignore` ausgeschlossen, weder im Repository noch online.

```
site/
├── index.html                              /                               Startseite
├── projects/index.html                     /projects/                      Platzhalter „Coming soon“
├── projects/project-agentic-ai/index.html  /projects/project-agentic-ai/   Projekt Agentic AI
├── project/thesis/index.html               /project/thesis/                Bachelorarbeit (Leseansicht, Download)
├── 404.html                                Seite nicht gefunden, leitet nach 6 s zur Startseite
├── en/                                     dieselben Seiten auf Englisch (inkl. en/404.html)
├── _headers                                Sicherheits- und Cache-Header (Cloudflare)
├── _redirects                              alte Adressen → /projects/project-agentic-ai/ (Cloudflare)
├── .assetsignore                           Dateien, die Cloudflare nicht ausliefert
├── staticwebapp.config.json                Regeln für Azure Static Web Apps (Reserve, nicht ausgeliefert)
└── assets/ (css, js, img)
```

## Zweisprachigkeit

- Jede Seite gibt es zweimal: deutsch unter `/…`, englisch unter `/en/…`. Wer eine deutsche Seite ändert,
  ändert die englische Entsprechung mit.
- Der Umschalter DE/EN oben rechts verlinkt jeweils die Gegenstück-Seite; im `<head>` stehen passende
  `hreflang`-Verweise für Suchmaschinen.
- Texte in den Skripten (`project.js`, `study.js`) wählen die Sprache anhand von `<html lang="…">`.
- Die Bachelorarbeit selbst (PDF) gibt es nur auf Deutsch; die englische Seite verweist auf dieselbe Datei.

## Lokal ansehen

```
cd site
python -m http.server 8080
```
→ http://127.0.0.1:8080

Die Seite muss über einen Server laufen, nicht über `file://`, weil sie mit absoluten Pfaden (`/assets/...`) arbeitet.
Weiterleitungen (`_redirects`), Header und die englische 404-Seite greifen erst bei Cloudflare.

## Hosting: Cloudflare Workers (statische Assets)

Die Seite läuft als Cloudflare Worker `ahmadalsayad`, verbunden mit diesem Repository; Konfiguration in
`wrangler.jsonc`. Jeder Push auf `main` veröffentlicht automatisch. Domain `ahmadalsayad.com` ist die
Hauptadresse, `www` leitet per Cloudflare-Regel weiter, HTTP wird auf HTTPS umgeleitet.

Nach Änderungen an CSS/JS die Versionsnummer `?v=` in allen HTML-Dateien erhöhen, weil
`/assets/*` eine Woche im Browser gecacht wird.

Azure Static Web Apps war geplant, ist mit dem Studenten-Abonnement aber nicht möglich
(Regionssperre). `staticwebapp.config.json` bleibt für einen späteren Umzug erhalten.
