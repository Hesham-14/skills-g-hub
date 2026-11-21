# Browser evidence

How to see the rendered UI and keep what you saw, safely. Used by `ui-guard`, the
visual feedback loop in `ui-engineering`, and `ui-e2e-tests`.

## Choose a browser path

Use the first one available. Name it in the report and the audit record.

1. **The runtime's own browser tools**: a built-in browser pane, a browser
   extension, a Playwright MCP server. Best for interaction: click, type, keyboard,
   read the accessibility tree and console.
2. **The project's own browser test tooling** (Playwright, Cypress) when it is already
   installed: `npx --no-install playwright …`, never `npx playwright` that can download.
3. **`scripts/capture.mjs`** in this skill, which drives a Chrome, Chromium or Edge
   that is already installed, over the DevTools protocol (Node 22+, no packages, no
   downloads, a throwaway profile). It gives exact-viewport PNGs, light/dark emulation,
   console errors, failed requests, DOM checks (page overflow, unnamed controls,
   unlabeled fields, missing `alt`/`lang`) and performance entries. It interacts only
   through a `--before` JavaScript expression, so use path 1 or 2 for real user flows.
4. **None**: report every rendered gate as `unavailable` with the reason. Do not
   install a browser, Playwright or an MCP server without the user's approval of that
   specific tool.

Do not use the command-line `--screenshot` flag of headless Chrome for phone widths:
its layout viewport cannot go below about 500 px, so a 390 px capture is clipped, not
responsive. `capture.mjs` uses device-metrics emulation instead.

```bash
node "<ui-guard-dir>/scripts/capture.mjs" --url http://127.0.0.1:5173/settings \
  --viewports 1280x800,390x844 --themes light,dark --label settings \
  --record .ui-audit/runs/<id>.json --build-mode dev
# a state reached by interaction:
node "<ui-guard-dir>/scripts/capture.mjs" --url http://127.0.0.1:5173/settings \
  --state delete-dialog --before "document.querySelector('[data-test=delete]').click()"
```

Run it from the project root so screenshots land inside the project; it exits `3`
when no browser is installed or the page cannot be reached.

## Run the app

Use only verified commands (see the visual loop's step 1). Bind servers to
`127.0.0.1`. Start them in the background, record the stop command, and stop them when
done. A page that fails to load, an empty error page, or a crash is evidence for the
`functional` gate, not a reason to switch to source review silently.

## Matrix

Viewports, themes, direction and states come from the brief, or the project's
`docs/agents/workflow.md`. Defaults when nothing is recorded: `1280x800` and `390x844`,
every theme the product ships, RTL when the product supports it, and the states the
change touched. Use fixture or seeded data to reach states; do not edit source to fake
one, and remove any temporary test hook before finishing.

For each cell check, in one look: layout and overflow, hierarchy, tokens and theme,
text wrapping with long content, focus visibility, and console/network errors.
Keyboard: Tab through the changed region, open and close overlays with the keyboard,
confirm focus returns.

## Authentication

Use, in order: the project's no-login preview mode, a local test account from the
project's seed or fixture files, or a session the user has signed in to in the
runtime's browser for this task. Never disable or bypass authentication in code,
invent credentials, reuse the user's real passwords, or capture against production
without the user naming that host. When none of these reach the surface, mark the
rendered gates `blocked: authentication` and continue with source review.

## Sensitive content

Screenshots, traces and DOM dumps can contain personal data, secrets or customer
content.

- Keep them local, under `.ui-audit/` (or the project's own artefact directory).
  Before the first capture, check it is git-ignored; if not, tell the user and let them
  decide. Do not commit evidence unless the user asks.
- Prefer fixture or sample data. When real data is on screen, mask it (`--before` can
  replace text in the page) or mark the evidence `--sensitive` and describe it instead
  of quoting it.
- Never upload evidence to external services, issue trackers, pull requests or chat
  integrations without explicit authorization for that destination.

## Evidence types

| Basis | What it is | Proves |
| --- | --- | --- |
| `rendered` | A screenshot or a browser-tool observation of the page | Layout, theme, visible states |
| `measured` | Tool output: DOM checks, computed contrast, axe result, console log, metric | The specific measured property |
| `source` | Reading code | A hypothesis about rendering; never a visual pass |

A persisted screenshot file is the strongest evidence. When the browser tool cannot
save files, record `--observed "<what was seen>" --tool <tool name>`; that is weaker,
and the report says so.
