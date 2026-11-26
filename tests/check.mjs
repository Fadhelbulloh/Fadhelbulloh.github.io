// Content, link and privacy checks for every page. Run: node tests/check.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'openxense.html', 'automation.html', 'dbo.html', 'payment-system.html', 'inacash.html'];
const CV = 'cv/Fadhel_Hasbullah_CV.pdf';
const read = (f) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : '');
const text = (s) => s.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const has = (body, s) => (s instanceof RegExp ? s.test(body) : body.includes(s));

const failures = [];
let ran = 0;
const check = (name, fn) => { ran++; try { fn(); } catch (e) { failures.push(`${name}: ${e.message}`); } };

// Visitor-facing text must never contain these: private client name, local payment jargon,
// phone number, server addresses/paths, absolute AI guarantees, private source references.
const FORBIDDEN = [/VALO/, /QRIS/, /PPOB/, /0877|877-2077/, /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, /~\/|\/home\/|\/Users\//, /\.ssh|id_ed25519/,
  /cannot invent|never (makes|make) up/i, /content-factory\/|career\/README|architecture documentation/i];

for (const page of PAGES) {
  const html = read(page);
  check(`${page} exists`, () => assert.ok(html, 'missing'));
  if (!html) continue;
  check(`${page} basics`, () => {
    assert.match(html, /<html[^>]*lang="en"/, 'lang="en"');
    assert.match(html, /<title>[^<]{5,}<\/title>/, 'title');
    assert.match(html, /<meta name="description" content="[^"]{20,}"/, 'description');
    assert.ok(html.includes('href="css/site.css"') && html.includes('src="js/site.js"'), 'shared css/js');
    assert.ok(html.includes('<link rel="icon" href="favicon.svg"'), 'favicon');
  });
  check(`${page} local refs resolve`, () => {
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|#)/.test(ref)) continue;
      assert.ok(existsSync(join(root, ref.split(/[?#]/)[0])), `missing ${ref}`);
      const hash = ref.split('#')[1];
      if (hash && ref.endsWith('.html#' + hash)) assert.ok(read(ref.split('#')[0]).includes(`id="${hash}"`), `missing anchor ${ref}`);
    }
  });
  check(`${page} private content absent`, () => FORBIDDEN.forEach((re) => assert.doesNotMatch(html, re)));
  check(`${page} no content hidden in markup`, () => assert.doesNotMatch(html, /style="[^"]*(opacity:\s*0[;"]|visibility:\s*hidden)|\shidden[\s>=]/));
  if (page !== 'index.html') check(`${page} back link`, () => assert.match(html, /<a class="back" href="index\.html(#\w+)?"/));
  check(`${page} images described and sized`, () => {
    for (const [img] of html.matchAll(/<img\b[^>]*>/g)) for (const a of [/alt="[^"]{10,}"/, /width="\d+"/, /height="\d+"/]) assert.match(img, a, `${img.slice(0, 60)} missing ${a}`);
  });
}

const pages = Object.fromEntries(PAGES.map((p) => [p, read(p)]));
const rule = (page, mustContain, mustNotContain = []) => check(`${page} content`, () => {
  const body = pages[page] + ' ' + text(pages[page]);
  for (const s of mustContain) assert.ok(has(body, s), `missing ${s}`);
  for (const s of mustNotContain) assert.ok(!has(body, s), `contains ${s}`);
});

rule('index.html', [
  'id="ai"', 'id="work"', 'id="contact"', ...PAGES.slice(1).map((p) => `href="${p}"`),
  'https://github.com/Fadhelbulloh/opencode-delegate', 'https://github.com/decolua/9router', 'https://github.com/Fadhelbulloh/offerbound', 'Hermes', 'n8n', 'OpenCode',
  'mailto:fadhelhasbullah.fh@gmail.com', 'https://linkedin.com/in/fadhel-hasbullah', 'https://github.com/Fadhelbulloh',
  'Astro', 'Pelukdiri', 'Pertamina', 'eBdesk', /co-founder/i, 'Payment System',
], [/Payments\. Orders\. Rescued/]);
check('index.html AI labels honest', () => {
  const item = (name) => [...pages['index.html'].matchAll(/<(?:li|button|details)\b[\s\S]*?<\/(?:li|button|details)>/g)].map((m) => text(m[0])).filter((t) => t.includes(name)).join(' ');
  assert.match(item('9Router'), /self-hosted/i, '9Router not labelled self-hosted');
  assert.doesNotMatch(item('9Router'), /\bbuilt\b/i, '9Router labelled built');
  assert.match(item('opencode-delegate'), /\bbuilt\b/i, 'opencode-delegate not labelled built');
});
rule('openxense.html', ['https://openxense.com', /co-founder/i, /built from zero/i, 'Go gateway', 'LiteLLM', 'PostgreSQL', 'Redis', /QR-code payments/, 'max_budget'],
  [/n8n/i, /Threads/, /Hermes/, /Content Factory/i, /job pipeline/i, /\d[\d,.]*\s*(users|requests|customers)/i]);
check('openxense.html screenshots link to full image', () => {
  const links = [...pages['openxense.html'].matchAll(/<a\b[^>]*href="(images\/[^"]+)"[^>]*>\s*<img\b[^>]*src="([^"]+)"/g)];
  assert.ok(links.length >= 3, `needs 3 linked screenshots, has ${links.length}`);
});
rule('automation.html', ['Hermes', 'PostgreSQL', 'n8n', 'Python', 'Threads', 'Telegram', 'Redis', /job pipeline/i, 'href="index.html#ai"',
  'href="https://github.com/Fadhelbulloh/offerbound"', 'href="https://pypi.org/project/offerbound/"', /review and send/i],
  [/auto(matically)?[- ]?(appl|submit)/i, /part of OpenXense/i]);
rule('dbo.html', ['1,080', '482.5', /55\.3%/, /8 (interleaved )?rounds/, '80 calls', /38%/, /decommission/i, '<details', /not a production-wide/i, 'MySQL', 'OpenSearch'],
  [/35%/, /cost sav/i]);
rule('payment-system.html', ['Payment System', /Bank Indonesia/, /audit trail/i, /80%/, 'GitHub Actions']);
rule('inacash.html', ['INACASH', /QR-code payments/, /virtual account/i, /bill payments/, /2 hours/, /zero data loss/i]);

const css = read('css/site.css');
check('css reduced motion', () => assert.match(css, /prefers-reduced-motion/));
check('css focus visible', () => assert.match(css, /:focus-visible/));

check('CV is linked from Google Drive, not shipped', () => {
  assert.match(pages['index.html'], /href="https:\/\/drive\.google\.com\/[^"]+"[^>]*>CV/);
  assert.ok(!existsSync(join(root, CV)), `${CV} present in repo`);
});
check('no private planning docs or CV tracked in git', () => {
  const tracked = execFileSync('git', ['ls-files', 'cv', 'docs', '.superpowers', '.taste-skill'], { cwd: root, encoding: 'utf8' }).trim();
  assert.equal(tracked, '', `tracked: ${tracked}`);
});

if (failures.length) {
  console.log(`FAIL ${failures.length}/${ran}\n` + failures.map((f) => '  - ' + f).join('\n'));
  process.exit(1);
}
console.log(`PASS ${ran} checks`);
