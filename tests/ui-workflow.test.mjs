import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const UI = ['ui-engineering', 'ui-design-system', 'ui-guard', 'ui-e2e-tests'];
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

function skill(name) {
  const text = fs.readFileSync(path.join(SKILLS, name, 'SKILL.md'), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  assert.ok(m, `${name}: frontmatter`);
  const field = key => {
    const line = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(m[1]);
    return line ? line[1].replace(/^"(.*)"$/, '$1') : null;
  };
  return { name: field('name'), description: field('description'), body: m[2], text };
}

function links(file) {
  const text = fs.readFileSync(file, 'utf8');
  return [...text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)].map(x => x[1]).filter(l => !/^[a-z]+:/i.test(l));
}

test('each UI skill is well-formed: folder name, DO NOT USE boundary, short entrypoint, agent metadata', t => {
  let descriptionChars = 0, bodyWords = 0;
  for (const name of UI) {
    const s = skill(name);
    assert.equal(s.name, name);
    assert.match(s.description, /DO NOT USE/);
    assert.ok(s.description.length <= 1024, `${name}: description over the 1024-character limit`);
    const lines = s.body.split('\n').length;
    assert.ok(lines <= 120, `${name}: SKILL.md body is ${lines} lines; move detail to references/`);
    assert.match(fs.readFileSync(path.join(SKILLS, name, 'agents/openai.yaml'), 'utf8'), /allow_implicit_invocation: true/);
    descriptionChars += s.description.length;
    bodyWords += s.body.split(/\s+/).length;
  }
  // Always-loaded cost: descriptions sit in context every turn; bodies only when a skill fires.
  t.diagnostic(`UI descriptions: ${descriptionChars} chars (~${Math.round(descriptionChars / 4)} tokens always loaded)`);
  t.diagnostic(`UI SKILL.md bodies: ${bodyWords} words total, loaded only on activation`);
  assert.ok(descriptionChars <= 2600, 'the four descriptions must stay cheap to keep loaded');
});

test('every relative link in the UI skills and the hub docs resolves', () => {
  const files = [
    ...UI.flatMap(n => [path.join(SKILLS, n, 'SKILL.md'), ...fs.readdirSync(path.join(SKILLS, n, 'references')).filter(f => f.endsWith('.md')).map(f => path.join(SKILLS, n, 'references', f))]),
    path.join(ROOT, 'docs/workflow.md'), path.join(ROOT, 'docs/ui-engineering.md'), path.join(ROOT, 'README.md'),
  ];
  for (const file of files) for (const l of links(file)) assert.ok(fs.existsSync(path.resolve(path.dirname(file), l)), `${path.relative(ROOT, file)} → ${l}`);
});

test('boundaries name the neighbours each skill must leave alone', () => {
  const boundaries = {
    'ui-engineering': ['frontend-design', 'prototype', 'ui-design-system', 'ui-guard', 'ui-e2e-tests'],
    'ui-design-system': ['ui-engineering', 'frontend-design', 'ui-guard'],
    'ui-guard': ['clean-code-guard', 'test-guard', 'ui-e2e-tests', 'ui-engineering'],
    'ui-e2e-tests': ['tdd', 'test-guard', 'ui-guard', 'ui-engineering'],
  };
  for (const [name, neighbours] of Object.entries(boundaries)) {
    const dontUse = skill(name).description.split('DO NOT USE')[1];
    for (const n of neighbours) assert.ok(dontUse.includes(n), `${name} DO NOT USE must name ${n}`);
  }
});

test('stack strategies are disclosed one at a time, never inlined', () => {
  const body = skill('ui-engineering').body;
  const stacks = fs.readdirSync(path.join(SKILLS, 'ui-engineering/references')).filter(f => f.startsWith('stack-'));
  assert.equal(stacks.length, 4);
  for (const f of stacks) assert.equal(body.split(`(references/${f})`).length - 1, 1, `${f} linked exactly once`);
  assert.match(body, /read \*\*only\*\* the matching reference/);
  for (const f of stacks) assert.ok(!/stack-[a-z-]+\.md\]/.test(read(`skills/ui-engineering/references/${f}`)), `${f} must not chain to another stack`);
});

test('every UI skill that names a neighbour says what to do when it is missing', () => {
  for (const name of UI) assert.match(skill(name).body, /(not installed|unavailable)[\s\S]{0,160}never install/i, name);
});

test('the evidence rule is stated where verification happens', () => {
  assert.match(read('skills/ui-engineering/SKILL.md'), /build, a type check or reading the source is \*\*not\*\* visual verification/);
  assert.match(read('skills/hub-workflow/references/review.md'), /build, type check or source reading is not visual verification/);
  assert.match(read('skills/ui-guard/SKILL.md'), /a check that did not run is never a pass/);
  assert.match(read('skills/ui-e2e-tests/SKILL.md'), /written but not run is reported as `not_run`/);
});

test('authentication, data and dependency safety rules are present', () => {
  const evidence = read('skills/ui-guard/references/browser-evidence.md');
  assert.match(evidence, /Never disable or bypass authentication/);
  assert.match(evidence, /Never upload evidence to external services/);
  assert.match(evidence, /blocked: authentication/);
  assert.match(read('skills/ui-engineering/SKILL.md'), /add none unless the user approves that specific package/);
  assert.match(read('skills/ui-e2e-tests/SKILL.md'), /Never install browsers or packages silently/);
});

test('the scripts stay local: no outbound network modules, fetch only to the DevTools endpoint', () => {
  const audit = read('skills/ui-guard/scripts/ui-audit.mjs');
  const capture = read('skills/ui-guard/scripts/capture.mjs');
  for (const src of [audit, capture]) assert.doesNotMatch(src, /from 'node:(https?|net|tls|dgram)'/);
  assert.doesNotMatch(audit, /\bfetch\(/);
  const calls = [...capture.matchAll(/fetch\(/g)].map(m => capture.slice(m.index, m.index + 60));
  assert.ok(calls.length > 0);
  for (const call of calls) assert.match(call, /^fetch\(`http:\/\/\$\{(host|new URL\(endpoint\)\.host)\}/);
  assert.match(capture, /refusing non-local URL/);
});

test('hub-workflow routes UI work and its contracts carry UI fields', () => {
  assert.match(read('skills/hub-workflow/SKILL.md'), /`ui-engineering` sets the task class[\s\S]*small UI fix goes straight to implementation/);
  const review = read('skills/hub-workflow/references/review.md');
  assert.match(review, /\| Rendered UI[^\n]*`ui-guard`/);
  assert.match(review, /`ui-e2e-tests`; its test code then goes to `test-guard`/);
  const exec = read('skills/hub-workflow/references/execution.md');
  for (const field of ['Target screens/routes', 'Tokens and components to reuse', 'Breakpoints, themes and text direction', 'run command, URL and preview/auth mode', 'Expected evidence', '`ui` lane']) assert.ok(exec.includes(field), field);
  assert.match(read('skills/to-spec/SKILL.md'), /UI brief from `ui-engineering`/);
  assert.match(read('skills/to-tickets/SKILL.md'), /screens, states, breakpoints\/themes/);
  assert.match(read('skills/setup-matt-pocock-skills/workflow.md'), /## UI verification/);
});

test('the workflow map matches the skills: every node exists and every edge cites a file naming its target', () => {
  const map = JSON.parse(read('docs/workflow-map.json'));
  const ids = new Set(map.nodes.map(n => n.id));
  for (const name of UI) assert.ok(ids.has(name), `node ${name}`);
  for (const n of map.nodes) assert.ok(fs.existsSync(path.join(SKILLS, n.id, 'SKILL.md')), `node ${n.id} has a skill`);
  for (const e of map.edges.filter(e => [e.source, e.target].some(x => UI.includes(x)))) {
    assert.ok(ids.has(e.source) && ids.has(e.target), `${e.source} → ${e.target}`);
    assert.ok(read(e.evidence).includes(e.target === e.source ? e.source : e.target), `${e.evidence} must mention ${e.target}`);
  }
});

test('the case set covers every required scenario and names real skills, fixtures and proofs', () => {
  const { cases } = JSON.parse(read('tests/ui-workflow/cases.json'));
  const ids = new Set(cases.map(c => c.id));
  for (const id of ['tiny-css', 'new-form-jinja', 'full-page', 'redesign-existing', 'react-no-new-deps', 'rtl-responsive', 'non-ui-cli', 'non-ui-backend', 'failed-visual-a11y', 'missing-browser-tooling', 'blocked-authentication', 'audit-record-and-compare', 'missing-upstream-skill']) assert.ok(ids.has(id), id);
  const tests = read('tests/ui-audit.test.mjs') + read('tests/ui-workflow.test.mjs');
  for (const c of cases) {
    if (c.kind === 'activation') {
      assert.ok(fs.existsSync(path.join(ROOT, 'tests/ui-workflow/fixtures', c.fixture)), `${c.id} fixture`);
      for (const s of [...c.expect_any, ...c.forbid]) assert.ok(fs.existsSync(path.join(SKILLS, s, 'SKILL.md')), `${c.id}: ${s} exists`);
      assert.ok(!c.expect_any.some(s => c.forbid.includes(s)), `${c.id}: expect and forbid overlap`);
    } else {
      for (const proof of c.proof.split(';')) {
        const name = proof.split(':').slice(1).join(':').trim().split(';')[0];
        for (const part of name.split(/, (?=[a-z])/)) assert.ok(tests.includes(part.trim()), `${c.id}: proof "${part.trim()}" names a real test`);
      }
    }
  }
  for (const c of cases.filter(x => x.id.startsWith('non-ui'))) for (const s of UI) assert.ok(c.forbid.includes(s), `${c.id} forbids ${s}`);
});

test('third-party material carries its notice and pin', () => {
  assert.match(read('skills/ui-guard/NOTICE.md'), /434b7f91364665f2f733b310ec54809bf8f37937[\s\S]*MIT License[\s\S]*687bc381bc9091bf252c0a05303640561014a425/);
  assert.match(read('skills/ui-guard/references/web-interface-guidelines.md'), /434b7f91364665f2f733b310ec54809bf8f37937/);
  assert.match(read('skills/ui-engineering/NOTICE.md'), /1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/);
  const pins = read('local-sources.json');
  for (const c of ['434b7f91364665f2f733b310ec54809bf8f37937', '1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62', '687bc381bc9091bf252c0a05303640561014a425']) assert.ok(pins.includes(c), c);
  const vendor = JSON.parse(read('vendor.json'));
  for (const name of UI) assert.ok(!vendor.sources.some(s => (s.skills || []).includes(name)), `${name} must stay outside vendor ownership`);
});
