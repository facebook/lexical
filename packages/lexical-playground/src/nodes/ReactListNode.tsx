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
  $isNestedRootNode,
  EXPERIMENTAL_DecoratorElementNode,
  LexicalNode,
  NodeKey,
} from 'lexical';
import * as React from 'react';

export class ReactListNode extends EXPERIMENTAL_DecoratorElementNode<JSX.Element> {
  static getType(): string {
    return 'reactlist';
  }

  static clone(node: ReactListNode): ReactListNode {
    return new ReactListNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <ReactListComponent nodeKey={this.__key} />;
  }
}

export function $createReactListNode(): ReactListNode {
  return $applyNodeReplacement(new ReactListNode());
}

export function $isReactListNode(
  node: LexicalNode | null | undefined,
): node is ReactListNode {
  return node instanceof ReactListNode;
}

function ReactListComponent({nodeKey}: {nodeKey: NodeKey}) {
  const [editor] = useLexicalComposerContext();
  const addAtBeginning = React.useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isReactListNode(node)) {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('New text'));
        const nestedRoot = $createNestedRootNode();
        nestedRoot.append(paragraph);
        node.splice(0, 0, [nestedRoot]);
      }
    });
  }, [editor, nodeKey]);
  const childKeys = editor.getEditorState().read(() => {
    const node = $getNodeByKey(nodeKey);
    return $isReactListNode(node) ? node.getChildrenKeys() : [];
  });
  return (
    <div
      style={{
        borderColor: 'black',
        borderStyle: 'solid',
        borderWidth: 1,
      }}>
      <button onClick={addAtBeginning}>Add one item at beginning</button>
      {childKeys.map((childKey, index) => (
        <ReactListItem key={childKey} index={index} nodeKey={childKey} />
      ))}
    </div>
  );
}

function ReactListItem({
  index,
  nodeKey,
}: {
  index: number;
  nodeKey: NodeKey;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const onRef = React.useCallback(
    (element: HTMLElement | null) => {
      editor.setNestedRootElement(nodeKey, element);
    },
    [editor, nodeKey],
  );
  const removeSelf = React.useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isNestedRootNode(node)) {
        node.remove();
      }
    });
  }, [editor, nodeKey]);
  const addOneAfter = React.useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isNestedRootNode(node)) {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('New text'));
        const nestedRoot = $createNestedRootNode();
        nestedRoot.append(paragraph);
        node.insertAfter(nestedRoot);
      }
    });
  }, [editor, nodeKey]);
  return (
    <div>
      Item No.{index} Key:{nodeKey}
      <div
        style={{
          borderColor: 'red',
          borderStyle: 'solid',
          borderWidth: 1,
          minHeight: 30,
          minWidth: 100,
        }}
        ref={onRef}
      />
      <button onClick={removeSelf}>Remove</button>
      <button onClick={addOneAfter}>Add one after</button>
    </div>
  );
}
