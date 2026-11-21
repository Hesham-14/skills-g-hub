# UI workflow evaluation

- `cases.json`: the scenario set. `activation` cases name a prompt, a fixture, the
  skills that should load and the ones that must not. `behaviour` cases name the
  offline test that proves them.
- `fixtures/`: small projects per supported stack (static with seeded defects and a
  fixed twin, FastAPI + Jinja RTL, React with a no-new-packages rule, React with
  Tailwind/shadcn/Radix) and a non-UI CLI.
- `../ui-workflow.test.mjs` and `../ui-audit.test.mjs`: offline checks, run on every
  change.
- `activation-eval.mjs`: the live check. It runs each activation case through the
  installed `claude` CLI in a throwaway copy of the fixture, with this hub's skills
  linked as project skills, and records which skills the model loaded. It costs
  model usage; run it after changing any description.

```bash
node tests/ui-workflow/activation-eval.mjs --out /tmp/ui-eval.json   # all cases, Sonnet
node tests/ui-workflow/activation-eval.mjs --only ui-review,e2e-test --runs 3
```

A case passes when an expected skill loads (or, for `accept_none` cases, nothing
loads) and no forbidden skill loads. Hitting the turn limit after the choice is not a
failure. The user's own installed skills and plugins stay visible, as in real use.

## Results, 2026-11-07 (Claude Code 2.1.319, Sonnet)

| Run | Change | Passed | Reported cost |
| --- | --- | --- | --- |
| Baseline | First descriptions; editing disallowed | 7/12 judged on activation (4/12 as first scored, which counted the turn limit as failure) | $1.18 |
| Tuning 1 | `ui-guard` and `ui-engineering` triggers front-loaded with "whenever" | `ui-guard` 2/2; `ui-engineering` build cases 0/6 | $0.87 |
| Tuning 2 | React fixture given the code the prompts refer to; edits allowed in the copy | build cases 0/6 | $0.87 |
| Tuning 3 | `ui-engineering` triggers on the act of editing UI files, "on your own initiative" | build cases 5/6 | $0.92 |
| Final | Full set, one run each | **11/12** | $1.41 |

Final misses: `visual-direction-only` expected the vendored `frontend-design`,
whose upstream description has no trigger phrases; it did not load in any run.
Vendored folders cannot be edited here; refreshing it from upstream is the only lever.
`react-no-new-deps` loaded `ui-engineering` in 2 of 3 runs across tuning 3 and the
final run. No UI skill loaded on either non-UI case, and no case loaded a forbidden
skill.

Token overhead: the four descriptions add about 2,500 characters (~630 tokens) to
every session; the bodies load only on activation. Average input per eval session
was 114k–196k tokens, dominated by the runtime's own prompt and the other installed
skills, not by these four.

Not measured: Codex and Antigravity activation (they read the same descriptions;
no comparable event stream was wired up here), and multi-run variance beyond two or
three runs per case.
