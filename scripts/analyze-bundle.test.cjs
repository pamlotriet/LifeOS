const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeBundle } = require('./analyze-bundle.cjs');

test('counts shared static dependencies once and excludes lazy entry points', () => {
  const stats = {
    outputs: {
      'main.js': {
        entryPoint: 'src/main.ts',
        bytes: 100,
        imports: [
          { path: 'shared.js', kind: 'import-statement' },
          { path: 'feature.js', kind: 'dynamic-import' },
        ],
      },
      'shared.js': {
        bytes: 50,
        imports: [{ path: 'main.js', kind: 'import-statement' }],
        inputs: {
          'node_modules/@ionic/core/components/ion-app.js': { bytesInOutput: 30 },
        },
      },
      'feature.js': { entryPoint: 'src/app/pages/books/books.ts', bytes: 1000 },
      'styles.css': { entryPoint: 'angular:styles/global:styles', bytes: 25 },
    },
  };
  const result = analyzeBundle(stats);
  assert.equal(result.initialBytes, 175);
  assert.equal(result.files.length, 3);
  assert.deepEqual(result.packages, [{ name: '@ionic/core', bytes: 30 }]);
});
