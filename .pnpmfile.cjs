/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

// onnxruntime-node and sharp ship large prebuilt native binaries that are
// only reachable through the Node entrypoint of @huggingface/transformers,
// which we never load - the website build aliases @huggingface/transformers
// to transformers.web.js (see packages/lexical-website/docusaurus.config.ts).
// Strip them from the manifest so pnpm does not download them.
function readPackage(pkg) {
  if (pkg.name === '@huggingface/transformers' && pkg.dependencies) {
    delete pkg.dependencies['onnxruntime-node'];
    delete pkg.dependencies.sharp;
  }
  return pkg;
}

module.exports = {hooks: {readPackage}};
