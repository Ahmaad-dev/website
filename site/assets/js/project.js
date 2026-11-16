/* Projektseite: Einblenden, Fortschritt, Zähler, Agenten-Netz, Pipeline-Animation, Lightbox */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  /* ── Einblenden ── */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
    io.observe(el);
  });

  /* ── Lesefortschritt ── */
  const bar = document.querySelector('.progress i');
  addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.width = (100 * h.scrollTop / (h.scrollHeight - h.clientHeight)) + '%';
  }, { passive: true });

  /* ── Zähler ── */
  const fmt = n => n.toLocaleString('de-DE');
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, pre = el.dataset.prefix ? el.dataset.prefix.replace('&gt;', '>') : '';
    if (reduce) return;
    const t0 = performance.now(), D = 1600;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / D), v = Math.round(end * (1 - Math.pow(1 - k, 4)));
      el.textContent = pre + fmt(v);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }), { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

  /* ── Heuhaufen: Punktfeld, Scan, wenige Fehler werden gefunden und korrigiert ── */
  (function hay() {
    const cv = document.getElementById('hay'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let w, h, dpr, pts = [], errs = [], t0 = performance.now(), raf, vis = false;
    const GAP = 10, CYCLE = 7000;
    function setup() {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (let y = GAP / 2; y < h; y += GAP) for (let x = GAP / 2; x < w; x += GAP) pts.push([x + (Math.random() - .5) * 2, y + (Math.random() - .5) * 2, .05 + Math.random() * .12]);
      const narrow = w < 560;
      errs = [];
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x = narrow ? w * (.12 + .76 * (i + Math.random() * .6) / n) : w * (.64 + .32 * (i + Math.random() * .7) / n);
        const y = narrow ? h * (.08 + Math.random() * .32) : h * (.12 + Math.random() * .76);
        errs.push([x, y]);
      }
    }
    function draw(now) {
      const k = ((now - t0) % CYCLE) / CYCLE;              // 0..1 je Durchlauf
      const sx = reduce ? w * 2 : -60 + (w + 120) * Math.min(1, k / .7); // Scanposition
      ctx.clearRect(0, 0, w, h);
      for (const [x, y, a] of pts) {
        const d = Math.abs(x - sx), boost = d < 70 ? (1 - d / 70) * .5 : 0;
        ctx.fillStyle = `rgba(232,240,236,${a + boost})`;
        ctx.fillRect(x - .8, y - .8, 1.6, 1.6);
      }
      if (!reduce && k < .7) {
        const g = ctx.createLinearGradient(sx - 60, 0, sx + 4, 0);
        g.addColorStop(0, 'rgba(68,209,189,0)'); g.addColorStop(1, 'rgba(68,209,189,.22)');
        ctx.fillStyle = g; ctx.fillRect(sx - 60, 0, 64, h);
        ctx.fillStyle = 'rgba(68,209,189,.7)'; ctx.fillRect(sx, 0, 1, h);
      }
      const fade = k > .92 ? 1 - (k - .92) / .08 : 1;
      errs.forEach(([x, y]) => {
        const passed = reduce ? 1 : (sx - x);
        if (passed < 0) return;
        const since = reduce ? 9999 : passed / ((w + 120) / (CYCLE * .7)); // ms seit Fund
        const fixed = since > 1100;
        const col = fixed ? '68,209,189' : '226,178,119';
        const ring = Math.min(1, since / 700);
        ctx.strokeStyle = `rgba(${col},${(1 - ring * .6) * fade})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, 6 + ring * 9, 0, 7); ctx.stroke();
        ctx.shadowColor = `rgba(${col},.9)`; ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(${col},${fade})`;
        ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
      });
      if (k > .995) setup();
      if (!reduce && vis) raf = requestAnimationFrame(draw);
    }
    setup(); draw(performance.now());
    new IntersectionObserver(es => es.forEach(e => { vis = e.isIntersecting; cancelAnimationFrame(raf); if (vis && !reduce) raf = requestAnimationFrame(draw); }), { threshold: .1 }).observe(cv);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { setup(); draw(performance.now()); }, 150); });
  })();

  /* ── Agenten-Netz ── */
  (function mesh() {
    const box = document.getElementById('mesh'); if (!box) return;
    const stage = document.getElementById('meshStage'), svg = document.getElementById('meshSvg'),
      tip = document.getElementById('meshTip'), scnBox = document.getElementById('meshScn'), stepEl = document.getElementById('meshStep');
    const IC = {
      user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
      kb: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6"/><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/></svg>',
      api: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 12l3-3 2 2 4-4"/></svg>',
      www: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17"/></svg>',
      rcpt: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/></svg>'
    };
    // [Schlüssel, Name, Untertitel, Art, Kategorie, Beschreibung, Technik, Desktop[x,y,r], Mobil[x,y,r]]
    const N = [
      ['user', 'Fachperson', '', 'sat', 'Mensch im Ablauf', 'Stellt Anfragen im Chat, prüft Korrekturvorschläge und gibt kritische Änderungen frei.', 'Weboberfläche · Review Board', [105, 300, 34], [200, 50, 28]],
      ['orch', 'Orchestrator', 'KOORDINATION', 'core', 'Agent · Koordination', 'Primäre Schnittstelle zur Fachperson. Erkennt die Absicht hinter einer Anfrage, plant die nötigen Schritte und verteilt sie – kontextsensitiv per LLM statt fester Wenn-dann-Regeln.', 'Azure OpenAI GPT-4.1', [410, 300, 80], [200, 232, 62]],
      ['rag', 'RAG-Agent', 'WISSEN', 'agent', 'Agent · Wissen', 'Sucht in einer Wissensbasis aus Produktionsdokumenten und Validierungsregelwerken. Die Regeln sind in natürlicher Sprache verfasst und von Fachleuten ohne Programmierkenntnisse pflegbar.', 'Azure AI Search', [680, 125, 58], [88, 440, 48]],
      ['sp', 'Smart-Planning-Agent', 'PLANUNG', 'agent', 'Agent · Operativer Kern', 'Holt Snapshots aus dem Planungssystem, prüft sie mit dessen Validierung, analysiert Fehler, erzeugt strukturierte Korrekturen, wendet sie an und schreibt sie zurück.', '10 Werkzeuge · 4 Pipelines · Smart-Planning-API', [720, 320, 64], [312, 440, 52]],
      ['chat', 'Chat-Agent', 'DIALOG', 'agent', 'Agent · Dialog', 'Übernimmt Rückfragen, die weder Suche noch Systemzugriff brauchen: Fehlerklassen erklären und Korrekturen fachlich einordnen.', 'Azure OpenAI GPT-4.1', [610, 490, 52], [200, 640, 44]],
      ['web', 'Websearch-Agent', 'BEI BEDARF', 'agent dem', 'Agent · Recherche, nur bei Bedarf', 'Wird nur zugeschaltet, wenn eine Frage Wissen von ausserhalb des Unternehmens braucht – etwa aktuelle Informationen aus dem Web. Interne Fragen bleiben beim RAG-Agenten.', 'Websuche · nur auf Anfrage des Orchestrators', [360, 92, 50], [64, 236, 40]],
      ['mail', 'E-Mail-Agent', 'KOMMUNIKATION', 'agent', 'Agent · Kommunikation', 'Bereitet E-Mails mit Berichten oder Korrekturdetails vor, etwa für Vorgesetzte oder die Betriebsleitung. Entwurf, Überarbeitung und Vorschau – versendet wird erst auf ausdrückliche Anweisung.', 'Mehrere Empfänger · CC · Link zum Bericht', [365, 505, 52], [336, 236, 42]],
      ['kb', 'Wissensbasis', '', 'sat', 'Datenquelle', 'Produktionsdokumente und Validierungsregelwerke, indexiert für Volltext-, semantische und Vektorsuche.', 'Azure AI Search', [910, 100, 28], [72, 610, 24]],
      ['api', 'Smart Planning', '', 'sat', 'Zielsystem', 'Das Produktionsplanungssystem: liefert Snapshots und ihre Validierung, nimmt korrigierte Snapshots zurück und prüft sie erneut.', 'REST-API · Validierungs-Engine', [915, 345, 30], [328, 610, 24]],
      ['www', 'Internet', '', 'sat', 'Externe Quelle', 'Öffentliche Quellen, die nur dann herangezogen werden, wenn internes Wissen nicht reicht.', 'Websuche', [150, 92, 26], [64, 112, 22]],
      ['rcpt', 'Empfänger', '', 'sat', 'Verantwortliche Stellen', 'Zum Beispiel Vorgesetzte oder Betriebsleitung: Sie erhalten Bericht und Korrekturdetails per E-Mail.', 'E-Mail · auch an mehrere Empfänger', [150, 515, 28], [336, 112, 22]]
    ];
    const E = [['user', 'orch'], ['orch', 'rag'], ['orch', 'sp'], ['orch', 'chat'], ['orch', 'web'], ['orch', 'mail'], ['rag', 'kb'], ['sp', 'api'], ['web', 'www'], ['mail', 'rcpt']];
    const SCN = [
      ['Korrektur', [['user', 'orch', '„Korrigiere diesen Snapshot.“'], ['orch', 'sp', 'Aufgabe an den Smart-Planning-Agenten'], ['sp', 'api', 'Snapshot abrufen und validieren'], ['api', 'sp', 'Validierungsmeldungen zurück'], ['sp', 'api', 'Korrektur anwenden, zurückschreiben, neu prüfen'], ['sp', 'orch', 'Ergebnis und Bericht'], ['orch', 'user', 'Zusammenfassung für die Fachperson']]],
      ['Wissensfrage', [['user', 'orch', '„Welche Regel gilt hier?“'], ['orch', 'rag', 'Anfrage an den RAG-Agenten'], ['rag', 'kb', 'Suche in Regelwerken und Dokumenten'], ['kb', 'rag', 'passende Fundstellen'], ['rag', 'orch', 'relevantes Wissen'], ['orch', 'user', 'Antwort auf Basis der Wissensbasis']]],
      ['Rückfrage', [['user', 'orch', '„Was bedeutet diese Fehlerklasse?“'], ['orch', 'chat', 'fachliche Einordnung anfragen'], ['chat', 'orch', 'Erklärung'], ['orch', 'user', 'Antwort im Dialog']]],
      ['Websuche', [['user', 'orch', '„Gibt es dazu aktuelle Informationen?“'], ['orch', 'web', 'Bedarf erkannt: Websearch-Agent zuschalten'], ['web', 'www', 'Suche in öffentlichen Quellen'], ['www', 'web', 'Treffer'], ['web', 'orch', 'zusammengefasste Ergebnisse'], ['orch', 'user', 'Antwort mit externem Wissen']]],
      ['E-Mail', [['user', 'orch', '„Schick den Bericht an die Betriebsleitung.“'], ['orch', 'mail', 'E-Mail-Agent bereitet Entwurf vor'], ['mail', 'orch', 'Entwurf mit Bericht'], ['orch', 'user', 'Vorschau zur Freigabe'], ['user', 'orch', '„Absenden.“'], ['orch', 'mail', 'Versand ausdrücklich angewiesen'], ['mail', 'rcpt', 'E-Mail mit Bericht verschickt']]]
    ];
    const byKey = Object.fromEntries(N.map(n => [n[0], n]));
    let L, W, H, s, nodeEl = {}, edgeEl = {}, pulse, trail;

    function mk(t, a, p) { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); p.appendChild(e); return e; }
    const ek = (a, b) => [a, b].sort().join('|');
    const P = k => { const v = byKey[k][L]; return { x: v[0], y: v[1], r: v[2] }; };
    // Endpunkte einer Kante auf den Kreisrändern (statt Mittelpunkt zu Mittelpunkt)
    const ends = (a, b) => {
      const A = P(a), B = P(b), dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
      return [{ x: A.x + ux * (A.r + 3), y: A.y + uy * (A.r + 3) }, { x: B.x - ux * (B.r + 3), y: B.y - uy * (B.r + 3) }];
    };

    function layout() {
      L = stage.clientWidth < 680 ? 8 : 7;
      [W, H] = L === 7 ? [1000, 600] : [400, 700];
      s = stage.clientWidth / W;
      stage.style.height = (H * s) + 'px';
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.innerHTML = '';
      const defs = mk('defs', {}, svg);
      const f = mk('filter', { id: 'glow', x: '-200%', y: '-200%', width: '500%', height: '500%' }, defs);
      mk('feGaussianBlur', { stdDeviation: '3.5' }, f);
      edgeEl = {};
      E.forEach(([a, b]) => {
        const [A, B] = ends(a, b);
        const d = `M${A.x},${A.y} L${B.x},${B.y}`;
        edgeEl[ek(a, b)] = [mk('path', { class: 'ed', d }, svg), mk('path', { class: 'fl', d }, svg)];
        if (reduce) edgeEl[ek(a, b)][1].style.animation = 'none';
      });
      trail = mk('circle', { r: 9, fill: '#44d1bd', opacity: 0, filter: 'url(#glow)' }, svg);
      pulse = mk('circle', { r: 4.2, fill: '#e9eeeb', opacity: 0 }, svg);
      stage.querySelectorAll('.node').forEach(n => n.remove());
      nodeEl = {};
      N.forEach(n => {
        const p = P(n[0]), b = document.createElement('button');
        b.className = 'node ' + n[3]; b.type = 'button';
        b.setAttribute('aria-label', `${n[1]}: ${n[5]}`);
        const d = 2 * p.r * s;
        Object.assign(b.style, { left: p.x * s + 'px', top: p.y * s + 'px', width: d + 'px', height: d + 'px' });
        if (n[3] === 'sat') {
          b.innerHTML = IC[n[0]] + `<span class="in"><span class="nm" style="font-size:${Math.max(11, 13 * Math.min(1, s * 1.1))}px">${n[1]}</span></span>`;
        } else {
          const fs = Math.max(12, d * (n[3] === 'core' ? .15 : .13));
          const nm = n[1].replace('Smart-Planning-Agent', 'Smart-Planning-<br>Agent').replace('Websearch-Agent', 'Websearch-<br>Agent').replace('E-Mail-Agent', 'E-Mail-<br>Agent');
          b.innerHTML = `<span class="in"><span class="nm" style="font-size:${fs}px">${nm}</span><span class="sb" style="font-size:${Math.max(9, fs * .42)}px">${n[2]}</span></span>`;
        }
        b.addEventListener('pointerenter', () => focus(n[0]));
        b.addEventListener('pointerleave', () => unfocus());
        b.addEventListener('focus', () => focus(n[0]));
        b.addEventListener('blur', () => unfocus());
        b.addEventListener('click', () => (tip.classList.contains('on') && tip.dataset.k === n[0] ? unfocus() : focus(n[0])));
        stage.appendChild(b); nodeEl[n[0]] = b;
      });
    }

    function focus(k) {
      const n = byKey[k], p = P(k);
      box.classList.add('focus');
      Object.entries(nodeEl).forEach(([kk, el]) => el.classList.toggle('rel', kk === k || E.some(e => e.includes(k) && e.includes(kk))));
      Object.entries(edgeEl).forEach(([kk, els]) => els.forEach(el => el.classList.toggle('rel', kk.split('|').includes(k))));
      tip.innerHTML = `<span class="tt-k">${n[4]}</span><h4>${n[1]}</h4><p>${n[5]}</p><span class="tt-t">${n[6]}</span>`;
      tip.dataset.k = k;
      tip.classList.add('on');
      const sw = stage.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
      const cx = p.x * s, cy = p.y * s, rr = p.r * s;
      let left = Math.min(Math.max(cx - tw / 2, 12), sw - tw - 12);
      let top = cy - rr - th - 14;
      if (top < 10) top = cy + rr + (n[3] === 'sat' ? 34 : 14);
      if (top + th > stage.clientHeight - 6) top = Math.max(10, cy - th / 2);
      tip.style.left = left + 'px'; tip.style.top = top + 'px';
    }
    function unfocus() {
      box.classList.remove('focus'); tip.classList.remove('on');
      Object.values(nodeEl).forEach(el => el.classList.remove('rel'));
      Object.values(edgeEl).forEach(els => els.forEach(el => el.classList.remove('rel')));
    }

    // Szenario-Wahl
    let cur = 0, step = 0, raf, visible = false, playing = !reduce;
    const btns = SCN.map((sc, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = sc[0];
      b.addEventListener('click', () => { cur = i; step = 0; playing = !reduce; mark(); if (reduce) showStatic(); else run(); });
      scnBox.appendChild(b); return b;
    });
    function mark() { btns.forEach((b, i) => b.setAttribute('aria-pressed', i === cur)); }
    function clearHot() { Object.values(nodeEl).forEach(el => el.classList.remove('hot')); Object.values(edgeEl).forEach(els => els[0].classList.remove('hot')); }
    function showStatic() {
      clearHot();
      const st = SCN[cur][1];
      st.forEach(([a, b]) => { nodeEl[a].classList.add('hot'); nodeEl[b].classList.add('hot'); edgeEl[ek(a, b)][0].classList.add('hot'); });
      stepEl.textContent = st.map(x => x[2]).join(' → ');
    }

    function run() {
      cancelAnimationFrame(raf);
      if (!visible || !playing) return;
      const [a, b, txt] = SCN[cur][1][step];
      clearHot();
      nodeEl[a].classList.add('hot'); edgeEl[ek(a, b)][0].classList.add('hot');
      stepEl.textContent = `${step + 1} / ${SCN[cur][1].length} · ${txt}`;
      const [A, B] = ends(a, b), D = 1150, t0 = performance.now();
      (function fr(t) {
        const k = Math.min(1, (t - t0) / D), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const x = A.x + (B.x - A.x) * e, y = A.y + (B.y - A.y) * e, op = Math.sin(Math.PI * Math.min(1, k * 1.08));
        pulse.setAttribute('cx', x); pulse.setAttribute('cy', y); pulse.setAttribute('opacity', op);
        trail.setAttribute('cx', x); trail.setAttribute('cy', y); trail.setAttribute('opacity', op * .8);
        if (k > .85) nodeEl[b].classList.add('hot');
        if (k < 1) { raf = requestAnimationFrame(fr); return; }
        step++;
        const last = step >= SCN[cur][1].length;
        if (last) { step = 0; cur = (cur + 1) % SCN.length; }
        setTimeout(() => { mark(); run(); }, last ? 1300 : 280);
      })(t0);
    }

    layout(); mark();
    if (reduce) showStatic();
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; if (visible && !reduce) run(); else cancelAnimationFrame(raf); }), { threshold: .25 }).observe(box);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { unfocus(); layout(); if (reduce) showStatic(); else run(); }, 150); });
  })();

  /* ── Pipeline ── */
  const N = [
    ['input_analysis', 'Eingabe analysieren', 0, 'Liest die Validierungsmeldungen des Snapshots und hält fest, womit der Lauf es zu tun hat.'],
    ['classification', 'Fehler klassifizieren', 1, 'Wählt den zu behandelnden Fehler, bestimmt die Suchparameter und schlägt passende Regelkarten vor. Hier wird sichtbar, welcher Fehler priorisiert wurde – und warum.'],
    ['context_search', 'Kontext suchen', 0, 'Führt die Suche im Snapshot aus und speichert, welcher Datenausschnitt dem Modell tatsächlich vorlag – samt Prüfsumme.'],
    ['rule_matching', 'Regeln zuordnen', 0, 'Löst die vorgeschlagenen Regelkarten auf und protokolliert, welche Regeln wirklich geladen waren.'],
    ['correction', 'Korrektur erzeugen', 1, 'Erzeugt aus Kontext und Regeln einen strukturierten Korrekturvorschlag.'],
    ['technical_check', 'Technisch prüfen', 1, 'Prüft den Vorschlag gegen das Schema. Ungültige Vorschläge bessert das Modell in begrenzten Versuchen nach – sonst geht es direkt zur Bewertung.'],
    ['apply_revalidate', 'Anwenden & neu prüfen', 0, 'Wendet die Korrektur an, schreibt den Snapshot zurück und stösst eine neue Validierung im Zielsystem an – erst ihr Ergebnis zählt.'],
    ['evaluation', 'Ergebnis bewerten', 0, 'Entscheidet begründet: fertig, nächste Runde – oder ein ehrliches „unsicher“ statt einer erfundenen Korrektur.'],
    ['answer', 'Antwort erstellen', 0, 'Fasst den Lauf für die Fachperson zusammen. Der vollständige Zustand wird als Ablaufspur abgelegt.']
  ];
  const SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7, 8];
  const svg = document.getElementById('pipeSvg'), detail = document.getElementById('pipeDetail'), btn = document.getElementById('pipePlay');
  if (svg) {
    let pos = [], vertical = false, nodesEl = [], halo, idx = 0, playing = !reduce, sel = null, timer;
    const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; };

    function build() {
      const w = svg.parentElement.clientWidth - 48;
      vertical = w < 760;
      svg.innerHTML = '';
      const defs = el('defs', {});
      const g = el('radialGradient', { id: 'haloG' }, defs);
      el('stop', { offset: '0', 'stop-color': '#44d1bd', 'stop-opacity': '.55' }, g);
      el('stop', { offset: '1', 'stop-color': '#44d1bd', 'stop-opacity': '0' }, g);
      let W, H; const R = 22;
      if (!vertical) { W = 1100; H = 280; pos = N.map((_, i) => [60 + i * (980 / 8), 118]); }
      else { W = 360; H = 9 * 74 + 20; pos = N.map((_, i) => [70, 40 + i * 74]); }
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      for (let i = 0; i < 8; i++) {
        const [x1, y1] = pos[i], [x2, y2] = pos[i + 1];
        if (!vertical) el('path', { class: 'e', d: `M${x1 + R + 4},${y1} L${x2 - R - 4},${y2}` });
        else el('path', { class: 'e', d: `M${x1},${y1 + R + 4} L${x2},${y2 - R - 4}` });
      }
      const [a6, a8, a2] = [pos[5], pos[7], pos[1]];
      if (!vertical) {
        el('path', { class: 'e skip', d: `M${a6[0]},${a6[1] - R - 4} C${a6[0] + 40},${a6[1] - 90} ${a8[0] - 40},${a8[1] - 90} ${a8[0]},${a8[1] - R - 4}` });
        el('text', { class: 'elab', x: (a6[0] + a8[0]) / 2, y: a6[1] - 78, 'text-anchor': 'middle' }).textContent = 'Schema ungültig';
        el('path', { class: 'e back', d: `M${a8[0]},${a8[1] + R + 48} C${a8[0] - 40},${a8[1] + 150} ${a2[0] + 40},${a2[1] + 150} ${a2[0]},${a2[1] + R + 48}` });
        el('text', { class: 'elab', x: (a8[0] + a2[0]) / 2, y: a8[1] + 148, 'text-anchor': 'middle', fill: '#44d1bd' }).textContent = '↺ nächste Runde';
      } else {
        el('path', { class: 'e skip', d: `M${a6[0] + R + 4},${a6[1]} C${a6[0] + 70},${a6[1] + 20} ${a8[0] + 70},${a8[1] - 20} ${a8[0] + R + 4},${a8[1]}` });
        el('path', { class: 'e back', d: `M${a8[0] - R - 4},${a8[1]} C${a8[0] - 62},${a8[1] - 60} ${a2[0] - 62},${a2[1] + 60} ${a2[0] - R - 4},${a2[1]}` });
      }
      halo = el('circle', { class: 'halo', r: 46, cx: pos[0][0], cy: pos[0][1] });
      nodesEl = N.map((n, i) => {
        const gg = el('g', { class: 'n' + (n[2] ? ' llm' : ''), tabindex: 0, role: 'button', 'aria-label': `${i + 1}. ${n[1]}` });
        const [x, y] = pos[i];
        el('circle', { class: 'ring', cx: x, cy: y, r: R }, gg);
        el('text', { class: 'k', x, y }, gg).textContent = i + 1;
        if (!vertical) {
          const words = n[1].split(' ');
          const l1 = words.slice(0, Math.ceil(words.length / 2)).join(' '), l2 = words.slice(Math.ceil(words.length / 2)).join(' ');
          el('text', { class: 'lab', x, y: y + R + 22 }, gg).textContent = l1;
          if (l2) el('text', { class: 'lab', x, y: y + R + 38 }, gg).textContent = l2;
          if (n[2]) el('text', { class: 'elab', x, y: y - R - 12, 'text-anchor': 'middle', fill: '#e2b277' }).textContent = 'LLM';
        } else {
          const t = el('text', { class: 'lab', x: x + R + 18, y: y + 4 }, gg); t.textContent = n[1]; t.style.textAnchor = 'start';
          if (n[2]) el('text', { class: 'elab', x: x + R + 18, y: y + 20, fill: '#e2b277' }).textContent = 'LLM';
        }
        const pick = () => { sel = i; setPlaying(false); show(i, true); };
        gg.addEventListener('click', pick);
        gg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        return gg;
      });
      show(sel != null ? sel : SEQ[idx], sel != null);
    }
    function show(i, selected) {
      nodesEl.forEach((g, j) => { g.classList.toggle('active', j === i); g.classList.toggle('sel', selected && j === i); });
      halo.setAttribute('cx', pos[i][0]); halo.setAttribute('cy', pos[i][1]);
      const n = N[i];
      const round = !selected && idx >= 8 ? '<span class="tag">Runde 2</span>' : '';
      detail.innerHTML = `<h4><span class="k">${String(i + 1).padStart(2, '0')}</span>${n[1]} <span class="tag ${n[2] ? 'llm' : 'det'}">${n[2] ? 'LLM-Aufruf' : 'deterministisch'}</span>${round}</h4><p>${n[3]}</p>`;
    }
    function tick() { idx = (idx + 1) % SEQ.length; show(SEQ[idx], false); }
    function setPlaying(p) {
      playing = p; clearInterval(timer);
      btn.textContent = p ? '❚❚ Pause' : '▶ Abspielen'; btn.setAttribute('aria-pressed', p);
      if (p) { sel = null; timer = setInterval(tick, 1500); }
    }
    btn.addEventListener('click', () => setPlaying(!playing));
    build(); setPlaying(playing);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 150); });
  }

  /* ── Lightbox ── */
  const lb = document.getElementById('lightbox');
  if (lb) {
    const lbi = lb.querySelector('img');
    document.querySelectorAll('.zoom').forEach(z => z.addEventListener('click', () => {
      lbi.src = z.dataset.full; lbi.alt = z.querySelector('img').alt; lb.showModal();
    }));
    lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.lb-close')) lb.close(); });
  }
})();
