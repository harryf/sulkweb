import { test, expect, Page } from '@playwright/test';

test('loads Sulk board without console errors', async ({ page }: { page: Page }) => {
  const errors: string[] = []
  page.on('pageerror', (err: Error) => errors.push(err.message))
  await page.goto('/')
  // Wait for tiles to draw – we query for <canvas>
  await expect(page.locator('canvas')).toBeVisible()
  expect(errors).toHaveLength(0)
})
