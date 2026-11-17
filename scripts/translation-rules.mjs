import ts from 'typescript';
import { parseTemplate } from '@angular/compiler';
import { inlineTemplates } from './quality-rules.mjs';

export function templateTranslationKeys(source, file) {
  const parsed = parseTemplate(source, file);
  if (parsed.errors?.length) throw Error(parsed.errors.join('\n'));
  const keys = new Set();
  const seen = new Set();
  function literals(node) {
    if (node?.constructor.name === 'ParenthesizedExpression') literals(node.expression);
    if (
      node?.constructor.name === 'LiteralPrimitive' &&
      typeof node.value === 'string' &&
      /[\p{L}\p{N}]/u.test(node.value)
    )
      keys.add(node.value);
    if (node?.constructor.name === 'Conditional') {
      literals(node.trueExp);
      literals(node.falseExp);
    }
  }
  function visit(node) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (node.constructor.name === 'BindingPipe' && node.name === 'translate') literals(node.exp);
    for (const value of Object.values(node))
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
  }
  parsed.nodes.forEach(visit);
  return keys;
}

export function typescriptTranslationKeys(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const keys = new Set(
    inlineTemplates(source, file).flatMap((template) => [
      ...templateTranslationKeys(template.source, file),
    ]),
  );
  const constants = new Map();
  function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const name = node.name.text;
      constants.set(name, constants.has(name) ? undefined : node.initializer);
    }
    ts.forEachChild(node, collect);
  }
  collect(ast);
  function literals(node, visited = new Set()) {
    if (!node) return;
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      /[\p{L}\p{N}]/u.test(node.text)
    )
      keys.add(node.text);
    if (ts.isParenthesizedExpression(node)) literals(node.expression, visited);
    if (ts.isConditionalExpression(node)) {
      literals(node.whenTrue, visited);
      literals(node.whenFalse, visited);
    }
    if (ts.isIdentifier(node) && !visited.has(node.text)) {
      visited.add(node.text);
      literals(constants.get(node.text), visited);
    }
  }
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      (node.expression.getText(ast).endsWith('.instant') ||
        node.expression.getText(ast) === 'translate')
    )
      literals(node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return keys;
}

export function catalogIssues(source) {
  let catalog;
  try {
    catalog = JSON.parse(source);
  } catch (error) {
    return [error.message];
  }
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog))
    return ['Translation catalog must be an object.'];
  const ast = ts.parseJsonText('catalog.json', source);
  const root = ast.statements[0]?.expression;
  const seen = new Set();
  const issues = [];
  if (root && ts.isObjectLiteralExpression(root))
    for (const property of root.properties) {
      const key = property.name?.text;
      if (seen.has(key)) issues.push(`Duplicate translation key: ${JSON.stringify(key)}`);
      seen.add(key);
    }
  for (const [key, value] of Object.entries(catalog))
    if (typeof value !== 'string' || !value.trim())
      issues.push(`Translation must be a nonempty string: ${JSON.stringify(key)}`);
  return issues;
}
