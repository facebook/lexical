/** @module @lexical/html */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMChildConversion,
  DOMConversion,
  DOMConversionFn,
  GridSelection,
  LexicalEditor,
  LexicalNode,
  NodeSelection,
  RangeSelection,
} from 'lexical';

import {
  $cloneWithProperties,
  $sliceSelectedTextNodeContent,
} from '@lexical/selection';
import {$getRoot, $isElementNode, $isTextNode} from 'lexical';
import invariant from 'shared/invariant';

import {cache2Get, cache2Set} from './utils';

let findParentNodeCache: null | Map<
  Node,
  Map<FindCachedParentDOMNodeSearchFn, null | Node>
> = null;

export type FindCachedParentDOMNode = (
  node: Node,
  searchFn: FindCachedParentDOMNodeSearchFn,
) => null | Node;
export type FindCachedParentDOMNodeSearchFn = (node: Node) => boolean;

export function $findParentDOMNode(
  node: Node,
  searchFn: FindCachedParentDOMNodeSearchFn,
) {
  invariant(
    findParentNodeCache !== null,
    'Expected findParentNodeCache to have been initialized. This function is should be called inside importDOM. Did you call this inside $generateNodesFromDOM?',
  );
  let parent = node.parentNode;
  let cached;
  if ((cached = cache2Get(findParentNodeCache, node, searchFn)) !== undefined) {
    return cached;
  }
  const visited = [node];
  while (
    parent !== null &&
    (cached = cache2Get(findParentNodeCache, parent, searchFn)) === undefined &&
    !searchFn(parent)
  ) {
    visited.push(parent);
    parent = parent.parentNode;
  }
  const resultNode = cached === undefined ? parent : cached;
  for (let i = 0; i < visited.length; i++) {
    cache2Set(findParentNodeCache, visited[i], searchFn, resultNode);
  }
  return resultNode;
}

/**
 * How you parse your html string to get a document is left up to you. In the browser you can use the native
 * DOMParser API to generate a document (see clipboard.ts), but to use in a headless environment you can use JSDom
 * or an equivilant library and pass in the document here.
 */
export function $generateNodesFromDOM(
  editor: LexicalEditor,
  dom: Document,
): Array<LexicalNode> {
  const elements = dom.body ? dom.body.childNodes : [];
  let lexicalNodes: Array<LexicalNode> = [];
  findParentNodeCache = new Map();
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (!IGNORE_TAGS.has(element.nodeName)) {
      const lexicalNode = $createNodesFromDOM(element, editor);
      if (lexicalNode !== null) {
        lexicalNodes = lexicalNodes.concat(lexicalNode);
      }
    }
  }
  findParentNodeCache = null;

  return lexicalNodes;
}

export function $generateHtmlFromNodes(
  editor: LexicalEditor,
  selection?: RangeSelection | NodeSelection | GridSelection | null,
): string {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
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
  selection: RangeSelection | NodeSelection | GridSelection | null = null,
): boolean {
  let shouldInclude =
    selection != null ? currentNode.isSelected(selection) : true;
  const shouldExclude =
    $isElementNode(currentNode) && currentNode.excludeFromCopy('html');
  let target = currentNode;

  if (selection !== null) {
    let clone = $cloneWithProperties<LexicalNode>(currentNode);
    clone =
      $isTextNode(clone) && selection != null
        ? $sliceSelectedTextNodeContent(selection, clone)
        : clone;
    target = clone;
  }
  const children = $isElementNode(target) ? target.getChildren() : [];
  const {element, after} = target.exportDOM(editor);

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
    element.append(fragment);
    parentElement.append(element);

    if (after) {
      const newElement = after.call(target, element);
      if (newElement) element.replaceWith(newElement);
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
          currentConversion.priority < domConversion.priority)
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
      // If the current node is a ElementNode after conversion,
      // we can append all the children to it.
      currentLexicalNode.append(...childLexicalNodes);
    }
  }

  return lexicalNodes;
}
