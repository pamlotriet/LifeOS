import { test, expect, Page } from '@playwright/test';

const failures = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  failures.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    errors.push(`Unexpected external request: ${route.request().url()}`);
    return route.abort();
  });
});
test.afterEach(async ({ page }) => expect(failures.get(page)).toEqual([]));

async function fits(page: Page) {
  for (const dark of [false, true]) {
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value), dark);
    expect(
      await page
        .locator('main')
        .first()
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
  }
}

test('library cards open progress editing and the goal panel still edits the goal', async ({
  page,
}) => {
  await page.goto('/library');
  const card = page.locator('[appReadingBookCard]');
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  await fits(page);
  await card.getByRole('button', { name: 'Update progress for Reading example' }).click();
  await page.locator('#reading-position').fill('100');
  await page.getByRole('button', { name: 'Save progress', exact: true }).click();
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  await page.getByRole('button', { name: 'Edit reading goal', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Number of books' }).fill('24');
  await page.getByRole('button', { name: 'Save goal', exact: true }).click();
  await expect(page.locator('[appReadingGoalPanel]')).toContainText('/ 24');
});

test('meal editor updates parent selections, meal slots and shopping groups', async ({ page }) => {
  await page.goto('/planning');
  await page.getByRole('button', { name: '+ Plan a meal', exact: true }).click();
  const editor = page.locator('[appMealEditor]');
  await editor.getByRole('combobox', { name: 'Recipe', exact: true }).selectOption('soup');
  await expect(editor.getByLabel('Meal name', { exact: true })).toHaveValue('Soup');
  await fits(page);
  await editor.getByRole('button', { name: 'Save meal', exact: true }).click();
  const slot = page
    .locator('[appMealSlot]')
    .filter({ has: page.getByRole('heading', { name: 'Dinner', exact: true }) });
  await expect(slot).toContainText('Soup');
  await slot.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(editor.getByLabel('Meal name', { exact: true })).toHaveValue('Soup');
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'Shopping list', exact: true }).click();
  const group = page.locator('[appGroceryGroup]');
  await group.getByRole('button', { name: 'Check off Tomatoes', exact: true }).click();
  await expect(
    group.getByRole('button', { name: 'Uncheck Tomatoes', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'Remove Tomatoes', exact: true }).click();
  await expect(group).toHaveCount(0);
});

test('Budget balance forms, cycle navigation and cycle outlook remain connected', async ({
  page,
}) => {
  await page.goto('/budget');
  const balances = page.locator('[appBudgetBalancePanels]');
  await expect(balances).toBeVisible();
  await balances.getByText('Set current Spending balance', { exact: true }).click();
  await balances.locator('input[name="spendingBalance"]').fill('500');
  await balances.getByRole('button', { name: 'Confirm current balance', exact: true }).click();
  await expect(balances.getByText('Spending balance saved.', { exact: true })).toBeVisible();
  await fits(page);
  const dates = page.getByLabel('Budget cycle dates', { exact: true });
  const previous = await dates.textContent();
  await page.getByRole('button', { name: 'Next budget cycle', exact: true }).click();
  await expect(dates).not.toHaveText(previous!);
  await page.getByText('This cycle in detail', { exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your cycle outlook', exact: true }),
  ).toBeVisible();
});
