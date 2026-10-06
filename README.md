# LifeOS

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.8.

## Installable web app (PWA)

LifeOS can be distributed through a website without publishing to app stores.
The production build includes a web manifest, home-screen icons, and Angular's
service worker. It caches the app shell and static assets; sign-in and cloud data
still require a connection. Private API responses are not cached by the service worker.

### Host LifeOS on Firebase

Run the following commands in PowerShell from the LifeOS project folder.
The `.cmd` suffix avoids PowerShell execution-policy errors on Windows.

1. Open the [Firebase Console](https://console.firebase.google.com/) and select
   the existing project used by LifeOS. Under **Project settings → General**,
   copy the **Project ID** (not the project display name).
2. Install the Firebase CLI and sign in with a Google account that has access
   to that project:

   ```powershell
   npm.cmd install -g firebase-tools
   firebase.cmd login
   ```

3. Install the project dependencies if this is a fresh checkout, then build:

   ```powershell
   npm.cmd ci
   npm.cmd run build
   ```

4. Deploy the website, replacing `YOUR_PROJECT_ID` with the ID you copied:

   ```powershell
   firebase.cmd deploy --only hosting --project YOUR_PROJECT_ID
   ```

   `firebase.json` already configures `dist/lifeos/browser` as the hosting folder
   and sends application routes to `index.html`. You do not need to run
   `firebase init`. This command publishes hosting files only; it does not deploy
   Firestore or Storage rules.

5. Open the **Hosting URL** printed by the deploy command. The default address
   is usually `https://YOUR_PROJECT_ID.web.app`.
6. In Firebase Console, open **Authentication → Settings → Authorized domains**
   and ensure the hostname, such as `YOUR_PROJECT_ID.web.app`, is listed.
   Add any custom domain you use as well, then check Google sign-in on the live site.

Firebase Hosting serves the website over HTTPS, which is required for the PWA
outside localhost. You can connect a custom domain later in the Hosting console.
See the [Firebase Hosting guide](https://firebase.google.com/docs/hosting/quickstart).

### Publish future updates

Deployment scripts target the LifeOS Firebase project `fuel-consumption-92c8c`.
Install the Firebase CLI and sign in as described above before using them.

To build and deploy the web app:

```powershell
npm.cmd run deploy:app
```

To deploy the Firestore and Storage rules from `firestore.rules` and `storage.rules`:

```powershell
npm.cmd run deploy:rules
```

To build and deploy the app and both sets of rules together:

```powershell
npm.cmd run deploy
```

App deployments stop if the build fails. Rules-only deployments do not build the app.

Installed users do not need to add LifeOS to their home screen again. While online,
the service worker checks for updates and downloads the new version in the
background. Once downloaded, close all LifeOS windows and reopen the app to use it.

### Install on a phone or computer

On Android or desktop, use the browser's install action. On iPhone or iPad, open
LifeOS in Safari and select Share > Add to Home Screen. Use Google sign-in and your master password to unlock the password vault.

### Verify the PWA

After deployment, check Google sign-in, refresh a page such as Budget directly,
and confirm the browser offers installation where supported. Check that the
installed app opens from its home-screen icon.

To check caching locally, serve the production output on localhost with a static
server that supports SPA fallback. The service worker is disabled in development.
After the first online visit, wait for service-worker activation, reload, and check
the manifest and service worker in browser developer tools. Simulate offline mode
to verify the app shell loads. Cloud operations may fail while offline. After a
deployment, the service worker downloads the new version in the background;
close and reopen all LifeOS windows to use it.

### Hosting troubleshooting

- **`npm.ps1` cannot be loaded:** use `npm.cmd` and `firebase.cmd` as shown above.
- **Project not found or permission denied:** check the Project ID and the account
  used with `firebase.cmd login`.
- **Hosting folder does not exist:** run `npm.cmd run build` successfully before deploying.
- **Google sign-in reports an unauthorised domain:** add the website's hostname
  under Firebase Authentication's authorised domains.
- **Installed app shows an older version:** connect to the internet, let the update
  download, then close all LifeOS windows and reopen it.

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
  template: ` <button hlmBtn>Save</button> `,
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
