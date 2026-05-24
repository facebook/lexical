/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {createEditor} from 'lexical';

// Exported so the bundler can't tree-shake the createEditor call away;
// verify-bundle.mjs greps the build output to confirm source-mode
// produced the expected artifacts.
export function makeEditor() {
  return createEditor({namespace: 'lexical-link-source-mode'});
}
