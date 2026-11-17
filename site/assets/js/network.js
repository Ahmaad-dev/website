/* Lebendes Netz: Knoten, Kanten und Signale, die durch den Graphen laufen.
   Mausnähe zieht Knoten an und hebt sie hervor; ein Klick sendet Signale vom
   nächstgelegenen Knoten aus. Respektiert prefers-reduced-motion (Standbild). */
(function () {
  const cv = document.getElementById('net');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ACC = [68, 209, 189], INK = [233, 238, 235], AMB = [226, 178, 119];

  let W, H, DPR, nodes = [], pulses = [], LINK;
  const mouse = { x: -9999, y: -9999, active: false };

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    LINK = Math.max(110, Math.min(170, Math.sqrt(W * H) / 7.5));
    const n = Math.round(Math.min(150, Math.max(46, (W * H) / 11500)));
    nodes = [];
    for (let i = 0; i < n; i++) {
      // Dichter auf der rechten Seite, damit die Schrift links frei atmet
      const bias = Math.random() < 0.62 ? 0.42 + Math.random() * 0.58 : Math.random();
      nodes.push({
        x: bias * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() < 0.09 ? 2.6 : 1.1 + Math.random() * 1.1,
        hub: Math.random() < 0.09, glow: 0
      });
    }
  }

  function neighbours(a) {
    const out = [];
    for (const b of nodes) {
      if (b === a) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < LINK) out.push(b);
    }
    return out;
  }

  function spawnPulse(from, color) {
    const nb = neighbours(from);
    if (!nb.length) return;
    const to = nb[(Math.random() * nb.length) | 0];
    pulses.push({ a: from, b: to, t: 0, s: 0.012 + Math.random() * 0.014, hops: 3 + ((Math.random() * 4) | 0), c: color || ACC });
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    // Bewegung
    for (const p of nodes) {
      if (!reduce) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      }
      const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if (mouse.active && dm < 190) {
        const f = (1 - dm / 190);
        p.x += (mouse.x - p.x) * 0.0035 * f; p.y += (mouse.y - p.y) * 0.0035 * f;
        p.glow = Math.max(p.glow, f);
      }
      p.glow *= 0.96;
    }

    // Kanten
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) > LINK || Math.abs(dy) > LINK) continue;
        const d = Math.hypot(dx, dy);
        if (d > LINK) continue;
        const k = 1 - d / LINK;
        const g = Math.max(a.glow, b.glow);
        const c = g > 0.05 ? ACC : INK;
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.05 + 0.10 * k + 0.35 * g * k).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    // Linien zur Maus
    if (mouse.active) {
      for (const p of nodes) {
        const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (d < 150) {
          ctx.strokeStyle = `rgba(${ACC},${(0.45 * (1 - d / 150)).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
    }

    // Knoten
    for (const p of nodes) {
      const c = p.glow > 0.05 || p.hub ? ACC : INK;
      const a = p.hub ? 0.95 : 0.55 + p.glow * 0.45;
      if (p.hub || p.glow > 0.2) {
        const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14 + p.glow * 10);
        rg.addColorStop(0, `rgba(${ACC},${0.35 * Math.max(p.glow, p.hub ? 0.6 : 0)})`);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + p.glow * 1.2, 0, 6.283); ctx.fill();
    }

    // Signale
    for (let i = pulses.length - 1; i >= 0; i--) {
      const s = pulses[i];
      s.t += s.s;
      const x = s.a.x + (s.b.x - s.a.x) * s.t, y = s.a.y + (s.b.y - s.a.y) * s.t;
      // Schweif
      const tx = s.a.x + (s.b.x - s.a.x) * Math.max(0, s.t - 0.25), ty = s.a.y + (s.b.y - s.a.y) * Math.max(0, s.t - 0.25);
      const lg = ctx.createLinearGradient(tx, ty, x, y);
      lg.addColorStop(0, `rgba(${s.c},0)`); lg.addColorStop(1, `rgba(${s.c},.9)`);
      ctx.strokeStyle = lg; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = `rgba(${s.c},1)`; ctx.beginPath(); ctx.arc(x, y, 1.9, 0, 6.283); ctx.fill();
      if (s.t >= 1) {
        s.b.glow = Math.max(s.b.glow, 0.7);
        pulses.splice(i, 1);
        if (--s.hops > 0) {
          const nb = neighbours(s.b).filter(n => n !== s.a);
          if (nb.length) pulses.push({ a: s.b, b: nb[(Math.random() * nb.length) | 0], t: 0, s: s.s, hops: s.hops, c: s.c });
        }
      }
    }

    if (!reduce && pulses.length < 7 && Math.random() < 0.035) {
      const hubs = nodes.filter(n => n.hub);
      spawnPulse((hubs.length ? hubs : nodes)[(Math.random() * (hubs.length || nodes.length)) | 0], Math.random() < 0.18 ? AMB : ACC);
    }
    if (!reduce) requestAnimationFrame(step);
  }

  window.addEventListener('resize', () => { size(); if (reduce) step(); });
  window.addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; });
  document.addEventListener('pointerleave', () => { mouse.active = false; mouse.x = mouse.y = -9999; });
  window.addEventListener('pointerdown', e => {
    if (e.target.closest('a,button')) return;
    let best = null, bd = 1e9;
    for (const p of nodes) { const d = Math.hypot(p.x - e.clientX, p.y - e.clientY); if (d < bd) { bd = d; best = p; } }
    if (best) { best.glow = 1; for (let k = 0; k < 5; k++) spawnPulse(best, k % 2 ? AMB : ACC); }
  });

  size(); step();
})();
