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
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {
  $cloneWithProperties,
  $sliceSelectedTextNodeContent,
} from '@lexical/selection';
import {isBlockDomNode, isHTMLElement} from '@lexical/utils';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $getRoot,
  $isBlockElementNode,
  $isElementNode,
  $isRootOrShadowRoot,
  $isTextNode,
  ArtificialNode__DO_NOT_USE,
  ElementNode,
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
  const allArtificialNodes: Array<ArtificialNode__DO_NOT_USE> = [];
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (!IGNORE_TAGS.has(element.nodeName)) {
      const lexicalNode = $createNodesFromDOM(
        element,
        editor,
        allArtificialNodes,
        false,
      );
      if (lexicalNode !== null) {
        lexicalNodes = lexicalNodes.concat(lexicalNode);
      }
    }
  }
  $unwrapArtificalNodes(allArtificialNodes);

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
  allArtificialNodes: Array<ArtificialNode__DO_NOT_USE>,
  hasBlockAncestorLexicalNode: boolean,
  forChildMap: Map<string, DOMChildConversion> = new Map(),
  parentLexicalNode?: LexicalNode | null | undefined,
): Array<LexicalNode> {
  let lexicalNodes: Array<LexicalNode> = [];

  if (IGNORE_TAGS.has(node.nodeName)) {
    return lexicalNodes;
  }

  let currentLexicalNode = null;
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
  let childLexicalNodes = [];

  const hasBlockAncestorLexicalNodeForChildren =
    currentLexicalNode != null && $isRootOrShadowRoot(currentLexicalNode)
      ? false
      : (currentLexicalNode != null &&
          $isBlockElementNode(currentLexicalNode)) ||
        hasBlockAncestorLexicalNode;

  for (let i = 0; i < children.length; i++) {
    childLexicalNodes.push(
      ...$createNodesFromDOM(
        children[i],
        editor,
        allArtificialNodes,
        hasBlockAncestorLexicalNodeForChildren,
        new Map(forChildMap),
        currentLexicalNode,
      ),
    );
  }

  if (postTransform != null) {
    childLexicalNodes = postTransform(childLexicalNodes);
  }

  if (isBlockDomNode(node)) {
    if (!hasBlockAncestorLexicalNodeForChildren) {
      childLexicalNodes = wrapContinuousInlines(
        node,
        childLexicalNodes,
        $createParagraphNode,
      );
    } else {
      childLexicalNodes = wrapContinuousInlines(node, childLexicalNodes, () => {
        const artificialNode = new ArtificialNode__DO_NOT_USE();
        allArtificialNodes.push(artificialNode);
        return artificialNode;
      });
    }
  }

  if (currentLexicalNode == null) {
    // If it hasn't been converted to a LexicalNode, we hoist its children
    // up to the same level as it.
    lexicalNodes = lexicalNodes.concat(childLexicalNodes);
  } else {
    if ($isElementNode(currentLexicalNode)) {
      // If the current node is a ElementNode after conversion,
      // we can append all the children to it.
      currentLexicalNode.append(...childLexicalNodes);
    }
  }

  return lexicalNodes;
}

function wrapContinuousInlines(
  domNode: Node,
  nodes: Array<LexicalNode>,
  createWrapperFn: () => ElementNode,
): Array<LexicalNode> {
  const textAlign = (domNode as HTMLElement).style
    .textAlign as ElementFormatType;
  const out: Array<LexicalNode> = [];
  let continuousInlines: Array<LexicalNode> = [];
  // wrap contiguous inline child nodes in para
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if ($isBlockElementNode(node)) {
      node.setFormat(textAlign);
      out.push(node);
    } else {
      continuousInlines.push(node);
      if (
        i === nodes.length - 1 ||
        (i < nodes.length - 1 && $isBlockElementNode(nodes[i + 1]))
      ) {
        const wrapper = createWrapperFn();
        wrapper.setFormat(textAlign);
        wrapper.append(...continuousInlines);
        out.push(wrapper);
        continuousInlines = [];
      }
    }
  }
  return out;
}

function $unwrapArtificalNodes(
  allArtificialNodes: Array<ArtificialNode__DO_NOT_USE>,
) {
  for (const node of allArtificialNodes) {
    if (node.getNextSibling() instanceof ArtificialNode__DO_NOT_USE) {
      node.insertAfter($createLineBreakNode());
    }
  }
  // Replace artificial node with it's children
  for (const node of allArtificialNodes) {
    const children = node.getChildren();
    for (const child of children) {
      node.insertBefore(child);
    }
    node.remove();
  }
}
