#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLANTUML_JAR = path.join(__dirname, 'plantuml.jar');
const STATIC_DIAGRAMS_DIR = path.join(process.cwd(), 'static', 'diagrams');
const TEMP_DIR = path.join(process.cwd(), 'temp', 'plantuml');

async function setupPlantUML() {
  console.log('🚀 Setting up PlantUML environment...');
  
  // Create necessary directories
  [STATIC_DIAGRAMS_DIR, TEMP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${path.relative(process.cwd(), dir)}`);
    }
  });
  
  // Download PlantUML JAR if it doesn't exist
  if (!fs.existsSync(PLANTUML_JAR)) {
    console.log('📦 Downloading PlantUML JAR...');
    try {
      execSync(`curl -L -o "${PLANTUML_JAR}" "https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar"`, 
        { stdio: 'inherit' });
      console.log('✓ PlantUML JAR downloaded successfully');
    } catch (error) {
      console.error('❌ Failed to download PlantUML JAR:', error.message);
      console.log('You can manually download it from: https://github.com/plantuml/plantuml/releases/latest');
      process.exit(1);
    }
  } else {
    console.log('✓ PlantUML JAR already exists');
  }
  
  // Check Java installation
  try {
    const javaVersion = execSync('java -version 2>&1', { encoding: 'utf-8' });
    console.log('✓ Java is installed:', javaVersion.split('\n')[0]);
  } catch (error) {
    console.error('❌ Java is not installed or not in PATH');
    console.log('Please install Java to use PlantUML');
    process.exit(1);
  }
  
  // Check Graphviz installation
  try {
    const dotVersion = execSync('dot -V 2>&1', { encoding: 'utf-8' });
    console.log('✓ Graphviz is installed:', dotVersion.trim());
  } catch (error) {
    console.warn('⚠️  Graphviz is not installed. Some PlantUML diagrams may not work properly.');
    console.log('To install Graphviz:');
    console.log('  Ubuntu/Debian: sudo apt install graphviz');
    console.log('  macOS: brew install graphviz');
    console.log('  Windows: Download from https://graphviz.org/download/');
  }
  
  // Test PlantUML with Graphviz
  try {
    execSync(`java -jar "${PLANTUML_JAR}" -testdot`, { stdio: 'pipe' });
    console.log('✓ PlantUML + Graphviz integration working');
  } catch (error) {
    console.warn('⚠️  PlantUML may have issues with Graphviz integration');
  }
  
  // Create gitignore entries
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const gitignoreEntries = [
    '# PlantUML temp files',
    'temp/plantuml/',
    '# PlantUML JAR (downloaded automatically)',
    'bin/plantuml.jar'
  ].join('\n');
  
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignoreContent.includes('temp/plantuml/')) {
      fs.appendFileSync(gitignorePath, '\n' + gitignoreEntries + '\n');
      console.log('✓ Updated .gitignore with PlantUML entries');
    }
  } else {
    fs.writeFileSync(gitignorePath, gitignoreEntries + '\n');
    console.log('✓ Created .gitignore with PlantUML entries');
  }
  
  console.log('✅ PlantUML setup complete!');
  console.log('');
  console.log('Usage:');
  console.log('  npm run plantuml:process  - Process PlantUML diagrams');
  console.log('  npm run dev              - Start development server with PlantUML processing');
  console.log('  npm run build            - Build site with PlantUML processing');
}

if (require.main === module) {
  setupPlantUML();
}

module.exports = { setupPlantUML };
