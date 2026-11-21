# Escalate only the uncertain part

Use for recurring failures, ambiguous evidence, intermittent bugs, performance
regressions, or an attempted fix that did not address the original symptom.

- Minimise the reproduction while it still captures the real failure. Stop when
  further shrinking would cost more than it clarifies; keep the original input.
- Rank plausible explanations by evidence and choose a probe that separates them.
  Do not invent extra hypotheses to meet a quota.
- Prefer debugger inspection or targeted boundary logs over dumping whole objects
  or repositories. Redact secrets; store only diagnostic signal from captured requests.
- For nondeterminism, control time/randomness/environment where applicable and
  repeat trials. Do not turn an observed flake rate into a guaranteed result.
- For slowness, establish a repeatable baseline and profile/query-plan evidence.
  Measure the same workload after the change. Use bisection when two known states
  differ and the reproduction can safely distinguish them.
- A temporary harness is justified when it shortens repeated experiments. Use
  existing dependencies first; do not provision infrastructure merely to complete
  a prescribed debugging phase.

If all useful probes depend on unavailable runtime evidence, state exactly what
is missing and why. Production instrumentation and external mutations require
authorization for those actions. Keep the current evidence so the next attempt
does not restart from zero.
