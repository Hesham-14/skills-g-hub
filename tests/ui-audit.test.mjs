import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareRecords, validateRecord, detect } from '../skills/ui-guard/scripts/ui-audit.mjs';
import { findChrome } from '../skills/ui-guard/scripts/capture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = path.join(ROOT, 'skills/ui-guard/scripts/ui-audit.mjs');
const CAPTURE = path.join(ROOT, 'skills/ui-guard/scripts/capture.mjs');
const FIXTURES = path.join(ROOT, 'tests/ui-workflow/fixtures');

function audit(args, opts = {}) {
  return spawnSync(process.execPath, [AUDIT, ...args], { encoding: 'utf8', ...opts });
}

function ok(args, opts) {
  const r = audit(args, opts);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout.trim().startsWith('{') ? JSON.parse(r.stdout) : r.stdout.trim();
}

function project(t, files = { 'index.html': '<!doctype html><html lang="en"><title>x</title><h1>Hi</h1></html>\n' }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-audit-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const git = (...a) => spawnSync('git', ['-C', dir, ...a], { encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), body);
  }
  fs.writeFileSync(path.join(dir, '.gitignore'), '.ui-audit/\n');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'base');
  return dir;
}

function init(dir, cls = 'standard') {
  return ok(['init', '--project-dir', dir, '--task', 'Fixture task', '--class', cls, '--scope', 'index.html', '--print-path']);
}

function shot(dir, name = 'shot.png') {
  fs.mkdirSync(path.join(dir, '.ui-audit/shots'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ui-audit/shots', name), Buffer.from('89504e470d0a1a0a', 'hex'));
  return `.ui-audit/shots/${name}`;
}

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

test('a new record is valid, starts with every gate not_run and is never a pass', t => {
  const dir = project(t);
  const rec = init(dir);
  const record = read(rec);
  assert.equal(record.schema, 'ui-audit/v1');
  assert.deepEqual(record.required_gates, ['visual', 'a11y']);
  assert.match(record.git.baseline.commit, /^[0-9a-f]{40}$/);
  assert.equal(record.agent_usage.status, 'unavailable');
  assert.deepEqual(validateRecord(record, dir), []);
  const fin = ok(['finalize', '--record', rec]);
  assert.equal(fin.verdict.status, 'incomplete');
  assert.ok(Object.values(fin.gates).every(s => s === 'not_run'));
});

test('required gates follow the task class', t => {
  const dir = project(t);
  assert.deepEqual(read(init(dir, 'trivial')).required_gates, ['visual']);
  assert.deepEqual(read(init(dir, 'redesign')).required_gates, ['visual', 'ux', 'a11y', 'functional', 'architecture']);
});

test('a pass needs real evidence: no claims, no build-as-visual, no failing exit codes', t => {
  const dir = project(t);
  const rec = init(dir);
  let r = audit(['check', '--record', rec, '--gate', 'a11y', '--name', 'looked fine', '--status', 'pass']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /needs recorder-captured exit code 0 or at least one evidence/);
  r = audit(['check', '--record', rec, '--gate', 'build', '--name', 'tests', '--status', 'pass', '--exit-code', '1']);
  assert.match(r.stderr, /exit code 1 cannot be a pass/);
  const log = ok(['evidence', '--record', rec, '--kind', 'log', '--tool', 'terminal', '--observed', 'npm run build: ok']).evidence;
  r = audit(['check', '--record', rec, '--gate', 'visual', '--name', 'build passed', '--status', 'pass', '--evidence', log]);
  assert.match(r.stderr, /visual pass needs screenshot evidence/);
  const ev = ok(['evidence', '--record', rec, '--kind', 'screenshot', '--tool', 'fixture', '--path', shot(dir), '--viewport', '390x844']).evidence;
  ok(['check', '--record', rec, '--gate', 'visual', '--name', 'phone look', '--status', 'pass', '--evidence', ev]);
  assert.equal(read(rec).checks.length, 1, 'rejected checks are not written');
});

test('run captures the real exit code, duration and a redacted output tail', t => {
  const dir = project(t);
  const rec = init(dir);
  const pass = ok(['run', '--record', rec, '--gate', 'build', '--name', 'ok', '--', process.execPath, '-e', 'console.log("token=abc123secret")']);
  assert.equal(pass.status, 'pass');
  const fail = ok(['run', '--record', rec, '--gate', 'functional', '--name', 'boom', '--', process.execPath, '-e', 'process.exit(3)']);
  assert.equal(fail.status, 'fail');
  assert.equal(fail.exit_code, 3);
  const missing = ok(['run', '--record', rec, '--gate', 'functional', '--name', 'no tool', '--', 'definitely-not-a-command-xyz']);
  assert.equal(missing.status, 'unavailable');
  const checks = read(rec).checks;
  assert.equal(checks[0].captured_by, 'recorder');
  assert.match(checks[0].output_tail, /token=\[redacted\]/);
  assert.doesNotMatch(checks[0].output_tail, /abc123secret/);
  assert.equal(ok(['finalize', '--record', rec]).verdict.status, 'fail');
});

test('evidence must be a local project file and is pinned by hash', t => {
  const dir = project(t);
  const rec = init(dir);
  let r = audit(['evidence', '--record', rec, '--kind', 'screenshot', '--tool', 'x', '--path', 'https://example.com/a.png']);
  assert.match(r.stderr, /not a URL/);
  const outside = path.join(path.dirname(dir), `${path.basename(dir)}-outside.png`);
  fs.writeFileSync(outside, 'x');
  t.after(() => fs.rmSync(outside, { force: true }));
  r = audit(['evidence', '--record', rec, '--kind', 'screenshot', '--tool', 'x', '--path', `../${path.basename(outside)}`]);
  assert.match(r.stderr, /outside the project/);
  const p = shot(dir);
  ok(['evidence', '--record', rec, '--kind', 'screenshot', '--tool', 'x', '--path', p]);
  fs.writeFileSync(path.join(dir, p), 'swapped');
  const v = audit(['validate', rec]);
  assert.equal(v.status, 1);
  assert.match(v.stdout, /file changed since it was recorded/);
});

test('findings drive the verdict and a hand-edited verdict is caught', t => {
  const dir = project(t);
  const rec = init(dir, 'trivial');
  let r = audit(['finding', '--record', rec, '--severity', 'P1', '--gate', 'a11y', '--title', 'No label', '--basis', 'rendered']);
  assert.match(r.stderr, /rendered finding needs evidence/);
  const ev = ok(['evidence', '--record', rec, '--kind', 'screenshot', '--tool', 'x', '--path', shot(dir)]).evidence;
  ok(['check', '--record', rec, '--gate', 'visual', '--name', 'look', '--status', 'pass', '--evidence', ev]);
  const fd = ok(['finding', '--record', rec, '--severity', 'P1', '--gate', 'a11y', '--title', 'No label', '--basis', 'rendered', '--evidence', ev]).finding;
  assert.equal(ok(['finalize', '--record', rec]).verdict.status, 'fail');
  ok(['finding', '--record', rec, '--update', fd, '--status', 'fixed']);
  assert.equal(ok(['finalize', '--record', rec]).verdict.status, 'pass');
  const record = read(rec);
  record.findings[0].status = 'open';
  fs.writeFileSync(rec, JSON.stringify(record));
  assert.match(audit(['validate', rec]).stdout, /recorded pass but the checks and findings give fail/);
});

test('a Playwright JSON report becomes an imported check', t => {
  const dir = project(t, { 'results.json': JSON.stringify({ stats: { expected: 4, unexpected: 1, flaky: 0, skipped: 2, duration: 1234.5 } }) });
  const rec = init(dir);
  const r = ok(['import-playwright', '--record', rec, '--report', 'results.json', '--command', 'npx --no-install playwright test']);
  assert.equal(r.status, 'fail');
  assert.match(r.note, /unexpected 1/);
});

test('agent usage is recorded only with a named source', t => {
  const dir = project(t);
  const rec = init(dir);
  assert.equal(audit(['usage', '--record', rec, '--input-tokens', '10']).status, 2);
  assert.equal(audit(['usage', '--record', rec, '--source', 'x', '--input-tokens', '-4']).status, 2);
  ok(['usage', '--record', rec, '--source', 'claude -p result.usage', '--input-tokens', '1200', '--output-tokens', '300']);
  assert.deepEqual(validateRecord(read(rec), dir), []);
});

function baseRecord(dir) {
  const rec = init(dir);
  const ev = ok(['evidence', '--record', rec, '--kind', 'screenshot', '--tool', 'x', '--path', shot(dir, `${path.basename(rec)}.png`)]).evidence;
  ok(['check', '--record', rec, '--gate', 'visual', '--name', 'look', '--status', 'pass', '--evidence', ev]);
  ok(['env', '--record', rec, '--tool', 'capture', '--browser', 'Chrome', '--browser-version', '156.0.1', '--build-mode', 'preview']);
  return rec;
}

test('compare reports gate, finding and metric regressions; small or incomparable moves are not verdicts', t => {
  const dir = project(t);
  const a = baseRecord(dir), b = baseRecord(dir);
  for (const [rec, lcp, cls] of [[a, 1000, 0.01], [b, 1400, 0.012]]) {
    ok(['metric', '--record', rec, '--name', 'lcp_ms', '--value', String(lcp), '--unit', 'ms', '--better', 'lower', '--source', 'test', '--viewport', '390x844']);
    ok(['metric', '--record', rec, '--name', 'cls', '--value', String(cls), '--unit', 'score', '--better', 'lower', '--source', 'test', '--viewport', '390x844']);
  }
  const ev = read(b).evidence[0].id;
  ok(['finding', '--record', b, '--severity', 'P2', '--gate', 'visual', '--title', 'Price wraps', '--basis', 'rendered', '--evidence', ev, '--location', 'offers.html:41']);
  const result = compareRecords(read(a), read(b));
  assert.ok(result.compatible);
  assert.ok(result.regressions.some(r => r.includes('lcp_ms')));
  assert.ok(result.regressions.some(r => r.includes('Price wraps')));
  assert.ok(!result.regressions.some(r => r.startsWith('cls')), 'a 0.002 CLS move is noise');
  const cli = audit(['compare', a, b]);
  assert.equal(cli.status, 1);
  const other = read(b);
  other.environment.build_mode = 'dev';
  const diffEnv = compareRecords(read(a), other);
  assert.ok(diffEnv.metrics.every(m => m.status.startsWith('not comparable')));
  assert.ok(!diffEnv.regressions.some(r => r.includes('lcp_ms')));
  const moved = read(b);
  moved.findings[0].location = 'offers.html:57';
  assert.equal(compareRecords(read(b), moved).regressions.length, 0, 'line moves do not create new findings');
});

test('detect identifies each supported stack and leaves non-UI projects alone', () => {
  const ids = name => detect(path.join(FIXTURES, name)).stacks.map(s => s.id);
  assert.deepEqual(ids('static-site'), ['static']);
  assert.deepEqual(ids('jinja-app'), ['server-templates']);
  assert.deepEqual(ids('react-plain-css'), ['react-plain-css']);
  const nonUi = detect(path.join(FIXTURES, 'non-ui'));
  assert.equal(nonUi.ui_detected, false);
  assert.ok(detect(path.join(FIXTURES, 'react-plain-css')).tooling.testing_library);
});

test('detect lists a standalone static surface beside a React app, as in a mixed repo', t => {
  const dir = project(t, {
    'web/package.json': JSON.stringify({ dependencies: { react: '19.0.0' } }),
    'web/index.html': '<!doctype html><div id="root"></div>',
    'panel/index.html': '<!doctype html><html lang="en"><script src="panel.js"></script></html>',
  });
  const stacks = detect(dir).stacks;
  assert.deepEqual(stacks.map(s => s.id), ['react-plain-css', 'static']);
  assert.deepEqual(stacks[1].where, ['panel']);
});

// ---------- real browser ----------

const chrome = findChrome();
const canCapture = chrome && typeof WebSocket !== 'undefined';

function serve(t, dir, routes = {}) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      if (routes[url.pathname]) return routes[url.pathname](req, res);
      const file = path.join(dir, url.pathname === '/' ? 'index.html' : url.pathname);
      if (!file.startsWith(dir) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': file.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => { t.after(() => server.close()); resolve(`http://127.0.0.1:${server.address().port}`); });
  });
}

function runCapture(args, cwd, env = process.env) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, [CAPTURE, ...args], { cwd, env });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { err += d; });
    p.on('close', status => resolve({ status, out, err }));
  });
}

test('capture refuses remote URLs and reports a missing browser as unavailable', async t => {
  const dir = project(t);
  const remote = await runCapture(['--url', 'https://example.com/'], dir);
  assert.equal(remote.status, 2);
  assert.match(remote.err, /refusing non-local URL/);
  if (typeof WebSocket === 'undefined') return t.skip('Node without global WebSocket');
  const missing = await runCapture(['--url', 'http://127.0.0.1:9/'], dir, { ...process.env, CHROME_PATH: '/nonexistent/chrome' });
  assert.equal(missing.status, 3);
  assert.match(missing.err, /capture is unavailable/);
});

test('capture finds the seeded defects, records evidence, and the fixed twin comes back clean', { skip: canCapture ? false : 'no installed Chrome/Chromium/Edge or Node < 22' }, async t => {
  const dir = project(t, Object.fromEntries(['index.html', 'fixed.html', 'site.css'].map(f => [f, fs.readFileSync(path.join(FIXTURES, 'static-site', f), 'utf8')])));
  const base = await serve(t, dir);
  const rec = init(dir);
  const before = await runCapture(['--url', `${base}/index.html`, '--label', 'before', '--record', rec, '--build-mode', 'static'], dir);
  assert.equal(before.status, 0, before.err);
  const result = JSON.parse(before.out);
  assert.equal(result.captures.length, 2);
  const phone = result.captures.find(c => c.viewport === '390x844');
  assert.ok(phone.checks.horizontal_overflow);
  assert.deepEqual(phone.checks.overflowing_elements, ['form.wide-form']);
  assert.ok(fs.readFileSync(phone.file).subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])), 'a real PNG');
  const titles = read(rec).findings.map(f => f.title).sort();
  assert.deepEqual(titles, ['Browser console errors', 'Document has no lang attribute', 'Form fields without a label', 'Horizontal page overflow at 390x844', 'Images without alt attribute', 'Interactive elements without an accessible name']);
  assert.equal(read(rec).environment.status, 'recorded');
  assert.ok(!read(rec).checks.length, 'capture never records a passing check on its own');
  assert.equal(ok(['finalize', '--record', rec]).verdict.status, 'fail');

  const rec2 = init(dir);
  const after = await runCapture(['--url', `${base}/fixed.html`, '--label', 'after', '--themes', 'light,dark', '--record', rec2], dir);
  assert.equal(after.status, 0, after.err);
  assert.equal(JSON.parse(after.out).captures.length, 4);
  assert.deepEqual(read(rec2).findings, []);
  assert.equal(ok(['finalize', '--record', rec2]).verdict.status, 'incomplete', 'clean signals are not a visual pass until someone looks');
});

test('an authentication wall is visible in the capture, not mistaken for the page', { skip: canCapture ? false : 'no installed Chrome/Chromium/Edge or Node < 22' }, async t => {
  const dir = project(t);
  const base = await serve(t, dir, { '/admin': (req, res) => { res.writeHead(401, { 'content-type': 'text/html' }); res.end('<!doctype html><html lang="en"><title>Sign in</title><h1>Sign in</h1></html>'); } });
  const r = await runCapture(['--url', `${base}/admin`, '--viewports', '1280x800', '--out-dir', '.ui-audit/shots'], dir);
  assert.equal(r.status, 0, r.err);
  const c = JSON.parse(r.out).captures[0];
  assert.ok(c.failed_requests.some(x => x.startsWith('401')));
  assert.equal(c.page.title, 'Sign in');
});
