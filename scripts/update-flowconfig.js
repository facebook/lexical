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
const path = require('node:path');
const {packagesManager} = require('./shared/packagesManager');
const npmToWwwName = require('./www/npmToWwwName');

const headerTemplate = fs.readFileSync(
  path.resolve(__dirname, 'www', 'headerTemplate.js'),
  'utf8',
);

const BLOCK_REGEX =
  /^([\s\S]+?\n;; \[generated-start update-flowconfig\]\n)([\s\S]*?)(;; \[generated-end update-flowconfig\][\s\S]+)$/;

function flowTemplate(wwwName) {
  return (
    headerTemplate.replace(/^( *\/)$/, '* @flow strict\n$1') +
    `
/**
 * ${wwwName}
 */` +
    '\n'
  );
}

/**
 * @param {string} configContents
 * @param {string} generatedCode
 */
function replaceBlock(configContents, generatedCode) {
  const m = configContents.match(BLOCK_REGEX);
  if (!m) {
    throw new Error(
      `update-flowconfig block not found in .flowconfig, expecting ';; [generated-start update-flowconfig]' followed by ';; [generated-end update-flowconfig]`,
    );
  }
  return `${m[1]}${generatedCode}${m[3]}`;
}

function updateFlowconfig(flowconfigPath = './.flowconfig') {
  const prevConfig = fs.readFileSync(flowconfigPath, 'utf8');
  const configDir = path.resolve(path.dirname(flowconfigPath));
  /** @type {Array<string>} */
  const generatedBlock = [];
  const emit = (moduleName, flowFilename) =>
    generatedBlock.push(
      `module.name_mapper='^${moduleName}$' -> '${flowFilename}'\n`,
    );
  for (const pkg of packagesManager.getPackages()) {
    const resolveRelative = (...subPaths) =>
      '<PROJECT_ROOT>/' +
      path.relative(configDir, pkg.resolve(...subPaths)).replace(/^(?!\.)/, '');
    if (pkg.isPrivate()) {
      if (pkg.getDirectoryName() !== 'shared') {
        continue;
      }
      if (process.env.TODO_DOES_WWW_NEED_SHARED_FILES === '1') {
        // Do these even work? These .js files aren't on disk and `npm run flow`
        // passes without them. Code is left in for demonstration purposes if
        // this is needed for www.
        for (const {name, sourceFileName} of pkg.getPrivateModuleEntries()) {
          emit(
            name,
            resolveRelative('src', sourceFileName.replace(/\.tsx?$/, '.js')),
          );
        }
      }
    } else {
      for (const name of pkg.getExportedNpmModuleNames()) {
        const wwwName = npmToWwwName(name);
        const flowFile = `${wwwName}.js.flow`;
        const resolvedFlowFile = resolveRelative('flow', flowFile);
        emit(name, resolveRelative('flow', flowFile));
        const flowFilePath = pkg.resolve('flow', flowFile);
        if (!fs.existsSync(flowFilePath)) {
          console.log(
            `Creating boilerplate ${resolvedFlowFile.replace(/^[^/]+\//, '')}`,
          );
          fs.writeFileSync(flowFilePath, flowTemplate(wwwName));
        }
      }
    }
  }
  const nextConfig = replaceBlock(prevConfig, generatedBlock.join(''));
  if (prevConfig !== nextConfig) {
    fs.writeFileSync(flowconfigPath, nextConfig);
  }
}

updateFlowconfig();
