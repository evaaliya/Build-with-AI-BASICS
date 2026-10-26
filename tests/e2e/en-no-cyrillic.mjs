/**
 * Demo mode in English must not show Cyrillic on any screen (incl. map iframe).
 * Also runs a ru smoke pass to confirm Cyrillic still appears there.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '../..');
const APP = join(ROOT, 'app');
const OUT = join(__dir, '../screens/en-no-cyrillic');
const BASE = 'http://127.0.0.1:8791';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CYR = /[\u0400-\u04FF]/;
const IGNORE_ERR = /favicon|serviceWorker|401|supabase\.co|Failed to load resource|WebGL|THREE/i;

mkdirSync(OUT, { recursive: true });

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-m', 'http.server', '8791', '--bind', '127.0.0.1'], {
      cwd: APP,
      stdio: 'pipe',
    });
    const t = setTimeout(() => resolve(child), 900);
    child.on('error', reject);
    fetch(BASE + '/')
      .then(() => { clearTimeout(t); resolve(child); })
      .catch(() => resolve(child));
  });
}

async function collectVisibleText(page) {
  return page.evaluate(() => {
    const out = [];
    const walk = (root, prefix) => {
      if (!root) return;
      const nodes = root.querySelectorAll('body *');
      for (const el of nodes) {
        if (!(el instanceof HTMLElement)) continue;
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') continue;
        const own = [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .filter(Boolean)
          .join(' ');
        if (own) out.push(prefix + own);
        for (const attr of ['placeholder', 'aria-label', 'title', 'alt']) {
          const v = el.getAttribute(attr);
          if (v && v.trim()) out.push(prefix + '[' + attr + '] ' + v.trim());
        }
      }
    };
    walk(document, '');
    const f = document.querySelector('#map3d');
    if (f && f.contentDocument) walk(f.contentDocument, '[map] ');
    return out;
  });
}

function cyrillicHits(strings) {
  return strings.filter((s) => CYR.test(s));
}

async function setLang(page, code) {
  await page.evaluate((code) => {
    try {
      localStorage.setItem('moo_lang', code);
      localStorage.setItem('moo_theme', 'light');
    } catch {}
  }, code);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#scroller', { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function enterDemo(page) {
  await page.locator('[data-act="try-demo"]').click();
  await page.waitForTimeout(1600);
}

async function go(page, sel) {
  const loc = page.locator(sel).first();
  if (await loc.count()) {
    await loc.click({ force: true }).catch(() => {});
    await page.waitForTimeout(700);
  }
}

async function scanScreens(page, label) {
  const hits = [];
  const steps = [
    ['auth-or-home', null],
    ['home', '#nav [data-go="home"]'],
    ['animals', '#nav [data-go="animals"]'],
    ['feed', '#nav [data-go="feed"]'],
    ['chat', '#nav [data-go="chat"]'],
    ['map', '#nav [data-go="map"]'],
    ['rating', '#nav [data-go="rating"]'],
    ['rewards', '[data-go="rewards"]'],
  ];
  for (const [name, sel] of steps) {
    if (sel) await go(page, sel);
    if (name === 'animals') {
      const edit = page.locator('[data-act="edit-animal"]').first();
      if (await edit.count()) {
        await edit.click();
        await page.waitForTimeout(400);
        const texts = await collectVisibleText(page);
        const bad = cyrillicHits(texts);
        if (bad.length) hits.push({ screen: 'passport', strings: bad.slice(0, 20) });
        await page.locator('[data-act="sheetclose"]').click().catch(() => {});
        await page.waitForTimeout(200);
      }
    }
    if (name === 'map') await page.waitForTimeout(2200);
    const texts = await collectVisibleText(page);
    const bad = cyrillicHits(texts);
    if (bad.length) hits.push({ screen: name, strings: bad.slice(0, 30) });
  }

  // Vet screens
  await page.evaluate(() => {
    try {
      localStorage.setItem('moo_demo_mode', '1');
      localStorage.setItem('moo_demo_role', 'vet');
    } catch {}
    const rb = document.getElementById('roleBtn');
    if (rb) { rb.hidden = false; rb.click(); }
  });
  await page.waitForTimeout(900);
  for (const [name, sel] of [
    ['vtoday', '#nav [data-go="vtoday"]'],
    ['vmap', '#nav [data-go="map"]'],
    ['vbcast', '#nav [data-go="vbroadcasts"], #nav [data-go="broadcasts"]'],
    ['vchats', '#nav [data-go="vchats"]'],
    ['vstats', '#nav [data-go="vstats"], #nav [data-go="stats"]'],
  ]) {
    await go(page, sel);
    if (name === 'vmap') await page.waitForTimeout(2200);
    const texts = await collectVisibleText(page);
    const bad = cyrillicHits(texts);
    if (bad.length) hits.push({ screen: name, strings: bad.slice(0, 30) });
  }
  return hits;
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=swiftshader-webgl', '--ignore-gpu-blocklist'],
  });
  const report = { en: null, ru: null, ok: true };

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      colorScheme: 'light',
      locale: 'en-GB',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
    });
    await setLang(page, 'en');
    // Auth screen before demo
    let texts = await collectVisibleText(page);
    let bad = cyrillicHits(texts);
    const authHits = bad.length ? [{ screen: 'auth', strings: bad.slice(0, 30) }] : [];
    await enterDemo(page);
    const demoHits = await scanScreens(page, 'en');
    report.en = { hits: authHits.concat(demoHits), errors: errors.filter((e) => !IGNORE_ERR.test(e)) };
    assert.equal(report.en.hits.length, 0, 'Cyrillic in EN UI:\n' + JSON.stringify(report.en.hits, null, 2));

    // RU regression: expect some Cyrillic after switching via the in-app language control
    for (let i = 0; i < 4; i++) {
      const cur = (await page.locator('#langBtn').innerText()).trim().toUpperCase();
      if (cur === 'RU') break;
      await page.locator('#langBtn').click();
      await page.waitForTimeout(500);
    }
    await go(page, '#nav [data-go="home"]');
    await page.waitForTimeout(600);
    texts = await collectVisibleText(page);
    bad = cyrillicHits(texts);
    const langNow = (await page.locator('#langBtn').innerText()).trim();
    report.ru = { lang: langNow, cyrillicSamples: bad.slice(0, 10), count: bad.length };
    assert.equal(langNow.toUpperCase(), 'RU', 'lang button should show RU');
    assert.ok(bad.length > 0, 'expected Cyrillic in RU UI, samples=' + JSON.stringify(texts.slice(0, 15)));

    writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.log('PASS en-no-cyrillic');
    console.log('RU samples:', report.ru.cyrillicSamples.slice(0, 5).join(' | '));
  } catch (e) {
    report.ok = false;
    report.error = String(e.message || e);
    writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.error('FAIL', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (server && server.kill) server.kill('SIGTERM');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
