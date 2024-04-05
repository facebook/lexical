/** @module @lexical/html */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  BaseSelection,
  DOMChildConversion,
  DOMConversion,
  DOMConversionFn,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {
  $cloneWithProperties,
  $sliceSelectedTextNodeContent,
} from '@lexical/selection';
import {isHTMLElement} from '@lexical/utils';
import {
  $createParagraphNode,
  $getRoot,
  $isBlockElementNode,
  $isElementNode,
  $isTextNode,
} from 'lexical';

/**
 * How you parse your html string to get a document is left up to you. In the browser you can use the native
 * DOMParser API to generate a document (see clipboard.ts), but to use in a headless environment you can use JSDom
 * or an equivalent library and pass in the document here.
 */
export function $generateNodesFromDOM(
  editor: LexicalEditor,
  dom: Document,
): Array<LexicalNode> {
  const elements = dom.body ? dom.body.childNodes : [];
  let lexicalNodes: Array<LexicalNode> = [];
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (!IGNORE_TAGS.has(element.nodeName)) {
      const lexicalNode = $createNodesFromDOM(element, editor);
      if (lexicalNode !== null) {
        lexicalNodes = lexicalNodes.concat(lexicalNode);
      }
    }
  }

  return lexicalNodes;
}

export function $generateHtmlFromNodes(
  editor: LexicalEditor,
  selection?: BaseSelection | null,
): string {
  if (
    typeof document === 'undefined' ||
    (typeof window === 'undefined' && typeof global.window === 'undefined')
  ) {
    throw new Error(
      'To use $generateHtmlFromNodes in headless mode please initialize a headless browser implementation such as JSDom before calling this function.',
    );
  }

  const container = document.createElement('div');
  const root = $getRoot();
  const topLevelChildren = root.getChildren();

  for (let i = 0; i < topLevelChildren.length; i++) {
    const topLevelNode = topLevelChildren[i];
    $appendNodesToHTML(editor, topLevelNode, container, selection);
  }

  return container.innerHTML;
}

function $appendNodesToHTML(
  editor: LexicalEditor,
  currentNode: LexicalNode,
  parentElement: HTMLElement | DocumentFragment,
  selection: BaseSelection | null = null,
): boolean {
  let shouldInclude =
    selection !== null ? currentNode.isSelected(selection) : true;
  const shouldExclude =
    $isElementNode(currentNode) && currentNode.excludeFromCopy('html');
  let target = currentNode;

  if (selection !== null) {
    let clone = $cloneWithProperties<LexicalNode>(currentNode);
    clone =
      $isTextNode(clone) && selection !== null
        ? $sliceSelectedTextNodeContent(selection, clone)
        : clone;
    target = clone;
  }
  const children = $isElementNode(target) ? target.getChildren() : [];
  const registeredNode = editor._nodes.get(target.getType());
  let exportOutput;

  // Use HTMLConfig overrides, if available.
  if (registeredNode && registeredNode.exportDOM !== undefined) {
    exportOutput = registeredNode.exportDOM(editor, target);
  } else {
    exportOutput = target.exportDOM(editor);
  }

  const {element, after} = exportOutput;

  if (!element) {
    return false;
  }

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < children.length; i++) {
    const childNode = children[i];
    const shouldIncludeChild = $appendNodesToHTML(
      editor,
      childNode,
      fragment,
      selection,
    );

    if (
      !shouldInclude &&
      $isElementNode(currentNode) &&
      shouldIncludeChild &&
      currentNode.extractWithChild(childNode, selection, 'html')
    ) {
      shouldInclude = true;
    }
  }

  if (shouldInclude && !shouldExclude) {
    if (isHTMLElement(element)) {
      element.append(fragment);
    }
    parentElement.append(element);

    if (after) {
      const newElement = after.call(target, element);
      if (newElement) {
        element.replaceWith(newElement);
      }
    }
  } else {
    parentElement.append(fragment);
  }

  return shouldInclude;
}

function getConversionFunction(
  domNode: Node,
  editor: LexicalEditor,
): DOMConversionFn | null {
  const {nodeName} = domNode;

  const cachedConversions = editor._htmlConversions.get(nodeName.toLowerCase());

  let currentConversion: DOMConversion | null = null;

  if (cachedConversions !== undefined) {
    for (const cachedConversion of cachedConversions) {
      const domConversion = cachedConversion(domNode);

      if (
        domConversion !== null &&
        (currentConversion === null ||
          (currentConversion.priority || 0) < (domConversion.priority || 0))
      ) {
        // [issue?] this means only one conversion function gets to run.
        // If there are multiple nodes initialised with mapping to same html node, only the highest pri function gets ran.
        // why this may be a problem: eg. div has multiple conversion mappings. div could map to a code node, tweet node, etc.
        // If both code node and tweet node initialised, because only code node conversion fn is chosen,
        // the tweet node conversion fn will never get to run on divs
        currentConversion = domConversion;
      }
    }
  }

  return currentConversion !== null ? currentConversion.conversion : null;
}

const IGNORE_TAGS = new Set(['STYLE', 'SCRIPT']);

function $createNodesFromDOM(
  node: Node,
  editor: LexicalEditor,
  forChildMap: Map<string, DOMChildConversion> = new Map(),
  parentLexicalNode?: LexicalNode | null | undefined,
): Array<LexicalNode> {
  let lexicalNodes: Array<LexicalNode> = [];

  if (IGNORE_TAGS.has(node.nodeName)) {
    return lexicalNodes;
  }

  let currentLexicalNode: LexicalNode | null | undefined = null;
  const transformFunction = getConversionFunction(node, editor);
  const transformOutput = transformFunction
    ? transformFunction(node as HTMLElement)
    : null;
  let postTransform = null;

  if (transformOutput !== null) {
    postTransform = transformOutput.after;
    const transformNodes = transformOutput.node;
    currentLexicalNode = Array.isArray(transformNodes)
      ? transformNodes[transformNodes.length - 1]
      : transformNodes;

    if (currentLexicalNode !== null) {
      for (const [, forChildFunction] of forChildMap) {
        currentLexicalNode = forChildFunction(
          currentLexicalNode,
          parentLexicalNode,
        );

        if (!currentLexicalNode) {
          break;
        }
      }

      if (currentLexicalNode) {
        lexicalNodes.push(
          ...(Array.isArray(transformNodes)
            ? transformNodes
            : [currentLexicalNode]),
        );
      }
    }

    if (transformOutput.forChild != null) {
      forChildMap.set(node.nodeName, transformOutput.forChild);
    }
  }

  // If the DOM node doesn't have a transformer, we don't know what
  // to do with it but we still need to process any childNodes.
  const children = node.childNodes;
  let childLexicalNodes: Array<LexicalNode> = [];

  for (let i = 0; i < children.length; i++) {
    childLexicalNodes.push(
      ...$createNodesFromDOM(
        children[i],
        editor,
        new Map(forChildMap),
        currentLexicalNode,
      ),
    );
  }

  if (postTransform != null) {
    childLexicalNodes = postTransform(childLexicalNodes);
  }

  if (currentLexicalNode == null) {
    // If it hasn't been converted to a LexicalNode, we hoist its children
    // up to the same level as it.
    lexicalNodes = lexicalNodes.concat(childLexicalNodes);
  } else {
    if ($isElementNode(currentLexicalNode)) {
      // nightmare starts here, apply to para only? this unnesting of block nodes will break list nodes.
      if ($isBlockElementNode(currentLexicalNode)) {
        const childLexicalNodes2: Array<LexicalNode> = [];
        let childLexicalNodes3: Array<LexicalNode> = [];
        // grp and normalise the kids, wrap leaf nodes in paragraphs (or newlines?)
        childLexicalNodes.forEach(function (c, i) {
          if ($isBlockElementNode(c)) {
            childLexicalNodes2.push(c);
          } else {
            // wrap contiguous block of inline nodes in a paragraph (or another block node eqv? for now just para)
            childLexicalNodes3.push(c);
            if (
              // end the group
              // last node
              i === childLexicalNodes.length - 1 ||
              // second last node
              (i < childLexicalNodes.length - 1 &&
                $isBlockElementNode(childLexicalNodes[i + 1]))
            ) {
              // prolly need to change paraNode to something more generic instead of always being a paragraph, maybe match whatever the current block node is?
              const paraNode = $createParagraphNode();
              paraNode.append(...childLexicalNodes3);
              childLexicalNodes2.push(paraNode);
              childLexicalNodes3 = [];
            }
          }
        });
        // this is returned to parent to process and append as child nodes
        return childLexicalNodes2;
      }
      // If the current node is a ElementNode after conversion,
      // we can append all the children to it.
      currentLexicalNode.append(...childLexicalNodes);
    }
  }

  return lexicalNodes;
}
