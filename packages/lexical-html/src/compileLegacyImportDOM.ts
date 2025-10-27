/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {DOMImportExtensionOutput, DOMImportOutput} from './types';

import {
  $createLineBreakNode,
  $createParagraphNode,
  $isBlockElementNode,
  $isElementNode,
  $isRootOrShadowRoot,
  ArtificialNode__DO_NOT_USE,
  type DOMConversionOutput,
  isBlockDomNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {$wrapContinuousInlinesInPlace} from './$wrapContinuousInlinesInPlace';
import {EMPTY_ARRAY, IGNORE_TAGS} from './constants';
import {contextUpdater} from './ContextRecord';
import {getConversionFunction} from './getConversionFunction';
import {
  $addImportChildContext,
  $addImportContextFinalizer,
  $getImportContextValue,
  ImportContextArtificialNodes,
  ImportContextForChildMap,
  ImportContextHasBlockAncestorLexicalNode,
  ImportContextParentLexicalNode,
} from './ImportContext';
import {isDomNodeBetweenTwoInlineNodes} from './isDomNodeBetweenTwoInlineNodes';

export function compileLegacyImportDOM(
  editor: LexicalEditor,
): DOMImportExtensionOutput['$importNode'] {
  return (node) => {
    if (IGNORE_TAGS.has(node.nodeName)) {
      return {childNodes: EMPTY_ARRAY, node: null};
    }
    // If the DOM node doesn't have a transformer, we don't know what
    // to do with it but we still need to process any childNodes.
    let childLexicalNodes: LexicalNode[] = [];
    let postTransform: DOMConversionOutput['after'];
    const output: DOMImportOutput = {
      $appendChild: (childNode) => childLexicalNodes.push(childNode),
      node: null,
    };
    $addImportContextFinalizer((nodeOrNodes) => {
      const finalLexicalNodes = Array.isArray(nodeOrNodes)
        ? nodeOrNodes
        : nodeOrNodes
          ? [nodeOrNodes]
          : [];
      const finalLexicalNode: null | LexicalNode =
        finalLexicalNodes[finalLexicalNodes.length - 1] || null;
      if (postTransform) {
        childLexicalNodes = postTransform(childLexicalNodes);
      }
      if (isBlockDomNode(node)) {
        const hasBlockAncestorLexicalNodeForChildren =
          finalLexicalNode && $isRootOrShadowRoot(finalLexicalNode)
            ? false
            : (finalLexicalNode && $isBlockElementNode(finalLexicalNode)) ||
              $getImportContextValue(ImportContextHasBlockAncestorLexicalNode);

        if (!hasBlockAncestorLexicalNodeForChildren) {
          $wrapContinuousInlinesInPlace(
            node,
            childLexicalNodes,
            $createParagraphNode,
          );
        } else {
          const allArtificialNodes = $getImportContextValue(
            ImportContextArtificialNodes,
          );
          invariant(
            allArtificialNodes !== null,
            'Missing ImportContextArtificialNodes',
          );
          $wrapContinuousInlinesInPlace(node, childLexicalNodes, () => {
            const artificialNode = new ArtificialNode__DO_NOT_USE();
            allArtificialNodes.push(artificialNode);
            return artificialNode;
          });
        }
      }

      if (finalLexicalNode == null) {
        if (childLexicalNodes.length > 0) {
          // If it hasn't been converted to a LexicalNode, we hoist its children
          // up to the same level as it.
          finalLexicalNodes.push(...childLexicalNodes);
        } else {
          if (isBlockDomNode(node) && isDomNodeBetweenTwoInlineNodes(node)) {
            // Empty block dom node that hasnt been converted, we replace it with a linebreak if its between inline nodes
            finalLexicalNodes.push($createLineBreakNode());
          }
        }
      } else {
        if ($isElementNode(finalLexicalNode)) {
          // If the current node is a ElementNode after conversion,
          // we can append all the children to it.
          finalLexicalNode.append(...childLexicalNodes);
        }
      }

      return finalLexicalNodes;
    });
    let currentLexicalNode: null | LexicalNode = null;
    const transformFunction = getConversionFunction(node, editor);
    const transformOutput = transformFunction
      ? transformFunction(node as HTMLElement)
      : null;

    if (transformOutput !== null) {
      const forChildMap = $getImportContextValue(
        ImportContextForChildMap,
        editor,
      );
      const parentLexicalNode = $getImportContextValue(
        ImportContextParentLexicalNode,
        editor,
      );
      postTransform = transformOutput.after;
      let transformNodeArray = Array.isArray(transformOutput.node)
        ? transformOutput.node
        : transformOutput.node
          ? [transformOutput.node]
          : [];

      if (transformNodeArray.length > 0 && forChildMap) {
        const transformWithForChild = (initial: LexicalNode) => {
          let current: null | undefined | LexicalNode = initial;
          for (const forChildFunction of forChildMap.values()) {
            current = forChildFunction(current, parentLexicalNode);

            if (!current) {
              return [];
            }
          }
          return [current];
        };
        transformNodeArray = transformNodeArray.flatMap(transformWithForChild);
      }
      currentLexicalNode =
        transformNodeArray[transformNodeArray.length - 1] || null;
      output.node =
        transformNodeArray.length > 1 ? transformNodeArray : currentLexicalNode;

      if (transformOutput.forChild) {
        const {forChild} = transformOutput;
        $addImportChildContext(
          contextUpdater(ImportContextForChildMap, (prev) => {
            return new Map(prev || forChildMap || []).set(
              node.nodeName,
              forChild,
            );
          }),
        );
      }
    }

    return output;
  };
}
