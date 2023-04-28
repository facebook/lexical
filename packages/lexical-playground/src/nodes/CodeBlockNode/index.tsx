/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  DOMConversionMap,
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  Spread,
} from 'lexical';

import {
  DecoratorBlockNode,
  SerializedDecoratorBlockNode,
} from '@lexical/react/LexicalDecoratorBlockNode';
import {isHTMLElement} from '@lexical/utils';
import * as React from 'react';
import {Suspense} from 'react';

import {CodeMode, modes} from './modes';

const CodeBlockComponent = React.lazy(() => import('./CodeBlockComponent'));

export type CodeBlockMode = CodeMode | 'none';

export type SerializedCodeBlockNode = Spread<
  {
    code: string;
    mode: CodeBlockMode;
  },
  SerializedDecoratorBlockNode
>;

// extracted from @lexical/code
function hasChildDOMNodeTag(node: Node, tagName: string): boolean {
  for (const child of node.childNodes) {
    if (isHTMLElement(child) && child.tagName === tagName) {
      return true;
    }
    hasChildDOMNodeTag(child, tagName);
  }
  return false;
}

const mapLanguageToMode = (
  language: string | null | undefined,
): CodeBlockMode => {
  // eslint-disable-next-line no-prototype-builtins
  return language != null && modes.hasOwnProperty(language)
    ? (language as CodeBlockMode)
    : 'none';
};

export class CodeBlockNode extends DecoratorBlockNode {
  __code: string;
  __mode: CodeBlockMode;

  static getType(): string {
    return 'code-block';
  }

  static clone(node: CodeBlockNode): CodeBlockNode {
    return new CodeBlockNode(
      node.__code,
      node.__mode,
      node.__format,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedCodeBlockNode): CodeBlockNode {
    const node = $createCodeBlockNode(serializedNode.code, serializedNode.mode);
    node.setFormat(serializedNode.format);
    return node;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      code: (node: Node) => {
        const isMultiLine =
          node.textContent != null &&
          (/\r?\n/.test(node.textContent) || hasChildDOMNodeTag(node, 'BR'));

        return isMultiLine
          ? {
              conversion: (childNode) => ({
                node: $createCodeBlockNode(childNode.textContent, null),
              }),
              priority: 1,
            }
          : null;
      },
      pre: () => ({
        conversion: (node) => ({
          node: $createCodeBlockNode(
            node.textContent,
            mapLanguageToMode(
              node.getAttribute('data-lexical-code-block-mode'),
            ),
          ),
        }),
        priority: 0,
      }),
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('pre');
    element.textContent = this.getCode();

    const mode = this.getMode();
    if (mode !== 'none') {
      element.setAttribute('data-lexical-code-block-mode', mode);
    }

    return {element};
  }

  exportJSON(): SerializedCodeBlockNode {
    return {
      ...super.exportJSON(),
      code: this.__code || '',
      mode: this.__mode || 'none',
      type: 'code-block',
      version: 1,
    };
  }

  constructor(
    code?: string | null | undefined,
    mode?: string | null | undefined,
    format?: ElementFormatType,
    key?: NodeKey,
  ) {
    // TODO: check if we really need format here
    super(format, key);
    this.__code = code || '';
    this.__mode = (mode as CodeBlockMode) || 'none';
  }

  updateDOM(): false {
    return false;
  }

  setCode(code: string): void {
    const writable = this.getWritable();
    writable.__code = code;
  }

  setMode(mode: CodeBlockMode): void {
    const writable = this.getWritable();
    writable.__mode = mode;
  }

  getCode(): string {
    return this.__code;
  }

  getMode(): CodeBlockMode {
    return this.__mode;
  }

  getTextContent(
    _includeInert?: boolean | undefined,
    _includeDirectionless?: false | undefined,
  ): string {
    return this.__code;
  }

  decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const embedBlockTheme = config.theme.embedBlock || {};
    const className = {
      base: embedBlockTheme.base || '',
      focus: embedBlockTheme.focus || '',
    };
    return (
      <Suspense fallback={null}>
        <CodeBlockComponent
          className={className}
          format={this.__format}
          nodeKey={this.getKey()}
          code={this.__code}
          mode={this.__mode}
        />
      </Suspense>
    );
  }
}

export function $createCodeBlockNode(
  code?: string | null | undefined,
  mode?: string | null | undefined,
): CodeBlockNode {
  return new CodeBlockNode(code, mode);
}

export function $isCodeBlockNode(
  node: CodeBlockNode | LexicalNode | null | undefined,
): node is CodeBlockNode {
  return node instanceof CodeBlockNode;
}
