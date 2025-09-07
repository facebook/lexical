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
const ts = require('typescript');
const tsMorph = require('ts-morph');
const hermesParser = require('hermes-parser');
const {packagesManager} = require('./shared/packagesManager');

const pretty = process.env.CI !== 'true';

/** @type {ts.FormatDiagnosticsHost} */
const diagnosticsHost = {
  getCanonicalFileName: (fn) => fn,
  getCurrentDirectory: () => './',
  getNewLine: () => '\n',
};

/**
 * Validate that the manually maintained .flow types have the same exports as
 * the corresponding .d.ts types produced by the build.
 *
 * `process.exit(1)` on failure.
 */
function lintFlowTypes() {
  let didError = false;
  const project = new tsMorph.Project({tsConfigFilePath: './tsconfig.json'});
  for (const pkg of packagesManager.getPublicPackages()) {
    didError = lintFlowTypesForPackage(project, pkg) || didError;
  }
  if (didError) {
    process.exit(1);
  }
}

function collectFlowExports(flowAst) {
  const exportNames = new Map();
  const exportId = (node) => {
    const identifier =
      node.type === 'Identifier'
        ? node
        : 'id' in node && node.id.type === 'Identifier'
          ? node.id
          : null;
    if (identifier) {
      exportNames.set(identifier.name, identifier);
      return true;
    }
    return false;
  };
  hermesParser.SimpleTraverser.traverse(flowAst, {
    enter: (node, parent) => {
      if (
        parent &&
        (parent.type === 'DeclareExportDeclaration' ||
          parent.type === 'ExportNamedDeclaration')
      ) {
        if (exportId(node)) {
          // ok
        } else if (node.type === 'VariableDeclaration') {
          for (const declaration of node.declarations) {
            if (!exportId(declaration)) {
              // debugger;
            }
          }
        } else if (node.type === 'ExportSpecifier') {
          if (!exportId(node.exported)) {
            // debugger;
          }
        } else {
          // debugger;
        }
      }
    },
    leave: () => {},
  });
  return exportNames;
}

function compareFlowDts(
  /** @type {PackageMetadata} */ pkg,
  /** @type {string} */ flowFilePath,
  /** @type {tsMorph.SourceFile} */ entrypoint,
  /** @type {ts.Diagnostic[]} */ diagnostics,
  /** @type {import('hermes-estree').Identifier[]} */ flowDiagnostics,
) {
  const flowAst = hermesParser.parse(fs.readFileSync(flowFilePath, 'utf-8'), {
    enableExperimentalComponentSyntax: true,
    flow: 'all',
    sourceFilename: flowFilePath,
    sourceType: 'module',
  });
  const flowMap = collectFlowExports(flowAst);
  const symbols = entrypoint.getExportSymbols();
  const tsMap = new Map(symbols.map((sym) => [sym.getName(), sym]));
  for (const [name, symbol] of tsMap) {
    if (flowMap.has(name)) {
      continue;
    }
    for (const decl of symbol.getDeclarations()) {
      const start = decl.getStart();
      const end = decl.getEnd();
      diagnostics.push({
        category: ts.DiagnosticCategory.Warning,
        code: Infinity,
        file: entrypoint.compilerNode,
        length: end - start,
        messageText: `Missing flow export for TypeScript export '${name}'`,
        start,
      });
      break;
    }
    // debugger;
  }
  for (const [name, flowToken] of flowMap) {
    if (tsMap.has(name)) {
      continue;
    }
    flowDiagnostics.push(flowToken);
  }
}

function lintFlowTypesForPackage(
  /** @type {tsMorph.Project} */ project,
  /** @type {PackageMetadata} */ pkg,
) {
  const def = pkg.getPackageBuildDefinition();
  if (def.packageName === 'lexical-eslint-plugin') {
    return false;
  }
  /** @type {ts.Diagnostic[]} */
  const diagnostics = [];
  /** @type {import('hermes-estree').Identifier[]} */
  const flowDiagnostics = [];
  for (const {outputFileName, sourceFileName} of def.modules) {
    const entrypoint = project.addSourceFileAtPath(
      pkg.resolve('src', sourceFileName),
    );
    const flowFilePath = pkg.resolve('flow', `${outputFileName}.js.flow`);
    if (!fs.existsSync(flowFilePath)) {
      console.error(`Missing ${flowFilePath}`);
      process.exit(1);
    }
    compareFlowDts(pkg, flowFilePath, entrypoint, diagnostics, flowDiagnostics);
  }
  if (diagnostics.length > 0 || flowDiagnostics.length > 0) {
    const msg = (
      pretty ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics
    )(diagnostics, diagnosticsHost);
    if (msg) {
      console.error(msg.replace(/ TSInfinity:/g, ':'));
    }
    const flowMsg = flowDiagnostics
      .map(
        (ident) =>
          `${ident.loc.source}:${ident.loc.start.line}:${ident.loc.start.column} - warning: Flow export '${ident.name}' does not have a TypeScript declaration`,
      )
      .join('\n');
    if (flowMsg) {
      console.error(flowMsg);
    }
    return true;
  }
  return false;
}

lintFlowTypes();
