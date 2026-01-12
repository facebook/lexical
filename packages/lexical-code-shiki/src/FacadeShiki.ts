/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CodeNode} from '@lexical/code';
import type {ThemedToken, TokensResult} from '@shikijs/types';
import type {LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import {$createCodeHighlightNode, $isCodeNode} from '@lexical/code';
import {
  createHighlighterCoreSync,
  getTokenStyleObject,
  isSpecialLang,
  isSpecialTheme,
  stringifyTokenStyle,
} from '@shikijs/core';
import {createJavaScriptRegexEngine} from '@shikijs/engine-javascript';
import {$createLineBreakNode, $createTabNode, $getNodeByKey} from 'lexical';
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

export function loadCodeLanguage(
  language: string,
  editor?: LexicalEditor,
  codeNodeKey?: NodeKey,
) {
  const diffedLanguage = getDiffedLanguage(language);
  const langId = diffedLanguage ? diffedLanguage : language;
  if (!isCodeLanguageLoaded(langId)) {
    const languageInfo = bundledLanguagesInfo.find(
      (desc) =>
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
    const themeInfo = bundledThemesInfo.find((info) => info.id === theme);
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
  return bundledLanguagesInfo.map((i) => [i.id, i.name]);
}
export function getCodeThemeOptions(): [string, string][] {
  return bundledThemesInfo.map((i) => [i.id, i.displayName]);
}

export function normalizeCodeLanguage(language: string): string {
  const langId = language;
  const languageInfo = bundledLanguagesInfo.find(
    (desc) =>
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

      const parts = text.split('\t');
      parts.forEach((part: string, pidx: number) => {
        if (pidx) {
          nodes.push($createTabNode());
        }
        if (part !== '') {
          const node = $createCodeHighlightNode(part);
          const style = stringifyTokenStyle(
            token.htmlStyle || getTokenStyleObject(token),
          );
          node.setStyle(style);
          nodes.push(node);
        }
      });
    });
  });

  return nodes;
}
