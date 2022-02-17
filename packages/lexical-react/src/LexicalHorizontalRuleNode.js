/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode} from 'lexical';

import {DecoratorNode} from 'lexical';
import * as React from 'react';

function HorizontalRuleComponent() {
  return <hr />;
}

export class HorizontalRuleNode extends DecoratorNode {
  static getType(): string {
    return 'horizontalrule';
  }

  static clone(node: HorizontalRuleNode): HorizontalRuleNode {
    return new HorizontalRuleNode(node.__state, node.__key);
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'contents';
    return div;
  }

  getTextContent(): '\n' {
    return '\n';
  }

  isTopLevel(): true {
    return true;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React$Node {
    return <HorizontalRuleComponent />;
  }
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return new HorizontalRuleNode();
}

export function $isHorizontalRuleNode(node: ?LexicalNode): boolean %checks {
  return node instanceof HorizontalRuleNode;
}
