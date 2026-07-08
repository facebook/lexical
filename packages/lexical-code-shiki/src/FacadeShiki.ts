/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ThemedToken, TokensResult} from '@shikijs/types';

import {
  $createCodeHighlightNode,
  $isCodeNode,
  type CodeNode,
} from '@lexical/code-core';
import {
  createHighlighterCoreSync,
  getTokenStyleObject,
  isSpecialLang,
  isSpecialTheme,
  stringifyTokenStyle,
} from '@shikijs/core';
import {createJavaScriptRegexEngine} from '@shikijs/engine-javascript';
import {
  $createLineBreakNode,
  $createTabNode,
  $getNodeByKey,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  tokenizeRawText,
} from 'lexical';
import {bundledLanguagesInfo} from 'shiki/langs';
import {bundledThemesInfo} from 'shiki/themes';

const shiki = createHighlighterCoreSync({
  engine: createJavaScriptRegexEngine(),
  langs: [],
  themes: [],
});

function getDiffedLanguage(language: string) {
  const DIFF_LANGUAGE_REGEX = /^diff-([\w-]+)/i;
  const diffLanguageMatch = DIFF_LANGUAGE_REGEX.exec(language);
  return diffLanguageMatch ? diffLanguageMatch[1] : null;
}

export function isCodeLanguageLoaded(language: string) {
  const diffedLanguage = getDiffedLanguage(language);
  const langId = diffedLanguage || language;

  // handle shiki Hard-coded languages ['ansi', '', 'plaintext', 'txt', 'text', 'plain']
  if (isSpecialLang(langId)) {
    return true;
  }

  // note: getLoadedLanguages() also returns aliases
  return shiki.getLoadedLanguages().includes(langId);
}

/**
 * Loads a syntax highlighting grammar for the given language via Shiki.
 * If the language is already loaded or is not supported, the call is a no-op.
 *
 * When both `editor` and `codeNodeKey` are passed, the corresponding
 * {@link CodeNode} is updated to enable syntax highlighting once the
 * language becomes available
 * @param language language identifier (e.g. `"typescript"`, `"diff-js"`)
 * @param editor - Lexical editor instance to update after the language loads.
 * @param codeNodeKey - Key of the {@link CodeNode} to mark as syntax-highlight-supported.
 * @returns A Promise that resolves when the language is ready,
 * or `undefined` if the `language` was already loaded or is not supported.
 */
export function loadCodeLanguage(
  language: string,
  editor?: LexicalEditor,
  codeNodeKey?: NodeKey,
) {
  const diffedLanguage = getDiffedLanguage(language);
  const langId = diffedLanguage ? diffedLanguage : language;
  if (!isCodeLanguageLoaded(langId)) {
    const languageInfo = bundledLanguagesInfo.find(
      desc =>
        desc.id === langId || (desc.aliases && desc.aliases.includes(langId)),
    );
    if (languageInfo) {
      // in case we arrive here concurrently (not yet loaded language is loaded twice)
      // shiki's synchronous checks make sure to load it only once
      return shiki.loadLanguage(languageInfo.import()).then(() => {
        // here we know that the language is loaded
        // make sure the code is highlighed with the correct language
        if (editor && codeNodeKey) {
          editor.update(() => {
            const codeNode = $getNodeByKey(codeNodeKey);
            if (
              $isCodeNode(codeNode) &&
              codeNode.getLanguage() === language &&
              !codeNode.getIsSyntaxHighlightSupported()
            ) {
              codeNode.setIsSyntaxHighlightSupported(true);
            }
          });
        }
      });
    }
  }
}

export function isCodeThemeLoaded(theme: string) {
  const themeId = theme;

  // handle shiki special theme ['none']
  if (isSpecialTheme(themeId)) {
    return true;
  }

  return shiki.getLoadedThemes().includes(themeId);
}

export function loadCodeTheme(
  theme: string,
  editor?: LexicalEditor,
  codeNodeKey?: NodeKey,
) {
  if (!isCodeThemeLoaded(theme)) {
    const themeInfo = bundledThemesInfo.find(info => info.id === theme);
    if (themeInfo) {
      return shiki.loadTheme(themeInfo.import()).then(() => {
        if (editor && codeNodeKey) {
          editor.update(() => {
            const codeNode = $getNodeByKey(codeNodeKey);
            if ($isCodeNode(codeNode)) {
              codeNode.markDirty();
            }
          });
        }
      });
    }
  }
}

export function getCodeLanguageOptions(): [string, string][] {
  return bundledLanguagesInfo.map(i => [i.id, i.name]);
}
export function getCodeThemeOptions(): [string, string][] {
  return bundledThemesInfo.map(i => [i.id, i.displayName]);
}

export function normalizeCodeLanguage(language: string): string {
  const langId = language;
  const languageInfo = bundledLanguagesInfo.find(
    desc =>
      desc.id === langId || (desc.aliases && desc.aliases.includes(langId)),
  );
  if (languageInfo) {
    return languageInfo.id;
  }
  return language;
}

export function $getHighlightNodes(
  codeNode: CodeNode,
  language: string,
): LexicalNode[] {
  const DIFF_LANGUAGE_REGEX = /^diff-([\w-]+)/i;
  const diffLanguageMatch = DIFF_LANGUAGE_REGEX.exec(language);
  const code: string = codeNode.getTextContent();
  const tokensResult: TokensResult = shiki.codeToTokens(code, {
    lang: diffLanguageMatch ? diffLanguageMatch[1] : language,
    theme: codeNode.getTheme() || 'poimandres',
  });
  const {tokens, bg, fg} = tokensResult;
  let style = '';
  if (bg) {
    style += `background-color: ${bg};`;
  }
  if (fg) {
    style += `color: ${fg};`;
  }
  if (codeNode.getStyle() !== style) {
    codeNode.setStyle(style);
  }
  return mapTokensToLexicalStructure(tokens, !!diffLanguageMatch);
}

function mapTokensToLexicalStructure(
  tokens: ThemedToken[][],
  diff: boolean,
): LexicalNode[] {
  const nodes: LexicalNode[] = [];

  tokens.forEach((line, idx) => {
    if (idx) {
      nodes.push($createLineBreakNode());
    }
    line.forEach((token, tidx) => {
      let text = token.content;

      // implement diff-xxxx languages
      if (diff && tidx === 0 && text.length > 0) {
        const prefixes = ['+', '-', '>', '<', ' '];
        const prefixTypes = [
          'inserted',
          'deleted',
          'inserted',
          'deleted',
          'unchanged',
        ];
        const prefixIndex = prefixes.indexOf(text[0]);
        if (prefixIndex !== -1) {
          nodes.push(
            $createCodeHighlightNode(
              prefixes[prefixIndex],
              prefixTypes[prefixIndex],
            ),
          );
          text = text.slice(1);
        }
      }

      const style = stringifyTokenStyle(
        token.htmlStyle || getTokenStyleObject(token),
      );
      tokenizeRawText(text, {
        linebreak: () => nodes.push($createLineBreakNode()),
        tab: () => nodes.push($createTabNode()),
        text: (part: string) => {
          const node = $createCodeHighlightNode(part);
          node.setStyle(style);
          nodes.push(node);
        },
      });
    });
  });

  return nodes;
}
