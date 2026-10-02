// Syntax and local-import checks when full Next/ESLint binaries are unavailable.
// Uses the Babel parser distributed with the project's Next.js dependency.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const parser = require('next/dist/compiled/babel/parser');
const root = path.resolve(__dirname, '..');
const locations = ['app', 'components', 'lib', 'backend/src', 'scripts'];
const extensions = ['.js','.jsx','.mjs','.cjs','.json','.ts','.tsx'];
let parsed = 0, checked = 0;
function resolveLocal(from, specifier) {
  if (!specifier.startsWith('.')) return;
  const target = path.resolve(path.dirname(from), specifier);
  const options = [target, ...extensions.map(ext => target + ext), ...extensions.map(ext => path.join(target, 'index' + ext))];
  assert.ok(options.some(file => fs.existsSync(file) && fs.statSync(file).isFile()),
    `Missing local import ${JSON.stringify(specifier)} from ${path.relative(root,from)}`);
  checked++;
}
function checkFile(file) {
  if (!/\.(js|jsx|mjs|cjs|ts|tsx)$/.test(file)) return;
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = parser.parse(code, { sourceType:'unambiguous', plugins:['jsx','typescript'] }); }
  catch (error) { throw new Error(`${path.relative(root,file)}: ${error.message}`); }
  parsed++;
  for (const node of ast.program.body) {
    if (['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type) && node.source) {
      resolveLocal(file, node.source.value);
    }
  }
  // Inspect actual syntax nodes so comments and example strings cannot
  // produce false missing-import failures.
  function inspect(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(inspect); return; }
    if (node.type === 'CallExpression' && (node.callee?.name === 'require' || node.callee?.type === 'Import')
        && node.arguments?.[0]?.type === 'StringLiteral') {
      resolveLocal(file, node.arguments[0].value);
    }
    if (node.type === 'ImportExpression' && node.source?.type === 'StringLiteral') {
      resolveLocal(file, node.source.value);
    }
    for (const [key, value] of Object.entries(node)) {
      if (!['loc','start','end','comments','leadingComments','trailingComments','extra'].includes(key)) inspect(value);
    }
  }
  inspect(ast.program);
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else checkFile(file);
  }
}
for (const dir of locations) walk(path.join(root,dir));
console.log(`PASS: parsed ${parsed} JS/JSX files; resolved ${checked} local imports`);
