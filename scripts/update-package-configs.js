const fs = require('fs');
const path = require('path');

// Reference configuration from lexical package
const PACKAGES_DIR = path.join(__dirname, '..', 'packages');
const LEXICAL_DIR = path.join(PACKAGES_DIR, 'lexical');
const REFERENCE_VITE_CONFIG = fs.readFileSync(path.join(LEXICAL_DIR, 'vite.config.mts'), 'utf8');
const REFERENCE_TS_CONFIG = JSON.parse(fs.readFileSync(path.join(LEXICAL_DIR, 'tsconfig.json'), 'utf8'));
const REFERENCE_PKG_JSON = JSON.parse(fs.readFileSync(path.join(LEXICAL_DIR, 'package.json'), 'utf8'));
const REFERENCE_GLOBAL_DTS = fs.readFileSync(path.join(LEXICAL_DIR, 'src', 'global.d.ts'), 'utf8');

// Get all package directories
const packages = fs.readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

packages.forEach(pkg => {
  const pkgPath = path.join(PACKAGES_DIR, pkg);
  
  // Skip lexical package (reference)
  if (pkg === 'lexical') return;
  
  console.log(`Updating configuration for: ${pkg}`);
  
  // 1. Create/update vite.config file
  const viteConfigPath = path.join(pkgPath, 'vite.config.mts');
  fs.writeFileSync(viteConfigPath, REFERENCE_VITE_CONFIG);
  console.log(`  Updated vite.config.mts`);
  
  // 2. Update tsconfig.json
  const tsConfigPath = path.join(pkgPath, 'tsconfig.json');
  let tsConfig = {};
  
  if (fs.existsSync(tsConfigPath)) {
    tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
  }
  
  // Merge with reference config
  tsConfig = {
    ...REFERENCE_TS_CONFIG,
    ...tsConfig,
    compilerOptions: {
      ...REFERENCE_TS_CONFIG.compilerOptions,
      ...(tsConfig.compilerOptions || {})
    }
  };
  
  fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
  console.log(`  Updated tsconfig.json`);
  
  // 3. Update package.json scripts
  const pkgJsonPath = path.join(pkgPath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    
    if (!pkgJson.scripts) {
      pkgJson.scripts = {};
    }
    
    // Add build scripts if missing
    if (!pkgJson.scripts.build) {
      pkgJson.scripts.build = REFERENCE_PKG_JSON.scripts.build;
    }
    
    if (!pkgJson.scripts['build:only']) {
      pkgJson.scripts['build:only'] = REFERENCE_PKG_JSON.scripts['build:only'];
    }
    
    // Add declaration script if missing
    if (!pkgJson.scripts.declaration) {
      pkgJson.scripts.declaration = "tsc --build --declaration --emitDeclarationOnly --declarationMap --verbose";
    }
    
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
    console.log(`  Updated package.json scripts`);
  }
  
  // 4. Create global.d.ts in src directory
  const srcDir = path.join(pkgPath, 'src');
  if (fs.existsSync(srcDir)) {
    const globalDtsPath = path.join(srcDir, 'global.d.ts');
    if (!fs.existsSync(globalDtsPath)) {
      fs.writeFileSync(globalDtsPath, REFERENCE_GLOBAL_DTS);
      console.log(`  Created global.d.ts`);
    }
  }
});

console.log('Configuration update complete!');
