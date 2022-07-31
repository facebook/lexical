/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  Spread,
} from 'lexical';

import {BlockWithAlignableContents} from '@lexical/react/LexicalBlockWithAlignableContents';
import {
  DecoratorBlockNode,
  SerializedDecoratorBlockNode,
} from '@lexical/react/LexicalDecoratorBlockNode';
import * as React from 'react';

type IFrameComponentProps = Readonly<{
  className: Readonly<{
    base: string;
    focus: string;
  }>;
  format: ElementFormatType | null;
  nodeKey: NodeKey;
  url: string;
}>;

function IFrameComponent({
  className,
  format,
  nodeKey,
  url,
}: IFrameComponentProps) {
  return (
    <BlockWithAlignableContents
      className={className}
      format={format}
      nodeKey={nodeKey}>
      <iframe
        width="90%"
        height="300"
        src={url}
        frameBorder="0"
        title="Embedded IFrame"
      />
    </BlockWithAlignableContents>
  );
}

export type SerializedIFrameNode = Spread<
  {
    url: string;
    type: 'iframe';
    version: 1;
  },
  SerializedDecoratorBlockNode
>;

export class IFrameNode extends DecoratorBlockNode {
  __url: string;

  static getType(): string {
    return 'iframe';
  }

  static clone(node: IFrameNode): IFrameNode {
    return new IFrameNode(node.__url, node.__format, node.__key);
  }

  static importJSON(serializedNode: SerializedIFrameNode): IFrameNode {
    const node = $createIFrameNode(serializedNode.url);
    node.setFormat(serializedNode.format);
    return node;
  }

  exportJSON(): SerializedIFrameNode {
    return {
      ...super.exportJSON(),
      type: 'iframe',
      url: this.__url,
      version: 1,
    };
  }

  constructor(url: string, format?: ElementFormatType, key?: NodeKey) {
    super(format, key);
    this.__url = url;
  }

  updateDOM(): false {
    return false;
  }

  getURL(): string {
    return this.__url;
  }

  decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const embedBlockTheme = config.theme.embedBlock || {};
    const className = {
      base: embedBlockTheme.base || '',
      focus: embedBlockTheme.focus || '',
    };
    return (
      <IFrameComponent
        className={className}
        format={this.__format}
        nodeKey={this.getKey()}
        url={this.__url}
      />
    );
  }

  isTopLevel(): true {
    return true;
  }
}

export function $createIFrameNode(url: string): IFrameNode {
  return new IFrameNode(url);
}

export function $isIFrameNode(
  node: IFrameNode | LexicalNode | null | undefined,
): node is IFrameNode {
  return node instanceof IFrameNode;
}
