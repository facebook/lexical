#!/usr/bin/env node
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const {execSync} = require('child_process');
const {readFileSync, writeFileSync} = require('fs');
const {copy, ensureDir, move, remove} = require('fs-extra');
const {join} = require('path');

const STATIC_FILES = ['icons'];

const preProcess = async (destinationPath, tempPath) => {
  await remove(destinationPath); // Clean up from previously completed builds
  await remove(tempPath); // Clean up from any previously failed builds
};

const postProcess = async (destinationPath, tempPath) => {
  await move(tempPath, destinationPath);
  await remove(tempPath); // Clean up temp directory and files
};

const build = async (tempPath, manifestPath) => {
  const tempSrcPath = join(tempPath, 'src');
  const tempAssetsPath = join(tempPath, 'assets');

  execSync(`npm run build`);
  await ensureDir(tempPath); // Create temp dir for this new build

  const buildSrcPath = join(__dirname, 'build', 'src');
  const buildAssetsPath = join(__dirname, 'build', 'assets');

  await move(buildSrcPath, tempSrcPath); // Copy built files to tempPath
  await move(buildAssetsPath, tempAssetsPath); // Copy built files to tempPath

  const copiedManifestPath = join(tempPath, 'manifest.json');

  await copy(manifestPath, copiedManifestPath);
  await Promise.all(
    STATIC_FILES.map((file) =>
      copy(join(__dirname, file), join(tempPath, file)),
    ),
  );

  const manifest = JSON.parse(readFileSync(copiedManifestPath).toString());

  if (process.env.NODE_ENV === 'development') {
    // When building the local development version of the
    // extension we want to be able to have a stable extension ID
    // for the local build (in order to be able to reliably detect
    // duplicate installations of DevTools).
    // By specifying a key in the built manifest.json file,
    // we can make it so the generated extension ID is stable.
    // For more details see the docs here: https://developer.chrome.com/docs/extensions/mv2/manifest/key/
    manifest.key = 'lexicaldevtoolslocalbuilduniquekey';
  }

  writeFileSync(copiedManifestPath, JSON.stringify(manifest, null, 2));
};

const main = async (buildId) => {
  const root = join(__dirname, buildId);
  const destinationPath = join(root, 'build');

  try {
    const tempPath = join(__dirname, 'build', buildId);
    const manifestPath = join(root, 'manifest.json');
    await preProcess(destinationPath, tempPath);
    await build(tempPath, manifestPath);
    await postProcess(destinationPath, tempPath);

    return destinationPath;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = main;
