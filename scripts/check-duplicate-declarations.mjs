import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { execSync } from 'node:child_process';

const repoRoot = process.cwd();

function getSourceFiles() {
  const rgCmd = [
    "rg --files",
    "-g '*.ts'",
    "-g '*.tsx'",
    "-g '!node_modules/**'",
    "-g '!web-build/**'",
    "-g '!archive/**'",
    "-g '!.expo/**'",
  ].join(' ');

  const output = execSync(rgCmd, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim();

  if (!output) return [];
  return output.split('\n').filter(Boolean);
}

function isBlockScopeBoundary(node) {
  return (
    ts.isSourceFile(node) ||
    ts.isBlock(node) ||
    ts.isModuleBlock(node) ||
    ts.isCaseBlock(node) ||
    ts.isFunctionLike(node) ||
    ts.isCatchClause(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node)
  );
}

function addDeclaration(scope, sourceFile, nameNode, kind, duplicates) {
  if (!nameNode || !ts.isIdentifier(nameNode)) return;
  const name = nameNode.text;
  const existing = scope.get(name);
  if (existing) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(nameNode.getStart());
    duplicates.push({
      name,
      file: sourceFile.fileName,
      kind,
      line: line + 1,
      column: character + 1,
      previousKind: existing.kind,
      previousLine: existing.line,
      previousColumn: existing.column,
    });
    return;
  }
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(nameNode.getStart());
  scope.set(name, { kind, line: line + 1, column: character + 1 });
}

function checkFile(filePath) {
  const fullPath = path.join(repoRoot, filePath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fullPath, code, ts.ScriptTarget.Latest, true, scriptKind);

  const duplicates = [];
  const scopeStack = [new Map()];

  function currentScope() {
    return scopeStack[scopeStack.length - 1];
  }

  function withScope(node, fn) {
    if (isBlockScopeBoundary(node) && node !== sourceFile) {
      scopeStack.push(new Map());
      fn();
      scopeStack.pop();
      return;
    }
    fn();
  }

  function visit(node) {
    // Imports are block-scoped at the source file level.
    if (ts.isImportClause(node) && node.name) {
      addDeclaration(currentScope(), sourceFile, node.name, 'import', duplicates);
    }
    if (ts.isNamespaceImport(node)) {
      addDeclaration(currentScope(), sourceFile, node.name, 'import', duplicates);
    }
    if (ts.isImportSpecifier(node)) {
      addDeclaration(currentScope(), sourceFile, node.name, 'import', duplicates);
    }

    // Block-scoped variable declarations (let/const)
    if (ts.isVariableDeclarationList(node)) {
      const isBlockScoped = (node.flags & ts.NodeFlags.BlockScoped) !== 0;
      if (isBlockScoped) {
        for (const decl of node.declarations) {
          if (ts.isIdentifier(decl.name)) {
            addDeclaration(currentScope(), sourceFile, decl.name, 'variable', duplicates);
          }
        }
      }
    }

    // Function and class declarations are block-scoped in ES modules.
    if (ts.isFunctionDeclaration(node) && node.name) {
      addDeclaration(currentScope(), sourceFile, node.name, 'function', duplicates);
    }
    if (ts.isClassDeclaration(node) && node.name) {
      addDeclaration(currentScope(), sourceFile, node.name, 'class', duplicates);
    }

    if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      addDeclaration(currentScope(), sourceFile, node.name, 'parameter', duplicates);
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isCatchClause(node.parent) &&
      ts.isIdentifier(node.name)
    ) {
      addDeclaration(currentScope(), sourceFile, node.name, 'catch', duplicates);
    }

    withScope(node, () => ts.forEachChild(node, visit));
  }

  visit(sourceFile);
  return duplicates;
}

function main() {
  const files = getSourceFiles();
  const duplicates = files.flatMap((file) => checkFile(file));

  if (duplicates.length === 0) {
    console.log('No duplicate block-scoped declarations found.');
    return;
  }

  console.error('Duplicate block-scoped declarations detected:');
  for (const dup of duplicates) {
    const relativeFile = path.relative(repoRoot, dup.file);
    console.error(
      `- ${dup.name} in ${relativeFile}:${dup.line}:${dup.column} (previous ${dup.previousKind} at ${dup.previousLine}:${dup.previousColumn})`
    );
  }
  process.exitCode = 1;
}

main();
