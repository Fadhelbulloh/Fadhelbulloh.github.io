// Progressive enhancement only: every page reads fully without this script.

// 1. Colour by chapter: sticky header adapts to the dark closing chapter.
(() => {
  const head = document.querySelector('.site-head');
  const dark = document.querySelector('.contact-chapter');
  if (!head || !dark) return;
  const sync = () => {
    const h = head.getBoundingClientRect().height || 64;
    head.classList.toggle('head-dark', dark.getBoundingClientRect().top <= h);
  };
  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; sync(); });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  sync();
})();

// 2. Scroll entrances: only activated once script runs so failed/disabled JS never hides content.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (reduced || !items.length || !window.IntersectionObserver) return;
  const vh = window.innerHeight || 900;
  items.forEach((el) => {
    if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add('is-in');
  });
  document.documentElement.classList.add('anim-ready');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -4% 0px', threshold: 0.01 });
  items.forEach((el) => { if (!el.classList.contains('is-in')) io.observe(el); });
})();

// 3. AI practice workbench: show one component's role, attribution and links in the sticky stage.
(() => {
  const tools = document.querySelectorAll('.tool');
  const panel = document.querySelector('.tool-detail');
  if (!tools.length || !panel) return;
  const select = (tool) => {
    tools.forEach((t) => {
      t.classList.toggle('selected', t === tool);
      t.querySelector('button').setAttribute('aria-pressed', String(t === tool));
    });
    const btn = tool.querySelector('button');
    const name = btn.firstChild.textContent.trim();
    const role = btn.querySelector('small')?.textContent.trim() || '';
    const desc = tool.querySelector('p').outerHTML;
    panel.innerHTML = `<p class="tool-detail-role">${role}</p><h3>${name}</h3>${desc}`;
  };
  tools.forEach((t) => t.querySelector('button').addEventListener('click', () => select(t)));
  select(document.querySelector('.tool[data-default]') || tools[0]);
  document.documentElement.classList.add('ai-ready');
})();

// 4. Orthogonal schematic wires: 90-degree SVG traces between nodes in data-links="from,to[,both|manual|retired];…".
// Automated flows carry continuous motion with a pause control; manual and retired links stay static.
(() => {
  const graphs = document.querySelectorAll('.graph[data-links]');
  if (!graphs.length || !window.ResizeObserver) return;
  const ns = 'http://www.w3.org/2000/svg';
  const el = (name, attrs) => {
    const node = document.createElementNS(ns, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  const draw = (graph) => {
    const canvas = graph.querySelector('.graph-canvas') || graph;
    canvas.querySelector('.wires')?.remove();
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const svg = el('svg', {
      class: 'wires',
      viewBox: `0 0 ${box.width} ${box.height}`,
      width: String(box.width),
      height: String(box.height),
      'aria-hidden': 'true'
    });
    const stacked = matchMedia('(max-width: 680px)').matches;
    for (const raw of graph.dataset.links.split(';')) {
      const link = raw.trim();
      if (!link) continue;
      const [from, to, kind = 'auto'] = link.split(',');
      const srcEl = graph.querySelector('#' + from);
      const dstEl = graph.querySelector('#' + to);
      if (!srcEl || !dstEl) continue;
      const s = srcEl.getBoundingClientRect();
      const t = dstEl.getBoundingClientRect();
      const sCy = s.top + s.height / 2;
      const tCy = t.top + t.height / 2;
      const sameRow = !stacked && Math.abs(sCy - tCy) < 16;

      let x1, y1, x2, y2, d;
      if (sameRow) {
        const ltr = s.left < t.left;
        x1 = (ltr ? s.right : s.left) - box.left;
        x2 = (ltr ? t.left : t.right) - box.left;
        y1 = sCy - box.top;
        y2 = tCy - box.top;
        d = `M${x1} ${y1} H${x2}`;
      } else if (s.top >= t.bottom - 4) {
        // Upward vertical orthogonal route (e.g. CI/CD deploy into core)
        x1 = s.left + s.width / 2 - box.left;
        y1 = s.top - box.top;
        x2 = t.left + t.width / 2 - box.left;
        y2 = t.bottom - box.top;
        const mid = (y1 + y2) / 2;
        d = Math.abs(x2 - x1) < 2 ? `M${x1} ${y1} V${y2}` : `M${x1} ${y1} V${mid} H${x2} V${y2}`;
      } else {
        // Downward vertical orthogonal route
        x1 = s.left + s.width / 2 - box.left;
        y1 = s.bottom - box.top;
        x2 = t.left + t.width / 2 - box.left;
        y2 = t.top - box.top;
        const mid = (y1 + y2) / 2;
        d = Math.abs(x2 - x1) < 2 ? `M${x1} ${y1} V${y2}` : `M${x1} ${y1} V${mid} H${x2} V${y2}`;
      }

      const cls = kind === 'manual' ? 'wire manual' : kind === 'retired' ? 'wire retired' : 'wire';
      svg.append(el('path', { d, class: cls }));
      const capCls = kind === 'manual' ? 'wire-cap manual' : kind === 'retired' ? 'wire-cap retired' : 'wire-cap';
      svg.append(el('rect', { x: String(x2 - 3), y: String(y2 - 3), width: '6', height: '6', class: capCls }));
      if (kind !== 'manual' && kind !== 'retired') svg.append(el('path', { d, class: 'pulse' }));
      if (kind === 'both') svg.append(el('path', { d, class: 'pulse back' }));
    }
    canvas.prepend(svg);
  };

  graphs.forEach((graph) => {
    graph.classList.add('wired');
    const canvas = graph.querySelector('.graph-canvas') || graph;
    new ResizeObserver(() => draw(graph)).observe(canvas);
    new IntersectionObserver(([e]) => graph.classList.toggle('offscreen', !e.isIntersecting)).observe(graph);
    const hasAuto = graph.dataset.links.split(';').some((l) => {
      const k = (l.split(',')[2] || 'auto').trim();
      return k !== 'manual' && k !== 'retired';
    });
    if (hasAuto) {
      const bar = graph.querySelector('.graph-bar') || graph;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wire-toggle';
      button.textContent = 'Pause motion';
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        const paused = graph.classList.toggle('paused');
        button.setAttribute('aria-pressed', String(paused));
        button.textContent = paused ? 'Play motion' : 'Pause motion';
      });
      bar.append(button);
    }
  });
})();

// 5. Screenshot lightbox dialog: without JS the link opens the full image; modified clicks are untouched.
(() => {
  const links = document.querySelectorAll('.shots a');
  if (!links.length || !window.HTMLDialogElement) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'viewer';
  dialog.setAttribute('aria-labelledby', 'viewer-title');
  dialog.innerHTML = '<div class="viewer-bar"><h2 id="viewer-title"></h2><button type="button">Close</button></div><img alt="">';
  document.body.append(dialog);
  const [title, img] = [dialog.querySelector('h2'), dialog.querySelector('img')];
  let opener;
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => opener?.focus());
  links.forEach((a) => a.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    opener = a;
    const thumb = a.querySelector('img');
    title.textContent = a.querySelector('span').textContent;
    img.src = a.href;
    img.alt = thumb.alt;
    dialog.showModal();
  }));
})();
