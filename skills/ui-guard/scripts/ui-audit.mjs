#!/usr/bin/env node
// UI audit recorder for the skills-g-hub UI engineering system.
// Node built-ins only. No network access. The only processes it starts are `git`
// with fixed read-only arguments, and the single command passed after `--` to `run`.
// Records are project-local JSON files; see ../references/audit-recorder.md.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const WORKFLOW_VERSION = '1.0.0';
const SCHEMA_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../references/ui-audit.schema.json');
const GATES = ['visual', 'ux', 'a11y', 'functional', 'architecture', 'performance', 'build'];
const STATUSES = ['pass', 'fail', 'not_run', 'blocked', 'unavailable'];
const REQUIRED_BY_CLASS = {
  trivial: ['visual'],
  standard: ['visual', 'a11y'],
  significant: ['visual', 'ux', 'a11y', 'functional'],
  redesign: ['visual', 'ux', 'a11y', 'functional', 'architecture'],
  audit: ['visual', 'ux', 'a11y'],
};
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.venv', 'venv', '__pycache__', '.ui-audit', 'coverage', '.turbo', 'vendor']);

export class UsageError extends Error {}

// ---------- small helpers ----------

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');

function git(dir, args) {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

function gitState(dir) {
  const commit = git(dir, ['rev-parse', 'HEAD']);
  if (!commit) return { commit: null, branch: null, dirty: null };
  const branch = git(dir, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const status = git(dir, ['status', '--porcelain', '--untracked-files=normal', '--', '.', ':(exclude).ui-audit']);
  return { commit, branch: branch === 'HEAD' ? null : branch, dirty: status === null ? null : status.length > 0 };
}

function stripCredentials(url) {
  if (!url) return null;
  return url.replace(/^([a-z+]+:\/\/)[^@/]+@/i, '$1');
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { throw new UsageError(`cannot read JSON ${file}: ${e.message}`); }
}

function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

function nextId(prefix, list) {
  const n = list.reduce((max, item) => Math.max(max, Number(item.id.split('-')[1]) || 0), 0) + 1;
  return `${prefix}-${n}`;
}

function list(value) {
  if (value === undefined || value === true) return [];
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
}

function redact(text) {
  return text
    .replace(/((?:api[_-]?key|token|secret|password|passwd|authorization)["']?\s*[:=]\s*["']?)[^\s"',]+/gi, '$1[redacted]')
    .replace(/\b(gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})\b/g, '[redacted]');
}

function tail(text, maxLines = 40, maxChars = 4000) {
  const lines = text.split('\n');
  return redact(lines.slice(-maxLines).join('\n')).slice(-maxChars);
}

// ---------- argument parsing ----------

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--') { opts['--'] = rest.slice(i + 1); break; }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next === undefined || next.startsWith('--')) opts[key] = true;
      else { opts[key] = next; i++; }
    } else opts._.push(arg);
  }
  return { command, opts };
}

function need(opts, key) {
  const v = opts[key];
  if (v === undefined || v === true || v === '') throw new UsageError(`missing --${key}`);
  return v;
}

function oneOf(value, allowed, name) {
  if (!allowed.includes(value)) throw new UsageError(`--${name} must be one of: ${allowed.join(', ')}`);
  return value;
}

// ---------- record I/O ----------

function projectDirOf(recordFile) {
  // Records live at <project>/.ui-audit/runs/<id>.json unless --project-dir says otherwise.
  const runs = path.dirname(path.resolve(recordFile));
  const auditDir = path.dirname(runs);
  return path.basename(auditDir) === '.ui-audit' ? path.dirname(auditDir) : process.cwd();
}

function load(opts) {
  const file = need(opts, 'record');
  const record = readJson(file);
  const projectDir = path.resolve(opts['project-dir'] || projectDirOf(file));
  return { file, record, projectDir };
}

function save(file, record) {
  record.updated_at = now();
  writeJsonAtomic(file, record);
}

// ---------- detect ----------

function walk(dir, maxFiles = 4000) {
  const out = [];
  const stack = [dir];
  while (stack.length && out.length < maxFiles) {
    const current = stack.pop();
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const full = path.join(current, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) stack.push(full); }
      else out.push(full);
    }
  }
  return out;
}

export function detect(projectDir) {
  const root = path.resolve(projectDir);
  const files = walk(root);
  const rel = f => path.relative(root, f);
  const read = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
  const packages = files.filter(f => path.basename(f) === 'package.json').map(f => {
    const pkg = (() => { try { return JSON.parse(read(f)); } catch { return {}; } })();
    return { path: rel(f), deps: { ...pkg.dependencies }, devDeps: { ...pkg.devDependencies }, scripts: pkg.scripts || {} };
  });
  const has = name => packages.some(p => name in p.deps || name in p.devDeps);
  const anyDep = re => packages.some(p => [...Object.keys(p.deps), ...Object.keys(p.devDeps)].some(d => re.test(d)));
  const named = re => files.filter(f => re.test(rel(f)));
  const python = files.filter(f => /(pyproject\.toml|requirements[^/]*\.txt|setup\.cfg)$/.test(f)).map(read).join('\n').toLowerCase();
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  const templateFiles = htmlFiles.filter(f => /\{%\s*(extends|block|include|macro)\b/.test(read(f)));
  const cssFiles = files.filter(f => f.endsWith('.css'));
  const tailwindCss = cssFiles.filter(f => /@import\s+["']tailwindcss|@tailwind\s+base|@theme\b/.test(read(f)));

  const signals = {
    react: has('react'),
    typescript: has('typescript') || named(/(^|\/)tsconfig[^/]*\.json$/).length > 0,
    tailwind: has('tailwindcss') || has('@tailwindcss/vite') || tailwindCss.length > 0 || named(/tailwind\.config\.[cm]?[jt]s$/).length > 0,
    shadcn: named(/(^|\/)components\.json$/).length > 0,
    radix: anyDep(/^(@radix-ui\/|radix-ui$)/),
    jinja_templates: templateFiles.length,
    python_web: ['fastapi', 'flask', 'django', 'jinja2', 'starlette'].filter(n => python.includes(n)),
    html_files: htmlFiles.length,
    css_files: cssFiles.length,
    package_json: packages.map(p => p.path),
  };
  const stacks = [];
  if (signals.react && (signals.tailwind || signals.shadcn || signals.radix)) stacks.push({ id: 'react-tailwind', reference: 'stack-react-tailwind.md' });
  if (signals.react && !(signals.tailwind || signals.shadcn)) stacks.push({ id: 'react-plain-css', reference: 'stack-react-plain-css.md' });
  if (signals.jinja_templates > 0 || (signals.python_web.length && htmlFiles.length)) stacks.push({ id: 'server-templates', reference: 'stack-server-templates.md' });
  // Standalone pages outside any package.json tree and not server templates: a static
  // surface, even in a repo whose main app is React (an admin panel, a design reference).
  const packageDirs = packages.map(p => path.dirname(p.path)).filter(d => d !== '.');
  const templateDirs = new Set(templateFiles.map(f => path.dirname(f)));
  const standalone = htmlFiles.filter(f => !templateDirs.has(path.dirname(f)) && !packageDirs.some(d => rel(f).startsWith(`${d}/`)) && !(packages.some(p => p.path === 'package.json')));
  if (standalone.length && (signals.react || signals.jinja_templates > 0 || signals.python_web.length)) {
    stacks.push({ id: 'static', reference: 'stack-static.md', where: [...new Set(standalone.map(f => path.dirname(rel(f)) || '.'))].slice(0, 5) });
  } else if (!signals.react && signals.jinja_templates === 0 && htmlFiles.length > 0 && !signals.python_web.length) stacks.push({ id: 'static', reference: 'stack-static.md' });

  const tooling = {
    playwright: has('@playwright/test') || has('playwright') || /\bplaywright\b/.test(python),
    playwright_config: named(/(^|\/)playwright\.config\.[cm]?[jt]s$/).map(rel),
    cypress: has('cypress'),
    axe: anyDep(/^(@axe-core\/|axe-core$|jest-axe$|vitest-axe$)/) || /axe-(core|playwright|selenium)/.test(python),
    vitest: has('vitest'), jest: has('jest'), testing_library: anyDep(/^@testing-library\//),
    storybook: anyDep(/^(@storybook\/|storybook$)/),
    pytest: /\bpytest\b/.test(python),
    lighthouse: anyDep(/lighthouse/),
  };
  const scripts = Object.fromEntries(packages.flatMap(p => Object.entries(p.scripts).map(([k, v]) => [`${p.path}:${k}`, v])));
  const agentDocs = ['docs/agents/workflow.md', 'AGENTS.md', 'CLAUDE.md', 'DESIGN.md'].filter(f => fs.existsSync(path.join(root, f)));
  return {
    project_dir: path.basename(root),
    ui_detected: stacks.length > 0,
    stacks, signals, tooling, scripts, agent_docs: agentDocs,
    files_scanned: files.length,
    note: 'Signals only. Read the project instructions before choosing a strategy or running any command.',
  };
}

// ---------- commands ----------

function cmdInit(opts) {
  const projectDir = path.resolve(opts['project-dir'] || process.cwd());
  const cls = oneOf(need(opts, 'class'), Object.keys(REQUIRED_BY_CLASS), 'class');
  const summary = need(opts, 'task');
  const stackId = opts.stack ? oneOf(opts.stack, ['react-plain-css', 'react-tailwind', 'server-templates', 'static', 'other', 'unknown'], 'stack') : null;
  const detected = detect(projectDir);
  const top = git(projectDir, ['rev-parse', '--show-toplevel']);
  const required = opts.require ? list(opts.require).map(g => oneOf(g, GATES, 'require')) : REQUIRED_BY_CLASS[cls];
  const stamp = now().replace(/:/g, '-');
  const slug = summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'run';
  const id = `${stamp}-${slug}`;
  const record = {
    schema: 'ui-audit/v1', id, created_at: now(), updated_at: now(),
    workflow: { name: 'ui-engineering-system', version: WORKFLOW_VERSION },
    project: { name: opts.project || path.basename(top || projectDir), repository: stripCredentials(git(projectDir, ['remote', 'get-url', 'origin'])) },
    task: { summary, class: cls, scope: list(opts.scope) },
    git: { baseline: gitState(projectDir), result: null },
    stack: {
      id: stackId || (detected.stacks.length === 1 ? detected.stacks[0].id : detected.stacks.length ? 'other' : 'unknown'),
      signals: detected.stacks.map(s => `detected:${s.id}`),
    },
    environment: { status: 'unavailable', os: `${os.platform()} ${os.release()}`, node: process.version, browser: null, browser_version: null, build_mode: 'unknown', tool: null, device: null },
    required_gates: required,
    checks: [], evidence: [], findings: [], metrics: [],
    agent_usage: { status: 'unavailable', source: null, input_tokens: null, output_tokens: null, cost_usd: null },
    gates: null, verdict: null, notes: [],
  };
  let out = path.resolve(opts.out || path.join(projectDir, '.ui-audit', 'runs', `${id}.json`));
  if (fs.existsSync(out) && opts.out) throw new UsageError(`record already exists: ${out}`);
  for (let n = 2; fs.existsSync(out); n++) {
    record.id = `${id}-${n}`;
    out = path.join(projectDir, '.ui-audit', 'runs', `${record.id}.json`);
  }
  writeJsonAtomic(out, record);
  const ignored = spawnSync('git', ['-C', projectDir, 'check-ignore', '-q', '.ui-audit/'], { encoding: 'utf8' }).status === 0;
  const warnings = [];
  if (top && !ignored && out.startsWith(path.join(projectDir, '.ui-audit'))) warnings.push('.ui-audit/ is not git-ignored; screenshots may contain application data. Ask the user before adding it to .gitignore or committing it.');
  for (const w of warnings) process.stderr.write(`ui-audit: ${w}\n`);
  if (opts['print-path']) return `${out}\n`;
  return { record: out, id: record.id, required_gates: required, warnings };
}

function cmdEnv(opts) {
  const { file, record } = load(opts);
  const env = record.environment;
  if (opts.browser) env.browser = String(opts.browser);
  if (opts['browser-version']) env.browser_version = String(opts['browser-version']);
  if (opts['build-mode']) env.build_mode = oneOf(opts['build-mode'], ['dev', 'preview', 'production', 'static', 'unknown'], 'build-mode');
  if (opts.tool) env.tool = String(opts.tool);
  if (opts.device) env.device = String(opts.device);
  env.status = env.browser || env.tool ? 'recorded' : 'unavailable';
  save(file, record);
  return { environment: env };
}

function resolveEvidencePath(projectDir, p) {
  if (/^[a-z][a-z0-9+.-]{1,}:/i.test(p)) throw new UsageError('evidence --path must be a local project file, not a URL');
  const resolved = path.resolve(projectDir, p);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new UsageError(`evidence file not found: ${p}`);
  // Compare real paths: /var vs /private/var on macOS, or a symlinked checkout.
  const full = fs.realpathSync(resolved);
  const relative = path.relative(fs.realpathSync(projectDir), full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new UsageError(`evidence path is outside the project: ${p}`);
  return { relative: relative.split(path.sep).join('/'), full };
}

function cmdEvidence(opts) {
  const { file, record, projectDir } = load(opts);
  const kind = oneOf(need(opts, 'kind'), ['screenshot', 'trace', 'video', 'console', 'network', 'a11y-tree', 'dom', 'report', 'log'], 'kind');
  const tool = need(opts, 'tool');
  let p = null, digest = null, observed = null;
  if (opts.path && opts.path !== true) {
    const r = resolveEvidencePath(projectDir, opts.path);
    p = r.relative; digest = sha256(fs.readFileSync(r.full));
  } else if (opts.observed && opts.observed !== true) {
    observed = redact(String(opts.observed));
  } else throw new UsageError('evidence needs --path <project file> or --observed "<what the browser tool showed>"');
  const viewport = opts.viewport && opts.viewport !== true ? String(opts.viewport) : null;
  if (viewport && !/^[0-9]+x[0-9]+$/.test(viewport)) throw new UsageError('--viewport must look like 390x844');
  const direction = opts.direction ? oneOf(opts.direction, ['ltr', 'rtl'], 'direction') : null;
  const item = {
    id: nextId('ev', record.evidence), kind, path: p, sha256: digest, observed, tool: String(tool),
    viewport, theme: opts.theme ? String(opts.theme) : null, direction,
    state: opts.state ? String(opts.state) : null, url: opts.url ? String(opts.url) : null,
    sensitive: opts.sensitive === true || opts.sensitive === 'true',
  };
  record.evidence.push(item);
  save(file, record);
  return { evidence: item.id };
}

function addCheck(record, fields) {
  const check = {
    id: nextId('chk', record.checks), gate: fields.gate, name: fields.name, status: fields.status,
    command: fields.command ?? null, exit_code: fields.exit_code ?? null, duration_ms: fields.duration_ms ?? null,
    captured_by: fields.captured_by, output_tail: fields.output_tail ?? null, evidence: fields.evidence ?? [],
    note: fields.note ?? null, at: now(),
  };
  record.checks.push(check);
  return check;
}

function cmdCheck(opts) {
  const { file, record } = load(opts);
  const exit = opts['exit-code'] === undefined ? null : Number(opts['exit-code']);
  if (exit !== null && !Number.isInteger(exit)) throw new UsageError('--exit-code must be an integer');
  const check = addCheck(record, {
    gate: oneOf(need(opts, 'gate'), GATES, 'gate'), name: need(opts, 'name'), status: oneOf(need(opts, 'status'), STATUSES, 'status'),
    command: opts.command ? String(opts.command) : null, exit_code: exit, captured_by: 'agent',
    evidence: list(opts.evidence), note: opts.note ? redact(String(opts.note)) : null,
  });
  const problems = semanticProblems(record).filter(p => p.startsWith(`${check.id}:`));
  if (problems.length) throw new UsageError(problems.join('\n'));
  save(file, record);
  return { check: check.id, status: check.status };
}

function cmdRun(opts) {
  const { file, record, projectDir } = load(opts);
  const argv = opts['--'];
  if (!argv || !argv.length) throw new UsageError('run needs the command after --, for example: run --record r.json --gate build --name "type check" -- npm run typecheck');
  const timeout = Number(opts.timeout || 600) * 1000;
  const started = Date.now();
  const r = spawnSync(argv[0], argv.slice(1), { cwd: opts.cwd ? path.resolve(projectDir, opts.cwd) : projectDir, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024, shell: false });
  const duration = Date.now() - started;
  const output = `${r.stdout || ''}${r.stderr ? `\n${r.stderr}` : ''}`;
  let status, note = null;
  if (r.error && r.error.code === 'ENOENT') { status = 'unavailable'; note = `command not found: ${argv[0]}`; }
  else if (r.error && r.error.code === 'ETIMEDOUT') { status = 'blocked'; note = `timed out after ${timeout / 1000}s`; }
  else if (r.error) { status = 'blocked'; note = r.error.message; }
  else status = r.status === 0 ? 'pass' : 'fail';
  const check = addCheck(record, {
    gate: oneOf(need(opts, 'gate'), GATES, 'gate'), name: need(opts, 'name'), status,
    command: redact(argv.join(' ')), exit_code: Number.isInteger(r.status) ? r.status : null, duration_ms: duration,
    captured_by: 'recorder', output_tail: tail(output), evidence: list(opts.evidence), note,
  });
  save(file, record);
  return { check: check.id, status, exit_code: check.exit_code, duration_ms: duration };
}

function cmdImportPlaywright(opts) {
  const { file, record, projectDir } = load(opts);
  const reportPath = resolveEvidencePath(projectDir, need(opts, 'report'));
  const report = readJson(reportPath.full);
  const s = report.stats;
  if (!s || typeof s.expected !== 'number') throw new UsageError('not a Playwright JSON report (missing stats.expected); run with --reporter=json');
  const failed = (s.unexpected || 0);
  const ran = (s.expected || 0) + failed + (s.flaky || 0);
  const ev = { id: nextId('ev', record.evidence), kind: 'report', path: reportPath.relative, sha256: sha256(fs.readFileSync(reportPath.full)), observed: null, tool: 'playwright-json-reporter', viewport: null, theme: null, direction: null, state: null, url: null, sensitive: false };
  record.evidence.push(ev);
  const status = ran === 0 ? 'not_run' : failed > 0 ? 'fail' : 'pass';
  const check = addCheck(record, {
    gate: oneOf(opts.gate || 'functional', GATES, 'gate'), name: opts.name || 'Playwright suite', status,
    command: opts.command ? String(opts.command) : null, duration_ms: Number.isFinite(s.duration) ? Math.round(s.duration) : null,
    captured_by: 'report-import', evidence: [ev.id],
    note: `expected ${s.expected}, unexpected ${failed}, flaky ${s.flaky || 0}, skipped ${s.skipped || 0}`,
  });
  save(file, record);
  return { check: check.id, status, note: check.note };
}

// Adds a capture.mjs result: screenshots and browser signals as evidence, metrics,
// the browser environment, and measured findings for detected problems. It never
// records a passing check: someone still has to look at the screenshots.
export function importCapture(recordFile, result, { buildMode, projectDir } = {}) {
  const record = readJson(recordFile);
  const dir = path.resolve(projectDir || projectDirOf(recordFile));
  const env = record.environment;
  env.tool = result.tool; env.status = 'recorded';
  const [browser, version] = String(result.browser || '').split('/');
  env.browser = browser || null; env.browser_version = version || null;
  if (buildMode) env.build_mode = oneOf(buildMode, ['dev', 'preview', 'production', 'static', 'unknown'], 'build-mode');
  const added = { evidence: [], findings: [], metrics: 0 };
  const addFinding = (severity, gate, title, location, evidenceIds, remediation) => {
    const fp = fingerprint(gate, title, location);
    const existing = record.findings.find(f => f.fingerprint === fp && f.status === 'open');
    if (existing) { existing.evidence = [...new Set([...existing.evidence, ...evidenceIds])]; return; }
    const f = { id: nextId('fd', record.findings), severity, gate, title, basis: 'measured', location, evidence: evidenceIds, remediation, status: 'open', fingerprint: fp };
    record.findings.push(f); added.findings.push(f.id);
  };
  for (const c of result.captures) {
    const shot = resolveEvidencePath(dir, c.file);
    const shotEv = { id: nextId('ev', record.evidence), kind: 'screenshot', path: shot.relative, sha256: c.sha256, observed: null, tool: result.tool, viewport: c.viewport, theme: c.theme, direction: c.page.dir === 'rtl' ? 'rtl' : 'ltr', state: c.state, url: result.url, sensitive: false };
    record.evidence.push(shotEv); added.evidence.push(shotEv.id);
    const ids = [shotEv.id];
    const signals = [...c.console_errors.map(e => `console: ${e}`), ...c.failed_requests.map(e => `request: ${e}`)];
    if (signals.length) {
      const logEv = { ...shotEv, id: nextId('ev', record.evidence), kind: 'console', path: null, sha256: null, observed: redact(signals.join('\n')).slice(0, 4000) };
      record.evidence.push(logEv); added.evidence.push(logEv.id); ids.push(logEv.id);
    }
    const where = `${result.url} (${c.viewport}, ${c.theme})`;
    const k = c.checks;
    if (k.horizontal_overflow) addFinding('P1', 'visual', `Horizontal page overflow at ${c.viewport}`, result.url, ids, `Constrain: ${k.overflowing_elements.join(', ') || 'see screenshot'}`);
    if (k.unnamed_controls.length) addFinding('P1', 'a11y', 'Interactive elements without an accessible name', result.url, ids, `Name: ${k.unnamed_controls.join(', ')}`);
    if (k.unlabeled_fields.length) addFinding('P1', 'a11y', 'Form fields without a label', result.url, ids, `Label: ${k.unlabeled_fields.join(', ')}`);
    if (k.images_missing_alt) addFinding('P2', 'a11y', 'Images without alt attribute', result.url, ids, `${k.images_missing_alt} image(s) need alt (empty when decorative)`);
    if (k.missing_lang) addFinding('P2', 'a11y', 'Document has no lang attribute', result.url, ids, 'Set <html lang>');
    if (c.console_errors.length) addFinding('P1', 'functional', 'Browser console errors', result.url, ids, `Seen at ${where}`);
    if (c.failed_requests.length) addFinding('P2', 'functional', 'Failed network requests', result.url, ids, `Seen at ${where}`);
    const metricDefs = [['lcp_ms', 'ms', 'lower'], ['fcp_ms', 'ms', 'lower'], ['ttfb_ms', 'ms', 'lower'], ['load_ms', 'ms', 'lower'], ['cls', 'score', 'lower'], ['long_tasks', 'count', 'lower'], ['transfer_bytes', 'bytes', 'lower']];
    for (const [name, unit, better] of metricDefs) {
      const value = c.metrics[name];
      if (value === null || value === undefined || !Number.isFinite(value)) continue;
      const m = { name: `${name}${c.theme === 'light' ? '' : `:${c.theme}`}`, value, unit, better, source: `${result.tool} (${result.browser})`, viewport: c.viewport, url: result.url };
      record.metrics = record.metrics.filter(x => !(x.name === m.name && x.viewport === m.viewport && x.url === m.url));
      record.metrics.push(m); added.metrics++;
    }
  }
  save(recordFile, record);
  return added;
}

function cmdImportCapture(opts) {
  const recordFile = need(opts, 'record');
  return importCapture(recordFile, readJson(need(opts, 'capture')), { buildMode: opts['build-mode'], projectDir: opts['project-dir'] });
}

function fingerprint(gate, title, location) {
  const loc = (location || '').replace(/:\d+(:\d+)?\b/g, '').trim().toLowerCase();
  return sha256(`${gate}|${title.trim().toLowerCase().replace(/\s+/g, ' ')}|${loc}`).slice(0, 16);
}

function cmdFinding(opts) {
  const { file, record } = load(opts);
  if (opts.update) {
    const f = record.findings.find(x => x.id === opts.update);
    if (!f) throw new UsageError(`no finding ${opts.update}`);
    f.status = oneOf(need(opts, 'status'), ['open', 'fixed', 'accepted', 'false_positive'], 'status');
    if (opts.evidence) f.evidence = [...new Set([...f.evidence, ...list(opts.evidence)])];
    const problems = semanticProblems(record).filter(p => p.startsWith(`${f.id}:`));
    if (problems.length) throw new UsageError(problems.join('\n'));
    save(file, record);
    return { finding: f.id, status: f.status };
  }
  const gate = oneOf(need(opts, 'gate'), GATES, 'gate');
  const title = String(need(opts, 'title'));
  const location = opts.location ? String(opts.location) : null;
  const f = {
    id: nextId('fd', record.findings), severity: oneOf(need(opts, 'severity'), ['P0', 'P1', 'P2', 'P3'], 'severity'), gate, title,
    basis: oneOf(need(opts, 'basis'), ['rendered', 'measured', 'source'], 'basis'), location, evidence: list(opts.evidence),
    remediation: opts.remediation ? String(opts.remediation) : null,
    status: opts.status ? oneOf(opts.status, ['open', 'fixed', 'accepted', 'false_positive'], 'status') : 'open',
    fingerprint: fingerprint(gate, title, location),
  };
  record.findings.push(f);
  const problems = semanticProblems(record).filter(p => p.startsWith(`${f.id}:`));
  if (problems.length) throw new UsageError(problems.join('\n'));
  save(file, record);
  return { finding: f.id };
}

function cmdMetric(opts) {
  const { file, record, projectDir } = load(opts);
  const incoming = [];
  if (opts['from-json']) {
    const data = readJson(resolveEvidencePath(projectDir, opts['from-json']).full);
    for (const m of Array.isArray(data) ? data : data.metrics || []) incoming.push(m);
  } else {
    incoming.push({ name: need(opts, 'name'), value: Number(need(opts, 'value')), unit: need(opts, 'unit'), better: need(opts, 'better'), source: need(opts, 'source'), viewport: opts.viewport || null, url: opts.url || null });
  }
  const added = [];
  for (const m of incoming) {
    if (m.value === null || m.value === undefined) continue; // the browser did not report it: leave it out, never zero
    const metric = {
      name: String(m.name), value: Number(m.value), unit: oneOf(m.unit, ['ms', 'score', 'count', 'bytes', 'ratio'], 'unit'),
      better: oneOf(m.better, ['lower', 'higher'], 'better'), source: String(m.source || opts.source || 'unspecified'),
      viewport: m.viewport ? String(m.viewport) : null, url: m.url ? String(m.url) : null,
    };
    if (!Number.isFinite(metric.value)) throw new UsageError(`metric ${metric.name} value is not a finite number`);
    record.metrics = record.metrics.filter(x => !(x.name === metric.name && x.viewport === metric.viewport && x.url === metric.url));
    record.metrics.push(metric);
    added.push(metric.name);
  }
  save(file, record);
  return { metrics: added };
}

function cmdUsage(opts) {
  const { file, record } = load(opts);
  const int = k => {
    if (opts[k] === undefined) return null;
    const n = Number(opts[k]);
    if (!Number.isInteger(n) || n < 0) throw new UsageError(`--${k} must be a non-negative integer`);
    return n;
  };
  if (opts['cost-usd'] !== undefined && !(Number(opts['cost-usd']) >= 0)) throw new UsageError('--cost-usd must be a non-negative number');
  record.agent_usage = {
    status: 'recorded', source: String(need(opts, 'source')),
    input_tokens: int('input-tokens'), output_tokens: int('output-tokens'),
    cost_usd: opts['cost-usd'] === undefined ? null : Number(opts['cost-usd']),
  };
  save(file, record);
  return { agent_usage: record.agent_usage };
}

function cmdNote(opts) {
  const { file, record } = load(opts);
  record.notes.push(redact(String(need(opts, 'text'))));
  save(file, record);
  return { notes: record.notes.length };
}

// ---------- verdict ----------

const RANK = { fail: 4, blocked: 3, unavailable: 2, not_run: 1, pass: 0 };

export function computeGates(record) {
  const gates = {};
  for (const gate of GATES) {
    const checks = record.checks.filter(c => c.gate === gate);
    gates[gate] = checks.length ? checks.reduce((worst, c) => (RANK[c.status] > RANK[worst] ? c.status : worst), 'pass') : 'not_run';
  }
  return gates;
}

export function computeVerdict(record) {
  const gates = computeGates(record);
  const reasons = [];
  for (const [gate, status] of Object.entries(gates)) if (status === 'fail') reasons.push(`${gate} gate failed`);
  for (const f of record.findings) if (f.status === 'open' && (f.severity === 'P0' || f.severity === 'P1')) reasons.push(`open ${f.severity} finding ${f.id}: ${f.title}`);
  if (reasons.length) return { gates, verdict: { status: 'fail', reasons } };
  for (const gate of record.required_gates) if (gates[gate] !== 'pass') reasons.push(`required ${gate} gate is ${gates[gate]}`);
  if (reasons.length) return { gates, verdict: { status: 'incomplete', reasons } };
  return { gates, verdict: { status: 'pass', reasons: ['every required gate passed with evidence; no open P0/P1 findings'] } };
}

function cmdFinalize(opts) {
  const { file, record, projectDir } = load(opts);
  record.git.result = gitState(projectDir);
  Object.assign(record, computeVerdict(record));
  save(file, record);
  const errors = validateRecord(record, projectDir);
  if (errors.length) throw new UsageError(`record is invalid:\n${errors.join('\n')}`);
  return { verdict: record.verdict, gates: record.gates };
}

// ---------- validation ----------

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}

function checkSchema(schema, value, where, root, errors) {
  if (schema.$ref) return checkSchema(schema.$ref.replace('#/', '').split('/').reduce((s, k) => s[k], root), value, where, root, errors);
  if (schema.oneOf) {
    const passing = schema.oneOf.filter(s => { const e = []; checkSchema(s, value, where, root, e); return e.length === 0; });
    if (passing.length !== 1) errors.push(`${where}: does not match exactly one allowed shape`);
    return;
  }
  if ('const' in schema && value !== schema.const) errors.push(`${where}: must be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${where}: ${JSON.stringify(value)} not in ${JSON.stringify(schema.enum)}`);
  if (schema.type) {
    const types = [].concat(schema.type);
    const t = typeOf(value);
    if (!types.includes(t) && !(t === 'integer' && types.includes('number'))) { errors.push(`${where}: expected ${types.join('|')}, got ${t}`); return; }
  }
  if (typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) errors.push(`${where}: too short`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${where}: does not match ${schema.pattern}`);
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) errors.push(`${where}: below ${schema.minimum}`);
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => checkSchema(schema.items, v, `${where}[${i}]`, root, errors));
  if (typeOf(value) === 'object') {
    for (const key of schema.required || []) if (!(key in value)) errors.push(`${where}: missing ${key}`);
    for (const [key, v] of Object.entries(value)) {
      if (schema.properties && key in schema.properties) checkSchema(schema.properties[key], v, `${where}.${key}`, root, errors);
      else if (schema.additionalProperties === false) errors.push(`${where}: unexpected property ${key}`);
    }
  }
}

export function semanticProblems(record, projectDir = null) {
  const problems = [];
  const evidence = new Map((record.evidence || []).map(e => [e.id, e]));
  for (const c of record.checks || []) {
    for (const id of c.evidence) if (!evidence.has(id)) problems.push(`${c.id}: references missing evidence ${id}`);
    if (c.exit_code !== null && c.exit_code !== 0 && c.status === 'pass') problems.push(`${c.id}: exit code ${c.exit_code} cannot be a pass`);
    if (c.status === 'pass') {
      const captured = c.captured_by !== 'agent' && (c.captured_by === 'report-import' || c.exit_code === 0);
      if (!captured && c.evidence.length === 0) problems.push(`${c.id}: a pass needs recorder-captured exit code 0 or at least one evidence reference`);
      if (c.gate === 'visual' && !c.evidence.some(id => evidence.get(id)?.kind === 'screenshot')) problems.push(`${c.id}: a visual pass needs screenshot evidence; a build or source reading is not visual verification`);
    }
  }
  for (const f of record.findings || []) {
    for (const id of f.evidence) if (!evidence.has(id)) problems.push(`${f.id}: references missing evidence ${id}`);
    if (f.basis !== 'source' && f.evidence.length === 0) problems.push(`${f.id}: a ${f.basis} finding needs evidence`);
  }
  for (const e of record.evidence || []) {
    if (!e.path && !e.observed) problems.push(`${e.id}: needs a path or an observation`);
    if (e.path && projectDir) {
      const full = path.resolve(projectDir, e.path);
      if (path.isAbsolute(e.path) || e.path.split('/').includes('..')) problems.push(`${e.id}: path outside project`);
      else if (!fs.existsSync(full)) problems.push(`${e.id}: file missing: ${e.path}`);
      else if (e.sha256 && sha256(fs.readFileSync(full)) !== e.sha256) problems.push(`${e.id}: file changed since it was recorded: ${e.path}`);
    }
  }
  if (record.verdict) {
    const expected = computeVerdict(record).verdict.status;
    if (record.verdict.status !== expected) problems.push(`verdict: recorded ${record.verdict.status} but the checks and findings give ${expected}`);
  }
  return problems;
}

export function validateRecord(record, projectDir = null) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const errors = [];
  checkSchema(schema, record, '$', schema, errors);
  if (errors.length) return errors;
  return semanticProblems(record, projectDir);
}

function cmdValidate(opts) {
  const file = opts._[0] || need(opts, 'record');
  const record = readJson(file);
  const projectDir = path.resolve(opts['project-dir'] || projectDirOf(file));
  const errors = validateRecord(record, projectDir);
  return { valid: errors.length === 0, errors };
}

// ---------- summary ----------

export function summarize(record) {
  const lines = [];
  const v = record.verdict ? record.verdict.status.toUpperCase() : 'NOT FINALIZED';
  lines.push(`# UI audit: ${record.task.summary}`, '');
  lines.push(`**Verdict: ${v}** · class ${record.task.class} · workflow ${record.workflow.version} · ${record.project.name}`);
  const b = record.git.baseline, r = record.git.result;
  lines.push(`Baseline ${b.commit ? b.commit.slice(0, 10) : 'no git'}${b.dirty ? ' (dirty)' : ''} → result ${r?.commit ? r.commit.slice(0, 10) : 'not recorded'}${r?.dirty ? ' (uncommitted changes)' : ''}`);
  const env = record.environment;
  lines.push(`Stack ${record.stack.id} · environment ${env.status === 'recorded' ? [env.tool, env.browser, env.browser_version, env.build_mode].filter(Boolean).join(', ') : 'not recorded'}`, '');
  if (record.verdict?.reasons?.length) lines.push(...record.verdict.reasons.map(x => `- ${x}`), '');
  const gates = record.gates || computeGates(record);
  lines.push('| Gate | Status | Required |', '| --- | --- | --- |');
  for (const g of GATES) lines.push(`| ${g} | ${gates[g]} | ${record.required_gates.includes(g) ? 'yes' : ''} |`);
  lines.push('', '## Checks', '');
  if (!record.checks.length) lines.push('None recorded.');
  for (const c of record.checks) lines.push(`- \`${c.id}\` ${c.gate} · ${c.status} · ${c.name}${c.command ? ` · \`${c.command}\`` : ''}${c.exit_code !== null ? ` · exit ${c.exit_code}` : ''} · ${c.captured_by}${c.note ? ` · ${c.note}` : ''}`);
  lines.push('', '## Findings', '');
  if (!record.findings.length) lines.push('None recorded.');
  for (const f of [...record.findings].sort((a, b) => a.severity.localeCompare(b.severity))) lines.push(`- [${f.severity}][${f.gate}][${f.basis}] ${f.title} · ${f.status}${f.location ? ` · ${f.location}` : ''}${f.remediation ? ` · fix: ${f.remediation}` : ''}`);
  lines.push('', '## Evidence', '');
  if (!record.evidence.length) lines.push('None recorded.');
  for (const e of record.evidence) lines.push(`- \`${e.id}\` ${e.kind} · ${e.path || `observed: ${e.observed}`} · ${e.tool}${e.viewport ? ` · ${e.viewport}` : ''}${e.theme ? ` · ${e.theme}` : ''}${e.direction ? ` · ${e.direction}` : ''}${e.state ? ` · ${e.state}` : ''}${e.sensitive ? ' · SENSITIVE' : ''}`);
  lines.push('', '## Metrics', '');
  if (!record.metrics.length) lines.push('None measured.');
  for (const m of record.metrics) lines.push(`- ${m.name}: ${m.value} ${m.unit} (${m.better} is better) · ${m.source}${m.viewport ? ` · ${m.viewport}` : ''}`);
  const u = record.agent_usage;
  lines.push('', `Agent usage: ${u.status === 'recorded' ? `${u.input_tokens ?? '?'} in / ${u.output_tokens ?? '?'} out tokens${u.cost_usd !== null ? `, $${u.cost_usd}` : ''} (${u.source})` : 'unavailable'}`);
  if (record.notes.length) lines.push('', '## Notes', '', ...record.notes.map(n => `- ${n}`));
  return `${lines.join('\n')}\n`;
}

function cmdSummary(opts) {
  const file = opts._[0] || need(opts, 'record');
  const text = summarize(readJson(file));
  if (opts.out) { fs.writeFileSync(opts.out, text); return { summary: opts.out }; }
  process.stdout.write(text);
  return null;
}

// ---------- compare ----------

// Single-sample browser timings jitter; a change smaller than this is never a verdict.
const NOISE_FLOOR = { ms: 50, bytes: 2048, score: 0.02, count: 1, ratio: 0.02 };

function envFingerprint(env) {
  if (env.status !== 'recorded') return null;
  const major = (env.browser_version || '').split('.')[0];
  return [env.os.split(' ')[0], env.browser, major, env.build_mode, env.device].join('|');
}

export function compareRecords(base, cand, threshold = 0.1) {
  const issues = [], regressions = [], improvements = [], incomparable = [];
  if (base.schema !== cand.schema) issues.push(`schema differs (${base.schema} vs ${cand.schema})`);
  if (base.project.name !== cand.project.name) issues.push(`different projects (${base.project.name} vs ${cand.project.name})`);
  const baseScope = new Set(base.task.scope), overlap = cand.task.scope.filter(s => baseScope.has(s));
  if (base.task.scope.length && cand.task.scope.length && !overlap.length) issues.push('task scopes do not overlap; comparison may be meaningless');
  const bg = base.gates || computeGates(base), cg = cand.gates || computeGates(cand);
  for (const g of GATES) {
    if (bg[g] === 'pass' && cg[g] !== 'pass') regressions.push(`${g} gate: pass → ${cg[g]}`);
    if (bg[g] !== 'pass' && cg[g] === 'pass') improvements.push(`${g} gate: ${bg[g]} → pass`);
  }
  const openBase = new Map(base.findings.filter(f => f.status === 'open').map(f => [f.fingerprint, f]));
  const openCand = new Map(cand.findings.filter(f => f.status === 'open').map(f => [f.fingerprint, f]));
  for (const [fp, f] of openCand) if (!openBase.has(fp)) regressions.push(`new open finding [${f.severity}] ${f.title}`);
  for (const [fp, f] of openBase) if (!openCand.has(fp)) improvements.push(`resolved finding [${f.severity}] ${f.title}`);
  const sameEnv = envFingerprint(base.environment) !== null && envFingerprint(base.environment) === envFingerprint(cand.environment);
  const key = m => `${m.name}|${m.viewport}|${m.url}`;
  const baseMetrics = new Map(base.metrics.map(m => [key(m), m]));
  const metrics = [];
  for (const m of cand.metrics) {
    const b = baseMetrics.get(key(m));
    if (!b) { metrics.push({ name: m.name, viewport: m.viewport, status: 'no baseline' }); continue; }
    if (!sameEnv) { incomparable.push(m.name); metrics.push({ name: m.name, viewport: m.viewport, status: 'not comparable (environment differs or unrecorded)' }); continue; }
    if (b.unit !== m.unit) { metrics.push({ name: m.name, status: 'not comparable (unit differs)' }); continue; }
    const delta = b.value === 0 ? (m.value === 0 ? 0 : Infinity) : (m.value - b.value) / Math.abs(b.value);
    const material = Math.abs(m.value - b.value) >= (NOISE_FLOOR[m.unit] ?? 0);
    const worse = material && (m.better === 'lower' ? delta > threshold : delta < -threshold);
    const better = material && (m.better === 'lower' ? delta < -threshold : delta > threshold);
    const entry = { name: m.name, viewport: m.viewport, baseline: b.value, candidate: m.value, unit: m.unit, delta_pct: Number.isFinite(delta) ? Math.round(delta * 1000) / 10 : null, status: worse ? 'regression' : better ? 'improvement' : 'within threshold' };
    metrics.push(entry);
    if (worse) regressions.push(`${m.name}${m.viewport ? ` @${m.viewport}` : ''}: ${b.value} → ${m.value} ${m.unit}`);
    if (better) improvements.push(`${m.name}${m.viewport ? ` @${m.viewport}` : ''}: ${b.value} → ${m.value} ${m.unit}`);
  }
  for (const m of base.metrics) if (!cand.metrics.some(c => key(c) === key(m))) metrics.push({ name: m.name, viewport: m.viewport, status: 'not measured in candidate' });
  return {
    baseline: base.id, candidate: cand.id, compatible: issues.length === 0, issues,
    verdicts: { baseline: base.verdict?.status ?? null, candidate: cand.verdict?.status ?? null },
    regressions, improvements, metrics, threshold, noise_floor: NOISE_FLOOR,
  };
}

function cmdCompare(opts) {
  const [a, b] = opts._;
  if (!a || !b) throw new UsageError('compare needs <baseline.json> <candidate.json>');
  const result = compareRecords(readJson(a), readJson(b), opts.threshold ? Number(opts.threshold) : 0.1);
  if (opts.json) return result;
  const lines = [`# UI audit comparison`, '', `Baseline \`${result.baseline}\` (${result.verdicts.baseline}) → candidate \`${result.candidate}\` (${result.verdicts.candidate})`, ''];
  if (result.issues.length) lines.push('**Compatibility issues:**', ...result.issues.map(i => `- ${i}`), '');
  lines.push(`## Regressions (${result.regressions.length})`, '', ...(result.regressions.length ? result.regressions.map(r => `- ${r}`) : ['None.']), '');
  lines.push(`## Improvements (${result.improvements.length})`, '', ...(result.improvements.length ? result.improvements.map(r => `- ${r}`) : ['None.']), '');
  const quiet = result.metrics.filter(m => m.status === 'within threshold').length;
  const loud = result.metrics.filter(m => m.status !== 'within threshold');
  lines.push('## Metrics', '', `Threshold ${result.threshold * 100}% and noise floors ${Object.entries(NOISE_FLOOR).map(([u, v]) => `${v} ${u}`).join(', ')}; single samples, so treat small moves as noise.`, '');
  if (!result.metrics.length) lines.push('None measured.');
  else lines.push(`- ${quiet} metric(s) within threshold`, ...loud.map(m => `- ${m.name}${m.viewport ? ` @${m.viewport}` : ''}: ${m.status}${m.baseline !== undefined ? ` (${m.baseline} → ${m.candidate} ${m.unit}, ${m.delta_pct}%)` : ''}`));
  process.stdout.write(`${lines.join('\n')}\n`);
  process.exitCode = result.regressions.length ? 1 : 0;
  return null;
}

// ---------- main ----------

const HELP = `ui-audit.mjs: record and compare UI verification runs (schema ui-audit/v1)

  detect   [--project-dir DIR]                       stack and test-tooling signals as JSON
  init     --task TEXT --class trivial|standard|significant|redesign|audit
           [--project-dir DIR] [--scope a,b] [--stack ID] [--require g1,g2] [--out FILE] [--print-path]
  env      --record FILE [--tool T] [--browser B] [--browser-version V] [--build-mode M] [--device D]
  evidence --record FILE --kind K --tool T (--path FILE | --observed TEXT)
           [--viewport WxH] [--theme T] [--direction ltr|rtl] [--state S] [--url U] [--sensitive]
  check    --record FILE --gate G --name TEXT --status S [--command C] [--exit-code N] [--evidence ids] [--note N]
  run      --record FILE --gate G --name TEXT [--timeout SEC] [--cwd DIR] [--evidence ids] -- CMD ARGS...
  import-playwright --record FILE --report results.json [--gate functional] [--name N] [--command C]
  import-capture --record FILE --capture capture.json [--build-mode M]   (capture.mjs --record does this)
  finding  --record FILE --severity P0..P3 --gate G --title T --basis rendered|measured|source
           [--location L] [--evidence ids] [--remediation R] [--status S]
  finding  --record FILE --update fd-N --status fixed|accepted|false_positive|open [--evidence ids]
  metric   --record FILE (--name N --value V --unit U --better lower|higher --source S [--viewport WxH] | --from-json FILE)
  usage    --record FILE --source S [--input-tokens N] [--output-tokens N] [--cost-usd N]
  note     --record FILE --text TEXT
  finalize --record FILE                             result commit, gates, verdict, validation
  validate FILE                                      schema + evidence rules
  summary  FILE [--out FILE]                         Markdown summary
  compare  BASELINE CANDIDATE [--threshold 0.1] [--json]   exit 1 when regressions are found

Gates: ${GATES.join(', ')}. Statuses: ${STATUSES.join(', ')}.`;

const COMMANDS = { detect: o => detect(o['project-dir'] || process.cwd()), init: cmdInit, env: cmdEnv, evidence: cmdEvidence, check: cmdCheck, run: cmdRun, 'import-playwright': cmdImportPlaywright, 'import-capture': cmdImportCapture, finding: cmdFinding, metric: cmdMetric, usage: cmdUsage, note: cmdNote, finalize: cmdFinalize, validate: cmdValidate, summary: cmdSummary, compare: cmdCompare };

export function main(argv) {
  const { command, opts } = parseArgs(argv);
  if (!command || command === '--help' || command === 'help' || opts.help) { process.stdout.write(`${HELP}\n`); return 0; }
  const fn = COMMANDS[command];
  if (!fn) { process.stderr.write(`unknown command: ${command}\n\n${HELP}\n`); return 2; }
  try {
    const result = fn(opts);
    if (typeof result === 'string') process.stdout.write(result);
    else if (result) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (command === 'validate' && result && !result.valid) return 1;
    return process.exitCode ?? 0;
  } catch (e) {
    if (e instanceof UsageError) { process.stderr.write(`ui-audit: ${e.message}\n`); return 2; }
    throw e;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
