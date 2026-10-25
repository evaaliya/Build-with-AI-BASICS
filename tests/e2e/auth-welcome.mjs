/**
 * Auth-screen welcome block screenshots at 390×844 (light/dark × ru/ky/en).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '../..');
const APP = join(ROOT, 'app');
const OUT = join(__dir, '../screens/auth-welcome');
const BASE = 'http://127.0.0.1:8777';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEW = { width: 390, height: 844 };
const IGNORE_ERR = /favicon|serviceWorker|401|supabase\.co|Failed to load resource/i;

mkdirSync(OUT, { recursive: true });

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-m', 'http.server', '8777'], { cwd: APP, stdio: 'pipe' });
    const t = setTimeout(() => resolve(child), 800);
    child.on('error', reject);
    fetch(BASE + '/').then(() => { clearTimeout(t); resolve(child); }).catch(() => resolve(child));
  });
}

async function fitCheck(page) {
  return page.evaluate(() => {
    const demo = document.querySelector('[data-act="try-demo"]');
    const form = document.querySelector('#authForm');
    const vh = window.innerHeight;
    const demoBottom = demo ? demo.getBoundingClientRect().bottom : 0;
    const formBottom = form ? form.getBoundingClientRect().bottom : 0;
    const els = [...document.querySelectorAll('.auth-screen > *')];
    let overlaps = false;
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i].getBoundingClientRect();
        const b = els[j].getBoundingClientRect();
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 2 && oy > 2) overlaps = true;
      }
    }
    return {
      overlaps,
      demoVisible: !!demo && demoBottom <= vh + 2,
      formVisible: !!form && formBottom <= vh + 2,
      welcomeOpen: !!document.querySelector('.welcome-card.open'),
      hasWelcome: !!document.querySelector('.welcome-card'),
      demoBottom, formBottom, vh,
    };
  });
}

async function prepPage(page, { lang, theme, welcomeOpen }) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('#scroller', { timeout: 10000 });
  await page.evaluate(({ lang, theme, welcomeOpen }) => {
    try {
      localStorage.clear();
      localStorage.setItem('moo_lang', lang);
      localStorage.setItem('moo_theme', theme);
      if (welcomeOpen === true) localStorage.setItem('moo_auth_welcome_open', '1');
      else if (welcomeOpen === false) localStorage.setItem('moo_auth_welcome_open', '0');
      // leave unset for first-visit default when welcomeOpen === null
      else localStorage.removeItem('moo_auth_welcome_open');
    } catch {}
  }, { lang, theme, welcomeOpen });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('.auth-screen', { timeout: 15000 });
  await page.waitForTimeout(500);
}

async function run() {
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const results = [];
  const langs = ['en', 'ru', 'ky'];
  const themes = ['light', 'dark'];

  try {
    for (const theme of themes) {
      for (const lang of langs) {
        const ctx = await browser.newContext({
          viewport: VIEW,
          deviceScaleFactor: 2,
          colorScheme: theme === 'dark' ? 'dark' : 'light',
        });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e.message || e)));
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(msg.text());
        });

        // First visit → welcome open by default
        await prepPage(page, { lang, theme, welcomeOpen: null });
        let fit = await fitCheck(page);
        let state = fit.welcomeOpen ? 'open' : 'closed-unexpected';

        if (!fit.demoVisible || !fit.formVisible) {
          // Collapse to meet fold requirement
          await page.click('[data-act="welcome-toggle"]');
          await page.waitForTimeout(200);
          fit = await fitCheck(page);
          state = 'collapsed';
        }

        const name = `auth-${lang}-${theme}-${state}.png`;
        await page.screenshot({ path: join(OUT, name), fullPage: false });

        // Tabs + demo smoke
        await page.click('[data-act="auth-tab"][data-v="up"]');
        await page.waitForTimeout(120);
        await page.click('[data-act="auth-tab"][data-v="in"]');
        await page.waitForTimeout(120);
        await page.click('[data-act="try-demo"]');
        await page.waitForTimeout(700);
        const leftAuth = await page.evaluate(() => !document.querySelector('.auth-screen'));

        const realErrors = errors.filter((e) => !IGNORE_ERR.test(e));
        const ok = fit.hasWelcome && !fit.overlaps && fit.demoVisible && fit.formVisible && leftAuth && realErrors.length === 0;
        results.push({ name, ok, fit, realErrors, leftAuth, state });
        console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: demoVis=${fit.demoVisible} formVis=${fit.formVisible} overlaps=${fit.overlaps} err=${realErrors.length} demo=${leftAuth} bottoms=${fit.formBottom}/${fit.demoBottom}/${fit.vh}`);
        if (realErrors.length) console.log('  errors:', realErrors);
        await ctx.close();
      }
    }

    // Explicit collapsed screenshots (all langs, light)
    for (const lang of langs) {
      const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await prepPage(page, { lang, theme: 'light', welcomeOpen: false });
      const fit = await fitCheck(page);
      const name = `auth-${lang}-light-force-collapsed.png`;
      await page.screenshot({ path: join(OUT, name), fullPage: false });
      const ok = fit.hasWelcome && !fit.welcomeOpen && fit.demoVisible && fit.formVisible;
      console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: collapsed fit`);
      results.push({ name, ok, fit });
      await ctx.close();
    }

    // Explicit open screenshots if they fit
    for (const lang of langs) {
      const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await prepPage(page, { lang, theme: 'light', welcomeOpen: true });
      const fit = await fitCheck(page);
      const name = `auth-${lang}-light-force-open.png`;
      await page.screenshot({ path: join(OUT, name), fullPage: false });
      console.log(`${fit.hasWelcome && fit.welcomeOpen ? 'SHOT' : 'MISS'} ${name}: open=${fit.welcomeOpen} demoVis=${fit.demoVisible} formVis=${fit.formVisible} bottoms=${fit.formBottom}/${fit.demoBottom}/${fit.vh}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    try { server.kill(); } catch {}
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }
  console.log('All auth welcome checks passed. Screenshots in', OUT);
}

run().catch((e) => { console.error(e); process.exit(1); });
