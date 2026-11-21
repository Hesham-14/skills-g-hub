---
name: grill-me-code
description: "Interrogate a technical plan — architecture, data model, migration, refactor, or implementation approach — before any code is written. Maps decisions in rounds, resolves repository facts, and saves agreed domain terms and consequential decisions with their reasons. Use when the user wants a software plan stress-tested, says 'grill me' about a technical decision, or is about to commit to an approach whose assumptions have not been examined. DO NOT USE for personal or life decisions, for reviewing code that already exists (use clean-code-guard, wp-guard, or woo-guard), for a question with a single lookup answer (use research), or once the plan is settled and the work is implementation."
---

# Grill Me — Technical Plans

Interview the user until you reach a shared understanding of the plan. Map it as a
**design tree**: every decision branches into the decisions that hang off it.

Read [references/domain-records.md](references/domain-records.md) when working in
a repository. Save agreed project terms and consequential decisions as they
settle, preserving their reasons. Read existing records before reopening a choice.
If the user wants conversation only, keep the conclusions in the conversation.

## Rounds and the frontier

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are
already settled — the questions you can ask *now* without guessing at answers you have
not heard yet. Ask the whole frontier in one round, numbered, each with your recommended
answer. Then wait.

```
❓ **Q1** — **<question title>**: <question body, may be several paragraphs, may offer choices>

➡️ <your recommended answer>
```

Each round of answers reshapes the tree: settled decisions push the frontier outward and
unblock what depended on them. Recompute the frontier and ask the next round. A question
whose answer depends on another question still open in this round belongs to a **later**
round, not this one.

## Facts are your job

Finding *facts* is your job, never the user's. When a frontier question needs a fact from
the environment — what the schema actually looks like, whether a hook already exists, how
the current code handles a case — go read it. Dispatch a sub-agent and keep going; a
running exploration is just an unsettled prerequisite, so only the questions downstream of
it wait. Ask the rest of the frontier now.

Never ask the user for something you could look up. The *decisions* are theirs — put each
one to them and wait.

## Recommended answers are expected here

Unlike non-technical grilling, leading with your recommendation is
correct: a technical plan has a codebase you can read, so your recommendation is grounded
in something the user can check, not a mirror of how they framed the question. Say what
you would do and why, then let them overrule you.

## Done

The session ends when the frontier is empty: every branch visited, nothing left silently
assumed. Show the settled plan and pointers to the records written. Confirm only
unresolved consequential choices; do not repeat questions already answered.
For a planning-only request, stop here. If implementation is already authorized,
continue through `hub-workflow`: use `to-spec`/`to-tickets` for substantial work,
or implement a small settled change directly. A runnable unresolved design question
can detour through `prototype` and return with its verdict.

---

Adapted from the `grilling` skill in [mattpocock/skills](https://github.com/mattpocock/skills)
(MIT), forked rather than vendored so its description can be scoped to technical work and
kept out of the way of non-technical grilling. Not covered by `vendor.json`; the sync never touches it.
