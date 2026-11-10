# LifeOS application conventions

- Follow `docs/project-structure.md` for directory ownership.
- Use the TypeScript aliases `@core/`, `@shared/`, `@pages/`, `@environments/`, `@app/`, `@src/` and `@public/` for all application module imports, including same-folder imports, lazy imports and tests. Keep Angular template and stylesheet URLs relative.
- Put page screens in `pages/<feature>/<screen>/` with their template, styles and tests.
- Keep feature stores, models, calculations and persistence services in that feature's `state/` folder. Do not recreate `shared/state`.
- Put app-wide authentication, navigation, theme, refresh, updates and infrastructure in the relevant `core/` folder.
- Put reusable, cross-feature UI in `shared/components/<component>/`. Keep feature-specific reusable UI in `pages/<feature>/components/<component>/`.
- Use `AppInput` on native text/number inputs and textareas, and `AppButton` for standard actions. Import these standalone components into the consuming component. Keep layout classes on the page; change common control appearance in the shared component stylesheet.
- Reuse `AppSelect`, `AppDatePicker`, `AppMonthPicker`, `AppChart`, `AppSkeleton`, `PageHeader` and `BackButton` instead of copying their markup.
- Preserve existing native form bindings, validation, accessibility labels, route URLs and stored data formats during structural changes.
