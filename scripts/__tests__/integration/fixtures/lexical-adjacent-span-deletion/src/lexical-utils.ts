import {
  $isElementNode,
  type LexicalNode,
  type SerializedElementNode,
  type SerializedLexicalNode,
} from 'lexical';

export function exportJsonSubtree(
  node: LexicalNode
): SerializedElementNode | SerializedLexicalNode {
  const serialization = node.exportJSON() as
    | SerializedElementNode
    | SerializedLexicalNode;
  if ($isElementNode(node)) {
    (serialization as SerializedElementNode).children = node
      .getChildren()
      .map((child) => exportJsonSubtree(child));
  }
  return serialization;
}