// Browser checks: overflow at three widths, no-JS content, AI controls, screenshot dialog focus.
// Needs Playwright and Google Chrome. Run: NODE_PATH=<dir containing playwright> node tests/browser.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = (p) => 'file://' + join(root, p);
const PAGES = ['index.html', 'openxense.html', 'automation.html', 'dbo.html', 'payment-system.html', 'inacash.html'];

const browser = await chromium.launch({ channel: 'chrome' });
const failures = [];
let ran = 0;
const check = async (name, fn) => { ran++; try { await fn(); } catch (e) { failures.push(`${name}: ${e.message.split('\n')[0]}`); } };
const shots = join(root, '.taste-skill', 'verified');
mkdirSync(shots, { recursive: true });

for (const width of [1440, 768, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const p of PAGES) await check(`${p}@${width} no overflow`, async () => {
    await page.goto(url(p));
    const over = await page.evaluate(() => [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !el.closest('.skip'))
      .map((el) => el.tagName + '.' + el.className).slice(0, 3));
    assert.deepEqual(over, []);
    await page.screenshot({ path: join(shots, `${p}-${width}.png`), fullPage: true });
  });
  if (width === 390) await check('mobile project title has room', async () => {
    await page.goto(url('index.html'));
    const title = page.locator('.work-row h3').first();
    assert.ok(await title.evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight) <= 2));
  });
  await page.close();
}

const noJs = await browser.newPage({ javaScriptEnabled: false });
await check('no-JS AI descriptions visible', async () => {
  await noJs.goto(url('index.html'));
  assert.ok(await noJs.getByText('All my AI tool traffic goes through it').isVisible());
});
await check('no-JS screenshot is a plain image link', async () => {
  await noJs.goto(url('openxense.html'));
  await noJs.locator('.shots a').first().click();
  assert.match(noJs.url(), /images\/openxense-landing\.jpg$/);
});

const page = await browser.newPage();
await check('script failure keeps AI descriptions readable', async () => {
  const blocked = await browser.newPage();
  try {
    await blocked.route('**/js/site.js', (route) => route.abort());
    await blocked.goto(url('index.html'));
    assert.ok(await blocked.getByText('All my AI tool traffic goes through it').isVisible());
  } finally { await blocked.close(); }
});
await check('AI component selection', async () => {
  await page.goto(url('index.html'));
  await page.getByRole('button', { name: /^9Router/ }).click();
  assert.match(await page.locator('.tool-detail').innerText(), /self-hosted by me/);
  assert.equal(await page.getByRole('button', { name: /^9Router/ }).getAttribute('aria-pressed'), 'true');
});
await check('dialog open, Escape close, focus returns', async () => {
  await page.goto(url('openxense.html'));
  const first = page.locator('.shots a').first();
  await first.focus();
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('dialog.viewer[open]').isVisible(), 'dialog not open');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog.viewer[open]').count(), 0, 'dialog still open');
  assert.ok(await first.evaluate((a) => a === document.activeElement), 'focus not returned');
});

await check('every AI selector works with keyboard', async () => {
  await page.goto(url('index.html'));
  for (const button of await page.locator('.tool button').all()) {
    await button.focus();
    await page.keyboard.press('Space');
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.tool-detail h3').innerText(), await button.evaluate((el) => el.firstChild.textContent.trim()));
  }
});
await check('every screenshot opens, closes by button and restores focus', async () => {
  await page.goto(url('openxense.html'));
  for (const link of await page.locator('.shots a').all()) {
    await link.click();
    await page.locator('.viewer img').evaluate((img) => img.decode());
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.ok(await link.evaluate((el) => el === document.activeElement));
  }
});
await check('native disclosures open with keyboard', async () => {
  for (const p of ['index.html', 'dbo.html']) {
    await page.goto(url(p));
    await page.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('details[open]').count(), 1);
  }
});
await check('all local navigation works without JavaScript', async () => {
  for (const p of PAGES) {
    await noJs.goto(url(p));
    const links = await noJs.locator('a').evaluateAll((els) => els.map((el) => el.getAttribute('href')).filter((ref) => !/^(https?:|mailto:|images\/)/.test(ref)));
    for (const ref of links) {
      await noJs.goto(new URL(ref, url(p)).href);
      assert.ok(await noJs.locator('main').isVisible());
      const hash = new URL(noJs.url()).hash;
      if (hash) assert.equal(await noJs.locator(hash).count(), 1);
    }
  }
});
await check('diagram wires: drawn inside graph at 3 widths, pause toggle, manual/retired links still', async () => {
  for (const [p, wires, manual, retired] of [
    ['index.html', 3, 0, 0],
    ['openxense.html', 4, 0, 0],
    ['automation.html', 10, 2, 0],
    ['dbo.html', 4, 0, 1],
    ['payment-system.html', 4, 1, 0],
    ['inacash.html', 4, 0, 0],
  ]) {
    await page.goto(url(p));
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      assert.equal(await page.locator('.wire').count(), wires, `${p}@${width} wires`);
      assert.ok(!await page.evaluate(() => [...document.querySelectorAll('.graph.wired')].some((g) => {
        const r = g.getBoundingClientRect();
        return [...g.querySelectorAll('.wire')].some((w) => { const b = w.getBoundingClientRect(); return b.left < r.left - 1 || b.right > r.right + 1 || b.top < r.top - 1 || b.bottom > r.bottom + 1; });
      })), `${p}@${width} wire outside graph`);
    }
    assert.equal(await page.locator('.wire.manual').count(), manual, `${p} manual wires`);
    assert.equal(await page.locator('.wire.retired').count(), retired, `${p} retired wires`);
    assert.equal(await page.locator('.wire.manual + .wire-cap + .pulse, .wire.manual + .pulse').count(), 0, `${p} manual must not pulse`);
    assert.equal(await page.locator('.wire.retired + .wire-cap + .pulse, .wire.retired + .pulse').count(), 0, `${p} retired must not pulse`);
    const toggle = page.locator('.wire-toggle').first();
    await toggle.click();
    assert.equal(await page.$eval('.graph .pulse', (e) => getComputedStyle(e).animationPlayState), 'paused', `${p} pause toggle`);
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true', `${p} aria-pressed`);
  }
});
await check('modified click on a screenshot is not intercepted', async () => {
  await page.goto(url('openxense.html'));
  const prevented = await page.$eval('.shots a', (a) => {
    const results = [];
    for (const init of [{ metaKey: true }, { ctrlKey: true }, { button: 1 }, {}]) {
      const e = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
      a.dispatchEvent(e);
      results.push(e.defaultPrevented);
      document.querySelector('dialog[open]')?.close();
    }
    return results;
  });
  assert.deepEqual(prevented, [false, false, false, true]);
});
await check('reduced motion and runtime errors', async () => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const p of PAGES) {
    await page.goto(url(p));
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  }
  await page.goto(url('automation.html'));
  await page.waitForSelector('.pulse', { state: 'attached' });
  assert.equal(await page.$eval('.pulse', (e) => getComputedStyle(e).display), 'none');
  assert.deepEqual(errors, []);
});

await browser.close();
if (failures.length) { console.log(`FAIL ${failures.length}\n` + failures.map((f) => '  - ' + f).join('\n')); process.exit(1); }
console.log(`PASS ${ran} browser checks; screenshots: ${shots}`);
