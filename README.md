# LifeOS

See [Application structure](docs/project-structure.md) for feature folders, state ownership,
and the shared input, button, chart, select and date controls.

LifeOS is an Angular and Ionic personal organiser, hosted as an installable web app on Firebase Hosting.

## UI translations

User-facing text is managed with ngx-translate. Edit the values in
`public/i18n/en.json` to change English wording. English phrases serve as message
keys; keep keys stable when editing their displayed values. Parameterized template
messages use stable `messages.*` keys and named parameters such as `{{p0}}` so
formatting cannot alter lookup keys.

Templates import `TranslatePipe` and use `| translate`; TypeScript presentation
code uses `TranslateService.instant(key, params)`. Pure calculations that generate
messages accept a translation callback. Keep persisted statuses, identifiers,
routes and user-entered content unchanged; translate labels when rendering them.

The loader and default language live in `src/app/core/i18n/translation.providers.ts`.
English loads before the first render, and the service worker caches translation
files for offline launches. Add another language as `public/i18n/<language>.json`
with matching keys before selecting it through `TranslateService.use(language)`.

Run `npm.cmd run i18n:check` to verify literal translation keys against the English
catalog, then run the build and tests after changing templates or providers.

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
