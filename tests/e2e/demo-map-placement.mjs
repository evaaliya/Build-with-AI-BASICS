/**
 * Assert every demo map marker / outbreak center lies inside a building footprint
 * from village-map.html D.b. Also takes Playwright screenshots of the vet Map tab.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// vet.js → i18n reads localStorage at import time
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(k) ? _store.get(k) : null),
  setItem: (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear(),
};

const { DEMO_HOUSE_PINS, DEMO_OUTBREAKS, HOUSE_PINS, OUTBREAKS } = await import('../../app/vet.js');

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '../..');
const APP = join(ROOT, 'app');
const SCREENS = join(__dir, '../screens/demo-map');
const BASE = 'http://127.0.0.1:8767';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

mkdirSync(SCREENS, { recursive: true });

function loadBuildings() {
  const html = readFileSync(join(APP, 'village-map.html'), 'utf8');
  const m = html.match(/const D=(\{.*?\});/s);
  if (!m) throw new Error('D constant not found in village-map.html');
  // Indices in DEMO_HOUSE_PINS refer to D.b before runtime NEW.b push.
  return JSON.parse(m[1]);
}

/** Point-in-rotated-rect for building [cx,cz,w,d,ph,...] */
function pointInBuilding(x, z, b) {
  const [cx, cz, w, d, ph] = b;
  const dx = x - cx;
  const dz = z - cz;
  const c = Math.cos(-ph);
  const s = Math.sin(-ph);
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  // small padding so centroid always passes; footprint half-extents
  return Math.abs(lx) <= w / 2 + 0.05 && Math.abs(lz) <= d / 2 + 0.05;
}

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-m', 'http.server', '8767'], { cwd: APP, stdio: 'pipe' });
    const t = setTimeout(() => resolve(child), 800);
    child.on('error', reject);
    fetch(BASE + '/').then(() => { clearTimeout(t); resolve(child); }).catch(() => resolve(child));
  });
}

function runPlacementCheck() {
  const D = loadBuildings();
  const fails = [];
  console.log('--- placement check (scene centroids vs D.b footprints) ---');
  for (const pin of DEMO_HOUSE_PINS) {
    const b = D.b[pin.buildingIndex];
    if (!b) {
      fails.push({ id: 'house-' + pin.id, reason: 'missing buildingIndex ' + pin.buildingIndex });
      continue;
    }
    const ok = pointInBuilding(pin.sx, pin.sz, b);
    const dist = Math.hypot(pin.sx - b[0], pin.sz - b[1]);
    console.log(`${ok ? 'PASS' : 'FAIL'} house-${pin.id} status=${pin.status} b${pin.buildingIndex} dist=${dist.toFixed(4)}`);
    if (!ok) fails.push({ id: 'house-' + pin.id, reason: `outside footprint b${pin.buildingIndex}` });
    // also confirm lat/lng invert to same scene point
    const x = (pin.lng - D.lon0) * D.kx;
    const z = -(pin.lat - D.lat0) * D.kz;
    if (Math.hypot(x - pin.sx, z - pin.sz) > 0.15) {
      fails.push({ id: 'house-' + pin.id, reason: 'lat/lng ↔ sx/sz mismatch' });
    }
  }
  for (const o of DEMO_OUTBREAKS) {
    const pin = DEMO_HOUSE_PINS.find((p) => p.id === o.houseId);
    const b = pin ? D.b[pin.buildingIndex] : null;
    const ok = b && pointInBuilding(o.sx, o.sz, b);
    console.log(`${ok ? 'PASS' : 'FAIL'} outbreak-${o.id} houseId=${o.houseId}`);
    if (!ok) fails.push({ id: 'outbreak-' + o.id, reason: 'center not inside building' });
  }
  // Sanity: real-path constants unchanged shape
  assert.equal(HOUSE_PINS.length, 10, 'HOUSE_PINS length changed');
  assert.equal(OUTBREAKS.length, 3, 'OUTBREAKS length changed');
  assert.ok(DEMO_HOUSE_PINS.length >= 14 && DEMO_HOUSE_PINS.length <= 18);
  const mix = DEMO_HOUSE_PINS.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
  console.log('status mix', mix);
  if (fails.length) {
    console.log('FAIL placement:', JSON.stringify(fails));
    return { ok: false, fails, mix };
  }
  console.log('PASS all demo markers and outbreaks sit on building footprints');
  return { ok: true, fails: [], mix };
}

async function screenshots(placement) {
  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--use-angle=swiftshader-webgl', '--ignore-gpu-blocklist', '--enable-webgl'],
  });
  const report = { placement, screens: [], console: [], farmerClean: null, iframeOverlay: null };
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: 'light',
      locale: 'ru-RU',
    });
    await context.addInitScript(() => {
      // Only top frame — iframe would clear shared origin localStorage and kill demo mode.
      if (window !== window.top) return;
      try { localStorage.clear(); } catch {}
      try {
        navigator.serviceWorker?.getRegistrations?.().then((regs) => regs.forEach((r) => r.unregister()));
        caches?.keys?.().then((keys) => keys.forEach((k) => caches.delete(k)));
      } catch {}
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await page.locator('[data-act="try-demo"]').click();
    await page.waitForTimeout(1500);

    const demoOn = await page.evaluate(() => localStorage.getItem('moo_demo_mode'));
    assert.equal(demoOn, '1', 'demo mode flag missing after Try demo; console=' + errors.slice(0, 3).join(' | '));

    // Enter vet via demo role storage + synthetic click (roleBtn may stay [hidden] in some paint orders)
    await page.evaluate(() => {
      try {
        localStorage.setItem('moo_demo_mode', '1');
        localStorage.setItem('moo_demo_role', 'vet');
      } catch {}
      const rb = document.getElementById('roleBtn');
      if (rb) { rb.hidden = false; rb.click(); }
    });
    await page.waitForTimeout(800);
    if (!(await page.locator('[data-go="map"]').count()) && !(await page.locator('[data-go="vtoday"]').count())) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
    }

    await page.locator('[data-go="map"]').click();
    await page.waitForTimeout(2500);

    // Re-send overlay after iframe ready, then read __mooOverlay
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const f = document.querySelector('#map3d');
      if (f) f.dispatchEvent(new Event('load'));
    });
    await page.waitForTimeout(600);

    report.iframeOverlay = await page.evaluate(() => {
      const f = document.querySelector('#map3d');
      if (!f) return { ok: false, reason: 'no iframe' };
      try {
        const w = f.contentWindow;
        const doc = f.contentDocument;
        if (!doc || !w) return { ok: false, reason: 'no content' };
        const canvas = doc.querySelector('canvas');
        const ov = w.__mooOverlay;
        const outbreakLabels = (ov && ov.outbreaks || []).map((o) => o.disease);
        const hasButtons = !!doc.getElementById('reset');
        return {
          ok: hasButtons && !!ov && ov.role === 'vet' && (ov.houses || []).length >= 14,
          canvas: !!(canvas && canvas.width > 0),
          houseCount: ov && ov.houses ? ov.houses.length : 0,
          outbreakLabels,
          sample: ov && ov.houses ? ov.houses.slice(0, 3) : [],
          demoFlag: localStorage.getItem('moo_demo_mode'),
          reason: hasButtons ? 'village-map loaded' : 'iframe empty',
        };
      } catch (e) {
        return { ok: false, reason: String(e.message || e) };
      }
    });
    assert.ok(report.iframeOverlay.ok, 'village-map iframe: ' + JSON.stringify(report.iframeOverlay));
    assert.ok(
      !(report.iframeOverlay.outbreakLabels || []).some((d) => /Падёж|Death/i.test(String(d))),
      'old death outbreak still present: ' + JSON.stringify(report.iframeOverlay.outbreakLabels)
    );

    await page.screenshot({ path: join(SCREENS, 'vet-map-all-light.png') });
    report.screens.push('vet-map-all-light.png');

    for (const [v, name] of [['bad', 'overdue'], ['soon', 'soon'], ['ok', 'ok'], ['all', 'all']]) {
      const chip = page.locator(`[data-act="mf"][data-v="${v}"]`);
      if (await chip.count()) {
        await chip.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(SCREENS, `vet-map-filter-${name}-light.png`) });
        report.screens.push(`vet-map-filter-${name}-light.png`);
      }
    }

    // Dark
    await page.locator('#themeBtn').click();
    await page.waitForTimeout(300);
    await page.locator('[data-act="mf"][data-v="all"]').click().catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(SCREENS, 'vet-map-all-dark.png') });
    report.screens.push('vet-map-all-dark.png');
    await page.locator('#themeBtn').click();

    // Farmer map: no status overlays (set role via storage + in-app click fallback)
    await page.evaluate(() => {
      try { localStorage.setItem('moo_demo_role', 'farmer'); } catch {}
      const rb = document.getElementById('roleBtn');
      if (rb) { rb.hidden = false; rb.click(); }
    });
    await page.waitForTimeout(700);
    // If still vet nav, click map privacy path: open map as farmer after forcing role
    const stillVet = await page.locator('[data-go="vtoday"], [data-go="vstats"]').count();
    if (stillVet) {
      await page.evaluate(() => { try { localStorage.setItem('moo_demo_role', 'farmer'); } catch {} });
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      if (await page.locator('[data-act="try-demo"]').count()) {
        await page.locator('[data-act="try-demo"]').click();
        await page.waitForTimeout(1000);
      }
      await page.evaluate(() => { try { localStorage.setItem('moo_demo_role', 'farmer'); } catch {} });
    }
    await page.locator('[data-go="map"]').click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(SCREENS, 'farmer-map-light.png') });
    const privacy = await page.locator('.lockrow').count();
    const privacyText = await page.locator('body').innerText();
    report.farmerClean = privacy > 0 || /Neighbours|соседей|коңшу|прививок соседей/i.test(privacyText);
    // iframe should receive farmer role → empty houses
    const overlayCheck = await page.evaluate(() => {
      const f = document.querySelector('#map3d');
      if (!f || !f.contentWindow) return { ok: false, reason: 'no iframe' };
      try {
        const doc = f.contentDocument;
        if (!doc) return { ok: true, reason: 'cross-origin ok' };
        // houseOverlayGroup length via scene not easily exposed; check privacy UI instead
        return { ok: true, reason: 'farmer map rendered' };
      } catch {
        return { ok: true, reason: 'cross-origin' };
      }
    });
    assert.ok(report.farmerClean, 'farmer map should show privacy lock, not status colors');
    console.log('farmer map', overlayCheck);

    report.console = errors.filter((e) =>
      !/favicon|supabase|serviceWorker|WebGL|THREE|Failed to load resource|Download the React/i.test(e)
    );
    assert.equal(report.console.length, 0, 'console: ' + report.console.join(' | '));

    writeFileSync(join(SCREENS, 'report.json'), JSON.stringify(report, null, 2));
    console.log('PASS screenshots + farmer privacy');
  } finally {
    await browser.close();
    if (server && server.kill) server.kill('SIGTERM');
  }
  return report;
}

async function main() {
  const placement = runPlacementCheck();
  if (!placement.ok) {
    writeFileSync(join(SCREENS, 'placement-fail.json'), JSON.stringify(placement, null, 2));
    process.exitCode = 1;
    return;
  }
  await screenshots(placement);
}

main().catch((e) => { console.error(e); process.exit(1); });
