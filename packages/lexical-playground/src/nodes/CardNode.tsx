/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $applyNodeReplacement,
  $createNestedRootNode,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $isElementNode,
  EXPERIMENTAL_DecoratorElementNode,
  LexicalNode,
  NodeKey,
} from 'lexical';
import * as React from 'react';

export class CardNode extends EXPERIMENTAL_DecoratorElementNode<JSX.Element> {
  __showBody: boolean;

  static getType(): string {
    return 'card';
  }

  static clone(node: CardNode): CardNode {
    return new CardNode(node.__showBody, node.__key);
  }

  constructor(showBody = false, key?: NodeKey) {
    super(key);

    this.__showBody = showBody;

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

  toggleBody(): void {
    const writableSelf = this.getWritable();
    writableSelf.__showBody = !writableSelf.__showBody;
  }

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <CardComponent
        nodeKey={this.__key}
        titleKey={this.getChildAtIndex(0)!.__key}
        bodyKey={this.getChildAtIndex(1)!.__key}
        showBody={this.__showBody}
      />
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

function CardComponent({
  nodeKey,
  titleKey,
  bodyKey,
  showBody,
}: {
  nodeKey: NodeKey;
  titleKey: NodeKey;
  bodyKey: NodeKey;
  showBody: boolean;
}) {
  const [editor] = useLexicalComposerContext();
  const onTitleRef = React.useCallback(
    (element: null | HTMLElement) => {
      editor.setNestedRootElement(titleKey, element);
    },
    [editor, titleKey],
  );
  const onBodyRef = React.useCallback(
    (element: null | HTMLElement) => {
      editor.setNestedRootElement(bodyKey, element);
    },
    [editor, bodyKey],
  );
  const toggleBody = React.useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isCardNode(node)) {
        node.toggleBody();
      }
    });
  }, [editor, nodeKey]);
  const addText = React.useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(bodyKey);
      if ($isElementNode(node)) {
        const paragraph = node.getFirstChildOrThrow();
        if ($isElementNode(paragraph)) {
          paragraph.append($createTextNode('abcdef'));
        }
      }
    });
  }, [bodyKey, editor]);
  const removeNode = React.useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isCardNode(node)) {
        node.remove();
      }
    });
  }, [editor, nodeKey]);
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
        ref={onTitleRef}
      />
      <button onClick={toggleBody}>Toggle Body</button>
      <button onClick={addText}>Add text to Body</button>
      <button onClick={removeNode}>Remove current node</button>
      {showBody && (
        <>
          <div>Body</div>
          <div
            style={{
              borderColor: 'blue',
              borderStyle: 'solid',
              borderWidth: 1,
              minHeight: 100,
              minWidth: 300,
            }}
            ref={onBodyRef}
          />
        </>
      )}
    </div>
  );
}
