const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const postcss = require('postcss');

test('shared Budget styles cannot target another feature', () => {
  const directory = 'src/app/pages/budget/components/budget-page';
  for (const name of ['budget-page.css', 'budget-page-layout.css']) {
    postcss.parse(fs.readFileSync(path.join(directory, name), 'utf8')).walkRules(rule => {
      for (const selector of rule.selectors) {
        assert.match(selector, /^(?:\.dark\s+)?(?:main)?\.budget-(?:page|screen)(?=[\s.:>]|$)/, `${name}: ${selector}`);
      }
    });
  }
});

test('the shared Budget theme has one component owner', () => {
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const name = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(name);
      else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
        const source = fs.readFileSync(name, 'utf8');
        assert.doesNotMatch(source, /['"][^'"]*\/(?:budget|budget-layout)\.css['"]/, name);
        if (source.includes("'./budget-page.css'")) assert.ok(name.endsWith('budget-page.ts'));
      }
    }
  }
  inspect('src/app/pages/budget');
});
