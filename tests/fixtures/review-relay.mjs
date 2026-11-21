// Fake external model/CLI boundary; no model or network requests.
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
if (args.includes('--help')) { console.log('--read-only --model --effort --timeout'); process.exit(0); }
const flag = name => args[args.indexOf(name) + 1];
if (process.env.REVIEW_FIXTURE_EXIT) process.exit(7);
if (!args.includes('--read-only') || args.includes('--lane')) process.exit(8);
if (process.env.REVIEW_FIXTURE_LANE &&
    (flag('--model') !== 'test-model' || flag('--effort') !== 'medium' || flag('--timeout') !== '2m')) process.exit(9);
const outDir = flag('--out-dir');
const role = path.basename(outDir);
const brief = fs.readFileSync(flag('--brief'), 'utf8');
if (process.env.REVIEW_FIXTURE_SPEC && (!brief.includes(process.env.REVIEW_FIXTURE_SPEC) || /\{\{[A-Z_]+\}\}/.test(brief))) process.exit(10);
const finding = { id: 'F1', file: 'app.txt', line_start: 1, line_end: 1,
  severity: 'blocking', axis: 'spec', claim: 'Fixture behavior differs from requirement',
  evidence: 'Controlled model response for pipeline integration', recommendation: 'Match requirement', confidence: 1 };
const documents = {
  main: { schema: 'debate-review.findings.v1', verdict: 'needs-attention', summary: 'Fixture finding', findings: [finding] },
  debate: { schema: 'debate-review.debate.v1', verdicts: [{ id: 'F1', verdict: 'confirm', reason: 'Requirement applies', evidence: 'Fixture evidence' }], new_findings: [] },
  final: { schema: 'debate-review.final.v1', summary: 'Confirmed fixture finding', findings: [{ ...finding, status: 'agreed', debate_note: 'Both checked the requirement' }] },
};
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify({ status: 'completed',
  readOnlyViolation: process.env.REVIEW_FIXTURE_VIOLATION === '1',
  finalMessage: JSON.stringify(documents[role]) }));
