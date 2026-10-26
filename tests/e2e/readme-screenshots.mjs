/**
 * Regenerate docs/screenshots/* for the README: English, light, demo mode,
 * viewport 390×844 @ deviceScaleFactor 2 → 780×1688.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '../..');
const APP = join(ROOT, 'app');
const OUT = join(ROOT, 'docs/screenshots');
const BASE = 'http://127.0.0.1:8788';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEW = { width: 390, height: 844 };

mkdirSync(OUT, { recursive: true });

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-m', 'http.server', '8788', '--bind', '127.0.0.1'], {
      cwd: APP,
      stdio: 'pipe',
    });
    const t = setTimeout(() => resolve(child), 900);
    child.on('error', reject);
    fetch(BASE + '/')
      .then(() => {
        clearTimeout(t);
        resolve(child);
      })
      .catch(() => resolve(child));
  });
}

async function bootEnglishLight(page, { welcomeOpen = false } = {}) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#scroller', { timeout: 15000 });
  await page.evaluate(({ welcomeOpen }) => {
    try {
      localStorage.clear();
      localStorage.setItem('moo_lang', 'en');
      localStorage.setItem('moo_theme', 'light');
      localStorage.setItem('moo_auth_welcome_open', welcomeOpen ? '1' : '0');
    } catch {}
  }, { welcomeOpen });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#scroller', { timeout: 15000 });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await page.waitForTimeout(400);
}

async function clearToasts(page) {
  await page.evaluate(() => {
    const box = document.getElementById('toasts');
    if (box) box.innerHTML = '';
  });
}

async function forceLight(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem('moo_theme', 'light');
      localStorage.setItem('moo_lang', 'en');
    } catch {}
    document.documentElement.setAttribute('data-theme', 'light');
  });
}

async function enterDemo(page) {
  await page.locator('[data-act="try-demo"]').click();
  await page.waitForTimeout(1500);
  const demo = await page.evaluate(() => localStorage.getItem('moo_demo_mode'));
  if (demo !== '1') throw new Error('demo mode not set');
  await forceLight(page);
}

async function ensureFarmer(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem('moo_demo_mode', '1');
      localStorage.setItem('moo_demo_role', 'farmer');
    } catch {}
  });
  const rl = await page.locator('#roleBtn').innerText().catch(() => '');
  if (/Vet|🩺/.test(rl) && !/Farmer|👨‍🌾/.test(rl)) {
    await page.locator('#roleBtn').click();
    await page.waitForTimeout(500);
  }
  await forceLight(page);
}

async function ensureVet(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem('moo_demo_mode', '1');
      localStorage.setItem('moo_demo_role', 'vet');
    } catch {}
    const rb = document.getElementById('roleBtn');
    if (rb) {
      rb.hidden = false;
      rb.click();
    }
  });
  await page.waitForTimeout(900);
  if (!(await page.locator('[data-go="map"]').count())) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await forceLight(page);
  }
}

async function shot(page, name) {
  await clearToasts(page);
  await forceLight(page);
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: false });
  console.log('wrote', path);
  return path;
}

/** Compact home so all four status chips fit in the 844px viewport. */
async function prepFarmerHomeShot(page) {
  await page.addStyleTag({
    content: `
      #toasts { display: none !important; }
      .scan, .alert, .demo, .mybook, .demo-fictional { display: none !important; }
      button.rank { display: none !important; }
      .trk .btn.go { display: none !important; }
      .trk .trkline, .trk .bar { display: none !important; }
      .trk { padding: 10px 12px !important; margin: 0 !important; }
      .stack { gap: 8px !important; }
      .hrow h1 { font-size: 22px !important; margin: 0 0 2px !important; }
      .hrow .sub { font-size: 13px !important; }
      .sec { margin: 10px 0 6px !important; font-size: 12px !important; }
      .glass.card.stack { display: none !important; }
    `,
  });
  await page.waitForTimeout(200);
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll('.trk .chip')].map((c) => c.textContent.trim())
  );
  if (chips.length < 4) throw new Error('expected 4 status chips, got ' + JSON.stringify(chips));
  // Scroll animal stack into comfortable view
  await page.evaluate(() => {
    const sec = document.querySelector('.sec');
    if (sec) sec.scrollIntoView({ block: 'start' });
    const scroller = document.getElementById('scroller');
    if (scroller) scroller.scrollTop = Math.max(0, (sec?.offsetTop || 0) - 8);
  });
  await page.waitForTimeout(200);
  return chips;
}

async function prepMapEnglish(page) {
  // Translate place labels + chrome inside the village-map iframe (baked Cyrillic).
  await page.evaluate(() => {
    const map = {
      'Нижнечуйское': 'Nizhny-Chuy',
      'Гагарина': 'Gagarin St',
      'Фрунзе': 'Frunze St',
      'Новый квартал': 'New quarter',
      'Детский сад': 'Kindergarten',
      'Площадка': 'Playground',
      'Футбольное поле': 'Football field',
      'Всё село': 'Whole village',
      'Повернуть': 'Rotate',
      'Я здесь': "I'm here",
    };
    const f = document.querySelector('#map3d');
    if (!f || !f.contentDocument) return;
    const doc = f.contentDocument;
    const w = f.contentWindow;
    doc.documentElement.setAttribute('data-theme', 'light');
    doc.documentElement.setAttribute('lang', 'en');
    const hint = doc.getElementById('hint');
    if (hint) hint.style.display = 'none';
    const bar = doc.getElementById('bar');
    if (bar) bar.style.display = 'none'; // hide map chrome so labels stay clean
    for (const btn of doc.querySelectorAll('.tag')) {
      const n = btn.textContent.trim();
      if (map[n]) btn.textContent = map[n];
    }
    // Focus camera on the village center (outbreak + demo house cluster), then hide the long title tag
    const village = [...doc.querySelectorAll('.tag')].find((t) => /Nizhny-Chuy|Нижнечуй/.test(t.textContent));
    if (village) {
      village.click(); // sets goal to village + zoom 2
      village.style.visibility = 'hidden';
    }
  });
  await page.waitForTimeout(1400);
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=swiftshader-webgl', '--ignore-gpu-blocklist', '--enable-webgl'],
  });

  try {
    const context = await browser.newContext({
      viewport: VIEW,
      deviceScaleFactor: 2,
      colorScheme: 'light',
      locale: 'en-GB',
    });
    const page = await context.newPage();

    // 1) Auth — welcome open, English
    await bootEnglishLight(page, { welcomeOpen: true });
    await page.waitForSelector('.auth-screen', { timeout: 10000 });
    await page.waitForSelector('.welcome-card.open', { timeout: 5000 }).catch(async () => {
      await page.click('[data-act="welcome-toggle"]');
      await page.waitForTimeout(250);
    });
    const welcomeText = await page.locator('.welcome-card.open').innerText();
    if (!/orange/i.test(welcomeText)) {
      console.warn('WARN: welcome may not show orange:', welcomeText.slice(0, 200));
    }
    if (!/What is Moo/i.test(welcomeText)) {
      throw new Error('Auth screen not in English: ' + welcomeText.slice(0, 120));
    }
    await shot(page, 'auth.png');

    // 2) Farmer home — four status chips
    await enterDemo(page);
    await ensureFarmer(page);
    await page.locator('[data-go="home"]').click().catch(() => {});
    await page.waitForTimeout(600);
    await clearToasts(page);
    const chips = await prepFarmerHomeShot(page);
    console.log('home chips:', chips.join(' | '));
    await shot(page, 'farmer-home.png');

    // 3) Trophies — active + one lost (nav → rating, then cups tab)
    await page.locator('#nav [data-go="rating"]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-go="rewards"]').click();
    await page.waitForTimeout(700);
    await clearToasts(page);
    await forceLight(page);
    await page.addStyleTag({ content: '#toasts { display: none !important; }' });
    const lost = await page.locator('.tro.lost').count();
    const trophies = await page.locator('.tro').count();
    if (trophies < 3) throw new Error('expected trophies, got ' + trophies);
    if (lost < 1) throw new Error('expected lost trophy');
    await shot(page, 'trophies.png');

    // 4) Vet map
    await ensureVet(page);
    await page.locator('[data-go="map"]').click();
    await page.waitForTimeout(2800);
    await page.evaluate(() => {
      const f = document.querySelector('#map3d');
      if (f) f.dispatchEvent(new Event('load'));
    });
    await page.waitForTimeout(1200);
    await page.locator('[data-act="mf"][data-v="all"]').click().catch(() => {});
    await page.waitForTimeout(600);
    await clearToasts(page);
    await forceLight(page);
    await prepMapEnglish(page);
    // Hide toast + ensure filter chips wrap fully and stay inside the viewport
    await page.addStyleTag({
      content: `
        #toasts { display: none !important; }
        .map-tools { padding: 0 4px !important; }
        .fchips {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 6px !important;
          justify-content: flex-start !important;
          overflow: visible !important;
        }
        .fchips .fc {
          font-size: 12px !important;
          padding: 6px 10px !important;
          flex: 0 0 auto !important;
          white-space: nowrap !important;
        }
        .legend { font-size: 12px !important; gap: 6px 10px !important; }
      `,
    });
    await page.evaluate(() => {
      const scroller = document.getElementById('scroller');
      if (scroller) scroller.scrollTop = 0;
    });
    await page.waitForTimeout(500);
    await shot(page, 'vet-map.png');

    console.log('PASS readme-screenshots');
  } finally {
    await browser.close();
    if (server && server.kill) server.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
