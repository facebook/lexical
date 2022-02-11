/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementNode, LexicalNode, RangeSelection} from 'lexical';

import {$isElementNode} from 'lexical';
import {LinkNode} from 'lexical/LinkNode';

// Custom node type to override `canInsertTextAfter` that will
// allow typing within the link
export class AutoLinkNode extends LinkNode {
  static getType(): string {
    return 'autolink';
  }

  // $FlowFixMe[incompatible-extend]
  static clone(node: AutoLinkNode): AutoLinkNode {
    return new AutoLinkNode(node.__url, node.__key);
  }

  insertNewAfter(selection: RangeSelection): null | ElementNode {
    const element = this.getParentOrThrow().insertNewAfter(selection);
    if ($isElementNode(element)) {
      const linkNode = $createAutoLinkNode(this.__url);
      element.append(linkNode);
      return linkNode;
    }
    return null;
  }

  canInsertTextAfter(): true {
    return true;
  }
}

export function $createAutoLinkNode(url: string): AutoLinkNode {
  return new AutoLinkNode(url);
}

export function $isAutoLinkNode(node: ?LexicalNode): boolean %checks {
  return node instanceof AutoLinkNode;
}
