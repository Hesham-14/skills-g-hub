# Visual feedback loop

Run it for every standard, significant and redesign change. The loop ends when every
UI acceptance criterion has rendered evidence, or when a concrete blocker is reported.
How to collect evidence safely (tools, viewports, auth, sensitive data) lives in
`ui-guard`'s `references/browser-evidence.md`; read it before the first capture.

## 1. Run the app with a verified command

Use the command recorded in `docs/agents/workflow.md`, the project README, its
`package.json`/`Makefile`/compose scripts, or one the user gave you. Never invent a
start command. Prefer the project's own no-login preview mode or test fixtures. Start
long-running servers in the background, record how to stop them, and stop them before
reporting unless the user wants them kept.

If the app cannot start (missing service, credentials, Docker, dependencies), stop the
loop: report `blocked` with the exact command and error. Do not install dependencies,
create accounts, disable authentication or point the app at production data to get
past the blocker.

## 2. Decide the check matrix

From the brief, list what must be looked at, and nothing more:

- **Viewports:** the project's own (for example 1280 and 390). Default when none is
  recorded: 1280×800 and 390×844.
- **Themes:** each theme the surface supports.
- **Direction:** RTL and LTR when the surface supports both.
- **States:** each state in the inventory that the change touched, reached through real
  interaction or fixture data (not by editing the source to force it).
- **Interactions:** the primary task end to end, keyboard path included.

## 3. Look

Open each matrix cell in a real browser. For each one, capture a screenshot and check:

- Layout: alignment, overflow, horizontal scroll, clipped or overlapping text, wrapping
  of long content, sticky elements covering content.
- Hierarchy: the primary task reads first; spacing groups what belongs together.
- Consistency: tokens, components and copy match the rest of the product.
- Interaction: controls respond, focus is visible and moves logically, async feedback
  appears, errors appear where the user is looking.
- Browser signals: console errors, failed requests, unhandled rejections.

Batch the checks: fix everything one look reveals before looking again.

## 4. Fix narrowly, then look again

Each fix targets a finding. Recheck the affected cells and any cell the fix could
change (a shared token or component touches every screen that uses it). Stop when the
acceptance criteria pass, or after three rounds without progress on the same finding,
which becomes a reported limitation.

## 5. Report what was actually seen

Name every matrix cell as checked, failed, blocked or not run, with its evidence.
"Verified visually" requires a rendered screenshot or browser observation of that
cell. Hand the evidence to `ui-guard`, and record it with its recorder when the task is
significant or above.
