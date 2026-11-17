import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  controlIssues,
  importIssues,
  inlineTemplates,
  sharedImportIssues,
} from './quality-rules.mjs';
import {
  catalogIssues,
  templateTranslationKeys,
  typescriptTranslationKeys,
} from './translation-rules.mjs';

const screen = 'src/app/pages/example/example.ts';
const templateFile = 'src/app/pages/example/example.html';

test('aliases apply to static, lazy, type-only, re-export and require imports', () => {
  for (const source of [
    "import { X } from './x';",
    "export * from '../x';",
    "import type { X } from './x';",
    "const route = () => import('./x');",
    "type X = import('./x').X;",
    "const x = require('./x');",
    "const route = () => import('./' + screen);",
    'const route = () => import(`./${screen}`);',
  ]) {
    assert.equal(importIssues(source, screen).length, 1, source);
    assert.equal(importIssues(source, screen.replace('.ts', '.spec.ts')).length, 1, source);
  }
  assert.equal(
    importIssues("import { X } from '@pages/example/x'; import { Y } from '@angular/core';", screen)
      .length,
    0,
  );
  assert.equal(importIssues("const text = `import('./example')`;", screen).length, 0);
  assert.equal(
    importIssues("import { X } from '../../src/app/example';", 'e2e/app/main.ts').length,
    1,
  );
  assert.equal(importIssues("import { X } from './helpers';", 'e2e/tests/example.ts').length, 0);
});

test('fields, buttons, button-like links and native selects use shared controls', () => {
  for (const source of [
    '<input>',
    '<input type="email" />',
    '<textarea></textarea>',
    '<button>Save</button>',
    '<a role="button">Save</a>',
    '<a class="primary-button">Save</a>',
    '<select><option>One</option></select>',
  ])
    assert.equal(controlIssues(source, templateFile).length, 1, source);
  assert.equal(
    controlIssues(
      '<input appInput><textarea appInput></textarea><button appButton>Save</button><a appButton class="primary-button">Save</a><app-select />',
      templateFile,
    ).length,
    0,
  );
  assert.equal(
    controlIssues(
      '<!-- <button>Example</button> --><input type="checkbox"><input type="file"><input type="range">',
      templateFile,
    ).length,
    0,
  );
});

test('widget and accessible icon controls remain specialized, but plain actions do not', () => {
  assert.equal(
    controlIssues(
      '<button [attr.aria-pressed]="active">Filter</button><button aria-label="Close"><ion-icon name="close" /></button>',
      templateFile,
    ).length,
    0,
  );
  assert.equal(controlIssues('<button aria-label="Save">Save</button>', templateFile).length, 1);
  assert.equal(controlIssues('<button><ion-icon name="close" /></button>', templateFile).length, 1);
});

test('exceptions require a reason and apply only to the immediately following matching element', () => {
  const exception =
    '<!-- quality-allow shared-button: Compact action inside the reading progress header. -->';
  assert.equal(
    controlIssues(exception + '<button>Back</button><button>Save</button>', templateFile).length,
    1,
  );
  assert.equal(
    controlIssues(exception + '<span>Other content</span><button>Save</button>', templateFile)
      .length,
    1,
  );
  assert.equal(
    controlIssues('<!-- quality-allow shared-button: legacy --><button>Save</button>', templateFile)
      .length,
    1,
  );
  assert.equal(controlIssues(exception + '<input>', templateFile).length, 1);
});

test('canonical control implementation exception cannot hide other components', () => {
  assert.equal(
    controlIssues('<select></select>', 'src/app/shared/components/app-select/app-select.ts').length,
    0,
  );
  assert.equal(
    controlIssues('<select></select>', 'src/app/shared/components/app-select/example.ts').length,
    1,
  );
});

test('inline templates and their shared standalone imports are checked', () => {
  const source =
    '@Component({template: `<button appButton>Save</button><input appInput>`}) class Example {}';
  assert.equal(inlineTemplates(source, screen).length, 1);
  assert.equal(sharedImportIssues(source, screen).length, 2);
  assert.equal(
    sharedImportIssues(
      '@Component({imports: [AppButton], template: `<button appButton>Save</button>`}) class Example {}',
      screen,
    ).length,
    1,
  );
  const imported =
    "import { AppButton as Action } from '@shared/components/app-button/app-button'; @Component({imports: [Action], template: `<button appButton>Save</button>`}) class Example {}";
  assert.equal(sharedImportIssues(imported, screen).length, 0);
  assert.equal(
    sharedImportIssues(
      "@Component({templateUrl: './example.html'}) class Example {}",
      screen,
      () => '<app-date-picker />',
    ).length,
    1,
  );
});

test('translation scan includes conditional and inline keys without guessing dynamic user data', () => {
  assert.deepEqual(
    [
      ...templateTranslationKeys(
        "{{ (busy ? 'Saving...' : 'Save') | translate }} {{ record.title | translate }}",
        templateFile,
      ),
    ].sort(),
    ['Save', 'Saving...'],
  );
  const source =
    "const key = busy ? 'Saving...' : 'Save'; i18n.instant(key); @Component({template: `{{ 'Cancel' | translate }}`}) class Example {}";
  assert.deepEqual([...typescriptTranslationKeys(source, screen)].sort(), [
    'Cancel',
    'Save',
    'Saving...',
  ]);
  assert.throws(() => templateTranslationKeys('@if (broken {', templateFile));
});

test('translation catalogs reject malformed JSON, duplicates, empty values and non-string values', () => {
  for (const source of [
    '{',
    '[]',
    '{"Save":"Save","Save":"Again"}',
    '{"Save":""}',
    '{"Save":false}',
  ])
    assert.ok(catalogIssues(source).length, source);
  assert.deepEqual(catalogIssues('{"Save":"Save","Cancel":"Cancel"}'), []);
});
