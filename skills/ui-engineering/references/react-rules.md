# React rules worth enforcing

A selected subset of Vercel's `composition-patterns` and `react-best-practices`
(MIT, `vercel-labs/agent-skills` @ `1a2c79d4`; see [../NOTICE.md](../NOTICE.md)), reworded
for client-rendered React. Rule IDs match upstream so the full rule can be looked up:
`https://github.com/vercel-labs/agent-skills/blob/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/<skill>/rules/<id>.md`.
Apply a rule only when the change touches the pattern; the project's conventions win.

## Composition (`composition-patterns`)

| ID | Rule |
| --- | --- |
| `architecture-avoid-boolean-props` | A new mode is a new composed component or explicit variant, not another `isX` prop. |
| `architecture-compound-components` | A complex widget shares state through a small context with `Parent.Part` children instead of a long prop list. |
| `patterns-explicit-variants` | Name variants (`<ThreadComposer>`, `<EditComposer>`) instead of branching one component on flags. |
| `patterns-children-over-render-props` | Prefer `children` for composition; render props only when the child needs the parent's data. |
| `state-lift-state` | State shared by siblings moves to the nearest provider/owner, not duplicated. |
| `state-decouple-implementation` | Only the provider knows how state is stored (local state, fetch, URL); consumers use its interface. |
| `state-context-interface` | A context exposes `{ state, actions, meta }`, so implementations can be swapped in tests. |
| `react19-no-forwardref` | React 19 only: pass `ref` as a prop and read context with `use()`; keep `forwardRef` on React 18. |

## Rendering and re-renders (`react-best-practices`)

| ID | Rule |
| --- | --- |
| `rerender-no-inline-components` | Never define a component inside another component's body. |
| `rerender-derived-state-no-effect` | Derive values during render; an effect that only sets state from props/state is a bug magnet. |
| `rerender-move-effect-to-event` | Interaction logic runs in the event handler, not an effect watching a flag. |
| `rerender-functional-setstate` | Updates based on previous state use the functional form. |
| `rerender-lazy-state-init` | Expensive initial state uses `useState(() => …)`. |
| `rerender-dependencies` | Effect dependencies are primitives or stable references. |
| `rerender-use-deferred-value` / `rerender-transitions` | Keep typing responsive: defer expensive renders, mark non-urgent updates as transitions. |
| `rendering-conditional-render` | Use a ternary when the left side can be `0` or `''`; `&&` renders them. |
| `rendering-content-visibility` | Long lists use `content-visibility: auto` or virtualization when measured to be slow. |

## Data and bundle (`react-best-practices`)

| ID | Rule |
| --- | --- |
| `async-parallel` | Independent requests start together (`Promise.all`), not one after another. |
| `bundle-barrel-imports` | Import from the module, not a barrel that pulls in the whole folder. |
| `bundle-conditional` / `bundle-dynamic-imports` | Heavy features load on demand (`import()`, `React.lazy`) when the project already splits chunks. |
| `client-event-listeners` / `client-passive-event-listeners` | One global listener per event, passive for scroll and touch. |
| `client-localstorage-schema` | Stored preferences are versioned, minimal and read inside `try/catch`. |

Server-component, Next.js and edge rules from upstream are out of scope for the stacks
this hub supports; look them up at the pinned commit for a Next.js project.
