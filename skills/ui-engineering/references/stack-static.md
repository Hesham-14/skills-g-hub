# Static HTML, CSS and JavaScript

For pages with no build step: demos, landing pages, documentation sites, single-file
tools, prototypes promoted to keep. Served by any static server (nginx, `python3 -m
http.server`, a project script) or opened directly.

## Before editing

- Find the shared stylesheet(s), the `:root` custom properties, and any per-page
  `<style>` blocks. Find how pages share chrome (copy-pasted header, JS include).
- Find how the site is served locally (`serve.py`, `start.sh`, compose file) and use
  that command for the visual loop.
- Note external runtime dependencies (Google Fonts, CDN scripts); keep them as they are
  unless the task is about them.

## Implementation rules

1. **No framework by default.** Plain semantic HTML, one shared stylesheet, small
   scripts. Do not introduce a bundler, package manager or framework for a static page.
2. **Tokens.** Colours, type sizes and spacing come from custom properties; new repeated
   values become properties. Inline `style=""` only for genuinely one-off values.
3. **Components.** A repeated block keeps one class vocabulary (`.card`, `.badge`) across
   pages. JavaScript that builds HTML escapes data before inserting it (`textContent`, or
   an escape helper) and never concatenates user or fetched strings into `innerHTML`.
4. **Icons.** Inline SVG with `aria-hidden="true"` and a text label on the control;
   emoji or Unicode symbols are not an accessible icon system.
5. **Responsive.** Mobile-friendly by default: fluid widths, `max-width` containers,
   `minmax()` grids, no fixed pixel widths on content. Add the viewport meta tag.
6. **Motion and media.** Respect `prefers-reduced-motion`; give autoplaying or looping
   motion a pause control.
7. **Print or export pages** keep their own print stylesheet; test them with print
   emulation when the change touches them.

## Verify

Serve the directory locally rather than relying on `file://` when scripts fetch data or
use modules. Run the visual loop at desktop and phone width. A static site usually has
no test suite; the rendered check and browser console are the gate.
