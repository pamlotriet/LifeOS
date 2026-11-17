# Automated code quality

Run the same gate used in CI:

```sh
npm run quality:check
```

It runs these commands in order and stops on the first failure:

| Command                | Checks                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm run lint`         | Application import aliases, shared controls, standalone control imports |
| `npm run format:check` | Repository-wide Prettier formatting                                     |
| `npm run i18n:check`   | Known translation keys and the English catalog                          |
| `npm run quality:test` | Regression fixtures for the checkers and Budget style ownership         |

Use `npm run format` to fix formatting. Generated browser reports, build/cache output,
dependencies and private user backups are excluded; application source is checked in full.

The `Code quality / quality` GitHub Actions job runs on pull requests and pushes to
`main` or `master`. It also runs the Angular unit suite and production build. The
separate browser workflow continues to exercise mobile and desktop interactions.
The quality job can be selected as a required check in repository branch protection.

## Import aliases

Use `@core/`, `@shared/`, `@pages/`, `@app/`, `@src/`, `@environments/` and `@public/`
for application imports. The checker parses TypeScript imports, re-exports, lazy
imports, import types and `require` calls, including application tests. External
packages and Node built-ins remain normal package imports. Relative template and
stylesheet URLs remain valid. E2E helper imports may be relative; imports from E2E
into application source must use an application alias.

## Shared controls

- Text/number fields and textareas use `AppInput`.
- Standard actions use `AppButton`, including links styled as primary/secondary actions.
- Selects use `AppSelect`; existing native selects may retain documented keyboard/form behavior.
- Both external and inline Angular templates are checked. Shared control components must
  appear in the consuming component's standalone `imports`; an inert HTML attribute does not pass.
- Toggle/tab/step controls identified by ARIA state and labeled icon-only controls have
  specialized interactions and retain their own styling. Checkbox, radio, file, range,
  color and hidden inputs retain native semantics.
- The three shared picker implementations are exempt only in their implementation files,
  since they implement the native controls themselves.

An exceptional native control needs an explanation immediately before that element:

```html
<!-- quality-allow shared-select: Native selection retains the existing platform keyboard interaction. -->
<select [(ngModel)]="selection">
  <option value="one">One</option>
</select>
```

Supported exception rules are `shared-input`, `shared-button` and `shared-select`.
Reasons must be at least 15 characters. An exception applies to one adjacent element
and one rule; it does not disable a file, section or subsequent controls. Keep the
reason specific to the control's interaction or layout. Regular save, cancel, retry
and delete actions should use the shared component.

## Translations

The English catalog is a flat JSON object of nonempty strings. Duplicate keys and
malformed JSON fail the check. Template translation pipes, including static branches
of conditional labels, and TypeScript `instant`/`translate` calls are checked.
Locally declared constant keys and inline component templates are included.

Dynamic user data and runtime-computed keys cannot be verified statically. Empty
placeholders and punctuation-only branches are not translation messages. Add known
application messages to `public/i18n/en.json`; do not suppress missing messages.

Checker behavior is tested with deliberately invalid fixtures: relative imports,
missing shared components, missing standalone imports, malformed exception comments,
conditional translation labels and invalid catalogs. Add regression cases when
extending these rules.
