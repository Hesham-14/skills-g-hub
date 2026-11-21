#!/usr/bin/env node
// Live activation check for the UI skills. Opt-in: every case is a real model call
// through the installed `claude` CLI and costs usage. Each case runs in a throwaway
// copy of its fixture with the hub's skills linked in as project skills. File edits
// are allowed inside that copy so build requests behave as they would in a real
// session; shell, web and sub-agent tools are disallowed; the copy is deleted after.
//
//   node tests/ui-workflow/activation-eval.mjs [--model sonnet] [--only id,id] [--runs 1] [--out results.json]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : acc), []));
const model = args.model || 'sonnet';
const runs = Number(args.runs || 1);
const only = args.only ? String(args.only).split(',') : null;
const budget = String(args['max-budget-usd'] || '0.60');

if (spawnSync('claude', ['--version'], { encoding: 'utf8' }).status !== 0) {
  console.error('claude CLI not found: the live activation check is unavailable');
  process.exit(3);
}

const { cases } = JSON.parse(fs.readFileSync(path.join(HERE, 'cases.json'), 'utf8'));
const selected = cases.filter(c => c.kind === 'activation' && (!only || only.includes(c.id)));
const skillNames = fs.readdirSync(path.join(ROOT, 'skills')).filter(n => n !== '_template' && fs.existsSync(path.join(ROOT, 'skills', n, 'SKILL.md')));

function workspace(fixture) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `ui-eval-${fixture}-`));
  fs.cpSync(path.join(HERE, 'fixtures', fixture), dir, { recursive: true });
  fs.mkdirSync(path.join(dir, '.claude/skills'), { recursive: true });
  for (const n of skillNames) fs.symlinkSync(path.join(ROOT, 'skills', n), path.join(dir, '.claude/skills', n));
  spawnSync('git', ['init', '-q', '-b', 'main', dir]);
  return dir;
}

function runCase(c) {
  const dir = workspace(c.fixture);
  return new Promise(resolve => {
    const p = spawn('claude', ['-p', c.prompt, '--output-format', 'stream-json', '--verbose', '--model', model, '--max-turns', '6',
      '--setting-sources', 'project', '--no-session-persistence', '--max-budget-usd', budget,
      '--allowedTools', 'Skill,Read,Glob,Grep,Edit,Write',
      '--disallowedTools', 'MultiEdit,NotebookEdit,Bash,WebFetch,WebSearch,Agent,Task'],
    { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '', err = '';
    const loaded = [], available = [];
    let usage = null, cost = null, turns = null;
    p.stdout.on('data', d => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        let ev; try { ev = JSON.parse(line); } catch { continue; }
        if (ev.type === 'system' && ev.subtype === 'init' && Array.isArray(ev.skills)) available.push(...ev.skills);
        if (ev.type === 'assistant') for (const part of ev.message?.content || []) if (part.type === 'tool_use' && part.name === 'Skill') loaded.push(String(part.input?.skill || part.input?.command || '').replace(/^\//, ''));
        if (ev.type === 'result') { usage = ev.usage || null; cost = ev.total_cost_usd ?? null; turns = ev.num_turns ?? null; }
      }
    });
    p.stderr.on('data', d => { err += d; });
    p.on('close', code => {
      fs.rmSync(dir, { recursive: true, force: true });
      resolve({ code, loaded, uiAvailable: available.filter(s => s.startsWith('ui-')), usage, cost, turns, err: err.slice(-400) });
    });
  });
}

const results = [];
for (const c of selected) {
  for (let r = 0; r < runs; r++) {
    const out = await runCase(c);
    const hitExpected = c.expect_any.length === 0 || c.expect_any.some(s => out.loaded.includes(s)) || (c.accept_none && out.loaded.length === 0);
    const forbidden = out.loaded.filter(s => c.forbid.includes(s));
    // Exit 1 usually means the turn limit was reached after the skill choice; activation is what is judged.
    const pass = out.loaded !== null && hitExpected && forbidden.length === 0 && !/not logged in|authentication/i.test(out.err);
    results.push({ id: c.id, run: r + 1, pass, loaded: out.loaded, expected: c.expect_any, forbidden_loaded: forbidden, exit: out.code, turns: out.turns, cost_usd: out.cost, input_tokens: out.usage ? (out.usage.input_tokens || 0) + (out.usage.cache_read_input_tokens || 0) + (out.usage.cache_creation_input_tokens || 0) : null, ui_skills_listed: out.uiAvailable.length, stderr: out.code === 0 ? undefined : out.err.slice(-200) });
    const last = results.at(-1);
    console.log(`${last.pass ? 'PASS' : 'FAIL'} ${c.id}#${last.run} loaded=[${last.loaded.join(', ')}] expected=[${c.expect_any.join(', ') || 'none'}]${forbidden.length ? ` FORBIDDEN=[${forbidden.join(', ')}]` : ''} cost=${last.cost_usd ?? 'n/a'}`);
  }
}
const passed = results.filter(r => r.pass).length;
const totalCost = results.reduce((n, r) => n + (r.cost_usd || 0), 0);
const summary = { date: new Date().toISOString(), model, cli: spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim(), cases: selected.length, runs: results.length, passed, accuracy: results.length ? passed / results.length : null, total_cost_usd: Math.round(totalCost * 10000) / 10000, results };
if (args.out) fs.writeFileSync(args.out, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`\n${passed}/${results.length} passed · model ${model} · reported cost $${summary.total_cost_usd}`);
process.exitCode = passed === results.length ? 0 : 1;
