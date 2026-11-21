# Visual regression

Screenshot comparison catches unintended visual change. It is expensive to keep
stable, so cover a few high-value views, not every page.

## With Playwright

```ts
test('offers list, phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/offers?fixture=sample');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveScreenshot('offers-phone.png', {
    fullPage: true,
    mask: [page.getByTestId('last-updated')],
    animations: 'disabled',
  });
});
```

- **What to snapshot:** shared layout shells, the primary screen of each surface per
  supported viewport and theme, and components with many visual states.
- **Determinism:** fixture data, frozen clock, disabled animations, fonts loaded
  (`await page.evaluate(() => document.fonts.ready)`), masks over dynamic regions
  (timestamps, avatars, maps, charts fed by live data).
- **Baselines** are created with `--update-snapshots` on the platform that runs the
  gate (font rendering differs across operating systems; projects often generate them
  in the same container as CI). Review every new or changed baseline image before
  committing it. Updating baselines to make a failing run pass requires confirming the
  change was intended.
- **Thresholds:** start with the default; raise `maxDiffPixelRatio` only for a named
  source of noise, per assertion.

## Without a screenshot-assertion runner

Use `ui-guard`'s `capture.mjs` to produce before/after screenshots for the same matrix,
then compare them by looking, and record the result as a `visual` check with both sets
as evidence. Identical SHA-256 hashes mean identical pixels; different hashes do not by
themselves mean a regression. This is review evidence, not an automated gate; say so.

## Python

`pytest-playwright` has no built-in screenshot assertion. Use the project's existing
image-comparison plugin if it has one; otherwise capture screenshots as evidence and
keep functional assertions as the test's gate.
