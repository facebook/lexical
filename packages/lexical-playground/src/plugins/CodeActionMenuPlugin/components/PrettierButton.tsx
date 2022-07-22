/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isCodeNode} from '@lexical/code';
import {$getNearestNodeFromDOMNode, LexicalEditor} from 'lexical';
import {Options} from 'prettier';
import * as babelParser from 'prettier/parser-babel';
import * as htmlParser from 'prettier/parser-html';
import * as markdownParser from 'prettier/parser-markdown';
import * as cssParser from 'prettier/parser-postcss';
import {format} from 'prettier/standalone';
import * as React from 'react';

interface Props {
  lang: string;
  editor: LexicalEditor;
  getCodeDOMNode: () => HTMLElement | null;
}

const PRETTIER_OPTIONS_BY_LANG: Record<string, Options> = {
  css: {
    parser: 'css',
    plugins: [cssParser],
  },
  html: {
    parser: 'html',
    plugins: [htmlParser],
  },
  js: {
    parser: 'babel',
    plugins: [babelParser],
  },
  markdown: {
    parser: 'markdown',
    plugins: [markdownParser],
  },
};

const LANG_CAN_BE_PRETTIER = Object.keys(PRETTIER_OPTIONS_BY_LANG);

export function canBePrettier(lang: string): boolean {
  return LANG_CAN_BE_PRETTIER.includes(lang);
}

function getPrettierOptions(lang: string): Options {
  const options = PRETTIER_OPTIONS_BY_LANG[lang];
  if (!options) {
    throw new Error(
      `CodeActionMenuPlugin: Prettier does not support this language: ${lang}`,
    );
  }

  return options;
}

export function PrettierButton({lang, editor, getCodeDOMNode}: Props) {
  async function handleClick(): Promise<void> {
    const codeDOMNode = getCodeDOMNode();

    if (!codeDOMNode) {
      return;
    }

    editor.update(() => {
      const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);

      if ($isCodeNode(codeNode)) {
        const content = codeNode.getTextContent();
        const options = getPrettierOptions(lang);

        let parsed = '';

        try {
          parsed = format(content, options);
        } catch (error: unknown) {
          if (error instanceof Error) {
            // TODO: If there is a syntax error, the user should be given some indication of the error.
            console.error(error.message);
          } else {
            console.error('Unexpected error: ', error);
          }
        }

        const selection = codeNode.select(0);
        selection.insertText(parsed);
      }
    });
  }

  return canBePrettier(lang) ? (
    <button className="menu-item" onClick={handleClick} aria-label="prettier">
      <i className="format prettier" />
    </button>
  ) : null;
}
