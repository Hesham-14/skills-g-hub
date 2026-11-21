# Tokens

## Layers

1. **Primitive values** (optional): the raw palette and scale steps (`--blue-600`,
   `--space-4`). Only when the project already has, or needs, more than one theme.
2. **Semantic roles**: what components use (`--color-text`, `--color-text-muted`,
   `--color-surface`, `--color-border`, `--color-accent`, `--color-danger`,
   `--color-focus`). Components never reference primitives directly.
3. **Component tokens** (rare): only when one component needs a value that varies per
   theme and is not a general role.

Name tokens by role, in the project's existing naming pattern. If it already uses
`--ink`, `--line` and `--acc`, extend that vocabulary rather than renaming everything.

## Categories and how to derive a scale

| Category | Roles / steps | Derive from |
| --- | --- | --- |
| Colour | text (default, muted, subtle, inverse), surface (page, raised, sunken, overlay), border (default, strong), accent (+ hover, soft), status (ok, warn, danger, info; each with a soft/background pair), focus | Existing values, grouped by role. Merge near-duplicates (ΔE below ~2) into one. |
| Typography | family roles (body, display, mono), sizes as a scale (5–7 steps), weights, line heights | The most-used existing sizes; snap outliers to the nearest step. Mixed `px`/`rem`/`em` become one unit, `rem` by default. |
| Spacing | 4- or 8-based scale (e.g. 4, 8, 12, 16, 24, 32, 48) | Existing paddings, margins and gaps. |
| Radius | 2–4 steps + `full` | Existing radii; a different radius should mean a different element class. |
| Shadow / elevation | 2–3 levels | Existing shadows; one per elevation. |
| Z-index | named layers (dropdown, sticky, overlay, modal, toast) | Existing values sorted by what sits on top of what. |
| Breakpoints | 2–3 named widths | The most-used existing values. Custom properties cannot be used in media queries; record the values in the design doc and keep one syntax across files. |
| Motion | durations, easings, and the reduced-motion rule | Existing transitions. |

Do not invent a value no screen uses. A scale exists to remove choices, not add them.

## Themes

- Define each theme's values once. A dark theme that honours both the OS preference and
  a manual override is a common source of duplication, because plain CSS cannot share
  one ruleset between a media query and an attribute selector. Two single-source
  options: write each role as `light-dark(<light>, <dark>)` and switch `color-scheme`
  (`:root { color-scheme: light dark }`, `[data-theme="light"] { color-scheme: light }`,
  `[data-theme="dark"] { color-scheme: dark }`) where the project's browser support
  allows it; or have the existing startup script always set `data-theme` from the stored
  choice or the OS preference, so only `[data-theme="dark"]` carries dark values. Keep
  the project's mechanism when it already works; say which option you chose.
- Every semantic role exists in every theme.
- Set `color-scheme` so native controls and scrollbars follow the theme.
- Check contrast **per theme**: body text and placeholders at least 4.5:1, large text
  and UI component boundaries at least 3:1, focus indicator visible against both the
  component and the page.

## Direction and language

- RTL layouts use logical properties (`margin-inline-*`, `padding-inline-*`,
  `inset-inline-*`, `border-inline-*`, `text-align: start/end`). Physical `left/right`
  only for things that do not mirror.
- Record which elements stay left-to-right (code, numbers in tables, charts, maps) and
  how mixed-direction text is isolated (`<bdi>`, `dir="auto"`).
- Script-specific type: line height and size can differ for Arabic and Latin text;
  define the family stack for each script the product uses.

## Stack mapping

| Stack | Where tokens live |
| --- | --- |
| Plain CSS / static / server templates | `:root` custom properties in one shared stylesheet or the base template |
| CSS modules | A global tokens file imported once; modules use `var(--…)` |
| Tailwind v4 | `@theme` (and `:root`/`.dark` variables referenced by it) in the CSS entry |
| Tailwind v3 | `tailwind.config` `theme.extend` pointing at CSS variables |
| shadcn/ui | Its variable set in the CSS entry (`--background`, `--foreground`, `--primary`, …); add roles in the same pattern |
