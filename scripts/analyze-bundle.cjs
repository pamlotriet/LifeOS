const fs = require('node:fs');

/** Summarize only the static dependency graph of the browser entry points. */
function analyzeBundle(stats) {
  const initial = new Set();
  function visit(file) {
    if (initial.has(file) || !stats.outputs[file]) return;
    initial.add(file);
    for (const dependency of stats.outputs[file].imports ?? []) {
      if (dependency.kind !== 'dynamic-import' && !dependency.external) visit(dependency.path);
    }
  }
  for (const [file, output] of Object.entries(stats.outputs)) {
    if (output.entryPoint === 'src/main.ts' || output.entryPoint === 'angular:styles/global:styles')
      visit(file);
  }
  const inputs = new Map();
  for (const file of initial) {
    for (const [name, input] of Object.entries(stats.outputs[file].inputs ?? {})) {
      inputs.set(name, (inputs.get(name) ?? 0) + input.bytesInOutput);
    }
  }
  const packages = new Map();
  for (const [name, bytes] of inputs) {
    const match = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(name);
    const group = match?.[1] ?? (name.startsWith('src/') ? 'application' : name);
    packages.set(group, (packages.get(group) ?? 0) + bytes);
  }
  return {
    initialBytes: [...initial].reduce((sum, file) => sum + stats.outputs[file].bytes, 0),
    files: [...initial].map((file) => ({ file, bytes: stats.outputs[file].bytes })),
    packages: [...packages]
      .map(([name, bytes]) => ({ name, bytes }))
      .sort((a, b) => b.bytes - a.bytes),
    inputs: [...inputs].map(([name, bytes]) => ({ name, bytes })).sort((a, b) => b.bytes - a.bytes),
  };
}

module.exports = { analyzeBundle };
if (require.main === module) {
  const report = analyzeBundle(
    JSON.parse(fs.readFileSync(process.argv[2] ?? 'dist/lifeos/stats.json', 'utf8')),
  );
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify(
      {
        initialBytes: report.initialBytes,
        files: report.files,
        packages: report.packages.slice(0, 12),
      },
      null,
      2,
    ),
  );
}
