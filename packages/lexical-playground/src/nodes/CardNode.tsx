/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $applyNodeReplacement,
  $createNestedRootNode,
  $createParagraphNode,
  $createTextNode,
  EXPERIMENTAL_DecoratorElementNode,
  EXPERIMENTAL_NestedRootNode,
  LexicalNode,
  NodeKey,
} from 'lexical';
import * as React from 'react';

export class CardNode extends EXPERIMENTAL_DecoratorElementNode<JSX.Element> {
  static getType(): string {
    return 'card';
  }

  static clone(node: CardNode): CardNode {
    return new CardNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);

    // ElementNode will automatically clone children
    // So we only need to set the children if the node is new
    if (key === undefined) {
      const title = $createNestedRootNode();
      const titleParagraph = $createParagraphNode();
      titleParagraph.append($createTextNode('Title sample text'));
      title.append(titleParagraph);
      this.append(title);
      const body = $createNestedRootNode();
      const bodyParagraph = $createParagraphNode();
      bodyParagraph.append($createTextNode('Content sample text'));
      body.append(bodyParagraph);
      this.append(body);
    }
  }

  get title(): EXPERIMENTAL_NestedRootNode {
    return this.getChildAtIndex(0) as EXPERIMENTAL_NestedRootNode;
  }

  get body(): EXPERIMENTAL_NestedRootNode {
    return this.getChildAtIndex(1) as EXPERIMENTAL_NestedRootNode;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <div
        style={{
          borderColor: 'black',
          borderStyle: 'solid',
          borderWidth: 1,
        }}>
        <div>Title</div>
        <div
          style={{
            borderColor: 'red',
            borderStyle: 'solid',
            borderWidth: 1,
            minHeight: 100,
            minWidth: 300,
          }}
          ref={this.title.onRef}
        />
        <div>Content</div>
        <div
          style={{
            borderColor: 'blue',
            borderStyle: 'solid',
            borderWidth: 1,
            minHeight: 100,
            minWidth: 300,
          }}
          ref={this.body.onRef}
        />
      </div>
    );
  }
}

export function $createCardNode(): CardNode {
  return $applyNodeReplacement(new CardNode());
}

export function $isCardNode(
  node: LexicalNode | null | undefined,
): node is CardNode {
  return node instanceof CardNode;
}
