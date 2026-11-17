import { test, expect } from '@playwright/test';

const externalRequests = new WeakMap<object, string[]>();

test('rejecting browser reload preserves an unsaved payment', async ({ page }) => {
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  const amount = page.getByRole('textbox', { name: 'Amount (R)', exact: true });
  await amount.fill('125');
  const prompt = page.waitForEvent('dialog');
  await page.evaluate(() => {
    setTimeout(() => location.reload(), 0);
  });
  const dialog = await prompt;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(amount).toHaveValue('125');
});

test('rejecting book modal dismissal preserves entered fields', async ({ page }) => {
  await page.goto('/books');
  await page.getByRole('button', { name: 'Add book', exact: true }).click();
  const modal = page.locator('ion-modal.add-book-sheet');
  await modal.getByPlaceholder('Enter book title').fill('Unsaved book');
  page.once('dialog', (dialog) => dialog.dismiss());
  await modal.getByRole('button', { name: 'Close add book', exact: true }).click();
  await expect(modal).toBeVisible();
  await expect(modal.getByPlaceholder('Enter book title')).toHaveValue('Unsaved book');
  page.once('dialog', (dialog) => dialog.accept());
  await modal.getByRole('button', { name: 'Close add book', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText('Unsaved book', { exact: true })).toHaveCount(0);
});
const browserErrors = new WeakMap<object, string[]>();
test.beforeEach(async ({ page }) => {
  const external: string[] = [];
  externalRequests.set(page, external);
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    external.push(url.origin);
    return route.abort();
  });
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/budget/debts');
  await expect(page.getByRole('heading', { name: 'Example loan' })).toBeVisible();
  expect(external, 'Fixture must never request external services').toEqual([]);
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), 'No browser runtime errors').toEqual([]);
  expect(
    externalRequests.get(page),
    'No external services may be requested during any workflow',
  ).toEqual([]);
});

test('book modal validates, preserves fields between steps, saves and cancels', async ({
  page,
}) => {
  await page.goto('/books');
  const open = page.getByRole('button', { name: 'Add book', exact: true });
  await open.click();
  const modal = page.locator('ion-modal.add-book-sheet');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(modal.locator('input[formControlName="title"]')).toBeVisible();
  await modal.getByPlaceholder('Enter book title').fill('Browser test book');
  await modal.getByPlaceholder('Enter author name').fill('Example author');
  await modal.getByRole('button', { name: 'Main category', exact: true }).click();
  await modal.getByRole('option', { name: 'Fantasy', exact: true }).click();
  await modal.getByRole('spinbutton', { name: /Number of pages/ }).fill('250');
  await modal.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(modal.getByRole('button', { name: 'Save Book', exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(modal.getByPlaceholder('Enter book title')).toHaveValue('Browser test book');
  await modal.getByRole('button', { name: 'Next', exact: true }).click();
  await modal.getByRole('button', { name: 'Save Book', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText('Browser test book', { exact: true })).toBeVisible();
  await open.click();
  await page.getByRole('button', { name: 'Close add book', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText('Browser test book', { exact: true })).toHaveCount(1);
});

test('debt cards and payment forms fit the viewport in light and dark themes', async ({ page }) => {
  for (const dark of [false, true]) {
    await page.evaluate((value) => document.documentElement.classList.toggle('dark', value), dark);
    await page.getByRole('button', { name: 'Plan payment', exact: true }).click();
    const form = page.locator('.payment-editor');
    await expect(form).toBeVisible();
    for (const selector of ['main', '.debt-summary', '.payment-editor', '.debt-card']) {
      const fits = await page
        .locator(selector)
        .first()
        .evaluate((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.left >= -1 &&
            box.right <= innerWidth + 1 &&
            element.scrollWidth <= element.clientWidth + 1
          );
        });
      expect(fits, `${selector} must not overflow`).toBe(true);
    }
    for (const control of await form
      .locator('input, select, app-date-picker > div > button, button[appButton]')
      .all()) {
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await form.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
});

test('payment date modal supports keyboard entry, focus containment, selection and dismissal', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Plan payment', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Payment date', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const modal = page.locator('ion-modal').filter({ visible: true });
  await expect(modal).toBeVisible();
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    expect(await modal.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await trigger.click();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.locator('ion-modal').filter({ visible: true })).toHaveCount(0);
  await expect(trigger).not.toHaveText('Select date');
  await expect(page.locator('.payment-editor')).toBeVisible();
});

test('keyboard users can cancel a payment form without changing balances', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Record payment', exact: true });
  await button.focus();
  await page.keyboard.press('Enter');
  const amount = page.getByRole('textbox', { name: 'Amount (R)', exact: true });
  await amount.focus();
  await page.keyboard.type('125');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Payment date', exact: true })).toBeFocused();
  const cancel = page
    .locator('.payment-editor')
    .getByRole('button', { name: 'Cancel', exact: true });
  await cancel.focus();
  page.once('dialog', (dialog) => dialog.accept());
  await page.keyboard.press('Space');
  await expect(page.locator('.payment-editor')).toHaveCount(0);
  await expect(page.locator('.debt-balance strong')).toContainText(/1[\s,]000/);
});

test('planned payment becomes paid once and deletion requires confirmation', async ({ page }) => {
  await page.getByRole('button', { name: 'Plan payment', exact: true }).click();
  await page.getByRole('textbox', { name: 'Amount (R)', exact: true }).fill('125');
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Browser instalment');
  await page.getByRole('button', { name: 'Save planned payment', exact: true }).click();
  await expect(page.locator('.payment-editor')).toHaveCount(0);
  await expect(page.locator('.debt-balance strong')).toContainText(/1[\s,]000/);
  await expect(page.getByRole('button', { name: /Hide payments/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.locator('.payment-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Mark paid', exact: true }).click();
  await page.getByRole('button', { name: 'Save payment', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving...', exact: true })).toBeDisabled();
  await expect(page.locator('.payment-editor')).toHaveCount(0);
  await expect(page.locator('.debt-balance strong')).toContainText('875');
  await expect(page.getByRole('button', { name: 'Mark paid', exact: true })).toHaveCount(0);
  await expect(page.locator('.payment-row')).toHaveCount(1);
  await page.locator('.payment-row').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Keep payment', exact: true }).click();
  await expect(page.locator('.payment-row')).toHaveCount(1);
  await page.locator('.payment-row').getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete payment', exact: true }).click();
  await expect(page.locator('.payment-row')).toHaveCount(0);
  await expect(page.locator('.debt-balance strong')).toContainText(/1[\s,]000/);
});

test('invalid and failed payments keep the form and do not reduce debt', async ({ page }) => {
  await page.goto('/budget/debts?failSave=1');
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  await page.getByRole('textbox', { name: 'Amount (R)', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save payment', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Check the highlighted fields');
  await expect(page.getByRole('textbox', { name: 'Amount (R)', exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByRole('textbox', { name: 'Amount (R)', exact: true }).fill('125');
  await page.getByRole('button', { name: 'Save payment', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Fixture payment could not be saved');
  await expect(page.locator('.payment-editor')).toBeVisible();
  await expect(page.locator('.debt-balance strong')).toContainText(/1[\s,]000/);
});

test('unsaved payment survives rejected cancellation and route navigation', async ({ page }) => {
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  const amount = page.getByRole('textbox', { name: 'Amount (R)', exact: true });
  await amount.fill('125');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page
    .locator('.payment-editor')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(amount).toHaveValue('125');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Transactions', exact: true }).click();
  await expect(page).toHaveURL(/budget\/debts$/);
  await expect(amount).toHaveValue('125');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('link', { name: 'Transactions', exact: true }).click();
  await expect(page).toHaveURL(/\/books$/);
});

test('invalid payment focuses its field and rapid submissions save only one record', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Record payment', exact: true }).click();
  const amount = page.getByRole('textbox', { name: 'Amount (R)', exact: true });
  await page.getByRole('button', { name: 'Save payment', exact: true }).click();
  await expect(amount).toBeFocused();
  await expect(amount).toHaveAttribute('aria-invalid', 'true');
  const descriptionId = await amount.getAttribute('aria-describedby');
  await expect(page.locator(`[id="${descriptionId}"]`)).toHaveText('This field is required.');
  await amount.fill('125');
  await page.locator('.payment-editor').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect(page.locator('.payment-editor')).toHaveCount(0);
  await expect(page.locator('.payment-row')).toHaveCount(1);
  await expect(page.locator('.debt-balance strong')).toContainText('875');
});
