/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getEndOfCodeInLine,
  $getFirstCodeNodeOfLine,
  $getLastCodeNodeOfLine,
  $getStartOfCodeInLine,
} from './FlatStructureUtils';

export {CodeExtension} from './CodeExtension';
export {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
  CodeHighlightNode,
} from './CodeHighlightNode';
export type {SerializedCodeNode} from './CodeNode';
export {
  $createCodeNode,
  $isCodeNode,
  CodeNode,
  DEFAULT_CODE_LANGUAGE,
  getDefaultCodeLanguage,
} from './CodeNode';
export {
  $getCodeLineDirection,
  $getEndOfCodeInLine,
  $getFirstCodeNodeOfLine,
  $getLastCodeNodeOfLine,
  $getStartOfCodeInLine,
} from './FlatStructureUtils';

/** @deprecated renamed to {@link $getFirstCodeNodeOfLine} by @lexical/eslint-plugin rules-of-lexical */
export const getFirstCodeNodeOfLine = $getFirstCodeNodeOfLine;
/** @deprecated renamed to {@link $getLastCodeNodeOfLine} by @lexical/eslint-plugin rules-of-lexical */
export const getLastCodeNodeOfLine = $getLastCodeNodeOfLine;
/** @deprecated renamed to {@link $getEndOfCodeInLine} by @lexical/eslint-plugin rules-of-lexical */
export const getEndOfCodeInLine = $getEndOfCodeInLine;
/** @deprecated renamed to {@link $getStartOfCodeInLine} by @lexical/eslint-plugin rules-of-lexical */
export const getStartOfCodeInLine = $getStartOfCodeInLine;
