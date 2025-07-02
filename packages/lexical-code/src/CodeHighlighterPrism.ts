/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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

declare global {
  interface Window {
    Prism: typeof import('prismjs');
  }
}

export const Prism: typeof import('prismjs') =
  (globalThis as {Prism?: typeof import('prismjs')}).Prism || window.Prism;

// The following code is extracted/adapted from prismjs v2
// It will probably be possible to use it directly from prism v2
// in the future when prismjs v2 is published and Lexical upgrades
// the prismsjs dependency

type TokenContent = string | Token | (string | Token)[];

export interface Token {
  type: string;
  alias: string | string[];
  content: TokenContent;
}

function getTextContent(token: TokenContent): string {
  if (typeof token === 'string') {
    return token;
  } else if (Array.isArray(token)) {
    return token.map(getTextContent).join('');
  } else {
    return getTextContent(token.content);
  }
}

export function tokenizeDiffHighlight(
  tokens: (string | Token)[],
  language: string,
) {
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
      const result: TokenContent = [];
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
