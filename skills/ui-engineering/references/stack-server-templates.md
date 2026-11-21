# Server templates + vanilla JavaScript

For server-rendered HTML (Jinja2 with FastAPI or Flask, Django templates) with
hand-written JavaScript and CSS and no frontend build. The server owns state; pages are
full-page loads with forms that POST and redirect.

## Before editing

- Find the base template (tokens, shell, nav, global CSS), the macro/include files, and
  how page CSS is injected (`{% block css %}`, static files).
- Find how templates are rendered: which `Jinja2Templates`/environment instance renders
  the target, and which filters and globals that instance registers. A filter that
  exists on one instance may be missing on another.
- Find the view-model code that builds the template context. Logic belongs there, not
  in the template.
- Find tests that render pages (FastAPI `TestClient`, Django test client) and assert on
  HTML.

## Implementation rules

1. **Keep logic in Python.** Templates format and branch on prepared values; computed
   labels, states and permissions come from the view-model and are unit-tested there.
2. **Reuse macros and includes.** Use the shared form/field macros; when the same macro
   is defined locally in several templates and this change needs it, move it to the
   shared macro file and use it at the new site.
3. **Forms.** Server-side validation is the source of truth. On error re-render with the
   submitted values, the field error next to its field, `aria-invalid` +
   `aria-describedby`, and the project's error status code (often 422); on success
   redirect (303). HTML attributes (`required`, `type`, `autocomplete`, `maxlength`) add
   client help, never the only check.
4. **Escaping.** Leave autoescape on. `|safe` and `Markup` only for HTML the server built
   from escaped parts. Data for scripts goes through `<script type="application/json">`
   with `|tojson`, not string interpolation into JavaScript.
5. **JavaScript.** Progressive enhancement: the page works without the script for its
   primary task where the project already does. Follow the existing pattern (IIFE,
   module, `data-*` hooks); no framework, bundler or CDN script unless the user approves.
   Reuse existing helpers before writing new ones.
6. **CSS.** Use the base template's custom properties. Put a style shared by two pages
   into the shared stylesheet rather than a second page block. Use the project's
   breakpoint values.
7. **RTL.** With `dir="rtl"`: logical properties (`margin-inline-start`, `inset-inline-end`,
   `text-align: start`), `<bdi>` around numbers, IDs and Latin text inside Arabic, and
   explicit `direction: ltr` only for inherently left-to-right content (code, charts,
   maps). Mirror directional icons; do not mirror logos or media controls.
8. **URL state.** Filters, tabs and pagination stay query parameters.

## Verify

Run the project's lint and test gate (for example `ruff` + `pytest`). Then the visual
loop through the project's preview mode if it has one (a no-login local copy for
screenshots). Check the form error path by submitting invalid input in the browser, and
the phone layout of any table.
