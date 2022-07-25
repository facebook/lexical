/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  NodeKey,
  Spread,
} from 'lexical';

import {BlockWithAlignableContents} from '@lexical/react/LexicalBlockWithAlignableContents';
import {
  DecoratorBlockNode,
  SerializedDecoratorBlockNode,
} from '@lexical/react/LexicalDecoratorBlockNode';
import * as React from 'react';

type ConfigTreeComponentProps = Readonly<{
  className: Readonly<{
    base: string;
    focus: string;
  }>;
  format: ElementFormatType | null;
  loadingComponent?: JSX.Element | string;
  nodeKey: NodeKey;
  onError?: (error: string) => void;
  onLoad?: () => void;
  interfaceName: string;
}>;

function convertConfigTreeElement(
  domNode: HTMLDivElement,
): DOMConversionOutput | null {
  const interfaceName = domNode.getAttribute(
    'data-lexical-config-tree-interface-name',
  );

  if (interfaceName) {
    const node = $createConfigTreeNode(interfaceName);
    return {node};
  }
  return null;
}

function ConfigTreeComponent({
  className,
  format,
  loadingComponent,
  nodeKey,
  onError,
  onLoad,
  interfaceName,
}: ConfigTreeComponentProps) {
  const isLoading = false;
  const displayName = interfaceName + ' is added from plugin';

  // TODO: need to call actual www component here, not sure how
  return (
    <BlockWithAlignableContents
      className={className}
      format={format}
      nodeKey={nodeKey}>
      {isLoading ? loadingComponent : null}
      <div>{displayName}</div>
    </BlockWithAlignableContents>
  );
}

export type SerializedConfigTreeNode = Spread<
  {
    interfaceName: string;
    type: 'configTree';
    version: 1;
  },
  SerializedDecoratorBlockNode
>;

export class ConfigTreeNode extends DecoratorBlockNode {
  __interfaceName: string;

  constructor(
    interfaceName: string,
    format?: ElementFormatType,
    key?: NodeKey,
  ) {
    super(format, key);
    this.__interfaceName = interfaceName;
  }

  getInterfaceName(): string {
    return this.__interfaceName;
  }

  static getType(): string {
    return 'configTree';
  }

  static clone(node: ConfigTreeNode): ConfigTreeNode {
    return new ConfigTreeNode(node.__interfaceName);
  }

  static importJSON(serializedNode: SerializedConfigTreeNode): ConfigTreeNode {
    const node = $createConfigTreeNode(serializedNode.interfaceName);
    node.setFormat(serializedNode.format);
    return node;
  }

  exportJSON(): SerializedConfigTreeNode {
    return {
      ...super.exportJSON(),
      interfaceName: this.getInterfaceName(),
      type: 'configTree',
      version: 1,
    };
  }

  static importDOM(): DOMConversionMap<HTMLDivElement> | null {
    return {
      div: (domNode: HTMLDivElement) => {
        if (!domNode.hasAttribute('data-lexical-config-tree-interface-name')) {
          return null;
        }
        return {
          conversion: convertConfigTreeElement,
          //TODO: what's the priority?
          priority: 0,
        };
      },
    };
  }

  isTopLevel(): boolean {
    return true;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.setAttribute(
      'data-lexical-config-tree-interface-name',
      this.__interfaceName,
    );
    return {element};
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const embedBlockTheme = config.theme.embedBlock || {};
    const className = {
      base: embedBlockTheme.base || '',
      focus: embedBlockTheme.focus || '',
    };
    return (
      <ConfigTreeComponent
        className={className}
        format={this.__format}
        loadingComponent={<div>Loading..</div>}
        nodeKey={this.getKey()}
        interfaceName={this.__interfaceName}
      />
    );
  }
}

export function $createConfigTreeNode(interfaceName: string): ConfigTreeNode {
  return new ConfigTreeNode(interfaceName);
}
