# Audit recorder

`scripts/ui-audit.mjs` writes one JSON record per verification run, validates it
against [ui-audit.schema.json](ui-audit.schema.json), prints a Markdown summary and
compares two runs. Node built-ins only; no network. It starts no process except `git`
(read-only queries) and the single command you pass to `run`.

`<ui-guard-dir>` below is the directory holding this skill's `SKILL.md`.

## When to record

Significant and redesign work, an explicit audit request, or a project policy that
asks for it. Trivial and most standard changes report evidence in the reply instead.

## A run

```bash
A="node <ui-guard-dir>/scripts/ui-audit.mjs"
R=$($A init --task "Offers list phone layout" --class significant --scope templates/offers.html --print-path)
# real commands: exit code, duration and a redacted output tail are captured
$A run --record "$R" --gate build --name "lint + tests" -- ./verify.sh
# rendered evidence, browser signals and metrics (capture.mjs adds the environment too)
node <ui-guard-dir>/scripts/capture.mjs --url http://127.0.0.1:3000/offers --themes light \
  --record "$R" --build-mode preview
# your judgement after looking at the screenshots
$A check   --record "$R" --gate visual --name "Phone + desktop look" --status pass --evidence ev-1,ev-2
$A finding --record "$R" --severity P2 --gate visual --basis rendered --title "Price wraps under the badge" \
  --location templates/offers.html:41 --evidence ev-2 --remediation "Give .price white-space:nowrap"
$A check   --record "$R" --gate functional --name "Playwright offers flow" --status blocked --note "no Playwright in this repo"
$A finalize --record "$R"          # stores the result commit, gates and verdict; validates
$A summary "$R"                    # human-readable report for the user
```

Records go to `<project>/.ui-audit/runs/<timestamp>-<slug>.json`; `init` warns when
`.ui-audit/` is not git-ignored. Other commands: `env`, `evidence`, `metric`
(`--from-json` accepts a list), `import-playwright` (a Playwright `--reporter=json`
file), `usage`, `note`, `validate`, `--help`.

## Rules the recorder enforces

- Every gate starts `not_run`. A gate's status is the worst of its checks.
- Required gates by class: trivial `visual`; standard `visual, a11y`; significant
  adds `ux, functional`; redesign adds `architecture`. Override with `--require`.
- Verdict: `fail` on any failed gate or open P0/P1 finding; otherwise `incomplete`
  while a required gate is not `pass`; otherwise `pass`.
- A `pass` needs a recorder-captured exit code 0 (`run`), an imported report, or
  evidence references. A `visual` pass needs screenshot evidence.
- A `rendered` or `measured` finding needs evidence. Evidence files must sit inside
  the project; their SHA-256 is stored and rechecked on `validate`.
- Agent usage stays `unavailable` unless you record figures the runtime actually
  reported (`usage --source "<where the numbers came from>"`).
- Metrics are recorded only when the browser reported them; missing values are left
  out, never zero.

## Comparing runs

```bash
$A compare .ui-audit/runs/<baseline>.json .ui-audit/runs/<candidate>.json   # --json for machines
```

It lists gate changes, new and resolved findings (matched by gate, title and location
without line numbers), and metric deltas. Metrics are compared only when both runs
recorded the same OS, browser major version, build mode and device; otherwise they are
reported as not comparable. A metric must move by more than the threshold (default
10%) **and** an absolute noise floor (50 ms, 2 KB, 0.02 CLS) to count. Exit code 1
means regressions were found. Use a compatible baseline: the same surface and scope,
recorded on the same machine and build mode.
