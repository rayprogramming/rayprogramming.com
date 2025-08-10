#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const PLANTUML_JAR = path.join(__dirname, 'plantuml.jar');
const CONTENT_DIR = path.join(process.cwd(), 'content');
const STATIC_DIR = path.join(process.cwd(), 'static', 'diagrams');
const TEMP_DIR = path.join(process.cwd(), 'temp', 'plantuml');

// Ensure directories exist
[STATIC_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Check if PlantUML JAR exists
function ensurePlantUMLJar() {
  if (!fs.existsSync(PLANTUML_JAR)) {
    console.log('❌ PlantUML JAR not found. Run: npm run plantuml:setup');
    process.exit(1);
  }
}

// Generate hash for PlantUML content (matching Hugo's processing)
function getContentHash(content) {
  let processed = content.trim();
  
  return crypto.createHash('sha256').update(processed).digest('hex').substring(0, 8);
}

// Extract PlantUML blocks from markdown content within shortcodes
function extractPlantUMLShortcodes(content) {
  const blocks = [];
  // Match both {{< plantuml >}} and {{< plantuml alt="..." >}} formats
  const regex = /\{\{<\s*plantuml[^>]*>\}\}([\s\S]*?)\{\{<\s*\/plantuml\s*>\}\}/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const plantUMLContent = match[1];
    // Remove markdown code block wrapper if present, but keep other formatting
    const cleanContent = plantUMLContent.replace(/^```plantuml\s*\n/, '').replace(/\n```$/, '');
    
    blocks.push({
      fullMatch: match[0],
      content: cleanContent, // Don't trim here - let getContentHash handle it consistently
      index: match.index
    });
  }
  
  return blocks;
}

// Process a single PlantUML block and generate SVG
function processPlantUMLBlock(block, filePath, blockIndex) {
  const hash = getContentHash(block.content);
  const fileName = path.basename(filePath, '.md');
  const outputName = `${fileName}-${hash}.svg`;
  const outputPath = path.join(STATIC_DIR, outputName);
  
  // Skip if already generated
  if (fs.existsSync(outputPath)) {
    return `/diagrams/${outputName}`;
  }
  
  try {
    const tempFile = path.join(TEMP_DIR, `${hash}.puml`);
    const tempOutputDir = path.join(TEMP_DIR, 'output');
    
    // Ensure temp output directory exists
    if (!fs.existsSync(tempOutputDir)) {
      fs.mkdirSync(tempOutputDir, { recursive: true });
    }
    
    // Write PlantUML content to temp file
    fs.writeFileSync(tempFile, block.content);
    
    // Generate SVG using PlantUML JAR
    execSync(`java -jar "${PLANTUML_JAR}" -tsvg -o "${tempOutputDir}" "${tempFile}"`, 
      { stdio: 'pipe' });
    
    // Find generated SVG (PlantUML may use diagram title as filename)
    const generatedFiles = fs.readdirSync(tempOutputDir).filter(f => f.endsWith('.svg'));
    
    if (generatedFiles.length > 0) {
      const generatedFile = path.join(tempOutputDir, generatedFiles[0]);
      fs.renameSync(generatedFile, outputPath);
      console.log(`✓ Generated: ${outputName}`);
      
      // Clean up temp files
      fs.unlinkSync(tempFile);
      generatedFiles.forEach(f => {
        const tempGenFile = path.join(tempOutputDir, f);
        if (fs.existsSync(tempGenFile)) {
          fs.unlinkSync(tempGenFile);
        }
      });
    }
    
    return `/diagrams/${outputName}`;
    
  } catch (error) {
    console.error(`❌ Failed to process PlantUML in ${filePath}:`, error.message);
    return null;
  }
}

// Process all markdown files and generate SVGs (without modifying source)
function generateSVGsOnly() {
  const markdownFiles = [];
  
  function findMarkdownFiles(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        findMarkdownFiles(itemPath);
      } else if (item.endsWith('.md')) {
        markdownFiles.push(itemPath);
      }
    }
  }
  
  findMarkdownFiles(CONTENT_DIR);
  
  let generatedCount = 0;
  
  for (const filePath of markdownFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const blocks = extractPlantUMLShortcodes(content);
    
    if (blocks.length === 0) continue;
    
    console.log(`📄 Processing ${path.relative(process.cwd(), filePath)}`);
    
    blocks.forEach((block, index) => {
      const svgPath = processPlantUMLBlock(block, filePath, index);
      if (svgPath) {
        generatedCount++;
      }
    });
  }
  
  console.log(`✅ Generated ${generatedCount} SVG diagrams`);
}

// Main execution
function main() {
  console.log('🎨 Generating PlantUML SVGs (source files unchanged)...');
  
  ensurePlantUMLJar();
  generateSVGsOnly();
  
  console.log('✅ SVG generation complete!');
}

if (require.main === module) {
  main();
}

module.exports = { generateSVGsOnly };
