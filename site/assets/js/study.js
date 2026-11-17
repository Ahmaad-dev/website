/* Thesis-Seite: Zähler und Diagramm der Studie */
(function () {
  const Motion = window.SiteMotion;
  const requestAnimationFrame = Motion.frame, cancelAnimationFrame = Motion.cancel;
  let reduce = Motion.reduced;
  Motion.change(() => { reduce = Motion.reduced; });

  document.querySelectorAll('[data-count]').forEach(el => Motion.once(el, () => {
    if (reduce) return;
    const end = +el.dataset.count, t0 = performance.now(), D = 1600;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / D);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 4))).toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'de-DE');
      if (reduce) { el.textContent = end.toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'de-DE'); return; }
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }, { threshold: .6 }));

  const EN = document.documentElement.lang === 'en';
  const X = EN ? { full: 'full rule set', cards: 'rule cards', path: 'path-exact', func: 'functional', of: 'of' } : { full: 'Regelwerk am Stück', cards: 'Regelkarten', path: 'pfadgenau', func: 'funktional', of: 'von' };
  const D = [['A', 'Monolith', X.full, 54, 82], ['B', 'Monolith', X.cards, 66, 85], ['C', 'Graph', X.cards, 61, 84]];
  const bars = document.getElementById('bars'), tip = document.getElementById('tip'), chart = document.getElementById('chart');
  if (!bars) return;
  const MAX = 145;
  D.forEach(d => {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<div class="lab"><b>${d[0]}</b>${d[1]}<small>${d[2]}</small></div>
      <div class="track">
        <div class="bar" style="background:#bc8139" data-w="${d[3] / MAX * 100}" data-t="<b>${d[0]} · ${X.path}</b> ${d[3]} ${X.of} 145"><span>${d[3]}</span></div>
        <div class="bar" style="background:#259e8f" data-w="${d[4] / MAX * 100}" data-t="<b>${d[0]} · ${X.func}</b> ${d[4]} ${X.of} 145"><span>${d[4]}</span></div>
      </div>`;
    bars.appendChild(row);
  });
  const ax = document.createElement('div'); ax.className = 'axis';
  ax.innerHTML = '<span></span><div>' + [0, 25, 50, 75, 100, 125, 145].map(v => `<span style="left:${v / MAX * 100}%">${v}</span>`).join('') + '</div>';
  bars.after(ax);
  const grow = () => chart.querySelectorAll('.bar').forEach((b, i) => setTimeout(() => b.style.width = b.dataset.w + '%', reduce ? 0 : i * 90));
  Motion.once(chart, grow, { threshold: .1 });
  chart.querySelectorAll('.bar').forEach(b => {
    b.addEventListener('pointerenter', () => { tip.innerHTML = b.dataset.t; tip.style.opacity = 1; });
    b.addEventListener('pointermove', e => { const r = chart.getBoundingClientRect(); tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top - 8) + 'px'; });
    b.addEventListener('pointerleave', () => tip.style.opacity = 0);
  });
})();
