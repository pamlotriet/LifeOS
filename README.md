# Lifeos

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.8.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Spartan UI components

This project uses [Spartan UI](https://spartan.ng/) with the Spartan CLI. Spartan components are generated into the project as Angular source code, so you can customize them locally instead of installing a large component bundle.

### Configuration

The project is already configured in `components.json`:

- Generated components: `src/libs/ui`
- Import alias: `@spartan-ng/helm`
- Style preset: `nova`

The Tailwind and Spartan theme imports are already in `src/styles.css`. You normally do not need to edit the global stylesheet when adding a component.

### Add a component

From the project root, run:

```bash
ng g @spartan-ng/cli:ui button
```

Replace `button` with the component name. For example:

```bash
ng g @spartan-ng/cli:ui card
ng g @spartan-ng/cli:ui dialog
ng g @spartan-ng/cli:ui input
ng g @spartan-ng/cli:ui table
```

The generator creates the component files under `src/libs/ui/<name>`. It may ask interactive questions for some components. To accept the defaults without prompts, add `--defaults`:

```bash
ng g @spartan-ng/cli:ui button --defaults
```

Preview the files without changing the project by adding `--dry-run`:

```bash
ng g @spartan-ng/cli:ui button --dry-run
```

### Use a generated component

Open the generated component directory and import the exported Angular component into the component that uses it. For example, after generating a button, the import will look like this:

```ts
import { HlmButton } from '@spartan-ng/helm/button';
```

For a standalone Angular component, add it to the `imports` array:

```ts
import { Component } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
	selector: 'app-example',
	standalone: true,
	imports: [HlmButton],
	template: `
		<button hlmBtn>Save</button>
	`,
})
export class ExampleComponent {}
```

The exact exported class and directive names are component-specific. Check the generated `index.ts` or component file when adding a component, then copy the usage example from the matching [Spartan component documentation](https://spartan.ng/documentation).

### Common workflow

1. Find the component you need in the [Spartan documentation](https://spartan.ng/documentation).
2. Generate it from the project root with `ng g @spartan-ng/cli:ui <name>`.
3. Inspect `src/libs/ui/<name>` for the generated exports and usage API.
4. Import the generated Angular components or directives into the consuming standalone component.
5. Use the documented `hlm-*` attributes and Tailwind classes in the template.
6. Run the app and verify the result:

```bash
npm start
```

### Troubleshooting

- **Unknown generator:** Run `npm install` and confirm `@spartan-ng/cli` exists in `devDependencies`.
- **No component name:** The command requires a name, for example `ng g @spartan-ng/cli:ui button`.
- **Imports cannot be resolved:** Generate the component first and use the exports in its generated `index.ts`. Do not import from a package path that has not been generated locally.
- **Styles are missing:** Confirm `src/styles.css` is listed in `angular.json` and still contains the Tailwind and Spartan preset imports.
- **Need to customize a component:** Edit the generated files in `src/libs/ui/<name>`. They are part of this application and are intended to be owned by the project.

To see all generator options, run:

```bash
ng g @spartan-ng/cli:ui --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
