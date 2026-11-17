// Progressive enhancement only: every page reads fully without this script.

// AI practice: show one component's description in the side panel.
(() => {
  const tools = document.querySelectorAll('.tool');
  const panel = document.querySelector('.tool-detail');
  if (!tools.length || !panel) return;
  const select = (tool) => {
    tools.forEach((t) => {
      t.classList.toggle('selected', t === tool);
      t.querySelector('button').setAttribute('aria-pressed', t === tool);
    });
    panel.innerHTML = `<h3>${tool.querySelector('button').firstChild.textContent.trim()}</h3>${tool.querySelector('p').outerHTML}`;
  };
  tools.forEach((t) => t.querySelector('button').addEventListener('click', () => select(t)));
  select(document.querySelector('.tool[data-default]') || tools[0]);
  document.documentElement.classList.add('ai-ready');
})();

// Diagram wires: animated connectors drawn between nodes listed in data-links="from,to[,both|manual];…".
// Without the script the text arrows stay. Manual links stay still: they are not automation.
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
    graph.querySelector('.wires')?.remove();
    const svg = el('svg', { class: 'wires', 'aria-hidden': 'true' });
    const box = graph.getBoundingClientRect();
    const stacked = matchMedia('(max-width: 640px)').matches;
    for (const link of graph.dataset.links.split(';')) {
      const [from, to, kind] = link.split(',');
      const s = graph.querySelector('#' + from).getBoundingClientRect();
      const t = graph.querySelector('#' + to).getBoundingClientRect();
      const side = !stacked && Math.abs(s.top - t.top) < 4;
      const x1 = (side ? s.right : s.left + s.width / 2) - box.left;
      const y1 = (side ? s.top + s.height / 2 : s.bottom) - box.top;
      const x2 = (side ? t.left : t.left + t.width / 2) - box.left;
      const y2 = (side ? t.top + t.height / 2 : t.top) - box.top;
      const mid = (y1 + y2) / 2;
      const d = side
        ? `M${x1} ${y1} C${x1 + 18} ${y1},${x2 - 18} ${y2},${x2} ${y2}`
        : `M${x1} ${y1} V${mid - 10} Q${x1} ${mid},${x1 + Math.sign(x2 - x1) * 10} ${mid} H${x2 - Math.sign(x2 - x1) * 10} Q${x2} ${mid},${x2} ${mid + 10} V${y2}`;
      svg.append(el('path', { d, class: 'wire' + (kind === 'manual' ? ' manual' : '') }));
      if (kind !== 'manual') svg.append(el('path', { d, class: 'pulse' }));
      if (kind === 'both') svg.append(el('path', { d, class: 'pulse back' }));
    }
    graph.prepend(svg);
  };
  graphs.forEach((graph) => {
    graph.classList.add('wired');
    new ResizeObserver(() => draw(graph)).observe(graph);
    new IntersectionObserver(([e]) => graph.classList.toggle('offscreen', !e.isIntersecting)).observe(graph);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wire-toggle';
    button.textContent = 'Pause animation';
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const paused = graph.classList.toggle('paused');
      button.setAttribute('aria-pressed', paused);
      button.textContent = paused ? 'Play animation' : 'Pause animation';
    });
    graph.append(button);
  });
})();

// Screenshots open in a dialog; without the script the link opens the full image.
(() => {
  const links = document.querySelectorAll('.shots a');
  if (!links.length || !window.HTMLDialogElement) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'viewer';
  dialog.setAttribute('aria-labelledby', 'viewer-title');
  dialog.innerHTML = '<div class="viewer-bar"><h2 id="viewer-title" class="h3"></h2><button type="button">Close</button></div><img alt="">';
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
