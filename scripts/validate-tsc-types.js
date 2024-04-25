/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
'use strict';

const fs = require('fs-extra');
const glob = require('glob');
const ts = require('typescript');

const pretty = process.env.CI !== 'true';

/** @type {ts.FormatDiagnosticsHost} */
const diagnosticsHost = {
  getCanonicalFileName: (fn) => fn,
  getCurrentDirectory: () => './',
  getNewLine: () => '\n',
};

/**
 * Validate that the published .d.ts types do not have dependencies
 * on any private module (currently shared/*).
 *
 * `process.exit(1)` on failure.
 */
function validateTscTypes() {
  const dtsFilesPattern = './.ts-temp/packages/{lexical,lexical-*}/**/*.d.ts';
  const dtsFiles = glob.sync(dtsFilesPattern);
  if (dtsFiles.length === 0) {
    console.error(
      `Missing ${dtsFilesPattern}, \`npm run build-prod\` or \`npm run build-release\` first`,
    );
    process.exit(1);
  }
  /** @type {ts.Diagnostic[]} */
  const diagnostics = [];
  for (const fn of dtsFiles) {
    // console.log(fn);
    const ast = ts.createSourceFile(
      fn,
      fs.readFileSync(fn, 'utf-8'),
      ts.ScriptTarget.Latest,
    );
    const checkSpecifier = (/** @type {ts.Node | undefined} */ node) => {
      if (!node || node.kind !== ts.SyntaxKind.StringLiteral) {
        return;
      }
      const specifier = /** @type {import('typescript').StringLiteral} */ (
        node
      );
      if (/^(shared|scripts)(\/|$)/.test(specifier.text)) {
        const start = specifier.getStart(ast);
        diagnostics.push({
          category: ts.DiagnosticCategory.Error,
          code: Infinity,
          file: ast,
          length: specifier.getEnd() - start,
          messageText: `Published .d.ts files must not import private module '${specifier.text}'.`,
          start,
        });
      }
    };
    ast.forEachChild((node) => {
      if (node.kind === ts.SyntaxKind.ExportDeclaration) {
        const exportNode =
          /** @type {import('typescript').ExportDeclaration} */ (node);
        checkSpecifier(exportNode.moduleSpecifier);
      } else if (node.kind === ts.SyntaxKind.ImportDeclaration) {
        const importNode =
          /** @type {import('typescript').ImportDeclaration} */ (node);
        checkSpecifier(importNode.moduleSpecifier);
      }
    });
  }
  if (diagnostics.length > 0) {
    const msg = (
      pretty ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics
    )(diagnostics, diagnosticsHost);
    console.error(msg.replace(/ TSInfinity:/g, ':'));
    process.exit(1);
  }
}

validateTscTypes();
