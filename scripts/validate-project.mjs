import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const errors = [];
const required = [
  'src/App.jsx',
  'src/components/Closet.jsx',
  'src/components/AvatarStage3D.jsx',
  'src/components/RaceRanking3D.jsx',
  'src/components/GoalsRanking.jsx',
  'src/three/avatarFactory.js',
  'src/styles.css',
  'public/sw.js',
];
required.forEach(file => { if (!fs.existsSync(path.join(root, file))) errors.push(`Arquivo obrigatório ausente: ${file}`); });

const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const sourceFiles = walk(sourceRoot).filter(file => /\.(js|jsx)$/.test(file));

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const relativeImports = [...text.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map(match => match[1]);
  for (const request of relativeImports) {
    const base = path.resolve(path.dirname(file), request);
    const candidates = [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js'), path.join(base, 'index.jsx')];
    if (!candidates.some(candidate => fs.existsSync(candidate))) errors.push(`${path.relative(root, file)} importa caminho inexistente: ${request}`);
  }
}

const vendor = fs.readFileSync(path.join(root, 'vendor/lucide-react/index.js'), 'utf8');
const namesMatch = vendor.match(/const names=\[([^\]]+)\]/s);
const lucideNames = new Set(namesMatch ? [...namesMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]) : []);
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/gs)) {
    const names = match[1].split(',').map(value => value.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    names.forEach(name => { if (!lucideNames.has(name)) errors.push(`${path.relative(root, file)} usa ícone não exportado: ${name}`); });
  }
}

const renderers = sourceFiles.reduce((total, file) => total + (fs.readFileSync(file, 'utf8').match(/new\s+THREE\.WebGLRenderer/g) || []).length, 0);
if (renderers > 2) errors.push(`Foram encontrados ${renderers} renderizadores WebGL. O limite arquitetural é 2 (Closet e Ranking).`);
if (fs.readFileSync(path.join(root, 'src/components/AvatarPreview.jsx'), 'utf8').includes("from 'three'")) errors.push('AvatarPreview compacto não pode importar Three.js.');

const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
const braces = [...css].reduce((value, char) => value + (char === '{' ? 1 : char === '}' ? -1 : 0), 0);
if (braces !== 0) errors.push(`CSS com chaves desbalanceadas: ${braces}.`);

if (errors.length) {
  console.error('\nValidação do Randers\'CRM falhou:\n');
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Validação concluída: ${sourceFiles.length} arquivos JS/JSX, ${renderers} renderizadores WebGL, imports e CSS verificados.`);
