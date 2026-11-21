# Consolidate without losing behavior

Map the actual inputs, callers, side effects and failure modes before moving code.
Classify dependencies only to choose suitable verification:

- In-process behavior: exercise the public function/module directly.
- Local database/filesystem behavior: use real scratch infrastructure where its
  semantics are under test. A stand-in needs evidence that it preserves those semantics.
- Owned remote services: test the transport contract separately from orchestration;
  use an existing client abstraction where available.
- Third-party service: substitute at that external boundary for deterministic tests,
  retaining targeted integration checks where necessary.

Migrate callers in verifiable batches. Preserve compatibility when not all callers
can change together; remove the old path only after callers migrate and coverage
has been checked. New test interfaces must exercise the same real failure patterns.

Do not delete old regression tests simply because the module became deeper.
Retain or migrate each regression and verify its replacement still catches the
original failure. Remove redundant implementation-coupled tests only with evidence
that their meaningful behaviors remain covered. Use test-guard for that review.
