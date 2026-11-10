import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { parseTemplate } from '@angular/compiler';

const catalog = JSON.parse(fs.readFileSync('public/i18n/en.json', 'utf8'));
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

function checkTemplate(source, file) {
  const parsed = parseTemplate(source, file);
  if (parsed.errors?.length) throw new Error(parsed.errors.join('\n'));
  const seen = new Set();
  function visit(node) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (
      node.constructor.name === 'BindingPipe' &&
      node.name === 'translate' &&
      node.exp.constructor.name === 'LiteralPrimitive'
    ) {
      check(node.exp.value, file);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  parsed.nodes.forEach(visit);
}

for (const file of files('src/app')) {
  if (file.endsWith('.html')) checkTemplate(fs.readFileSync(file, 'utf8'), file);
  if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue;
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(ast) === 'template' &&
      (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))
    ) {
      checkTemplate(node.initializer.text, file);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.getText(ast).endsWith('.instant') ||
        node.expression.getText(ast) === 'translate') &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      check(node.arguments[0].text, file);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}

if (missing.size) {
  console.error([...missing].sort().join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Translation keys verified (${Object.keys(catalog).length} English messages).`);
}
