/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// eslint-disable-next-line simple-import-sort/imports
import {
  $createLineBreakNode,
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  TextNode,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {
  CodeNode,
  $isCodeNode,
  registerCodeIndent,
  $createCodeHighlightNode,
  $isCodeHighlightNode,
  CodeHighlightNode,
  updateCodeGutter,
} from '@lexical/code';

import * as Prism from 'prismjs';

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

import {mergeRegister} from '@lexical/utils';

const DEFAULT_CODE_LANGUAGE = 'javascript';

// Wrapping update function into selection retainer, that tries to keep cursor at the same
// position as before.
function updateAndRetainSelection(
  node: CodeNode,
  updateFn: () => boolean,
): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.anchor) {
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
      anchorNode.getPreviousSiblings().reduce((offset, _node) => {
        return (
          offset + ($isLineBreakNode(_node) ? 0 : _node.getTextContentSize())
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
  node.getChildren().some((_node) => {
    if ($isTextNode(_node)) {
      const textContentSize = _node.getTextContentSize();
      if (textContentSize >= textOffset) {
        _node.select(textOffset, textOffset);
        return true;
      }
      textOffset -= textContentSize;
    }
    return false;
  });
}

function getHighlightNodes(
  tokens: (string | Prism.Token)[],
): Array<LexicalNode> {
  const nodes: LexicalNode[] = [];
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
      } else if (
        Array.isArray(content) &&
        content.length === 1 &&
        typeof content[0] === 'string'
      ) {
        nodes.push($createCodeHighlightNode(content[0], token.type));
      } else if (Array.isArray(content)) {
        nodes.push(...getHighlightNodes(content));
      }
    }
  });

  return nodes;
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

// Finds minimal diff range between two nodes lists. It returns from/to range boundaries of prevNodes
// that needs to be replaced with `nodes` (subset of nextNodes) to make prevNodes equal to nextNodes.
function getDiffRange(
  prevNodes: Array<LexicalNode>,
  nextNodes: Array<LexicalNode>,
): {
  from: number;
  nodesForReplacement: Array<LexicalNode>;
  to: number;
} {
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
  return {
    from,
    nodesForReplacement,
    to,
  };
}

// Using `skipTransforms` to prevent extra transforms since reformatting the code
// will not affect code block content itself.

// Using extra flag (`isHighlighting`) since both CodeNode and CodeHighlightNode
// trasnforms might be called at the same time (e.g. new CodeHighlight node inserted) and
// in both cases we'll rerun whole reformatting over CodeNode, which is redundant.
// Especially when pasting code into CodeBlock.
let isHighlighting = false;
function codeNodeTransform(
  node: CodeNode,
  editor: LexicalEditor,
  threshold?: number,
) {
  if (isHighlighting) {
    return;
  }
  isHighlighting = true;
  // When new code block inserted it might not have language selected
  if (node.getLanguage() === undefined) {
    node.setLanguage(DEFAULT_CODE_LANGUAGE);
  }
  // Using nested update call to pass `skipTransforms` since we don't want
  // each individual codehighlight node to be transformed again as it's already
  // in its final state
  const code = node.getTextContent();
  editor.update(
    () => {
      updateAndRetainSelection(node, () => {
        const tokens = Prism.tokenize(
          code,
          Prism.languages[node.getLanguage() || ''] ||
            Prism.languages[DEFAULT_CODE_LANGUAGE],
        );
        const highlightNodes = getHighlightNodes(tokens);
        const diffRange = getDiffRange(node.getChildren(), highlightNodes);
        const {from, to, nodesForReplacement} = diffRange;
        if (from !== to || nodesForReplacement.length) {
          if (code.length <= threshold) {
            node.splice(from, to - from, nodesForReplacement);
          } else {
            const codeContent = code.split('\n');
            node.clear();
            for (let i = 0; i < codeContent.length; i++) {
              node.append($createTextNode(codeContent[i]));
              if (i !== codeContent.length - 1) {
                node.append($createLineBreakNode());
              }
            }
          }

          return true;
        }
        return false;
      });
    },
    {
      onUpdate: () => {
        isHighlighting = false;
      },
      skipTransforms: true,
    },
  );
}

function textNodeTransform(
  node: TextNode,
  editor: LexicalEditor,
  threshold?: number,
): void {
  // Since CodeNode has flat children structure we only need to check
  // if node's parent is a code node and run highlighting if so
  const parentNode = node.getParent();
  if ($isCodeNode(parentNode)) {
    codeNodeTransform(parentNode, editor, threshold);
  } else if ($isCodeHighlightNode(node)) {
    // When code block converted into paragraph or other element
    // code highlight nodes converted back to normal text
    node.replace($createTextNode(node.__text));
  }
}

export function registerCodeHighlighting(
  editor: LexicalEditor,
  threshold: number,
): () => void {
  if (!editor.hasNodes([CodeNode, CodeHighlightNode])) {
    throw new Error(
      'CodeHighlightPlugin: CodeNode or CodeHighlightNode not registered on editor',
    );
  }

  return mergeRegister(
    editor.registerMutationListener(CodeNode, (mutations) => {
      editor.update(() => {
        for (const [key, type] of mutations) {
          if (type !== 'destroyed') {
            const node = $getNodeByKey(key);
            if (node !== null) {
              updateCodeGutter(node as CodeNode, editor);
            }
          }
        }
      });
    }),
    editor.registerNodeTransform(CodeNode, (node) =>
      codeNodeTransform(node, editor, threshold),
    ),
    editor.registerNodeTransform(TextNode, (node) =>
      textNodeTransform(node, editor, threshold),
    ),
    editor.registerNodeTransform(CodeHighlightNode, (node) =>
      textNodeTransform(node, editor, threshold),
    ),
    registerCodeIndent(editor),
  );
}
