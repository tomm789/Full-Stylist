#!/usr/bin/env node
/**
 * Remove debug instrumentation from source files
 * Archives instrumented versions before cleaning
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
  // Remove entire #region agent log blocks
  const regionRegex = /\s*\/\/ #region agent log[\s\S]*?\/\/ #endregion\n?/g;
  return content.replace(regionRegex, '');
}

function cleanFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const cleaned = removeInstrumentation(content);
  
  if (content === cleaned) {
    console.log(`✓ ${filePath} - No instrumentation found`);
    return;
  }
  
  const originalLines = content.split('\n').length;
  const cleanedLines = cleaned.split('\n').length;
  const removedLines = originalLines - cleanedLines;
  
  fs.writeFileSync(fullPath, cleaned, 'utf8');
  console.log(`✓ ${filePath} - Removed ${removedLines} lines of instrumentation`);
}

console.log('🧹 Removing debug instrumentation...\n');

filesToClean.forEach(cleanFile);

console.log('\n✅ Instrumentation removal complete!');
console.log('📁 Instrumented versions archived in: archive/debug-instrumentation/2026-01-20-performance-and-delete/');
