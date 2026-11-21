---
name: diagnosing-bugs
description: "Diagnose recurring, unclear or intermittent bugs and performance regressions using reproducible evidence. Use when asked to debug a difficult failure or when an attempted fix fails. DO NOT USE for an obvious typo, routine implementation, or review without a reported failure."
---

# Diagnose with evidence

Make each experiment reduce uncertainty. Reuse the information already gathered
and scale investigation to the bug; do not impose a full research process on a
cause already established by a precise error and a reproducible check.

## Start with the symptom

Establish expected versus actual behavior and the relevant input/environment.
Read the failing path and its immediate callers, applicable project instructions,
and relevant glossary/ADRs. Reuse an existing failing test, command, captured input,
or repeatable UI action before building a new harness. Verify it catches this
specific symptom; a process exiting successfully is not necessarily a passing check.

Reproduce before changing behavior where possible. When reproduction is blocked,
label code-based explanations as unverified and seek the smallest missing artifact
or access needed. Bounded read-only investigation can continue; never claim a
confirmed cause or successful fix without sufficient evidence.

## Probe, then fix

- State the explanation and the observation that would distinguish it from an
  alternative. Change one relevant variable per probe.
- If the evidence identifies a clear cause, fix the smallest responsible area.
  Otherwise use [deep-investigation.md](references/deep-investigation.md).
- For repeated attempts, keep a compact note in the project's existing scratch
  area: symptom, reproduction, hypothesis → probe → result, ruled-out causes,
  and next useful experiment. Create a file only when history needs to survive
  another attempt/session. Update it instead of restarting broad exploration.
- If a failed attempt adds no information, change the probe or gather missing
  evidence. Do not repeat equivalent edits with different wording.

For a regression, turn the reproduction into a failing test at a real observable
interface when feasible, then use `tdd`. Reuse an existing failing regression test
instead of adding a duplicate. Do not create an abstraction solely to make an
unrepresentative test pass. If the architecture blocks a faithful test, record
that limitation; offer `improve-codebase-architecture` as separate scoped work.

Rerun the original scenario after the fix, then relevant broader checks. For
intermittent failures report trials/failures and residual uncertainty. Remove only
temporary instrumentation introduced by this investigation. Route the changed
diff through `hub-workflow` review and its relevant guards.

When delegating under existing authorization, include the reproduction and ruled-out
hypotheses in the brief. A new implementer should start from the last experiment.

Adapted locally from Matt Pocock's diagnosing-bugs at v1.2.3 (MIT; see LICENSE).
The upstream human-loop shell template is not included; ordinary manual
reproduction steps suffice until automation has a demonstrated benefit.
