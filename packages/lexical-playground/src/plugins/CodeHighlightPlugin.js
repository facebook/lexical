/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor, ElementNode} from 'lexical';

import {CodeNode, $isCodeNode} from 'lexical/CodeNode';
import {
  $createLineBreakNode,
  $createTextNode,
  LexicalNode,
  TextNode,
  $isTextNode,
  $isLineBreakNode,
  $getSelection,
} from 'lexical';
import {useEffect} from 'react';
import withSubscriptions from '@lexical/react/withSubscriptions';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import Prism from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-objectivec';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-swift';
import {Array} from 'yjs';
import {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
  CodeHighlightNode,
} from 'lexical/CodeHighlightNode';

const DEFAULT_CODE_LANGUAGE = 'javascript';

export const getDefaultCodeLanguage = (): string => DEFAULT_CODE_LANGUAGE;

export const getCodeLanguages = (): Array<string> =>
  Object.keys(Prism.languages)
    .filter(
      // Prism has several language helpers mixed into languages object
      // so filtering them out here to get langs list
      (language) => typeof Prism.languages[language] !== 'function',
    )
    .sort();

export default function CodeHighlightPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return withSubscriptions(
      editor.registerNodes([CodeNode, CodeHighlightNode]),
      editor.addTransform(CodeNode, (node) => codeNodeTransform(node, editor)),
      editor.addTransform(TextNode, (node) => textNodeTransform(node, editor)),
      editor.addTransform(CodeHighlightNode, (node) =>
        textNodeTransform(node, editor),
      ),
    );
  }, [editor]);
  return null;
}

// Using `skipTransforms` to prevent extra transforms since reformatting the code
// will not affect code block content itself.
//
// Using extra flag (`isHighlighting`) since both CodeNode and CodeHighlightNode
// trasnforms might be called at the same time (e.g. new CodeHighlight node inserted) and
// in both cases we'll rerun whole reformatting over CodeNode, which is redundant.
// Especially when pasting code into CodeBlock.
let isHighlighting = false;
function codeNodeTransform(node: CodeNode, editor: LexicalEditor) {
  if (isHighlighting) {
    return;
  }
  isHighlighting = true;
  editor.update(
    () => {
      // When new code block inserted it might not have language selected
      if (node.getLanguage() === undefined) {
        node.setLanguage(DEFAULT_CODE_LANGUAGE);
      }

      updateAndRetainSelection(node, () => {
        const code = node.getTextContent();
        const tokens = Prism.tokenize(
          code,
          Prism.languages[node.getLanguage() || ''] ||
            Prism.languages[DEFAULT_CODE_LANGUAGE],
        );
        const highlightNodes = getHighlightNodes(tokens);
        const diffRange = getDiffRange(node.getChildren(), highlightNodes);
        if (diffRange !== null) {
          const {from, to, nodesForReplacement} = diffRange;
          replaceRange(node, from, to, nodesForReplacement);
          return true;
        }
        return false;
      });
    },
    {
      skipTransforms: true,
      onUpdate: () => {
        isHighlighting = false;
      },
    },
  );
}

function textNodeTransform(node: TextNode, editor: LexicalEditor): void {
  // Since CodeNode has flat children structure we only need to check
  // if node's parent is a code node and run highlighting if so
  const parentNode = node.getParent();
  if ($isCodeNode(parentNode)) {
    codeNodeTransform(parentNode, editor);
  } else if ($isCodeHighlightNode(node)) {
    // When code block converted into paragraph or other element
    // code highlight nodes converted back to normal text
    node.replace($createTextNode(node.__text));
  }
}

function getHighlightNodes(tokens): Array<LexicalNode> {
  const nodes = [];

  tokens.forEach((token) => {
    if (typeof token === 'string') {
      const partials = token.split('\n');
      for (let i = 0; i < partials.length; i++) {
        const text = partials[i];
        if (text.length) {
          nodes.push($createCodeHighlightNode(text));
        }
        if (i < partials.length - 1) {
          nodes.push($createLineBreakNode());
        }
      }
    } else {
      const {content} = token;
      if (typeof content === 'string') {
        nodes.push($createCodeHighlightNode(content, token.type));
      } else if (content.length === 1 && typeof content[0] === 'string') {
        nodes.push($createCodeHighlightNode(content[0], token.type));
      } else {
        nodes.push(...getHighlightNodes(content));
      }
    }
  });

  return nodes;
}

// Wrapping update function into selection retainer, that tries to keep cursor at the same
// position as before.
function updateAndRetainSelection(
  node: CodeNode,
  updateFn: () => boolean,
): void {
  const selection = $getSelection();
  if (!selection || !selection.anchor) {
    return;
  }

  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const isNewLineAnchor =
    anchor.type === 'element' &&
    $isLineBreakNode(node.getChildAtIndex(anchor.offset - 1));
  let textOffset = 0;

  // Calculating previous text offset (all text node prior to anchor + anchor own text offset)
  if (!isNewLineAnchor) {
    const anchorNode = anchor.getNode();
    textOffset =
      anchorOffset +
      anchorNode.getPreviousSiblings().reduce((offset, node) => {
        return (
          offset + ($isLineBreakNode(node) ? 0 : node.getTextContentSize())
        );
      }, 0);
  }

  const hasChanges = updateFn();
  if (!hasChanges) {
    return;
  }

  // Non-text anchors only happen for line breaks, otherwise
  // selection will be within text node (code highlight node)
  if (isNewLineAnchor) {
    anchor.getNode().select(anchorOffset, anchorOffset);
    return;
  }

  // If it was non-element anchor then we walk through child nodes
  // and looking for a position of original text offset
  node.getChildren().some((node) => {
    if ($isTextNode(node)) {
      const textContentSize = node.getTextContentSize();
      if (textContentSize >= textOffset) {
        node.select(textOffset, textOffset);
        return true;
      }
      textOffset -= textContentSize;
    }
    return false;
  });
}

// Inserts notes into specific range of node's children. Works for replacement (from != to && nodesToInsert not empty),
// insertion (from == to && nodesToInsert not empty) and deletion (from != to && nodesToInsert is empty)
function replaceRange(
  node: ElementNode,
  from: number,
  to: number,
  nodesToInsert: Array<LexicalNode>,
): void {
  let children = node.getChildren();
  for (let i = from; i < to; i++) {
    children[i].remove();
  }

  children = node.getChildren();
  if (children.length === 0) {
    node.append(...nodesToInsert);
    return;
  }

  if (from === 0) {
    const firstChild = children[0];
    for (let i = 0; i < nodesToInsert.length; i++) {
      firstChild.insertBefore(nodesToInsert[i]);
    }
  } else {
    let currentNode = children[from - 1] || children[children.length - 1];
    for (let i = 0; i < nodesToInsert.length; i++) {
      currentNode.insertAfter(nodesToInsert[i]);
      currentNode = nodesToInsert[i];
    }
  }
}

// Finds minimal diff range between two nodes lists. It returns from/to range boundaries of prevNodes
// that needs to be replaced with `nodes` (subset of nextNodes) to make prevNodes equal to nextNodes.
function getDiffRange(
  prevNodes: Array<LexicalNode>,
  nextNodes: Array<LexicalNode>,
): {
  from: number,
  to: number,
  nodesForReplacement: Array<LexicalNode>,
} | null {
  let leadingMatch = 0;
  while (leadingMatch < prevNodes.length) {
    if (!isEqual(prevNodes[leadingMatch], nextNodes[leadingMatch])) {
      break;
    }
    leadingMatch++;
  }

  const prevNodesLength = prevNodes.length;
  const nextNodesLength = nextNodes.length;
  const maxTrailingMatch =
    Math.min(prevNodesLength, nextNodesLength) - leadingMatch;

  let trailingMatch = 0;
  while (trailingMatch < maxTrailingMatch) {
    trailingMatch++;
    if (
      !isEqual(
        prevNodes[prevNodesLength - trailingMatch],
        nextNodes[nextNodesLength - trailingMatch],
      )
    ) {
      trailingMatch--;
      break;
    }
  }

  const from = leadingMatch;
  const to = prevNodesLength - trailingMatch;
  const nodesForReplacement = nextNodes.slice(
    leadingMatch,
    nextNodesLength - trailingMatch,
  );
  const hasChanges = from !== to || nodesForReplacement.length > 0;
  return hasChanges
    ? {
        from,
        to,
        nodesForReplacement,
      }
    : null;
}

function isEqual(nodeA: LexicalNode, nodeB: LexicalNode): boolean {
  // Only checking for code higlight nodes and linebreaks. If it's regular text node
  // returning false so that it's transformed into code highlight node
  if ($isCodeHighlightNode(nodeA) && $isCodeHighlightNode(nodeB)) {
    return (
      nodeA.__text === nodeB.__text &&
      nodeA.__highlightType === nodeB.__highlightType
    );
  }

  if ($isLineBreakNode(nodeA) && $isLineBreakNode(nodeB)) {
    return true;
  }

  return false;
}
