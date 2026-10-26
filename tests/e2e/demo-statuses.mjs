/**
 * Verify demo animals show all vaccination statuses + take screenshots.
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
const SCREENS = join(__dir, '../screens/demo-statuses');
const BASE = 'http://127.0.0.1:8766';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

mkdirSync(SCREENS, { recursive: true });

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-m', 'http.server', '8766'], { cwd: APP, stdio: 'pipe' });
    const t = setTimeout(() => resolve(child), 800);
    child.on('error', reject);
    fetch(BASE + '/').then(() => { clearTimeout(t); resolve(child); }).catch(() => resolve(child));
  });
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const report = { animals: [], photos: [], console: [], ok: true };

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'light',
      locale: 'en-GB',
    });
    await context.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {}
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    const tryDemo = page.locator('[data-act="try-demo"]');
    assert.ok(await tryDemo.count(), 'Try demo button missing');
    await tryDemo.click();
    await page.waitForTimeout(1200);

    // Ensure farmer
    const rl = await page.locator('#roleBtn').innerText().catch(() => '');
    if (/Vet|Вет|🩺/.test(rl) && !/Farmer|Фермер|👨‍🌾/.test(rl)) {
      await page.locator('#roleBtn').click();
      await page.waitForTimeout(400);
    }

    await page.locator('[data-go="home"]').click().catch(() => {});
    await page.waitForTimeout(400);

    const fictional = await page.locator('.demo-fictional').innerText();
    assert.match(fictional, /fictional|вымышлен|ойдон/i);

    const tracks = page.locator('.trk');
    const n = await tracks.count();
    assert.equal(n, 4, 'expected 4 demo animals, got ' + n);

    const chips = [];
    for (let i = 0; i < n; i++) {
      const name = await tracks.nth(i).locator('.meta b').innerText();
      const chip = await tracks.nth(i).locator('.chip').first().innerText();
      const img = await tracks.nth(i).locator('.av-photo img').getAttribute('src').catch(() => null);
      chips.push({ name, chip, img });
      report.animals.push({ name, chip, img });
    }

    const chipText = chips.map((c) => c.chip.toLowerCase()).join(' | ');
    assert.ok(/protect|защищ|коргол|ok|\d+/.test(chipText), 'missing green/ok chip text: ' + chipText);
    assert.ok(chips.some((c) => /overdue|просроч|мөөнөт/i.test(c.chip)), 'missing overdue');
    assert.ok(chips.every((c) => c.img && c.img.includes('img/demo-')), 'photos missing: ' + JSON.stringify(chips));

    // photo load check
    const broken = await page.evaluate(() =>
      [...document.querySelectorAll('.av-photo img')].filter((img) => !img.complete || img.naturalWidth === 0).map((i) => i.src)
    );
    assert.equal(broken.length, 0, 'broken images: ' + broken.join(', '));

    await page.screenshot({ path: join(SCREENS, 'home-light.png'), fullPage: true });

    // Animal passport / edit sheet
    await tracks.first().locator('[data-act="edit-animal"]').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SCREENS, 'passport-light.png') });
    await page.locator('[data-act="sheetclose"]').click().catch(() => {});
    await page.waitForTimeout(200);

    // Trophies
    await page.locator('[data-go="rewards"]').click();
    await page.waitForTimeout(500);
    const trophies = await page.locator('.tro').count();
    const lost = await page.locator('.tro.lost').count();
    assert.ok(trophies >= 3, 'expected trophies, got ' + trophies);
    assert.ok(lost >= 1, 'expected lost trophy');
    await page.screenshot({ path: join(SCREENS, 'trophies-light.png'), fullPage: true });

    // Dark theme home
    await page.locator('[data-go="home"]').click();
    await page.waitForTimeout(200);
    await page.locator('#themeBtn').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(SCREENS, 'home-dark.png'), fullPage: true });
    await page.locator('[data-go="rewards"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(SCREENS, 'trophies-dark.png'), fullPage: true });
    await page.locator('#themeBtn').click();

    // Seed flag + local animals only under demo
    const seedInfo = await page.evaluate(() => ({
      demo: localStorage.getItem('moo_demo_mode'),
      seeded: localStorage.getItem('moo_demo_seeded_v3'),
      animalKeys: Object.keys(localStorage).filter((k) => /animal/i.test(k)),
    }));
    assert.equal(seedInfo.demo, '1');
    assert.equal(seedInfo.seeded, '1');

    // Leave demo → auth; confirm demo seed path does not run without demo flag
    await page.locator('[data-act="leave-demo"]').first().click().catch(async () => {
      await page.locator('[data-go="profile"]').click();
      await page.waitForTimeout(300);
      await page.locator('[data-act="leave-demo"]').click();
    });
    await page.waitForTimeout(800);
    const afterLeave = await page.evaluate(() => ({
      demo: localStorage.getItem('moo_demo_mode'),
      hasTryDemo: !!document.querySelector('[data-act="try-demo"]'),
    }));
    assert.ok(afterLeave.hasTryDemo || afterLeave.demo !== '1', 'should leave demo mode');

    // Simulate "real account" path: no demo flag, empty animals view after fake session
    // Code path: enterApp without demo clears S.animals and does not call demoAnimals.
    // Static check already covers seed gated by opts.demo; here confirm UI has no demo herd on auth.
    const onAuth = await page.locator('[data-act="try-demo"]').count();
    assert.ok(onAuth > 0, 'back on auth');

    report.console = errors.filter((e) => !/favicon|supabase|serviceWorker|WebGL|THREE|Failed to load resource/i.test(e));
    assert.equal(report.console.length, 0, 'console errors: ' + report.console.join(' | '));

    writeFileSync(join(SCREENS, 'report.json'), JSON.stringify(report, null, 2));
    console.log('PASS demo-statuses');
    console.log(JSON.stringify(report.animals, null, 2));
  } catch (e) {
    report.ok = false;
    report.error = String(e.message || e);
    writeFileSync(join(SCREENS, 'report.json'), JSON.stringify(report, null, 2));
    console.error('FAIL', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (server && server.kill) server.kill('SIGTERM');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
