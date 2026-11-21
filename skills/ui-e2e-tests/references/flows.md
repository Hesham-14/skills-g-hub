# Flow tests

## Shape of a good flow test

```ts
test('owner approves an inbox item into an offer', async ({ page }) => {
  await page.goto('/inbox');
  await page.getByRole('link', { name: 'Review item 42' }).click();
  await page.getByLabel('Price').fill('1000');
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page).toHaveURL(/\/offers\/\d+$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sample offer');
  await expect(page.getByRole('status')).toContainText('Approved');
});
```

One user goal per test, named for the outcome. Arrange through the UI or a documented
test API/seed, act like the user, assert what the user would see.

## Locators

1. `getByRole` with the accessible name, then `getByLabel`, `getByPlaceholder`,
   `getByText`.
2. `getByTestId` when the element has no stable accessible handle; add `data-testid`
   following the project's existing convention.
3. CSS/XPath only for third-party markup you cannot change.

A locator that needs a role name you cannot find is often an accessibility finding:
report it to `ui-guard` instead of switching to CSS.

For RTL or localised UIs, locate by the strings the product actually renders, or by
test IDs when copy changes often. Assert both directions only when the product ships
both.

## Waiting and stability

- Use web-first assertions (`await expect(locator).toBeVisible()`,
  `toHaveText`, `toHaveURL`) that retry. No fixed sleeps (`waitForTimeout`, `time.sleep`).
- Wait for the user-visible result of an action, not for network idle.
- Freeze what varies: clock (`page.clock`), random seeds, animation
  (`reducedMotion: 'reduce'`), time zone and locale in config.
- Each test creates or seeds the data it needs and does not depend on another test's
  order or leftovers.

## Mocks

Run the real front end against the real back end in its test configuration. Mock only
boundaries the test does not own and cannot run locally: third-party payment, email,
LLM or map providers, through the network layer (`page.route`) or the project's existing
fake. A test that mocks the application's own API is a component test with a browser
around it; say so in its name if you keep it.

## Authentication

Sign in once in a setup project or fixture with a test account from the project's
seed/fixture files, save the storage state to a git-ignored path, and reuse it. Keep
real credentials out of the repository and out of test output. When the project has a
no-login test mode, prefer it. Never weaken production auth for testing.

## Browser errors

Fail on uncaught errors and unexpected console errors during each flow:

```ts
// tests/e2e/fixtures.ts: import { test, expect } from here instead of @playwright/test
import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await use(errors);
    expect(errors, 'browser errors during the test').toEqual([]);
  }, { auto: true }],
});
export { expect };
```

Adapt to the project's existing fixture file if it has one. Allow known, documented
noise explicitly by message, never with a blanket filter.

## Smells to avoid

Snapshotting whole DOM trees, asserting implementation classes, one test per button,
`test.skip` without an issue reference, retry counts raised to hide flakiness, and
tests that pass with the feature removed.
