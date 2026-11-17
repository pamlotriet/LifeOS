import fs from 'node:fs';
import path from 'node:path';
import {
  catalogIssues,
  templateTranslationKeys,
  typescriptTranslationKeys,
} from './translation-rules.mjs';

const catalogSource = fs.readFileSync('public/i18n/en.json', 'utf8');
const errors = catalogIssues(catalogSource);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const catalog = JSON.parse(catalogSource);
const missing = new Set();
const files = (directory) =>
  fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    );
const check = (key, file) => {
  if (!Object.hasOwn(catalog, key)) missing.add(`${file}: ${JSON.stringify(key)}`);
};

for (const file of files('src/app')) {
  if ((!file.endsWith('.html') && !file.endsWith('.ts')) || file.endsWith('.spec.ts')) continue;
  const source = fs.readFileSync(file, 'utf8');
  const keys = file.endsWith('.html')
    ? templateTranslationKeys(source, file)
    : typescriptTranslationKeys(source, file);
  keys.forEach((key) => check(key, file));
}

if (missing.size) {
  console.error([...missing].sort().join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Translation keys verified (${Object.keys(catalog).length} English messages).`);
}
