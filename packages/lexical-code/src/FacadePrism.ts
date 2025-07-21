/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CodeNode} from './CodeNode';
import type {LexicalEditor, LexicalNode, NodeKey} from 'lexical';
import type {Token, TokenStream} from 'prismjs';

// eslint-disable-next-line simple-import-sort/imports
import 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-objectivec';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-cpp';

import {$createLineBreakNode, $createTabNode} from 'lexical';

import {$createCodeHighlightNode} from './CodeHighlightNode';

declare global {
  interface Window {
    Prism: typeof import('prismjs');
  }
}

export const Prism: typeof import('prismjs') =
  (globalThis as {Prism?: typeof import('prismjs')}).Prism || window.Prism;

export const CODE_LANGUAGE_FRIENDLY_NAME_MAP: Record<string, string> = {
  c: 'C',
  clike: 'C-like',
  cpp: 'C++',
  css: 'CSS',
  html: 'HTML',
  java: 'Java',
  js: 'JavaScript',
  markdown: 'Markdown',
  objc: 'Objective-C',
  plain: 'Plain Text',
  powershell: 'PowerShell',
  py: 'Python',
  rust: 'Rust',
  sql: 'SQL',
  swift: 'Swift',
  typescript: 'TypeScript',
  xml: 'XML',
};

export const CODE_LANGUAGE_MAP: Record<string, string> = {
  cpp: 'cpp',
  java: 'java',
  javascript: 'js',
  md: 'markdown',
  plaintext: 'plain',
  python: 'py',
  text: 'plain',
  ts: 'typescript',
};

export function normalizeCodeLang(lang: string) {
  return CODE_LANGUAGE_MAP[lang] || lang;
}

export function getLanguageFriendlyName(lang: string) {
  const _lang = normalizeCodeLang(lang);
  return CODE_LANGUAGE_FRIENDLY_NAME_MAP[_lang] || _lang;
}

export const getCodeLanguages = (): Array<string> =>
  Object.keys(Prism.languages)
    .filter(
      // Prism has several language helpers mixed into languages object
      // so filtering them out here to get langs list
      (language) => typeof Prism.languages[language] !== 'function',
    )
    .sort();

export function getCodeLanguageOptions(): [string, string][] {
  const options: [string, string][] = [];

  for (const [lang, friendlyName] of Object.entries(
    CODE_LANGUAGE_FRIENDLY_NAME_MAP,
  )) {
    options.push([lang, friendlyName]);
  }

  return options;
}

// Prism has no theme support
export function getCodeThemeOptions(): [string, string][] {
  const options: [string, string][] = [];
  return options;
}

function getDiffedLanguage(language: string) {
  const DIFF_LANGUAGE_REGEX = /^diff-([\w-]+)/i;
  const diffLanguageMatch = DIFF_LANGUAGE_REGEX.exec(language);
  return diffLanguageMatch ? diffLanguageMatch[1] : null;
}

export function isCodeLanguageLoaded(language: string) {
  const diffedLanguage = getDiffedLanguage(language);
  const langId = diffedLanguage ? diffedLanguage : language;
  try {
    // eslint-disable-next-line no-prototype-builtins
    return langId ? Prism.languages.hasOwnProperty(langId) : false;
  } catch {
    return false;
  }
}

export async function loadCodeLanguage(
  language: string,
  editor?: LexicalEditor,
  codeNodeKey?: NodeKey,
) {
  // NOT IMPLEMENTED
}

function getTextContent(token: TokenStream): string {
  if (typeof token === 'string') {
    return token;
  } else if (Array.isArray(token)) {
    return token.map(getTextContent).join('');
  } else {
    return getTextContent(token.content);
  }
}

// The following code is extracted/adapted from prismjs v2
// It will probably be possible to use it directly from prism v2
// in the future when prismjs v2 is published and Lexical upgrades
// the prismsjs dependency
export function tokenizeDiffHighlight(
  tokens: (string | Token)[],
  language: string,
): Array<string | Token> {
  const diffLanguage = language;
  const diffGrammar = Prism.languages[diffLanguage];
  const env = {tokens};
  const PREFIXES: Record<string, string> = (
    Prism.languages.diff as Record<string, Record<string, string>>
  ).PREFIXES;
  for (const token of env.tokens) {
    if (
      typeof token === 'string' ||
      !(token.type in PREFIXES) ||
      !Array.isArray(token.content)
    ) {
      continue;
    }

    const type = token.type as keyof typeof PREFIXES;
    let insertedPrefixes = 0;
    const getPrefixToken = () => {
      insertedPrefixes++;
      return new Prism.Token(
        'prefix',
        PREFIXES[type],
        type.replace(/^(\w+).*/, '$1'),
      );
    };

    const withoutPrefixes = token.content.filter(
      (t) => typeof t === 'string' || t.type !== 'prefix',
    );
    const prefixCount = token.content.length - withoutPrefixes.length;
    const diffTokens = Prism.tokenize(
      getTextContent(withoutPrefixes),
      diffGrammar,
    );

    // re-insert prefixes
    // always add a prefix at the start
    diffTokens.unshift(getPrefixToken());

    const LINE_BREAK = /\r\n|\n/g;
    const insertAfterLineBreakString = (text: string) => {
      const result: TokenStream = [];
      LINE_BREAK.lastIndex = 0;
      let last = 0;
      let m;
      while (insertedPrefixes < prefixCount && (m = LINE_BREAK.exec(text))) {
        const end = m.index + m[0].length;
        result.push(text.slice(last, end));
        last = end;
        result.push(getPrefixToken());
      }

      if (result.length === 0) {
        return undefined;
      }

      if (last < text.length) {
        result.push(text.slice(last));
      }
      return result;
    };
    const insertAfterLineBreak = (toks: (string | Token)[]) => {
      for (let i = 0; i < toks.length && insertedPrefixes < prefixCount; i++) {
        const tok = toks[i];

        if (typeof tok === 'string') {
          const inserted = insertAfterLineBreakString(tok);
          if (inserted) {
            toks.splice(i, 1, ...inserted);
            i += inserted.length - 1;
          }
        } else if (typeof tok.content === 'string') {
          const inserted = insertAfterLineBreakString(tok.content);
          if (inserted) {
            tok.content = inserted;
          }
        } else if (Array.isArray(tok.content)) {
          insertAfterLineBreak(tok.content);
        } else {
          insertAfterLineBreak([tok.content]);
        }
      }
    };
    insertAfterLineBreak(diffTokens);

    if (insertedPrefixes < prefixCount) {
      // we are missing the last prefix
      diffTokens.push(getPrefixToken());
    }

    token.content = diffTokens;
  }
  return env.tokens;
}

export function $getHighlightNodes(
  codeNode: CodeNode,
  language: string,
): LexicalNode[] {
  const DIFF_LANGUAGE_REGEX = /^diff-([\w-]+)/i;
  const diffLanguageMatch = DIFF_LANGUAGE_REGEX.exec(language);

  const code = codeNode.getTextContent();

  let tokens: Array<string | Token> = Prism.tokenize(
    code,
    Prism.languages[diffLanguageMatch ? 'diff' : language],
  );
  if (diffLanguageMatch) {
    tokens = tokenizeDiffHighlight(tokens, diffLanguageMatch[1]);
  }
  return $mapTokensToLexicalStructure(tokens);
}

function $mapTokensToLexicalStructure(
  tokens: Array<string | Token>,
  type?: string,
): LexicalNode[] {
  const nodes: LexicalNode[] = [];

  for (const token of tokens) {
    if (typeof token === 'string') {
      const partials = token.split(/(\n|\t)/);
      const partialsLength = partials.length;
      for (let i = 0; i < partialsLength; i++) {
        const part = partials[i];
        if (part === '\n' || part === '\r\n') {
          nodes.push($createLineBreakNode());
        } else if (part === '\t') {
          nodes.push($createTabNode());
        } else if (part.length > 0) {
          nodes.push($createCodeHighlightNode(part, type));
        }
      }
    } else {
      const {content, alias} = token;
      if (typeof content === 'string') {
        nodes.push(
          ...$mapTokensToLexicalStructure(
            [content],
            token.type === 'prefix' && typeof alias === 'string'
              ? alias
              : token.type,
          ),
        );
      } else if (Array.isArray(content)) {
        nodes.push(
          ...$mapTokensToLexicalStructure(
            content,
            token.type === 'unchanged' ? undefined : token.type,
          ),
        );
      }
    }
  }

  return nodes;
}
