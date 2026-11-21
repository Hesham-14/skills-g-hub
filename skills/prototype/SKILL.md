---
name: prototype
description: "Build a disposable experiment to answer a logic, state or UI design question. Use when behavior needs a runnable demonstration or competing layouts need comparison. DO NOT USE for production implementation, a settled design, or routine UI polish."
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

Identify which question is being answered — from the user's prompt, the surrounding code, or by asking if the user is around:

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). Build a single shareable HTML file — free-play buttons plus tabbed guided walkthroughs — that pushes the state machine through cases that are hard to reason about on paper, and that a non-developer can drive.
- **"What should this look like?"** → [UI.md](UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.

The two branches produce very different artifacts — getting this wrong wastes the whole prototype. If the question is genuinely ambiguous and the user isn't reachable, default to whichever branch better matches the surrounding code (a backend module → logic; a page or component → UI) and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from day one, and clearly marked as such.** Locate the prototype code close to where it will actually be used (next to the module or page it's prototyping for) so context is obvious — but name it so a casual reader can see it's a prototype, not production. For throwaway UI routes, obey whatever routing convention the project already uses; don't invent a new top-level structure.
2. **Trivial to run.** A UI prototype starts from one command in the project's task runner — `pnpm <name>`, `python <path>`, `bun <path>`, etc. A logic demo is a single HTML file the user double-clicks. Either way, no thinking required to start it.
3. **No persistence by default.** State lives in memory. Persistence is the thing the prototype is _checking_, not something it should depend on. If the question explicitly involves a database, hit a scratch DB or a local file with a clear "PROTOTYPE — wipe me" name.
4. **Skip the polish.** No tests, no error handling beyond what makes the prototype _runnable_, no abstractions. The point is to learn something fast.
5. **Surface the state.** After every action (logic) or on every variant switch (UI), print or render the full relevant state so the user can see what changed.
6. **Capture the verdict.** Record the question, observations, chosen behavior and unresolved uncertainty in the originating plan/ticket. Preserve the experiment in a marked scratch directory or an isolated prototype branch when git actions are authorized. Never switch/reset a dirty tree to move it. Promoting the result to production requires implementation scope; use `hub-workflow` and relevant tests/guards for that step (`ui-engineering` for a UI verdict). Prototype completion alone does not authorize production edits or a commit.

Use `frontend-design` for UI design direction when available, bounded to the experiment. Return domain decisions through `grill-me-code`; carry the verdict to `to-spec` when appropriate. These references are conditional, not a requirement to run the entire workflow.

Locally adapted from Matt Pocock v1.2.3 (MIT; see LICENSE).
