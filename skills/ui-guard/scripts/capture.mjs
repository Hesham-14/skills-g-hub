#!/usr/bin/env node
// Capture rendered evidence from an already-installed Chrome/Chromium over the
// DevTools protocol: exact-viewport screenshots, colour-scheme emulation, console
// errors, failed requests, cheap DOM checks and browser performance entries.
// Node 22+ built-ins only (global WebSocket and fetch). Downloads nothing. Uses a
// throwaway profile, so no cookies or logins from the user's browser are present.
// Only local URLs are opened unless --allow-remote is passed.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export class CaptureError extends Error {}

const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];
const PATH_NAMES = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'];

export function findChrome(env = process.env) {
  if (env.CHROME_PATH) return fs.existsSync(env.CHROME_PATH) ? env.CHROME_PATH : null;
  for (const c of CANDIDATES) if (fs.existsSync(c)) return c;
  for (const name of PATH_NAMES) {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split('\n')[0];
  }
  return null;
}

export function isLocalUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol === 'file:') return true;
  if (!['http:', 'https:'].includes(u.protocol)) return false;
  const h = u.hostname.replace(/^\[|\]$/g, '');
  return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.localhost');
}

export function parseViewport(v) {
  const m = /^(\d{2,5})x(\d{2,5})$/.exec(v);
  if (!m) throw new CaptureError(`bad viewport ${v}; use WIDTHxHEIGHT like 390x844`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

// Runs in the page before any page script: collects layout shifts and LCP.
const OBSERVER = `(() => {
  const s = (window.__uiAudit = { cls: 0, lcp: null, longTasks: 0 });
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) s.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  try { new PerformanceObserver(l => { const e = l.getEntries().at(-1); if (e) s.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
  try { new PerformanceObserver(l => { s.longTasks += l.getEntries().length; }).observe({ type: 'longtask', buffered: true }); } catch {}
})();`;

// Cheap, deterministic DOM checks. Signals, not a full accessibility audit.
const PAGE_CHECKS = W => `((W) => {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const name = el => (el.getAttribute('aria-label') || el.getAttribute('title') || (el.getAttribute('aria-labelledby') || '').split(/\\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ') || el.textContent || el.value || el.querySelector('img[alt]')?.alt || '').trim();
  const describe = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  const controls = [...document.querySelectorAll('button, a[href], [role=button], [role=link], [role=menuitem], [role=tab]')].filter(vis);
  const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')].filter(vis);
  const labelled = el => el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title');
  const doc = document.documentElement;
  const overflowing = [...document.body.querySelectorAll('*')].filter(el => { const r = el.getBoundingClientRect(); return vis(el) && (r.right > W + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed'; }).slice(0, 5).map(describe);
  const pageOverflow = doc.scrollWidth > W + 1;
  const nav = performance.getEntriesByType('navigation')[0];
  const fcp = performance.getEntriesByName('first-contentful-paint')[0];
  const a = window.__uiAudit || {};
  return {
    title: document.title, lang: doc.lang || null, dir: doc.dir || getComputedStyle(doc).direction,
    viewport: innerWidth + 'x' + innerHeight, layout_width: doc.scrollWidth, color_scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    checks: {
      horizontal_overflow: pageOverflow, overflowing_elements: pageOverflow ? overflowing : [],
      images_missing_alt: [...document.images].filter(i => vis(i) && !i.hasAttribute('alt')).length,
      unnamed_controls: controls.filter(c => !name(c)).slice(0, 10).map(describe),
      unlabeled_fields: fields.filter(f => !labelled(f)).slice(0, 10).map(describe),
      missing_lang: !doc.lang, heading_count: document.querySelectorAll('h1,h2,h3,h4,h5,h6').length, h1_count: document.querySelectorAll('h1').length,
    },
    metrics: {
      ttfb_ms: nav ? Math.round(nav.responseStart) : null,
      dom_content_loaded_ms: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load_ms: nav && nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd) : null,
      fcp_ms: fcp ? Math.round(fcp.startTime) : null,
      lcp_ms: a.lcp === null || a.lcp === undefined ? null : Math.round(a.lcp),
      cls: typeof a.cls === 'number' ? Math.round(a.cls * 1000) / 1000 : null,
      long_tasks: typeof a.longTasks === 'number' ? a.longTasks : null,
      transfer_bytes: nav ? nav.transferSize + performance.getEntriesByType('resource').reduce((n, r) => n + (r.transferSize || 0), 0) : null,
    },
  };
})(${W})`;

class Cdp {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.listeners = []; }
  open() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = e => reject(new CaptureError(`DevTools connection failed: ${e.message || 'error'}`));
      this.ws.onmessage = ev => {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve: ok, reject: bad } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) bad(new CaptureError(`${msg.error.message}`)); else ok(msg.result);
        } else if (msg.method) for (const l of this.listeners) l(msg);
      };
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  on(fn) { this.listeners.push(fn); }
  waitFor(method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new CaptureError(`timed out waiting for ${method}`)), timeoutMs);
      this.on(m => { if (m.method === method) { clearTimeout(t); resolve(m.params); } });
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

async function launch(chrome, timeoutMs) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-capture-'));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', '--disable-sync', '--disable-component-update', '--mute-audio', '--hide-scrollbars', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new CaptureError('Chrome did not expose a DevTools endpoint in time')), timeoutMs);
    proc.stderr.on('data', d => { buf += d; const m = /DevTools listening on (ws:\/\/[^\s]+)/.exec(buf); if (m) { clearTimeout(t); resolve(m[1]); } });
    proc.on('exit', code => { clearTimeout(t); reject(new CaptureError(`Chrome exited early (code ${code})`)); });
  });
  const cleanup = () => { try { proc.kill('SIGKILL'); } catch {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
  return { endpoint, cleanup };
}

async function pageSocket(endpoint) {
  const { host } = new URL(endpoint);
  const pages = await (await fetch(`http://${host}/json/list`)).json();
  const page = pages.find(p => p.type === 'page');
  if (!page) throw new CaptureError('no page target in Chrome');
  return page.webSocketDebuggerUrl;
}

export async function capture(opts) {
  if (typeof WebSocket === 'undefined') throw new CaptureError(`Node ${process.version} has no global WebSocket; capture.mjs needs Node 22+`);
  const url = opts.url;
  if (!url) throw new CaptureError('missing --url');
  if (!isLocalUrl(url) && !opts.allowRemote) throw new CaptureError(`refusing non-local URL ${url}; pass --allow-remote only for a host the user named`);
  const chrome = opts.chrome || findChrome();
  if (!chrome) throw new CaptureError('no Chrome, Chromium or Edge found (set CHROME_PATH); capture is unavailable');
  const viewports = (opts.viewports || ['1280x800', '390x844']).map(parseViewport);
  const themes = opts.themes || ['light'];
  const outDir = path.resolve(opts.outDir || '.ui-audit/shots');
  fs.mkdirSync(outDir, { recursive: true });
  const label = (opts.label || new URL(url).pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'page').slice(0, 40);
  const timeoutMs = (opts.timeout || 45) * 1000;

  const { endpoint, cleanup } = await launch(chrome, 15000);
  const guard = setTimeout(cleanup, timeoutMs + 5000);
  try {
    const version = await (await fetch(`http://${new URL(endpoint).host}/json/version`)).json();
    const cdp = new Cdp(await pageSocket(endpoint));
    await cdp.open();
    let consoleErrors = [], failedRequests = [];
    cdp.on(m => {
      if (m.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(m.params.type)) consoleErrors.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
      if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(`uncaught: ${(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').split('\n')[0].slice(0, 300)}`);
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && m.params.entry.source !== 'network') consoleErrors.push(`${m.params.entry.source}: ${m.params.entry.text.slice(0, 300)}`);
      if (m.method === 'Network.loadingFailed' && !m.params.canceled) failedRequests.push(`${m.params.errorText} (${m.params.type})`);
      if (m.method === 'Network.responseReceived' && m.params.response.status >= 400 && !/\/favicon\.ico(\?|$)/.test(m.params.response.url)) failedRequests.push(`${m.params.response.status} ${m.params.response.url.slice(0, 200)}`);
    });
    await Promise.all(['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable'].map(x => cdp.send(x)));
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVER });
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    const captures = [];
    for (const vp of viewports) {
      for (const theme of themes) {
        consoleErrors = []; failedRequests = [];
        const mobile = vp.width < 768;
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: opts.scale || 1, mobile });
        await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
        await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: opts.reducedMotion ? 'reduce' : 'no-preference' }] });
        const loaded = cdp.waitFor('Page.loadEventFired', timeoutMs);
        const nav = await cdp.send('Page.navigate', { url });
        if (nav.errorText) throw new CaptureError(`navigation failed: ${nav.errorText} (is the app running?)`);
        await loaded;
        await new Promise(r => setTimeout(r, opts.waitMs ?? 800));
        if (opts.before) {
          const r = await cdp.send('Runtime.evaluate', { expression: opts.before, awaitPromise: true });
          if (r.exceptionDetails) throw new CaptureError(`--before script failed: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
          await new Promise(res => setTimeout(res, opts.waitMs ?? 800));
        }
        const evaluated = await cdp.send('Runtime.evaluate', { expression: PAGE_CHECKS(vp.width), returnByValue: true });
        const page = evaluated.result.value;
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!opts.fullPage });
        const file = path.join(outDir, `${label}-${vp.width}x${vp.height}-${theme}${opts.state ? `-${opts.state.replace(/[^a-z0-9]+/gi, '-')}` : ''}.png`);
        const png = Buffer.from(shot.data, 'base64');
        fs.writeFileSync(file, png);
        captures.push({
          viewport: `${vp.width}x${vp.height}`, theme, state: opts.state || null, file, sha256: crypto.createHash('sha256').update(png).digest('hex'),
          page: { title: page.title, lang: page.lang, dir: page.dir, rendered_viewport: page.viewport, layout_width: page.layout_width, color_scheme: page.color_scheme },
          checks: page.checks, metrics: page.metrics, console_errors: [...new Set(consoleErrors)], failed_requests: [...new Set(failedRequests)],
        });
      }
    }
    cdp.close();
    return { tool: 'ui-guard/capture.mjs', browser: version.Browser, protocol: version['Protocol-Version'], url, captures };
  } finally {
    clearTimeout(guard);
    cleanup();
  }
}

function parse(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    const flag = ['allow-remote', 'full-page', 'reduced-motion', 'help'].includes(k);
    o[k] = flag ? true : argv[++i];
  }
  return o;
}

const HELP = `capture.mjs: screenshots and browser signals from a local page via installed Chrome

  --url URL               page to open (localhost/127.0.0.1/::1/*.localhost/file:// only by default)
  --viewports LIST        default 1280x800,390x844
  --themes LIST           light,dark (prefers-color-scheme emulation); default light
  --out-dir DIR           default .ui-audit/shots
  --label NAME            file name prefix; default from the URL path
  --state NAME            state label added to file names (pair with --before)
  --before JS             expression run after load, e.g. "document.querySelector('#open').click()"
  --wait-ms N             settle time after load and after --before; default 800
  --full-page             capture beyond the viewport
  --reduced-motion        emulate prefers-reduced-motion: reduce
  --scale N               device scale factor; default 1
  --json-out FILE         also write the result JSON to FILE
  --record FILE           add screenshots, browser signals, metrics and environment to a ui-audit record
  --build-mode MODE       dev|preview|production|static, stored with --record
  --allow-remote          permit a non-local URL the user explicitly named
  --timeout SEC           per navigation; default 45

Exit codes: 0 captured, 2 usage error, 3 capture unavailable or failed (report the gate as unavailable/blocked).`;

async function cli(argv) {
  const o = parse(argv);
  if (o.help || !argv.length) { process.stdout.write(`${HELP}\n`); return 0; }
  try {
    const result = await capture({
      url: o.url, viewports: o.viewports?.split(','), themes: o.themes?.split(','), outDir: o['out-dir'], label: o.label, state: o.state,
      before: o.before, waitMs: o['wait-ms'] ? Number(o['wait-ms']) : undefined, fullPage: o['full-page'], reducedMotion: o['reduced-motion'],
      scale: o.scale ? Number(o.scale) : undefined, allowRemote: o['allow-remote'], timeout: o.timeout ? Number(o.timeout) : undefined,
    });
    if (o['json-out']) fs.writeFileSync(o['json-out'], `${JSON.stringify(result, null, 2)}\n`);
    if (o.record) {
      const { importCapture } = await import('./ui-audit.mjs');
      result.recorded = importCapture(o.record, result, { buildMode: o['build-mode'] });
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (e) {
    process.stderr.write(`capture: ${e.message}\n`);
    return e instanceof CaptureError ? (/^(missing|bad|refusing)/.test(e.message) ? 2 : 3) : 3;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await cli(process.argv.slice(2));
