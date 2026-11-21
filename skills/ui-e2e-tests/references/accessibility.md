# Accessibility checks in browser tests

Automated rules find a minority of accessibility problems: missing names and labels,
contrast, invalid ARIA, landmark and heading structure. Keyboard behaviour, focus
order, meaningful names and screen-reader experience still need a scripted or manual
check.

## Automated rules (when an axe integration is installed)

```ts
import AxeBuilder from '@axe-core/playwright';

test('settings has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/settings');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('[data-third-party]')
    .analyze();
  expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});
```

- Scan each state that changes the DOM meaningfully: open dialogs, error states,
  expanded menus, both themes when contrast differs.
- Assert on rule IDs and counts so failures read clearly. Disable a rule only per
  element with a comment naming the reason.
- Python: `axe-playwright-python` if the project has it. Without any axe package, do
  not add one silently; use `ui-guard`'s `capture.mjs` DOM checks as a lighter signal and
  say which rules were not covered.

## Keyboard flow (always possible)

```ts
test('delete dialog is keyboard operable', async ({ page }) => {
  await page.goto('/chats');
  await page.getByRole('button', { name: 'Delete chat' }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Delete chat' })).toBeFocused();
});
```

Cover: reaching every control of the flow with Tab, operating it with Enter/Space or
arrows, focus moving into and back out of overlays, no focus trap, visible focus (a
screenshot of a focused control in the visual set).

## Contrast and zoom

Automated contrast checks miss text over images and gradients; check those visually.
For reflow, run the flow at 320 CSS px width or 400% zoom equivalent and assert no
horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`).

## Browser errors and performance signals

- Page errors and console errors: see [flows.md](flows.md).
- Failed requests: listen to `requestfailed` and responses with status ≥ 400 that the
  flow did not expect.
- Performance: read `PerformanceObserver` entries (`largest-contentful-paint`,
  `layout-shift`, `longtask`) inside the page and attach them to the test result.
  Assert budgets only where the project defined them and the environment is stable;
  otherwise record the numbers with `ui-audit.mjs metric` and compare runs from the
  same machine and build mode.
