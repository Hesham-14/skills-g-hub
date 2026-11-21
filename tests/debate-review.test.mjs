import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../skills/debate-review/scripts/review-pr.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REVIEW = path.join(ROOT, 'skills/debate-review/scripts/review-pr.mjs');
const CONFIG = path.join(ROOT, 'skills/delegate-setup/scripts/config.mjs');

function execute(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout;
}

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-review-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'project');
  const skills = path.join(dir, 'skills');
  fs.mkdirSync(repo);
  execute('git', ['init', '-b', 'main', repo]);
  execute('git', ['-C', repo, 'config', 'user.name', 'Fixture']);
  execute('git', ['-C', repo, 'config', 'user.email', 'fixture@example.invalid']);
  fs.writeFileSync(path.join(repo, 'app.txt'), 'before\n');
  fs.writeFileSync(path.join(repo, '.gitignore'), '.scratch/\n');
  execute('git', ['-C', repo, 'add', '.']);
  execute('git', ['-C', repo, '-c', 'commit.gpgsign=false', 'commit', '-m', 'base']);
  fs.writeFileSync(path.join(repo, 'app.txt'), 'after\n');
  for (const name of ['claude', 'codex']) {
    const scripts = path.join(skills, `${name}-delegate`, 'scripts');
    fs.mkdirSync(scripts, { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'tests/fixtures/review-relay.mjs'), path.join(scripts, 'relay.mjs'));
  }
  const env = { ...process.env, DELEGATE_SKILLS_DIR: skills, XDG_CONFIG_HOME: path.join(dir, 'config') };
  return { dir, repo, skills, env, out: path.join(dir, 'artifacts') };
}

function review(f, extra = [], env = {}) {
  return spawnSync(process.execPath, [REVIEW, '--local', '--base', 'main', '--repo-dir', f.repo,
    '--out-dir', f.out, ...extra], { encoding: 'utf8', env: { ...f.env, ...env } });
}

test('PR reviews print by default; publishing requires an explicit flag', () => {
  for (const args of [['42'], ['42', '--dry-run'], ['42', '--force']]) assert.equal(parseArgs(args).dryRun, true);
  assert.equal(parseArgs(['42', '--post']).post, true);
  assert.ok(!parseArgs(['42', '--post']).dryRun);
  for (const args of [['--local', '--post'], ['42', '--post', '--dry-run']]) {
    const result = spawnSync(process.execPath, [REVIEW, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 2);
  }
});

test('a local ignored spec reaches every reviewer and leaves the source tree untouched', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.repo, '.scratch'));
  const requirement = 'Fixture requirement: preserve the original record.';
  fs.writeFileSync(path.join(f.repo, '.scratch/spec.md'), requirement);
  const before = execute('git', ['-C', f.repo, 'status', '--porcelain=v1']);
  const result = review(f, ['--main', 'claude', '--debate', 'codex', '--spec', '.scratch/spec.md'], { REVIEW_FIXTURE_SPEC: requirement });
  assert.equal(result.status, 0, result.stderr);
  const run = JSON.parse(fs.readFileSync(path.join(f.out, 'run.json')));
  assert.equal(run.printOnly, true);
  assert.equal(run.postResult, undefined);
  assert.equal(run.stages.final.doc.findings[0].status, 'agreed');
  assert.equal(execute('git', ['-C', f.repo, 'status', '--porcelain=v1']), before);
  assert.equal(fs.readFileSync(path.join(f.repo, 'app.txt'), 'utf8'), 'after\n');
});

test('trusted project lane dials follow the review into a temporary snapshot; untrusted edits fail', t => {
  const f = fixture(t);
  const proposal = path.join(f.dir, 'fleet.json');
  const lane = implementer => ({ implementer, model: 'test-model', effort: 'medium', timeout: '2m' });
  fs.writeFileSync(proposal, JSON.stringify({ version: 'delegate-fleet.v1', lanes: {
    'review-main': lane('claude'), 'review-debate': lane('codex') } }));
  // Uses the real config/trust writer, entirely inside the temporary fixture repo.
  execute(process.execPath, [CONFIG, 'write', '--scope', 'project', '--cwd', f.repo, proposal], { env: f.env });
  const result = review(f, [], { REVIEW_FIXTURE_LANE: '1' });
  assert.equal(result.status, 0, result.stderr);
  const run = JSON.parse(fs.readFileSync(path.join(f.out, 'run.json')));
  assert.equal(run.who.main.dials.model, 'test-model');
  fs.appendFileSync(path.join(f.repo, '.delegate/config.json'), '\n');
  const rejected = review(f);
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /not trusted/);
});

test('read-only violations and failed retries cannot produce an accepted review', t => {
  const f = fixture(t);
  const args = ['--main', 'claude', '--debate', 'codex'];
  assert.equal(review(f, args).status, 0);
  const failed = review(f, args, { REVIEW_FIXTURE_EXIT: '1' });
  assert.equal(failed.status, 1);
  assert.equal(fs.existsSync(path.join(f.out, 'main/result.json')), false);
  const violated = review(f, args, { REVIEW_FIXTURE_VIOLATION: '1' });
  assert.equal(violated.status, 1);
  assert.match(violated.stderr, /read-only violation/);
  const run = JSON.parse(fs.readFileSync(path.join(f.out, 'run.json')));
  assert.equal(run.stages.final, undefined);
  assert.equal(run.postResult, undefined);
});
