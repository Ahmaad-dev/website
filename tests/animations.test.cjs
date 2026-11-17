/* Run: node tests/animations.test.cjs
   Deterministic DOM/Canvas doubles exercise lifecycle and failure paths.
   These are not browser, visual, GPU or Windows compatibility tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');

function environment({ lang = 'de', reduced = false, observer = 'normal', canvas = 'normal', raf = true } = {}) {
  const events = new Map(), frames = new Map(), timers = new Map(), observers = [], warnings = [];
  let serial = 0, now = 100;
  class Element {
    constructor(tag = 'div', id = '') {
      this.tag = tag; this.id = id; this.children = []; this.dataset = {}; this.attrs = {};
      this.style = { setProperty(k, v) { this[k] = v; } }; this.listeners = {};
      this.clientWidth = 1000; this.clientHeight = 600; this.offsetWidth = 200; this.offsetHeight = 100;
      this.textContent = ''; this.classes = new Set();
      this.classList = {
        add: (...names) => names.forEach(n => this.classes.add(n)),
        remove: (...names) => names.forEach(n => this.classes.delete(n)),
        contains: n => this.classes.has(n),
        toggle: (n, value) => { value = value ?? !this.classes.has(n); value ? this.classes.add(n) : this.classes.delete(n); return value; }
      };
    }
    set className(value) { this.classes = new Set(value.split(/\s+/)); }
    get className() { return [...this.classes].join(' '); }
    set innerHTML(value) {
      this.html = value; this.children = [];
      // Enough markup parsing for generated chart bars; mesh text stays opaque.
      for (const m of value.matchAll(/<div class="bar"[^>]*data-w="([^"]+)"[^>]*data-t="([^"]+)"/g)) {
        const b = new Element(); b.className = 'bar'; b.dataset.w = m[1]; b.dataset.t = m[2]; this.appendChild(b);
      }
    }
    get innerHTML() { return this.html || ''; }
    appendChild(el) { this.children.push(el); el.parentElement = this; return el; }
    after(el) { this.parentElement?.appendChild(el); }
    remove() { this.parentElement.children = this.parentElement.children.filter(c => c !== this); }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); }
    getAttribute(k) { return this.attrs[k]; }
    addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
    emit(k, extra = {}) { for (const fn of this.listeners[k] || []) fn({ target: this, preventDefault() {}, ...extra }); }
    querySelectorAll(selector) {
      const parts = selector.split(' '), simple = parts.pop();
      const matches = e => simple.startsWith('.') ? e.classes.has(simple.slice(1)) : simple === '[data-count]' ? 'count' in e.dataset : e.tag === simple;
      const all = this.children.flatMap(c => [c, ...c.querySelectorAll('*')]);
      if (simple === '*') return all;
      return all.filter(e => matches(e) && (!parts.length || e.parentElement?.classes.has(parts[0].slice(1))));
    }
    querySelector(s) { return this.querySelectorAll(s)[0] || null; }
    closest(s) { return s.split(',').includes(this.tag) ? this : null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    getContext() {
      if (canvas === 'throw') throw Error('Canvas blocked');
      if (canvas === 'null') return null;
      const counts = this.draws ||= {};
      return new Proxy({}, { get: (_, key) => {
        if (/create.*Gradient/.test(key)) return () => ({ addColorStop() {} });
        return () => { counts[key] = (counts[key] || 0) + 1; };
      }, set: () => true });
    }
  }
  const document = new Element('document');
  document.documentElement = { lang, scrollTop: 50, scrollHeight: 1000, clientHeight: 600 };
  document.hidden = false;
  const ids = {};
  document.getElementById = id => ids[id] || null;
  document.createElement = tag => new Element(tag);
  document.createElementNS = (_, tag) => new Element(tag);
  document.addEventListener = (k, fn) => { (events.get(k) || events.set(k, []).get(k)).push(fn); };
  const add = (id, tag = 'div', parent = document) => { const e = new Element(tag, id); ids[id] = e; parent.appendChild(e); return e; };
  const query = { matches: reduced, addEventListener: (_, fn) => events.set('motion', [fn]) };
  const context = { document, devicePixelRatio: 2, performance: { now: () => now }, console: { warn: (...v) => warnings.push(v) },
    matchMedia: () => query, setTimeout: fn => { const id = ++serial; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id),
    setInterval: fn => { const id = ++serial; timers.set(id, fn); return id; }, clearInterval: id => timers.delete(id),
    addEventListener: document.addEventListener, scrollY: 0,
  };
  context.window = context;
  if (raf) { context.requestAnimationFrame = fn => { const id = ++serial; frames.set(id, fn); return id; }; context.cancelAnimationFrame = id => frames.delete(id); }
  if (observer !== 'missing') context.IntersectionObserver = class {
    constructor(fn) { if (observer === 'throw') throw Error('Observer blocked'); this.fn = fn; observers.push(this); }
    observe(el) { this.el = el; }
    disconnect() { this.el = null; }
  };
  vm.createContext(context);
  const load = name => vm.runInContext(fs.readFileSync(path.join(root, 'site/assets/js', name + '.js'), 'utf8'), context, { filename: name });
  const dispatch = type => (events.get(type) || []).forEach(fn => fn());
  const visible = value => observers.forEach(o => { if (o.el) o.fn([{ isIntersecting: value }]); });
  const frame = () => { now += 16.67; const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(now)); };
  const timeout = () => { const batch = [...timers.values()]; timers.clear(); batch.forEach(fn => fn()); };
  const motion = value => { query.matches = value; dispatch('motion'); };
  load('motion');
  return { add, ids, context, load, dispatch, visible, frame, timeout, motion, frames, timers, warnings };
}
function project(env) {
  const { add } = env;
  add('hay', 'canvas'); add('mesh'); const stage = add('meshStage'); add('meshSvg', 'svg', stage);
  for (const id of ['meshTip', 'meshScn', 'meshStep', 'pipeDetail', 'pipePlay']) add(id);
  add('pipeSvg', 'svg', add('pipe'));
  add('lightbox', 'dialog').appendChild(add('lightboxImg', 'img'));
  const z = add('zoom', 'button'); z.className = 'zoom'; z.dataset.full = '/image.png'; const img = add('zoomImg', 'img', z); img.alt = 'Image';
  env.load('project');
}
for (const lang of ['de', 'en']) {
  for (const observer of ['normal', 'missing', 'throw']) {
    test(`${lang}: project controls and lifecycle, observer=${observer}`, () => {
      const env = environment({ lang, observer }); project(env); env.visible(true);
      assert.equal(env.ids.meshStage.querySelectorAll('.node').length, 11);
      assert.equal(env.ids.meshScn.children.length, 5);
      assert.equal(env.ids.pipeSvg.querySelectorAll('.n').length, 9);
      env.ids.meshScn.children.forEach(b => { b.emit('click'); env.frame(); });
      assert.match(env.ids.meshStep.textContent, lang === 'en' ? /Email|report|Email Agent/ : /Mail|Bericht|E-Mail/);
      env.ids.meshStage.querySelectorAll('.node')[0].emit('focus'); assert(env.ids.meshTip.classList.contains('on'));
      env.ids.meshStage.querySelectorAll('.node')[0].emit('blur'); assert(!env.ids.meshTip.classList.contains('on'));
      env.ids.pipeSvg.querySelectorAll('.n')[4].emit('keydown', { key: 'Enter' });
      assert.match(env.ids.pipeDetail.innerHTML, lang === 'en' ? /Generate correction/ : /Korrektur erzeugen/);
      assert.equal(env.ids.pipePlay.getAttribute('aria-pressed'), 'false');
      env.ids.pipePlay.emit('click'); assert.equal(env.ids.pipePlay.getAttribute('aria-pressed'), 'true');
      env.ids.zoom.emit('click'); assert.equal(env.ids.lightbox.open, true);
      env.ids.lightbox.emit('click'); assert.equal(env.ids.lightbox.open, false);
      for (let i = 0; i < 5; i++) { env.dispatch('resize'); env.timeout(); env.frame(); }
      assert.equal(env.frames.size, 2, 'one frame each for hay and mesh');
      env.motion(true); assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
      assert.match(env.ids.meshStep.textContent, /→/);
      env.motion(false); assert.equal(env.frames.size, 2);
      env.context.document.hidden = true; env.dispatch('visibilitychange');
      assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
      env.context.document.hidden = false; env.dispatch('visibilitychange'); assert.equal(env.frames.size, 2);
      assert.deepEqual(env.warnings, []);
    });
  }
  for (const canvas of ['null', 'throw']) test(`${lang}: Canvas ${canvas} leaves SVG and lightbox usable`, () => {
    const env = environment({ lang, canvas }); project(env); env.visible(true);
    assert.equal(env.ids.pipeSvg.querySelectorAll('.n').length, 9);
    assert.equal(env.ids.meshScn.children.length, 5);
    env.ids.zoom.emit('click'); assert(env.ids.lightbox.open); assert.deepEqual(env.warnings, []);
  });
  test(`${lang}: reduced motion at load, study and chart fallback`, () => {
    const env = environment({ lang, reduced: true, observer: 'missing' });
    const chart = env.add('chart'); env.add('bars', 'div', chart); env.add('tip');
    const count = env.add('count'); count.dataset.count = '255'; count.textContent = '255';
    env.load('study'); env.timeout();
    assert.equal(count.textContent, '255'); assert.equal(env.frames.size, 0);
    const bars = chart.querySelectorAll('.bar'); assert.equal(bars.length, 6);
    assert(bars.every(b => parseFloat(b.style.width) > 0));
    bars[0].emit('pointerenter'); assert.match(env.ids.tip.innerHTML, lang === 'en' ? /path-exact/ : /pfadgenau/);
    bars[0].emit('pointerleave'); assert.equal(env.ids.tip.style.opacity, 0);
  });
}
test('network: single loop after resize, live reduced motion, hidden tab, empty surface', () => {
  const env = environment(); const net = env.add('net', 'canvas'); env.load('network');
  assert.equal(env.frames.size, 1);
  for (let i = 0; i < 10; i++) { env.dispatch('resize'); env.timeout(); env.frame(); assert.equal(env.frames.size, 1); }
  env.motion(true); assert.equal(env.frames.size, 0);
  env.motion(false); assert.equal(env.frames.size, 1);
  env.context.document.hidden = true; env.dispatch('visibilitychange'); assert.equal(env.frames.size, 0);
  net.clientWidth = net.clientHeight = 0; env.dispatch('resize'); env.timeout();
  assert.deepEqual(env.warnings, []);
});
test('fallbacks: reveal, missing rAF, observer failure, drawing budget', () => {
  const env = environment({ observer: 'throw', raf: false });
  const el = env.add('reveal'); env.context.SiteMotion.reveal(el, 0);
  assert(el.classList.contains('in'));
  let called = false; const id = env.context.SiteMotion.frame(() => { called = true; });
  env.context.SiteMotion.cancel(id); env.timeout(); assert(!called);
  env.context.SiteMotion.frame(() => { called = true; }); env.timeout(); assert(called);
  const budget = env.context.SiteMotion.budget();
  for (let i = 0; i < 100; i++) budget.sample(2);
  assert.equal(budget.scale, 1);
  for (let i = 0; i < 30; i++) budget.sample(20);
  assert.equal(budget.scale, .5);
  for (let i = 0; i < 100; i++) budget.sample(20);
  assert.equal(budget.scale, .5);
});
test('all HTML pages: scripts compile, local CSS/JS exist, helpers load first, language links match', () => {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
  const pages = walk(path.join(root, 'site')).filter(p => p.endsWith('.html'));
  assert.equal(pages.length, 11);
  for (const filename of pages) {
    const html = fs.readFileSync(filename, 'utf8');
    let supportLoaded = false;
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      const src = /src="([^"]+)"/.exec(m[1]);
      if (src) {
        const asset = src[1].split('?')[0];
        assert(fs.existsSync(path.join(root, 'site', asset)), `${filename}: ${asset}`);
        if (asset.endsWith('/motion.js')) supportLoaded = true;
        else if (/\/(network|project|study)\.js$/.test(asset)) assert(supportLoaded, filename);
      } else {
        new vm.Script(m[2], { filename });
        if (m[2].includes('SiteMotion')) assert(supportLoaded, filename);
      }
    }
    for (const m of html.matchAll(/href="(\/assets\/css\/[^"?]+)[^"]*"/g)) assert(fs.existsSync(path.join(root, 'site', m[1])));
    const languages = [...html.matchAll(/<a href="([^"]+)" lang="(de|en)" hreflang="\2"/g)];
    for (const [, href, lang] of languages) {
      assert.equal(href.startsWith('/en/'), lang === 'en');
      assert(fs.existsSync(path.join(root, 'site', href, 'index.html')), href);
    }
  }
});

for (const lang of ['de', 'en']) test(`${lang}: project starts static with reduced motion`, () => {
  const env = environment({ lang, reduced: true }); project(env); env.visible(true);
  assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
  assert.equal(env.ids.pipePlay.getAttribute('aria-pressed'), 'false');
  env.ids.meshScn.children[1].emit('click');
  assert.match(env.ids.meshStep.textContent, /→/);
  assert.equal(env.frames.size, 0);
});
test('hay reuses the cached point field instead of repainting every static dot', () => {
  const env = environment(); project(env); env.visible(true);
  const draws = env.ids.hay.draws;
  const before = draws.fillRect; env.frame();
  assert(draws.drawImage > 0);
  assert(draws.fillRect - before < 1000, 'a 1000x600 field contains 6000 dots');
});
