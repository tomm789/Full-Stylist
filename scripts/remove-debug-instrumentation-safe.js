#!/usr/bin/env node
/**
 * Safely remove debug instrumentation from source files
 * Preserves code structure and line breaks
 */

const fs = require('fs');
const path = require('path');

const filesToClean = [
  'lib/wardrobe.ts',
  'app/(tabs)/wardrobe.tsx',
  'app/(tabs)/calendar.tsx',
  'app/index.tsx',
];

const projectRoot = path.join(__dirname, '..');

function removeInstrumentation(content) {
  const lines = content.split('\n');
  const output = [];
  let inRegion = false;
  let skippedLines = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Start of instrumentation block
    if (trimmed === '// #region agent log') {
      inRegion = true;
      skippedLines++;
      continue;
    }
    
    // End of instrumentation block
    if (trimmed === '// #endregion') {
      inRegion = false;
      skippedLines++;
      continue;
    }
    
    // Skip lines inside the region
    if (inRegion) {
      skippedLines++;
      continue;
    }
    
    // Keep all other lines
    output.push(line);
  }
  
  return { 
    content: output.join('\n'),
    removedLines: skippedLines
  };
}

function cleanFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const original = fs.readFileSync(fullPath, 'utf8');
  const { content: cleaned, removedLines } = removeInstrumentation(original);
  
  if (original === cleaned) {
    console.log(`✓ ${filePath} - No instrumentation found`);
    return;
  }
  
  fs.writeFileSync(fullPath, cleaned, 'utf8');
  console.log(`✓ ${filePath} - Removed ${removedLines} lines of instrumentation`);
}

console.log('🧹 Safely removing debug instrumentation...\n');

filesToClean.forEach(cleanFile);

console.log('\n✅ Instrumentation removal complete!');
console.log('📁 Original versions preserved in: archive/debug-instrumentation/2026-01-20-performance-and-delete/');
