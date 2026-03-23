import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const tempDir = path.join(rootDir, '.build-temp');

async function copyPublicDir() {
  const publicDir = path.join(rootDir, 'public');
  const entries = await readdir(publicDir, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => copyFile(path.join(publicDir, entry.name), path.join(distDir, entry.name)))
  );
}

async function prepareTempEntry() {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  const stylesSource = await readFile(path.join(rootDir, 'src/styles.css'), 'utf8');
  const processedStyles = await postcss([
    tailwindcss({ config: path.join(rootDir, 'tailwind.config.js') }),
    autoprefixer()
  ]).process(stylesSource, {
    from: path.join(rootDir, 'src/styles.css')
  });

  await writeFile(path.join(tempDir, 'styles.generated.css'), processedStyles.css, 'utf8');

  const mainContents = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '../src/app/providers';
import { AppRouter } from '../src/app/router';
import './styles.generated.css';

if (typeof document !== 'undefined') {
  document.title = 'Data Center';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>
);
`;

  await writeFile(path.join(tempDir, 'main.tsx'), mainContents, 'utf8');
}

async function runBunBuild() {
  await new Promise((resolve, reject) => {
    const child = spawn('bun', ['build', path.join(tempDir, 'main.tsx'), '--outdir', path.join(distDir, 'assets'), '--target', 'browser', '--minify'], {
      cwd: rootDir,
      stdio: 'inherit'
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`bun build failed with exit code ${code ?? 'unknown'}`));
      }
    });
    child.on('error', reject);
  });
}

async function writeHtml() {
  const assetsDir = path.join(distDir, 'assets');
  const outputs = await readdir(assetsDir);
  const hasCss = outputs.includes('main.css');
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    ${hasCss ? '<link rel="stylesheet" href="/assets/main.css" />' : ''}
    <title>Data Center</title>
  </head>
  <body class="bg-slate-50">
    <div id="root"></div>
    <script type="module" src="/assets/main.js"></script>
  </body>
</html>
`;
  await writeFile(path.join(distDir, 'index.html'), html, 'utf8');
}

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(path.join(distDir, 'assets'), { recursive: true });
  await prepareTempEntry();
  await runBunBuild();
  await copyPublicDir();
  await writeHtml();
  await rm(tempDir, { recursive: true, force: true });
}

build().catch(async (error) => {
  console.error(error);
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  process.exitCode = 1;
});
