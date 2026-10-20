# Connected nutrition feature

LifeOS now extends its existing Recipes, Planning, Grocery List, Nutrition and Stats modules. No additional runtime dependencies, authentication system or backend were introduced.

## Using the feature

1. Open Nutrition from the existing navigation. Create ingredients in the Ingredient library. Enter label nutrition for 1 or 100 g/ml, or the defined weight/volume of one serving. Optional nutrients use grams, except sodium (mg). Ingredients with matching names remain distinct by stable ID, brand and preparation state.
2. Define density in grams per ml only when mass/volume conversion is needed. Define each household portion with its own weight or volume. Undefined conversions produce an error instead of assuming equivalence. Archive ingredients to stop new selection and grocery generation while preserving recipe references and diary history.
3. In the existing recipe editor, select library ingredients and enter quantities/units. Create a missing ingredient inline without leaving the editor. Adjust quantities in place. Changing the serving count changes portion division only; the explicit Scale ingredients action changes quantities and servings together. The optional serving weight is informational.
4. Old text ingredient rows remain intact. Link them gradually by adding the matching library ingredient and quantity, then removing the corresponding text row when fully represented. Nutrition stays marked incomplete while text rows or unavailable conversions remain. Legacy copied nutrition is shown as an incomplete estimate until linked. Incomplete recipes cannot be logged as complete food entries.
5. Plan any of Breakfast, Lunch, Dinner or Snacks in the existing planner. Add multiple recipes/ingredients per day, navigate weeks, edit entries, copy an entry or copy a day's meals to another date. Custom text meals remain supported and clearly have unavailable nutrition.
6. Generate the current week's groceries in the existing Grocery List. Recipe quantities scale by planned servings divided by recipe servings. Matching IDs/compatible units combine. Incompatible units remain separate. Archived/missing ingredients are skipped. Manual entries and other weeks' generated entries are preserved. Unlinked text ingredients need manual grocery entries. Regeneration updates the current week's generated lines and preserves their checked state.
7. Use Log as eaten in the planner, adjust actual servings/amount, review nutrition and confirm. Plans never write diary entries automatically. Deterministic document IDs plus create-only writes protect a planned meal against concurrent duplicate logging. Log again deliberately records repeated consumption.
8. The diary supports recipe, ingredient and manual food logging; fractional quantities; date navigation; editing name/date/meal/amount/nutrition; deletion; copying recent history; and separate planned totals. Food snapshots and recorded goals never recalculate from later source edits. Diary progress compares against explicitly labelled current targets; historical Stats comparisons use saved goal snapshots.
9. Set all four manual targets in Settings without entering personal profile details. Existing optional profile estimates remain available. Nutrition Stats uses only consumed snapshots, supports date/range filtering, daily and weekly charts, averages across logged days and macro progress against current targets. Days within recorded calorie goal means intake at or below the saved goal, not a medical target range.

## Storage and access

- `users/{ingredientOwnerId}/ingredients/{id}`: reusable ingredient JSON envelopes, matching the repository's existing JSON persistence pattern. An ingredient's canonical persisted label is per 100 g or per 100 ml (`baseUnit`); the deterministic calculator normalizes this to per g/ml for calculation without rounding. Metadata includes owner, timestamps, archive state, density and portion definitions.
- Ingredients and recipes are stored in the signed-in user's scope. Legacy family links are ignored. Existing private legacy food records remain readable from the signed-in user's nutrition collection; editing one copies the same ID to the active ingredient scope, without destructive migration.
- `users/{recipeOwnerId}/recipes/{id}`: existing recipes retain their original text ingredients and structured nutrition ingredient array. Current calculations use the library's current values by ID; old copied `per100` fields are compatibility fallback data, not the source of truth for linked ingredients.
- `users/{planningOwnerId}/mealPlan/{id}` and `groceryItems/{id}`: existing collections, expanded with optional meal category, ingredient amount/unit and generated grocery key. Old meals default to Dinner. Existing manual groceries retain their original shape.
- `users/{signedInUserId}/nutrition/{id}`: existing owner-only collection for profile/targets, legacy foods and diary snapshots. No family read/write permissions were added. Logs contain source references, amount, meal/date, immutable copied nutrients, timestamp and targets at recording time. Explicit user edits replace that record; source updates cannot mutate it.
- Stores use the existing signal state, session-version guards and refresh coordinator. No additional realtime subscriptions. Nutrition Stats resolves its store lazily.

## Significant files

- `src/app/shared/state/nutrition/nutrition.model.ts`: compatible expanded domain types.
- `src/app/shared/state/nutrition/nutrition.calculations.ts`: normalization, explicit conversions, recipe aggregation, scaling, snapshots, daily statistics, duplicate detection and grocery aggregation.
- `src/app/shared/state/nutrition/nutrition.service.ts`: ingredient CRUD/archive, personal ingredient scope, private logging/edits/deletes, goals and persistence.
- `src/app/shared/components/nutrition-summary.ts`: reusable complete/incomplete recipe nutrition summary.
- `src/app/pages/nutrition/nutrition.ts`, `nutrition.html`, `nutrition-settings.ts`: daily diary, library, logging/history/editing and target guidance.
- `src/app/pages/recipes/recipe-form.*`, `recipe-detail.*`, `src/app/shared/state/recipes/recipe.model.ts`, `recipe.service.ts`: existing recipe integration and compatibility.
- `src/app/pages/planning/planning-meals.*`, `src/app/shared/state/planning/planning.model.ts`, `planning.service.ts`: expanded existing planner and grocery persistence.
- `src/app/shared/state/statistics/stats.service.ts`, `src/app/shared/components/tab-pages/statistics/statistics.*`: Nutrition module, existing Chart.js components, range filters and consumption-only reporting.
- `firestore.rules`: recipe-sharing-scoped ingredients collection; private nutrition permissions retained.
- Nutrition calculation, persistence and workflow specs: conversion/business-rule coverage and a mocked service integration through ingredient ? recipe ? plan ? diary ? Stats.

## Deployment / migration

Deploy the updated rules before using the ingredient library:

```powershell
firebase deploy --only firestore:rules --project fuel-consumption-92c8c
npm.cmd run build
firebase deploy --only hosting --project fuel-consumption-92c8c
```

No destructive migration, backfill or new composite index is required. The implementation uses the existing collection listing and cached signal conventions rather than new compound Firestore queries. Older recipes, dinner plans, manual groceries and food logs remain readable. Link legacy recipe rows gradually in the editor.

## Validation and remaining limits

- Focused nutrition/recipe/planning/settings suite: 38 tests passed, including a service-level workflow with mocked persistence and Stats. Includes per-100 normalization, gram/kg and explicit volume/portion conversion, missing conversions, decimals, recipe totals/servings/scaling, live ingredient changes versus stable historical snapshots, logged-only totals, goal calculations, duplicate protection including create conflicts, private versus shared scope, copying/editing/deleting and grocery aggregation.
- Development and production builds passed. Production emitted existing bundle-size/CommonJS and unrelated unused-import warnings.
- Full suite: 294 tests passed, 5 tests failed; 6 of 67 test files failed (including two suites blocked before running). Full-suite results are recorded in `tmp/nutrition-full-tests.log`; remaining unrelated test setup failures include unsupported relative `vi.mock` calls in Angular's runner, missing SwUpdate/ActivatedRoute providers and a BudgetService mock missing tryGetDocument.
- No lint script is configured in this repository. Added core files were formatted with the existing Prettier installation.
- Firebase rules were inspected but not exercised against an emulator or deployed. Live Firebase and Android/iOS device UI flows were not exercised in this environment.
- Historical goals are captured with logged entries, not managed as an effective-date goal timeline. Older logs without saved goals are excluded from historical goal comparisons. The diary labels its current-target comparison explicitly.
- Following the current app architecture, nutrition loads the user's saved diary collection into cached signal state; very large multi-year histories may warrant server-side range queries in a later change.
