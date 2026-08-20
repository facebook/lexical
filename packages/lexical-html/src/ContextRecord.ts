/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// The context machinery lives in core, where the JSON serialization context is
// built on it as well. The DOM render and import pipelines scope their records
// to the active editor, which is the default; a pipeline with no editor of its
// own passes a placeholder scope instead.
export {
  $withContext,
  $withFullContext,
  contextFromPairs,
  contextUpdater,
  contextValue,
  createContextState,
  getContextRecord,
  getContextValue,
  getOwnContextValue,
  popOwnContextValue,
} from 'lexical';
