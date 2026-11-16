/* Thesis-Seite: Zähler und Diagramm der Studie */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    if (reduce) return;
    const el = e.target, end = +el.dataset.count, t0 = performance.now(), D = 1600;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / D);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 4))).toLocaleString('de-DE');
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }), { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));

  const D = [['A', 'Monolith', 'Regelwerk am Stück', 54, 82], ['B', 'Monolith', 'Regelkarten', 66, 85], ['C', 'Graph', 'Regelkarten', 61, 84]];
  const bars = document.getElementById('bars'), tip = document.getElementById('tip'), chart = document.getElementById('chart');
  if (!bars) return;
  const MAX = 145;
  D.forEach(d => {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<div class="lab"><b>${d[0]}</b>${d[1]}<small>${d[2]}</small></div>
      <div class="track">
        <div class="bar" style="background:#bc8139" data-w="${d[3] / MAX * 100}" data-t="<b>${d[0]} · pfadgenau</b> ${d[3]} von 145"><span>${d[3]}</span></div>
        <div class="bar" style="background:#259e8f" data-w="${d[4] / MAX * 100}" data-t="<b>${d[0]} · funktional</b> ${d[4]} von 145"><span>${d[4]}</span></div>
      </div>`;
    bars.appendChild(row);
  });
  const ax = document.createElement('div'); ax.className = 'axis';
  ax.innerHTML = '<span></span><div>' + [0, 25, 50, 75, 100, 125, 145].map(v => `<span style="left:${v / MAX * 100}%">${v}</span>`).join('') + '</div>';
  bars.after(ax);
  const grow = () => chart.querySelectorAll('.bar').forEach((b, i) => setTimeout(() => b.style.width = b.dataset.w + '%', reduce ? 0 : i * 90));
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { o.disconnect(); grow(); } }), { threshold: 0.4 }).observe(chart);
  chart.querySelectorAll('.bar').forEach(b => {
    b.addEventListener('pointerenter', () => { tip.innerHTML = b.dataset.t; tip.style.opacity = 1; });
    b.addEventListener('pointermove', e => { const r = chart.getBoundingClientRect(); tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top - 8) + 'px'; });
    b.addEventListener('pointerleave', () => tip.style.opacity = 0);
  });
})();
