/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, LexicalNode, NodeKey, RangeSelection} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {$isElementNode, ElementNode} from 'lexical';

export class CommentNode extends ElementNode {
  __ids: Array<string>;

  static getType(): string {
    return 'comment';
  }

  static clone(node: CommentNode): CommentNode {
    return new CommentNode(node.__ids, node.__key);
  }

  constructor(ids: Array<string>, key?: NodeKey): void {
    super(key);
    this.__ids = ids || [];
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('mark');
    addClassNamesToElement(element, config.theme.comment);
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
    const ids = Array.from(self.__ids);
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
    const ids = Array.from(self.__ids);
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
      const linkNode = $createCommentNode(this.__ids);
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }

  canBeEmpty(): false {
    return false;
  }

  isInline(): true {
    return true;
  }

  excludeFromCopy(): true {
    return true;
  }
}

export function $createCommentNode(ids: Array<string>): CommentNode {
  return new CommentNode(ids);
}

export function $isCommentNode(node: ?LexicalNode): boolean %checks {
  return node instanceof CommentNode;
}
