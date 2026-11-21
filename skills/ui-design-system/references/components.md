# Components

## Inventory

List each UI concept the product repeats (button, field, field error, card, badge/pill,
dialog, menu, tabs/segmented control, table, empty state, toast/notice, status lamp),
with every implementation found:

| Concept | Implementations (file:line) | Differences | Keep |
| --- | --- | --- | --- |

Two names for the same concept, or one name with two markups, is drift. Choose the
implementation with the best semantics and accessibility as the survivor, not the
newest one.

## One implementation per concept, in the project's model

| Stack | Shared component form |
| --- | --- |
| React | A component in the shared components folder with a typed props interface; variants as explicit props or `cva` |
| shadcn/ui | The generated primitive in `components/ui/`, extended in place |
| Jinja / server templates | A macro in the shared macro file, or an include with documented context variables |
| Static / vanilla | A CSS class contract (`.btn`, `.btn--primary`) documented with its required markup, plus a JS helper only when behaviour is shared |

## State matrix

Each interactive component documents and implements:

| State | Requirement |
| --- | --- |
| Default | Uses semantic tokens only |
| Hover | Visible change; not the only cue (touch has no hover) |
| Focus-visible | Distinct ring with ≥3:1 contrast; never removed without a replacement |
| Active / pressed | Immediate feedback; `aria-pressed` for toggles |
| Disabled | Not focusable when it cannot be used, or `aria-disabled` with an explanation when it must stay discoverable |
| Busy / loading | `aria-busy` or a status message; prevents duplicate submission |
| Invalid / error | Message next to the field, linked by `aria-describedby`; `aria-invalid` |
| Selected / current | `aria-selected`, `aria-current` or `aria-checked` as fits the role |
| Empty / long content | Wraps, truncates with access to the full text, or scrolls inside the component |

## Interaction conventions

Record the product's answers once, then apply them everywhere:

- Dialogs: when to use one, focus moves in and returns on close, Escape closes, background
  inert, title required.
- Menus and pickers: one control type for one kind of choice; arrow-key navigation inside,
  Tab leaves.
- Destructive actions: confirmation or undo, and the wording pattern.
- Feedback: where success and error messages appear and how long they stay.
- Forms: validation timing, required-field marking, error summary for long forms.
- Copy: an action keeps the same verb from button to confirmation.

## When to extract

Extract a shared component when the change in hand would create the second or third
copy, when copies already disagree on behaviour (focus trap re-implemented in several
places), or when the user asked for consolidation. Leave a single use inline. Moving
existing call sites onto the extracted component is migration; it follows the scope
agreed in the skill's step 1.
