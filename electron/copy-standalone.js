const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) {
    try {
      src = fs.realpathSync(src);
    } catch {
      return;
    }
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const entryStat = fs.lstatSync(srcPath);

    if (entryStat.isSymbolicLink()) {
      try {
        const realTarget = fs.realpathSync(srcPath);
        const targetStat = fs.statSync(realTarget);
        if (targetStat.isDirectory()) {
          copyDirSync(realTarget, destPath);
        } else {
          fs.copyFileSync(realTarget, destPath);
        }
      } catch {
        // Ignore broken symlinks
      }
    } else if (entryStat.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function flattenStandaloneNodeModules(standaloneDir) {
  const nmDir = path.join(standaloneDir, 'node_modules');
  if (!fs.existsSync(nmDir)) return;

  console.log('🔧 [Package Preparer] Flattening pnpm node_modules for standalone NSIS packaging...');

  // 1. Replace any top-level symlinks in standalone/node_modules with real directories
  for (const entry of fs.readdirSync(nmDir)) {
    if (entry === '.pnpm') continue;
    const fullPath = path.join(nmDir, entry);
    const stat = fs.lstatSync(fullPath);
    if (stat.isSymbolicLink()) {
      const realTarget = fs.realpathSync(fullPath);
      fs.rmSync(fullPath, { recursive: true, force: true });
      copyDirSync(realTarget, fullPath);
    } else if (stat.isDirectory() && entry.startsWith('@')) {
      for (const subEntry of fs.readdirSync(fullPath)) {
        const subFullPath = path.join(fullPath, subEntry);
        const subStat = fs.lstatSync(subFullPath);
        if (subStat.isSymbolicLink()) {
          const realTarget = fs.realpathSync(subFullPath);
          fs.rmSync(subFullPath, { recursive: true, force: true });
          copyDirSync(realTarget, subFullPath);
        }
      }
    }
  }

  // 2. Hoist and merge all real packages from .pnpm/*/node_modules/* into standalone/node_modules
  const pnpmDir = path.join(nmDir, '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    for (const pkgFolder of fs.readdirSync(pnpmDir)) {
      if (pkgFolder === 'node_modules') continue;
      const innerNm = path.join(pnpmDir, pkgFolder, 'node_modules');
      if (!fs.existsSync(innerNm) || !fs.lstatSync(innerNm).isDirectory()) continue;

      for (const modName of fs.readdirSync(innerNm)) {
        const modPath = path.join(innerNm, modName);
        const modStat = fs.lstatSync(modPath);
        if (modStat.isSymbolicLink()) continue;

        if (modStat.isDirectory() && modName.startsWith('@')) {
          for (const scopedName of fs.readdirSync(modPath)) {
            const scopedPath = path.join(modPath, scopedName);
            const scopedStat = fs.lstatSync(scopedPath);
            if (scopedStat.isSymbolicLink()) continue;
            if (scopedStat.isDirectory()) {
              copyDirSync(scopedPath, path.join(nmDir, modName, scopedName));
            }
          }
        } else if (modStat.isDirectory()) {
          copyDirSync(modPath, path.join(nmDir, modName));
        }
      }
    }

    // 3. Remove .pnpm virtual store completely so NSIS has zero symlinks and zero duplicate packages
    fs.rmSync(pnpmDir, { recursive: true, force: true });
  }
}

const rootDir = path.join(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');

if (fs.existsSync(standaloneDir)) {
  console.log('📦 [Package Preparer] Copying static assets to standalone bundle...');

  // 1. Copy .next/static to .next/standalone/.next/static
  const srcStatic = path.join(rootDir, '.next', 'static');
  const destStatic = path.join(standaloneDir, '.next', 'static');
  copyDirSync(srcStatic, destStatic);

  // 2. Copy public to .next/standalone/public
  const srcPublic = path.join(rootDir, 'public');
  const destPublic = path.join(standaloneDir, 'public');
  copyDirSync(srcPublic, destPublic);

  // 3. Flatten pnpm symlinks in .next/standalone/node_modules
  flattenStandaloneNodeModules(standaloneDir);

  console.log('✅ [Package Preparer] Standalone bundle is complete, flattened, and self-contained!');
} else {
  console.warn('⚠️ [Package Preparer] .next/standalone not found. Run next build first.');
}
