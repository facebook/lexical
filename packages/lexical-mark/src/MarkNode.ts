/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  BaseSelection,
  EditorConfig,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  RangeSelection,
  SerializedElementNode,
  Spread,
} from 'lexical';

import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {$applyNodeReplacement, $isRangeSelection, ElementNode} from 'lexical';

export type SerializedMarkNode = Spread<
  {
    ids: Array<string>;
  },
  SerializedElementNode
>;

const NO_IDS: readonly string[] = [];

/** @noInheritDoc */
export class MarkNode extends ElementNode {
  /** @internal */
  __ids: readonly string[];

  static getType(): string {
    return 'mark';
  }

  static clone(node: MarkNode): MarkNode {
    return new MarkNode(node.__ids, node.__key);
  }

  static importDOM(): null {
    return null;
  }

  static importJSON(serializedNode: SerializedMarkNode): MarkNode {
    return $createMarkNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedMarkNode>): this {
    return super.updateFromJSON(serializedNode).setIDs(serializedNode.ids);
  }

  exportJSON(): SerializedMarkNode {
    return {
      ...super.exportJSON(),
      ids: this.getIDs(),
    };
  }

  constructor(ids: readonly string[] = NO_IDS, key?: NodeKey) {
    super(key);
    this.__ids = ids;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('mark');
    addClassNamesToElement(element, config.theme.mark);
    if (this.__ids.length > 1) {
      addClassNamesToElement(element, config.theme.markOverlap);
    }
    return element;
  }

  updateDOM(
    prevNode: this,
    element: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const prevIDs = prevNode.__ids;
    const nextIDs = this.__ids;
    const prevIDsCount = prevIDs.length;
    const nextIDsCount = nextIDs.length;
    const overlapTheme = config.theme.markOverlap;

    if (prevIDsCount !== nextIDsCount) {
      if (prevIDsCount === 1) {
        if (nextIDsCount === 2) {
          addClassNamesToElement(element, overlapTheme);
        }
      } else if (nextIDsCount === 1) {
        removeClassNamesFromElement(element, overlapTheme);
      }
    }
    return false;
  }

  hasID(id: string): boolean {
    return this.getIDs().includes(id);
  }

  getIDs(): Array<string> {
    return Array.from(this.getLatest().__ids);
  }

  setIDs(ids: readonly string[]): this {
    const self = this.getWritable();
    self.__ids = ids;
    return self;
  }

  addID(id: string): this {
    const self = this.getWritable();
    return self.__ids.includes(id) ? self.setIDs([...self.__ids, id]) : self;
  }

  deleteID(id: string): this {
    const self = this.getWritable();
    const idx = self.__ids.indexOf(id);
    if (idx === -1) {
      return self;
    }
    const ids = Array.from(self.__ids);
    ids.splice(idx, 1);
    return self.setIDs(ids);
  }

  insertNewAfter(
    selection: RangeSelection,
    restoreSelection = true,
  ): null | ElementNode {
    const markNode = $createMarkNode(this.__ids);
    this.insertAfter(markNode, restoreSelection);
    return markNode;
  }

  canInsertTextBefore(): false {
    return false;
  }

  canInsertTextAfter(): false {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }

  isInline(): true {
    return true;
  }

  extractWithChild(
    child: LexicalNode,
    selection: BaseSelection,
    destination: 'clone' | 'html',
  ): boolean {
    if (!$isRangeSelection(selection) || destination === 'html') {
      return false;
    }
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = anchor.getNode();
    const focusNode = focus.getNode();
    const isBackward = selection.isBackward();
    const selectionLength = isBackward
      ? anchor.offset - focus.offset
      : focus.offset - anchor.offset;
    return (
      this.isParentOf(anchorNode) &&
      this.isParentOf(focusNode) &&
      this.getTextContent().length === selectionLength
    );
  }

  excludeFromCopy(destination: 'clone' | 'html'): boolean {
    return destination !== 'clone';
  }
}

export function $createMarkNode(ids: readonly string[] = NO_IDS): MarkNode {
  return $applyNodeReplacement(new MarkNode(ids));
}

export function $isMarkNode(node: LexicalNode | null): node is MarkNode {
  return node instanceof MarkNode;
}
