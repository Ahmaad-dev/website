# ahmadalsayad.com

Statische Website, ohne Build-Schritt. Alles, was ausgeliefert wird, liegt in `site/`.
`Artikel/` und `Bachelorarbeit/` sind Quellmaterial: per `.gitignore` ausgeschlossen, weder im Repository noch online.

```
site/
├── index.html                  /                 Startseite
├── project-agentic-ai/index.html  /project-agentic-ai/  Projekt und Ergebnisse (/project/ leitet hierher um)
├── project/thesis/index.html   /project/thesis/  Bachelorarbeit (Leseansicht und Download)
├── 404.html
├── _headers                    Sicherheits- und Cache-Header (Cloudflare Pages)
├── _redirects                  Weiterleitung /project/ → /project-agentic-ai/ (Cloudflare Pages)
├── staticwebapp.config.json    dieselben Regeln für Azure Static Web Apps (Reserve)
└── assets/ (css, js, img)
```

## Lokal ansehen

```
cd site
python -m http.server 8080
```
→ http://127.0.0.1:8080

Die Seite muss über einen Server laufen, nicht über `file://`, weil sie mit absoluten Pfaden (`/assets/...`) arbeitet.

## Hosting: Cloudflare Pages

Die Seite läuft auf Cloudflare Pages, verbunden mit diesem Repository. Jeder Push auf `main`
veröffentlicht automatisch. Einstellungen: Framework „None“, kein Build-Befehl,
Ausgabeverzeichnis `site`. Domain `ahmadalsayad.com` (Hauptadresse) und `www` (leitet weiter).

Nach Änderungen an CSS/JS die Versionsnummer `?v=` in den HTML-Dateien erhöhen, weil
`/assets/*` eine Woche im Browser gecacht wird.

Azure Static Web Apps war geplant, ist mit dem Studenten-Abonnement aber nicht möglich
(Regionssperre). `staticwebapp.config.json` bleibt für einen späteren Umzug erhalten.
