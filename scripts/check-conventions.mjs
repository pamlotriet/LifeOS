import fs from 'node:fs';
import path from 'node:path';
import {
  controlIssues,
  importIssues,
  inlineTemplates,
  sharedImportIssues,
} from './quality-rules.mjs';

function files(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    );
}
const violations = [];
for (const file of [...files('src'), ...files('e2e')]) {
  if (!/\.(?:ts|html)$/.test(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  const report = (issue) => {
    const prefix = source.slice(0, issue.offset);
    const line = prefix.split('\n').length;
    const column = prefix.length - prefix.lastIndexOf('\n');
    violations.push(
      `${file.replaceAll('\\', '/')}:${line}:${column} [${issue.rule}] ${issue.message}`,
    );
  };
  if (file.endsWith('.ts')) {
    importIssues(source, file).forEach(report);
    if (!file.endsWith('.spec.ts') && file.replaceAll('\\', '/').startsWith('src/app/')) {
      sharedImportIssues(source, file, (relative) =>
        fs.readFileSync(path.resolve(path.dirname(file), relative), 'utf8'),
      ).forEach(report);
      for (const template of inlineTemplates(source, file))
        controlIssues(template.source, file).forEach((issue) =>
          report({ ...issue, offset: template.offset + issue.offset }),
        );
    }
  } else if (file.replaceAll('\\', '/').startsWith('src/app/'))
    controlIssues(source, file).forEach(report);
}
if (violations.length) {
  console.error(violations.join('\n'));
  console.error(`\n${violations.length} convention violation(s). See docs/code-quality.md.`);
  process.exitCode = 1;
} else console.log('Application aliases and shared control conventions verified.');
