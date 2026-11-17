import path from 'node:path';
import ts from 'typescript';
import { parseTemplate } from '@angular/compiler';

export function importIssues(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const issues = [];
  function check(node) {
    if (!node) return;
    function prefix(value) {
      if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
      if (ts.isTemplateExpression(value)) return value.head.text;
      if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.PlusToken)
        return prefix(value.left);
      if (ts.isParenthesizedExpression(value)) return prefix(value.expression);
      return '';
    }
    const value = prefix(node);
    const applicationSource = file.replaceAll('\\', '/').startsWith('src/');
    const local =
      value.startsWith('.') &&
      (applicationSource ||
        /(?:^|\/)src\//.test(
          path.posix.normalize(
            path.posix.join(path.posix.dirname(file.replaceAll('\\', '/')), value),
          ),
        ));
    if (
      local ||
      (applicationSource && value.startsWith('/')) ||
      /^(?:\/?src\/|app\/|[A-Za-z]:[\\/])/.test(value)
    ) {
      issues.push({
        rule: 'import-alias',
        offset: node.getStart(ast),
        message: `Use a configured application alias for "${value}".`,
      });
    }
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) check(node.moduleSpecifier);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference))
      check(node.moduleReference.expression);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
      check(node.argument.literal);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(ast) === 'require')
    )
      check(node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return issues;
}

export function inlineTemplates(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const templates = [];
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(ast) === 'template' &&
      (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))
    ) {
      templates.push({ source: node.initializer.text, offset: node.initializer.getStart(ast) + 1 });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return templates;
}

export function templateElements(source, file) {
  const parsed = parseTemplate(source, file);
  if (parsed.errors?.length) throw new Error(parsed.errors.join('\n'));
  const elements = [];
  const seen = new Set();
  function visit(node) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (node.name && node.startSourceSpan) elements.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (key.endsWith('Span')) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  parsed.nodes.forEach(visit);
  return elements;
}

export function controlIssues(source, file) {
  // These components implement the native controls; requiring their own directive would recurse.
  const implementations =
    /^src\/app\/shared\/components\/(?:app-select\/app-select|app-date-picker\/app-date-picker|app-month-picker\/app-month-picker)\.ts$/;
  if (implementations.test(file.replaceAll('\\', '/'))) return [];
  const issues = [];
  for (const node of templateElements(source, file)) {
    const names = new Set(
      [...(node.attributes ?? []), ...(node.inputs ?? [])].map((attribute) => attribute.name),
    );
    const attribute = (name) =>
      node.attributes?.find((attribute) => attribute.name === name)?.value;
    let rule;
    if (
      node.name === 'textarea' ||
      (node.name === 'input' &&
        ![
          'checkbox',
          'radio',
          'range',
          'file',
          'color',
          'hidden',
          'button',
          'submit',
          'reset',
        ].includes(attribute('type') ?? 'text'))
    ) {
      if (!names.has('appInput')) rule = 'shared-input';
    }
    const widget =
      ['aria-pressed', 'aria-expanded', 'aria-current'].some(
        (name) => names.has(name) || names.has(`attr.${name}`),
      ) || ['tab', 'switch', 'checkbox', 'option'].includes(attribute('role'));
    const iconOnly =
      (names.has('aria-label') || names.has('attr.aria-label')) &&
      source
        .slice(
          node.startSourceSpan.end.offset,
          node.endSourceSpan?.start.offset ?? node.sourceSpan.end.offset,
        )
        .replace(/<[^>]*>/g, '')
        .replace(/&(?:times|#215|#8249|#8250);/g, '')
        .trim() === '';
    if (node.name === 'button' && !names.has('appButton') && !widget && !iconOnly)
      rule = 'shared-button';
    if (node.name === 'select') rule = 'shared-select';
    if (
      node.name === 'a' &&
      (attribute('role') === 'button' ||
        /(?:^|\s)(?:primary-button|secondary-button|danger-button|primary-action|secondary-action)(?:\s|$)/.test(
          attribute('class') ?? '',
        )) &&
      !names.has('appButton')
    )
      rule = 'shared-button';
    if (!rule) continue;
    const offset = node.startSourceSpan.start.offset;
    const preceding = source.slice(0, offset);
    const exception = preceding.match(
      /<!--\s*quality-allow\s+(shared-(?:input|button|select)):\s*([^<>]+?)\s*-->\s*$/,
    );
    if (exception?.[1] === rule && exception[2].trim().length >= 15) continue;
    issues.push({
      rule,
      offset,
      end: node.startSourceSpan.end.offset,
      message:
        rule === 'shared-input'
          ? 'Use AppInput on this native field.'
          : rule === 'shared-select'
            ? 'Use AppSelect, or document why this native select is required.'
            : 'Use AppButton for this action, or document its specialized interaction.',
    });
  }
  return issues;
}

/** Static attributes are inert unless the shared standalone component is registered. */
export function sharedImportIssues(source, file, readTemplate = () => '') {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const aliases = new Map();
  const modules = new Map([
    ['AppInput', '@shared/components/app-input/app-input'],
    ['AppButton', '@shared/components/app-button/app-button'],
    ['AppSelect', '@shared/components/app-select/app-select'],
    ['AppDatePicker', '@shared/components/app-date-picker/app-date-picker'],
    ['AppMonthPicker', '@shared/components/app-month-picker/app-month-picker'],
  ]);
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    if (!statement.moduleSpecifier.text.startsWith('@shared/components/')) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings))
      for (const binding of bindings.elements) {
        const component = (binding.propertyName ?? binding.name).text;
        if (modules.get(component) === statement.moduleSpecifier.text)
          aliases.set(component, binding.name.text);
      }
  }
  const issues = [];
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(ast) === 'Component' &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const properties = node.arguments[0].properties;
      const property = (name) =>
        properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(ast) === name);
      const inline = property('template')?.initializer;
      const external = property('templateUrl')?.initializer;
      const template =
        inline && (ts.isStringLiteral(inline) || ts.isNoSubstitutionTemplateLiteral(inline))
          ? inline.text
          : external && ts.isStringLiteral(external)
            ? readTemplate(external.text)
            : '';
      const registered = new Set();
      function identifiers(n) {
        if (ts.isIdentifier(n)) registered.add(n.text);
        ts.forEachChild(n, identifiers);
      }
      const imports = property('imports')?.initializer;
      if (imports) identifiers(imports);
      const required = new Set();
      for (const element of templateElements(template, file)) {
        const attrs = [...(element.attributes ?? []), ...(element.inputs ?? [])].map((a) => a.name);
        if (attrs.includes('appButton')) required.add('AppButton');
        if (attrs.includes('appInput')) required.add('AppInput');
        for (const [selector, component] of [
          ['app-select', 'AppSelect'],
          ['app-date-picker', 'AppDatePicker'],
          ['app-month-picker', 'AppMonthPicker'],
        ])
          if (element.name === selector) required.add(component);
      }
      for (const component of required)
        if (!aliases.has(component) || !registered.has(aliases.get(component)))
          issues.push({
            rule: 'shared-import',
            offset: node.getStart(ast),
            message: `Import ${component} in this component's standalone imports.`,
          });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return issues;
}
