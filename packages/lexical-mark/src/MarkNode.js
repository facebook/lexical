/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorConfig,
  GridSelection,
  LexicalNode,
  NodeKey,
  NodeSelection,
  RangeSelection,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {$isElementNode, $isRangeSelection, ElementNode} from 'lexical';

export class MarkNode extends ElementNode {
  __ids: Array<string>;

  static getType(): string {
    return 'mark';
  }

  static clone(node: MarkNode): MarkNode {
    return new MarkNode(Array.from(node.__ids), node.__key);
  }

  constructor(ids: Array<string>, key?: NodeKey): void {
    super(key);
    this.__ids = ids || [];
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('mark');
    addClassNamesToElement(element, config.theme.mark);
    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  hasID(id: string): boolean {
    const ids = this.getIDs();
    for (let i = 0; i < ids.length; i++) {
      if (id === ids[i]) {
        return true;
      }
    }
    return false;
  }

  getIDs(): Array<string> {
    const self = this.getLatest();
    return self.__ids;
  }

  addID(id: string): void {
    const self = this.getWritable();
    const ids = self.__ids;
    self.__ids = ids;
    for (let i = 0; i < ids.length; i++) {
      // If we already have it, don't add again
      if (id === ids[i]) {
        return;
      }
    }
    ids.push(id);
  }

  deleteID(id: string): void {
    const self = this.getWritable();
    const ids = self.__ids;
    self.__ids = ids;
    for (let i = 0; i < ids.length; i++) {
      if (id === ids[i]) {
        ids.splice(i, 1);
        return;
      }
    }
  }

  insertNewAfter(selection: RangeSelection): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(selection);
    if ($isElementNode(element)) {
      const linkNode = $createMarkNode(this.__ids);
      element.append(linkNode);
      return linkNode;
    }
    return null;
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
    selection: RangeSelection | NodeSelection | GridSelection,
    destination: 'clone' | 'html',
  ): boolean {
    if (!$isRangeSelection(selection) || destination === 'html') {
      return false;
    }
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    const isBackward = selection.isBackward();
    const selectionLength = isBackward
      ? selection.anchor.offset - selection.focus.offset
      : selection.focus.offset - selection.anchor.offset;
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

export function $createMarkNode(ids: Array<string>): MarkNode {
  return new MarkNode(ids);
}

export function $isMarkNode(node: ?LexicalNode): boolean %checks {
  return node instanceof MarkNode;
}
