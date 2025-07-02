/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { $getEndOfCodeInLine, $getStartOfCodeInLine } from './CodeHighlighter';
import { $getFirstCodeNodeOfLine, $getLastCodeNodeOfLine } from './CodeHighlightNode';
export { $getEndOfCodeInLine, $getStartOfCodeInLine, PrismTokenizer, registerCodeHighlighting, } from './CodeHighlighter';
export { $createCodeHighlightNode, $getFirstCodeNodeOfLine, $getLastCodeNodeOfLine, $isCodeHighlightNode, CODE_LANGUAGE_FRIENDLY_NAME_MAP, CODE_LANGUAGE_MAP, CodeHighlightNode, DEFAULT_CODE_LANGUAGE, getCodeLanguages, getDefaultCodeLanguage, getLanguageFriendlyName, normalizeCodeLang, } from './CodeHighlightNode';
export type { SerializedCodeNode } from './CodeNode';
export { $createCodeNode, $isCodeNode, CodeNode } from './CodeNode';
/** @deprecated renamed to {@link $getFirstCodeNodeOfLine} by @lexical/eslint-plugin rules-of-lexical */
export declare const getFirstCodeNodeOfLine: typeof $getFirstCodeNodeOfLine;
/** @deprecated renamed to {@link $getLastCodeNodeOfLine} by @lexical/eslint-plugin rules-of-lexical */
export declare const getLastCodeNodeOfLine: typeof $getLastCodeNodeOfLine;
/** @deprecated renamed to {@link $getEndOfCodeInLine} by @lexical/eslint-plugin rules-of-lexical */
export declare const getEndOfCodeInLine: typeof $getEndOfCodeInLine;
/** @deprecated renamed to {@link $getStartOfCodeInLine} by @lexical/eslint-plugin rules-of-lexical */
export declare const getStartOfCodeInLine: typeof $getStartOfCodeInLine;
//# sourceMappingURL=index.d.ts.map