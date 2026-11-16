# ahmadalsayad.com

Statische Website, ohne Build-Schritt. Alles, was ausgeliefert wird, liegt in `site/`.
`Artikel/` und `Bachelorarbeit/` sind Quellmaterial: per `.gitignore` ausgeschlossen, weder im Repository noch online.

```
site/
├── index.html                  /                 Startseite
├── project-agentic-ai/index.html  /project-agentic-ai/  Projekt und Ergebnisse (/project/ leitet hierher um)
├── project/thesis/index.html   /project/thesis/  Bachelorarbeit (Leseansicht und Download)
├── 404.html
├── staticwebapp.config.json    Routing und Header für Azure Static Web Apps
└── assets/ (css, js, img)
```

## Lokal ansehen

```
cd site
python -m http.server 8080
```
→ http://127.0.0.1:8080

Die Seite muss über einen Server laufen, nicht über `file://`, weil sie mit absoluten Pfaden (`/assets/...`) arbeitet.

## Später: Azure

Zielplattform ist Azure Static Web Apps (Free-Tarif). Einstellungen: `app_location: "site"`,
kein `api_location`, kein Build (`skip_app_build: true`). Danach wird die eigene Domain
`ahmadalsayad.com` verbunden: per TXT-Eintrag für die Apex-Domain, CNAME für `www`.
