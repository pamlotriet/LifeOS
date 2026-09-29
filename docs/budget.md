# Budget module

Budget lives at `/budget`, with `/budget/month`, `/budget/transactions/add`,
`/budget/transactions/:id/edit`, `/budget/categories`, and `/budget/insights`.
The central Add tab opens a new transaction. The reading wheel remains available in More.

Transactions are stored in `budgets/{uid}/transactions` and category overrides in
`budgets/{uid}/categories`. Starter categories appear without writing sample financial data.
Editing a starter category persists an override; deleting an unused category persists a
tombstone so it does not reappear on the next load. Categories with transactions cannot
be deleted or moved to another type until their transactions are reassigned or deleted.

Amounts are in South African rand, entered with at most two decimal places. Aggregation
uses integer cents. Bills are a subset of expenses. Savings are transfers, excluded from
expenses. Remaining balance is income minus expenses minus savings. Insight averages
include all four displayed months, even when a month has no records. Dates are local
calendar dates; month and day filters use those dates without timezone conversion.

Receipt images use `users/{uid}/budget/{transactionId}/receipt-{uuid}` in Firebase Storage.
Uploads are limited to 5 MB and supported image types. New uploads are removed when a
Firestore save fails. Old receipts are cleaned up after replacement or transaction
deletion; cleanup failure is reported separately from the successful transaction save.

## Deployment

Deploy the updated `firestore.rules` and `storage.rules` to the Firebase project used by
the app before testing with a real account. Both paths are owner-only and are not shared
through family access. The rules are included in this change but are not deployed by the
local build. No composite Firestore indexes are needed. Lists use the existing paginated
REST service, and the current account's loaded history is filtered locally.

## Verification

`npm exec -- vitest run src/app/shared/state/budget/budget.model.spec.ts src/app/shared/state/budget/budget.service.spec.ts`

`npm run build`

Camera/gallery permission prompts and Firebase rules should also be checked on a native
device with the deployed rules. Browser verification uses intercepted Firebase requests
and temporary data, not a real account.
