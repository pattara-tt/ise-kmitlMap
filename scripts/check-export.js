// Verify static local ESM imports/exports; no build server required.
// Syntax-only validation misses errors such as `import Foo` from a file
// that has no default export, so keep this in `npm run test:source`.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const parser = require('next/dist/compiled/babel/parser');
const root = path.resolve(__dirname, '..');
const dirs = ['app', 'components', 'lib', 'backend/src', 'scripts'];
const extensions = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'];
const files = [];
const asts = new Map();

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (extensions.some(ext => file.endsWith(ext))) files.push(file);
  }
}
for (const dir of dirs) walk(path.join(root, dir));
function astFor(file) {
  if (!asts.has(file)) {
    try {
      asts.set(file, parser.parse(fs.readFileSync(file, 'utf8'), {
        sourceType: 'unambiguous', plugins: ['jsx', 'typescript'],
      }).program);
    } catch (error) { throw new Error(`${path.relative(root, file)}: ${error.message}`); }
  }
  return asts.get(file);
}
function localFile(from, source) {
  if (!source.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), source);
  const possibilities = [base, ...extensions.map(e => base + e),
    ...extensions.map(e => path.join(base, 'index' + e))];
  return possibilities.find(f => fs.existsSync(f) && fs.statSync(f).isFile()) || null;
}
function namesFromDeclaration(decl, out) {
  if (!decl) return;
  if (decl.id?.name) out.add(decl.id.name);
  if (decl.type === 'VariableDeclaration') {
    for (const d of decl.declarations) {
      if (d.id?.name) out.add(d.id.name);
      if (d.id?.type === 'ObjectPattern') for (const p of d.id.properties) if (p.value?.name) out.add(p.value.name);
    }
  }
}
function exportsOf(file, seen = new Set()) {
  if (seen.has(file)) return new Set();
  seen.add(file);
  const names = new Set();
  for (const node of astFor(file).body) {
    if (node.type === 'ExportDefaultDeclaration') names.add('default');
    if (node.type === 'ExportNamedDeclaration') {
      namesFromDeclaration(node.declaration, names);
      for (const spec of node.specifiers || []) {
        if (spec.exported?.name) names.add(spec.exported.name);
        else if (spec.exported?.value) names.add(spec.exported.value);
      }
    }
    if (node.type === 'ExportAllDeclaration') {
      if (node.exported?.name) { names.add(node.exported.name); continue; }
      const target = localFile(file, node.source.value);
      if (target) for (const n of exportsOf(target, seen)) if (n !== 'default') names.add(n);
    }
  }
  return names;
}
let imports = 0;
for (const file of files) {
  for (const node of astFor(file).body) {
    if (node.type !== 'ImportDeclaration' && node.type !== 'ExportNamedDeclaration') continue;
    if (!node.source) continue;
    const target = localFile(file, node.source.value);
    if (!target || !extensions.some(ext => target.endsWith(ext))) continue;
    const exported = exportsOf(target);
    for (const spec of node.specifiers || []) {
      let requested = null;
      if (spec.type === 'ImportDefaultSpecifier') requested = 'default';
      if (spec.type === 'ImportSpecifier') requested = spec.imported?.name || spec.imported?.value;
      if (node.type === 'ExportNamedDeclaration') requested = spec.local?.name || spec.local?.value;
      if (!requested) continue;
      assert.ok(exported.has(requested),
        `${path.relative(root, file)} imports '${requested}' from ${path.relative(root, target)} but it isn't exported`);
      imports++;
    }
  }
}
console.log(`PASS: ${imports} local named/default ESM import-export bindings validated`);