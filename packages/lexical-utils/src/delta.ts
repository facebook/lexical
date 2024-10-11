/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $getEditor,
  $isElementNode,
  DOMExportOutput,
  EditorState,
  Klass,
  LexicalEditor,
  LexicalNode,
  SerializedEditorState,
  SerializedElementNode,
  SerializedLexicalNode,
  Transform,
} from 'lexical';
import {$getRoot} from 'lexical';

/**
 * A better setEditorState that looks into differences as opposed to a full replacement.
 * This function only compares top level blocks for now.
 * 1. Update all trivial RootNode children properties.
 * 2. If the JSON representation still differs perform a full replacement. The number of operations
 * is minimized but there's it's not guaranteed to be optimal:
 *   1. Remove the nodes that are not present in the new version.
 *   2. Compare, if unequal, insertAfter the appropriate node.
 *
 * @param editor
 */
export function $applyDelta(serialized: SerializedEditorState): void {
  const editor = $getEditor();
  const root = $getRoot();
  const newRoot = serialized.root;
  if (compareJSON(exportNodeToJSON(root), newRoot)) {
    return;
  }

  // 1. Delete nodes not present in the new version
  const newMatchers = new Map<string, number>(); // <matcher, times>
  for (const child of newRoot.children) {
    const matcher = equalityHeuristic(child);
    const times = newMatchers.get(matcher) || 0;
    newMatchers.set(matcher, times + 1);
  }
  for (const child of root.getChildren()) {
    const matcher = equalityHeuristic(exportNodeToJSON(child));
    const times = newMatchers.get(matcher) || 0;
    if (times === 0) {
      child.remove();
    } else {
      newMatchers.set(matcher, times - 1);
    }
  }

  // 2. Add nodes present in the new version, which might just mean leaving the current ones
  // untouched
  const oldMatchers = new Map<string, Array<LexicalNode>>(); // <matcher, node>
  for (const child of root.getChildren()) {
    const matcher = equalityHeuristic(exportNodeToJSON(child));
    const matchers = oldMatchers.get(matcher) || [];
    matchers.push(child);
    oldMatchers.set(matcher, matchers);
  }
  let insertAfterNode: null | LexicalNode = null;
  function $insertAfterNode(node: LexicalNode) {
    if (insertAfterNode === null) {
      const firstChild = root.getFirstChild();
      if (firstChild !== null) {
        firstChild.insertBefore(node);
      } else {
        root.append(node);
      }
    } else {
      insertAfterNode.insertAfter(node);
    }
  }
  for (const newChild of newRoot.children) {
    const nextChild: null | LexicalNode =
      insertAfterNode === null
        ? root.getFirstChild()
        : insertAfterNode.getNextSibling();
    if (nextChild === null) {
      // const registeredNode = editor._nodes.get(newChild.type)!;
      $insertAfterNode($parseSerializedNodeImpl(newChild, editor._nodes));
    } else {
      const matchingNodes = oldMatchers.get(equalityHeuristic(newChild));
      if (matchingNodes === undefined || matchingNodes.length === 0) {
        // New node, insert it
        // const registeredNode = editor._nodes.get(newChild.type)!;
        const node = $parseSerializedNodeImpl(newChild, editor._nodes);
        $insertAfterNode(node);
        insertAfterNode = node;
      } else {
        // Existing node
        insertAfterNode = nextChild;
      }
    }
  }

  // 3. Update properties that weren't matched by heuristic
  const i = 0;
  for (const child of root.getChildren()) {
    // $updateNodeProps(child, newRoot.children[i++])
  }
}

function compareJSON(
  a: SerializedLexicalNode,
  b: SerializedLexicalNode,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// This heuristic pretends properties other than children on ElementNodes are trivial.
function equalityHeuristic(serializedNode: SerializedLexicalNode): string {
  if ('children' in serializedNode) {
    return JSON.stringify({
      children: serializedNode.children,
      type: serializedNode.type,
    });
  }
  return JSON.stringify(serializedNode);
}

// function $updateNodeProps(node: LexicalNode, serializedNode: SerializedLexicalNode) {
//   const s1 = exportNodeToJSON(node);
//   const s2 = serializedNode;
//   for (const prop in s1) {
//     if (!(prop in s2)) {
//       node.getWritable();
//       // @ts-ignore
//       delete node[prop]
//     } else if (s1[prop] !== s2[prop]) {
//       node.
//     }
//   }
// }

// Export from Core?
function exportNodeToJSON<SerializedNode extends SerializedLexicalNode>(
  node: LexicalNode,
): SerializedNode {
  const serializedNode = node.exportJSON();
  const nodeClass = node.constructor;

  // if (serializedNode.type !== nodeClass.getType()) {
  //   invariant(
  //     false,
  //     'LexicalNode: Node %s does not match the serialized type. Check if .exportJSON() is implemented and it is returning the correct type.',
  //     nodeClass.name,
  //   );
  // }

  if ($isElementNode(node)) {
    const serializedChildren = (serializedNode as SerializedElementNode)
      .children;
    if (!Array.isArray(serializedChildren)) {
      throw new Error(
        'LexicalNode: Node .. is an element but .exportJSON() does not have a children array.',
      );
      // invariant(
      //   false,
      //   'LexicalNode: Node %s is an element but .exportJSON() does not have a children array.',
      //   nodeClass.name,
      // );
    }

    const children = node.getChildren();

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const serializedChildNode = exportNodeToJSON(child);
      serializedChildren.push(serializedChildNode);
    }
  }

  // @ts-expect-error
  return serializedNode;
}

type InternalSerializedNode = {
  children?: Array<InternalSerializedNode>;
  type: string;
  version: number;
};

export type RegisteredNodes = Map<string, RegisteredNode>;

export type RegisteredNode = {
  klass: Klass<LexicalNode>;
  transforms: Set<Transform<LexicalNode>>;
  replace: null | ((node: LexicalNode) => LexicalNode);
  replaceWithKlass: null | Klass<LexicalNode>;
  exportDOM?: (
    editor: LexicalEditor,
    targetNode: LexicalNode,
  ) => DOMExportOutput;
};

function $parseSerializedNodeImpl<
  SerializedNode extends InternalSerializedNode,
>(
  serializedNode: SerializedNode,
  registeredNodes: RegisteredNodes,
): LexicalNode {
  const type = serializedNode.type;
  const registeredNode = registeredNodes.get(type);

  if (registeredNode === undefined) {
    throw new Error('parseEditorState: type "%s" + not found');
  }

  const nodeClass = registeredNode.klass;

  if (serializedNode.type !== nodeClass.getType()) {
    throw new Error('LexicalNode: Node %s does not implement .importJSON().');
  }

  const node = nodeClass.importJSON(serializedNode);
  const children = serializedNode.children;

  if ($isElementNode(node) && Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const serializedJSONChildNode = children[i];
      const childNode = $parseSerializedNodeImpl(
        serializedJSONChildNode,
        registeredNodes,
      );
      node.append(childNode);
    }
  }

  return node;
}
