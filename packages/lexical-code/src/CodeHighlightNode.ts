/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// eslint-disable-next-line simple-import-sort/imports
import {
  $applyNodeReplacement,
  $isLineBreakNode,
  type EditorConfig,
  type EditorThemeClasses,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  TextNode,
} from 'lexical';

import * as Prism from 'prismjs';

import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-objectivec';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-swift';

import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/utils';

export const DEFAULT_CODE_LANGUAGE = 'javascript';

type SerializedCodeHighlightNode = Spread<
  {
    highlightType: string | null | undefined;
    type: 'code-highlight';
    version: 1;
  },
  SerializedTextNode
>;

export const CODE_LANGUAGE_FRIENDLY_NAME_MAP: Record<string, string> = {
  c: 'C',
  clike: 'C-like',
  css: 'CSS',
  html: 'HTML',
  js: 'JavaScript',
  markdown: 'Markdown',
  objc: 'Objective-C',
  plain: 'Plain Text',
  py: 'Python',
  rust: 'Rust',
  sql: 'SQL',
  swift: 'Swift',
  xml: 'XML',
};

export const CODE_LANGUAGE_MAP: Record<string, string> = {
  javascript: 'js',
  md: 'markdown',
  plaintext: 'plain',
  python: 'py',
  text: 'plain',
};

export function normalizeCodeLang(lang: string) {
  return CODE_LANGUAGE_MAP[lang] || lang;
}

export function getLanguageFriendlyName(lang: string) {
  const _lang = normalizeCodeLang(lang);
  return CODE_LANGUAGE_FRIENDLY_NAME_MAP[_lang] || _lang;
}

export const getDefaultCodeLanguage = (): string => DEFAULT_CODE_LANGUAGE;

export const getCodeLanguages = (): Array<string> =>
  Object.keys(Prism.languages)
    .filter(
      // Prism has several language helpers mixed into languages object
      // so filtering them out here to get langs list
      (language) => typeof Prism.languages[language] !== 'function',
    )
    .sort();

/** @noInheritDoc */
export class CodeHighlightNode extends TextNode {
  /** @internal */
  __highlightType: string | null | undefined;

  constructor(
    text: string,
    highlightType?: string | null | undefined,
    key?: NodeKey,
  ) {
    super(text, key);
    this.__highlightType = highlightType;
  }

  static getType(): string {
    return 'code-highlight';
  }

  static clone(node: CodeHighlightNode): CodeHighlightNode {
    return new CodeHighlightNode(
      node.__text,
      node.__highlightType || undefined,
      node.__key,
    );
  }

  getHighlightType(): string | null | undefined {
    const self = this.getLatest();
    return self.__highlightType;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    const className = getHighlightThemeClass(
      config.theme,
      this.__highlightType,
    );
    addClassNamesToElement(element, className);
    return element;
  }

  updateDOM(
    prevNode: CodeHighlightNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const update = super.updateDOM(prevNode, dom, config);
    const prevClassName = getHighlightThemeClass(
      config.theme,
      prevNode.__highlightType,
    );
    const nextClassName = getHighlightThemeClass(
      config.theme,
      this.__highlightType,
    );
    if (prevClassName !== nextClassName) {
      if (prevClassName) {
        removeClassNamesFromElement(dom, prevClassName);
      }
      if (nextClassName) {
        addClassNamesToElement(dom, nextClassName);
      }
    }
    return update;
  }

  static importJSON(
    serializedNode: SerializedCodeHighlightNode,
  ): CodeHighlightNode {
    const node = $createCodeHighlightNode(
      serializedNode.text,
      serializedNode.highlightType,
    );
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedCodeHighlightNode {
    return {
      ...super.exportJSON(),
      highlightType: this.getHighlightType(),
      type: 'code-highlight',
      version: 1,
    };
  }

  // Prevent formatting (bold, underline, etc)
  setFormat(format: number): this {
    return this;
  }
}

function getHighlightThemeClass(
  theme: EditorThemeClasses,
  highlightType: string | null | undefined,
): string | null | undefined {
  return (
    highlightType &&
    theme &&
    theme.codeHighlight &&
    theme.codeHighlight[highlightType]
  );
}

export function $createCodeHighlightNode(
  text: string,
  highlightType?: string | null | undefined,
): CodeHighlightNode {
  return $applyNodeReplacement(new CodeHighlightNode(text, highlightType));
}

export function $isCodeHighlightNode(
  node: LexicalNode | CodeHighlightNode | null | undefined,
): node is CodeHighlightNode {
  return node instanceof CodeHighlightNode;
}

export function getFirstCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): CodeHighlightNode | null | undefined {
  let currentNode = null;
  const previousSiblings = anchor.getPreviousSiblings();
  previousSiblings.push(anchor);
  while (previousSiblings.length > 0) {
    const node = previousSiblings.pop();
    if ($isCodeHighlightNode(node)) {
      currentNode = node;
    }
    if ($isLineBreakNode(node)) {
      break;
    }
  }

  return currentNode;
}

export function getLastCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): CodeHighlightNode | null | undefined {
  let currentNode = null;
  const nextSiblings = anchor.getNextSiblings();
  nextSiblings.unshift(anchor);
  while (nextSiblings.length > 0) {
    const node = nextSiblings.shift();
    if ($isCodeHighlightNode(node)) {
      currentNode = node;
    }
    if ($isLineBreakNode(node)) {
      break;
    }
  }

  return currentNode;
}
