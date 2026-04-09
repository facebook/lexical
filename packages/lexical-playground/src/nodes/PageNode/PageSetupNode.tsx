/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $applyNodeReplacement,
  $getRoot,
  DecoratorNode,
  DOMConversionMap,
  DOMExportOutput,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import {DEFAULT_PAGE_SETUP} from './constants';
import {Orientation, PageSetup, PageSize} from './types';

export const PAGE_SETUP_TAG = 'page-setup';

export type SerializedPageSetupNode = Spread<
  {
    type: 'page-setup';
    version: 1;
  } & PageSetup,
  SerializedLexicalNode
>;

export class PageSetupNode extends DecoratorNode<null> {
  __pageSize: PageSize;
  __orientation: Orientation;
  __margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  static getType(): string {
    return 'page-setup';
  }

  static clone(node: PageSetupNode): PageSetupNode {
    return new PageSetupNode(
      node.__pageSize,
      node.__orientation,
      structuredClone(node.__margins),
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedPageSetupNode): PageSetupNode {
    return $createPageSetupNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedPageSetupNode>,
  ): this {
    const {pageSize, orientation, margins} = serializedNode;
    const node = super.updateFromJSON(serializedNode);
    if (pageSize !== undefined) node.setPageSize(pageSize);
    if (orientation !== undefined) node.setOrientation(orientation);
    if (margins !== undefined) node.setMargins(margins);
    return node;
  }

  constructor(
    pageSize: PageSize,
    orientation: Orientation,
    margins: {top: number; right: number; bottom: number; left: number},
    key?: NodeKey,
  ) {
    super(key);
    this.__pageSize = pageSize;
    this.__orientation = orientation;
    this.__margins = margins;
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.style.display = 'none';
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-page-setup')) {
          return null;
        }
        return {
          conversion: () => {
            return {
              node: $createPageSetupNode(),
            };
          },
          priority: 2,
        };
      },
    };
  }

  exportJSON(): SerializedPageSetupNode {
    return {
      ...super.exportJSON(),
      margins: this.__margins,
      orientation: this.__orientation,
      pageSize: this.__pageSize,
      type: 'page-setup',
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.setAttribute('data-lexical-page-setup', 'true');
    return {element};
  }

  decorate(): null {
    return null;
  }

  isSelected(): boolean {
    return false;
  }

  isKeyboardSelectable(): boolean {
    return false;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  excludeFromCopy(): boolean {
    return true;
  }

  getPageSetup(): PageSetup {
    return {
      margins: this.getMargins(),
      orientation: this.getOrientation(),
      pageSize: this.getPageSize(),
    };
  }

  getPageSize(): PageSize {
    const latest = this.getLatest();
    return latest.__pageSize ?? DEFAULT_PAGE_SETUP.pageSize;
  }

  getOrientation(): Orientation {
    const latest = this.getLatest();
    return latest.__orientation ?? DEFAULT_PAGE_SETUP.orientation;
  }

  getMargins(): {top: number; right: number; bottom: number; left: number} {
    const latest = this.getLatest();
    return latest.__margins ?? structuredClone(DEFAULT_PAGE_SETUP.margins);
  }

  setPageSize(pageSize: PageSize) {
    const writable = this.getWritable();
    writable.__pageSize = pageSize;
    return this;
  }

  setOrientation(orientation: Orientation) {
    const writable = this.getWritable();
    writable.__orientation = orientation;
    return this;
  }

  setMargins(
    margins: Partial<{
      top: number;
      right: number;
      bottom: number;
      left: number;
    }>,
  ) {
    const writable = this.getWritable();
    writable.__margins = {...writable.__margins, ...margins};
    return this;
  }
}

export function $createPageSetupNode(
  payload = structuredClone(DEFAULT_PAGE_SETUP),
): PageSetupNode {
  const {pageSize, orientation, margins} = payload;
  return $applyNodeReplacement(
    new PageSetupNode(pageSize, orientation, margins),
  );
}

export function $isPageSetupNode(
  node: LexicalNode | null | undefined,
): node is PageSetupNode {
  return node instanceof PageSetupNode;
}

export function $getPageSetupNode(): PageSetupNode | null {
  const root = $getRoot();
  const firstChild = root.getFirstChild();
  if ($isPageSetupNode(firstChild)) {
    return firstChild;
  }
  return null;
}
