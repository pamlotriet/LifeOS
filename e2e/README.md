# Browser regression tests

These tests render production Angular screens and shared controls in a real Chromium browser, using an independent entry point and fictional in-memory records. The normal app configuration, sign-in, analytics and service worker are not started. External HTTP requests are blocked and fail the suite. Each test starts with fresh state; nothing is persisted to Firebase or browser storage.

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

Playwright starts and stops the dedicated server at `127.0.0.1:4300`. It refuses to reuse an existing server, so the suite cannot accidentally target a running production app. The fixture configuration is used only by `start:e2e`; normal builds and deployments retain their existing entry point.

To use an installed browser on Windows:

```powershell
$env:E2E_BROWSER_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
npm run test:e2e
```

Coverage runs at 390×844 with touch emulation and 1280×900:

- Light/dark Budget cards and payment forms: overflow and minimum 44px form controls.
- Real two-step Add Book modal: required fields, category selection, back navigation, preserved input, save and cancel.
- Payment date modal: keyboard activation, focus containment, Escape and date selection.
- Payment form keyboard order and cancellation.
- Plan → mark paid → history → confirmed deletion, with balances checked at each stage.
- Validation and simulated persistence failures preserve the form and balance.
- Shared field errors, focus on invalid submission and rapid duplicate-submit prevention.
- Rejected cancellation, route navigation, browser reload and book-modal dismissal preserve drafts.
- Extracted library cards and goal panel, meal editor and shopping groups, and Budget balance/cycle/outlook sections retain their parent bindings and fit mobile/desktop layouts in both themes.

Failure screenshots, traces and the HTML report are written to ignored `test-results/` and `playwright-report/`. Open reports with `npx playwright show-report`.

This complements `npm test -- --watch=false`; it does not verify Firebase rules, authentication, real payment processing, or native Safari/Firefox behavior. Payment workflows here are Budget records, not bank transactions.
