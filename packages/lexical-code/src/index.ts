/** @module @lexical/code */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

export {
  getEndOfCodeInLine,
  getStartOfCodeInLine,
  PrismTokenizer,
  registerCodeHighlighting,
} from './CodeHighlighter';
export {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
  CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  CODE_LANGUAGE_MAP,
  CodeHighlightNode,
  DEFAULT_CODE_LANGUAGE,
  getCodeLanguages,
  getDefaultCodeLanguage,
  getFirstCodeNodeOfLine,
  getLanguageFriendlyName,
  getLastCodeNodeOfLine,
  normalizeCodeLang,
} from './CodeHighlightNode';
export type {SerializedCodeNode} from './CodeNode';
export {$createCodeNode, $isCodeNode, CodeNode} from './CodeNode';
export type {SerializedCodeTabNode} from './CodeTabNode';
export {$createCodeTabNode, $isCodeTabNode, CodeTabNode} from './CodeTabNode';
