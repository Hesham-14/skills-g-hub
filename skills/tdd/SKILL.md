---
name: tdd
description: "Build behavior test-first at an agreed observable interface. Use for explicit TDD, substantial behavior covered by a spec, or a regression with a faithful reproduction. DO NOT USE for test review alone, prose/config-only edits, disposable prototypes, or trivial mechanically verified changes."
---

# One behavior at a time

Reuse the test interface agreed in the spec, conversation or existing project
conventions. State the chosen observable behavior before testing. Ask only when
choosing a new interface would change an unresolved contract or meaningful design
trade-off; do not re-ask for an already settled choice.

If interface shape is the actual uncertainty, consult `codebase-design`; do not
invent layers solely for mocking. Follow applicable glossary terms and ADRs.

1. Write one test for a concrete expected behavior using an independent expected
   result. Observe it fail for the intended reason, not setup, syntax or missing infrastructure.
2. Implement enough real behavior to pass. Do not hardcode a fixture result, weaken
   assertions or implement speculative future cases.
3. Repeat with the next meaningful behavior. Reuse existing failing tests; avoid
   writing a batch of speculative tests before feedback from implementation.

Use the project's runner and suitable existing fixtures. Test at an interface that
actually observes the requirement; use real database/schema behavior when that is
what the test is about. Consult `test-guard` for test-quality rules and its relevant
language reference, rather than maintaining a second copy of those rules here.
If it is unavailable, preserve behavior-based assertions, meaningful regressions,
independent expected results and mocks only at real external boundaries.

For a bug, `diagnosing-bugs` supplies the reproduction and original scenario to
rerun. TDD does not require restarting the diagnosis. A missing faithful test
interface is a limitation to report, not permission for an unrelated redesign.

After the behavior is green, do necessary cleanup while preserving the contract,
then run affected tests and use `hub-workflow` review. `test-guard` reviews the
resulting tests; production guards review the implementation. Do not run every
reviewer after every red/green step or force an independent debate.

Adapted from Matt Pocock's tdd v1.2.3 (MIT; see LICENSE). Test quality is owned by
this hub's test-guard; local workflow replaces upstream's mandatory repeated
interface confirmation and code-review dependency.
