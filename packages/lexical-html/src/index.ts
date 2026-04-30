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
  EditorDOMRenderConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {$sliceSelectedTextNodeContent} from '@lexical/selection';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $getEditor,
  $getEditorDOMRenderConfig,
  $getRoot,
  $isBlockElementNode,
  $isElementNode,
  $isRootOrShadowRoot,
  $isTextNode,
  ArtificialNode__DO_NOT_USE,
  ElementNode,
  isBlockDomNode,
  isDocumentFragment,
  isDOMDocumentNode,
  isHTMLElement,
  isInlineDomNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {contextValue} from './ContextRecord';
import {
  $withRenderContext,
  RenderContextExport,
  RenderContextRoot,
} from './RenderContext';

export {contextUpdater, contextValue} from './ContextRecord';
export {domOverride} from './domOverride';
export {DOMRenderExtension} from './DOMRenderExtension';
export {
  $getRenderContextValue,
  $withRenderContext,
  createRenderState,
  RenderContextExport,
  RenderContextRoot,
} from './RenderContext';
export type {
  AnyDOMRenderMatch,
  AnyRenderStateConfig,
  AnyRenderStateConfigPairOrUpdater,
  ContextPairOrUpdater,
  DOMRenderConfig,
  DOMRenderExtensionOutput,
  DOMRenderMatch,
  NodeMatch,
} from './types';

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.constructor.name === CSSStyleRule.name;
}

/**
 * Inlines CSS rules from <style> tags onto matching elements as inline styles.
 * This is needed because apps like Excel generate HTML where styles live in
 * class-based <style> rules (e.g. `.xl65 { background: #FFFF00; color: blue; }`)
 * rather than inline styles. Since Lexical's import converters read inline styles,
 * we resolve stylesheet rules into inline styles before conversion.
 *
 * Mutates the DOM in-place. Original inline styles always take precedence over
 * stylesheet rules (matching CSS specificity behavior).
 */
function inlineStylesFromStyleSheets(doc: Document): void {
  if (doc.querySelector('style') === null) {
    return;
  }

  const originalInlineStyles = new Map<HTMLElement, Set<string>>();

  function getOriginalInlineProps(el: HTMLElement): Set<string> {
    let props = originalInlineStyles.get(el);
    if (props === undefined) {
      props = new Set<string>();
      for (let i = 0; i < el.style.length; i++) {
        props.add(el.style[i]);
      }
      originalInlineStyles.set(el, props);
    }
    return props;
  }

  try {
    for (const sheet of Array.from(doc.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (!isStyleRule(rule)) {
          continue;
        }
        let elements: NodeListOf<Element>;
        try {
          elements = doc.querySelectorAll(rule.selectorText);
        } catch {
          continue;
        }
        for (const el of Array.from(elements)) {
          if (!isHTMLElement(el)) {
            continue;
          }
          const originalProps = getOriginalInlineProps(el);
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (!originalProps.has(prop)) {
              el.style.setProperty(
                prop,
                rule.style.getPropertyValue(prop),
                rule.style.getPropertyPriority(prop),
              );
            }
          }
        }
      }
    }
  } catch {
    // styleSheets API not supported in this environment
  }
}

const IGNORE_TAGS = new Set(['STYLE', 'SCRIPT']);

/**
 * How you parse your html string to get a document is left up to you. In the browser you can use the native
 * DOMParser API to generate a document (see clipboard.ts), but to use in a headless environment you can use JSDom
 * or an equivalent library and pass in the document here.
 */
export function $generateNodesFromDOM(
  editor: LexicalEditor,
  dom: Document | ParentNode,
): Array<LexicalNode> {
  if (isDOMDocumentNode(dom)) {
    inlineStylesFromStyleSheets(dom);
  }

  const elements = isDOMDocumentNode(dom)
    ? dom.body.childNodes
    : dom.childNodes;
  const lexicalNodes: Array<LexicalNode> = [];
  const allArtificialNodes: Array<ArtificialNode__DO_NOT_USE> = [];
  for (const element of elements) {
    if (!IGNORE_TAGS.has(element.nodeName)) {
      const lexicalNode = $createNodesFromDOM(
        element,
        editor,
        allArtificialNodes,
        false,
      );
      if (lexicalNode !== null) {
        for (const node of lexicalNode) {
          lexicalNodes.push(node);
        }
      }
    }
  }
  $unwrapArtificialNodes(allArtificialNodes);

  return lexicalNodes;
}

/**
 * Generate DOM nodes from the editor state into the given container element,
 * using the editor's {@link EditorDOMRenderConfig}.
 * @experimental
 */
export function $generateDOMFromNodes<T extends HTMLElement | DocumentFragment>(
  container: T,
  selection: null | BaseSelection = null,
  editor: LexicalEditor = $getEditor(),
): T {
  return $withRenderContext(
    [contextValue(RenderContextExport, true)],
    editor,
  )(() => {
    const root = $getRoot();
    const domConfig = $getEditorDOMRenderConfig(editor);

    const parentElementAppend = container.append.bind(container);
    for (const topLevelNode of root.getChildren()) {
      $appendNodesToHTML(
        editor,
        topLevelNode,
        parentElementAppend,
        selection,
        domConfig,
      );
    }
    return container;
  });
}

/**
 * Generate DOM nodes from a root node into the given container element,
 * including the root node itself. Uses the editor's {@link EditorDOMRenderConfig}.
 * @experimental
 */
export function $generateDOMFromRoot<T extends HTMLElement | DocumentFragment>(
  container: T,
  root: LexicalNode = $getRoot(),
): T {
  const editor = $getEditor();
  return $withRenderContext(
    [
      contextValue(RenderContextExport, true),
      contextValue(RenderContextRoot, true),
    ],
    editor,
  )(() => {
    const selection = null;
    const domConfig = $getEditorDOMRenderConfig(editor);
    const parentElementAppend = container.append.bind(container);
    $appendNodesToHTML(editor, root, parentElementAppend, selection, domConfig);
    return container;
  });
}

export function $generateHtmlFromNodes(
  editor: LexicalEditor,
  selection: BaseSelection | null = null,
): string {
  if (
    typeof document === 'undefined' ||
    (typeof window === 'undefined' && typeof global.window === 'undefined')
  ) {
    invariant(
      false,
      'To use $generateHtmlFromNodes in headless mode please initialize a headless browser implementation such as JSDom or use withDOM from @lexical/headless/dom before calling this function.',
    );
  }
  return $generateDOMFromNodes(document.createElement('div'), selection, editor)
    .innerHTML;
}

function $appendNodesToHTML(
  editor: LexicalEditor,
  currentNode: LexicalNode,
  parentElementAppend: (element: Node) => void,
  selection: BaseSelection | null = null,
  domConfig: EditorDOMRenderConfig = $getEditorDOMRenderConfig(editor),
): boolean {
  let shouldInclude = domConfig.$shouldInclude(currentNode, selection, editor);
  const shouldExclude = domConfig.$shouldExclude(
    currentNode,
    selection,
    editor,
  );
  let target = currentNode;

  if (selection !== null && $isTextNode(currentNode)) {
    target = $sliceSelectedTextNodeContent(selection, currentNode, 'clone');
  }
  const exportProps = domConfig.$exportDOM(target, editor);
  const {element, after, append, $getChildNodes} = exportProps;

  if (!element) {
    return false;
  }

  const fragment = document.createDocumentFragment();
  const children = $getChildNodes
    ? $getChildNodes()
    : $isElementNode(target)
      ? target.getChildren()
      : [];

  const fragmentAppend = fragment.append.bind(fragment);
  for (const childNode of children) {
    const shouldIncludeChild = $appendNodesToHTML(
      editor,
      childNode,
      fragmentAppend,
      selection,
      domConfig,
    );

    if (
      !shouldInclude &&
      shouldIncludeChild &&
      domConfig.$extractWithChild(
        currentNode,
        childNode,
        selection,
        'html',
        editor,
      )
    ) {
      shouldInclude = true;
    }
  }

  if (shouldInclude && !shouldExclude) {
    if (isHTMLElement(element) || isDocumentFragment(element)) {
      if (append) {
        append(fragment);
      } else {
        element.append(fragment);
      }
    }
    parentElementAppend(element);

    if (after) {
      const newElement = after.call(target, element);
      if (newElement) {
        if (isDocumentFragment(element)) {
          element.replaceChildren(newElement);
        } else {
          element.replaceWith(newElement);
        }
      }
    }
  } else {
    parentElementAppend(fragment);
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
          // Given equal priority, prefer the last registered importer
          // which is typically an application custom node or HTMLConfig['import']
          (currentConversion.priority || 0) <= (domConversion.priority || 0))
      ) {
        currentConversion = domConversion;
      }
    }
  }

  return currentConversion !== null ? currentConversion.conversion : null;
}

function $createNodesFromDOM(
  node: Node,
  editor: LexicalEditor,
  allArtificialNodes: Array<ArtificialNode__DO_NOT_USE>,
  hasBlockAncestorLexicalNode: boolean,
  forChildMap: Map<string, DOMChildConversion> = new Map(),
  parentLexicalNode?: LexicalNode | null | undefined,
): Array<LexicalNode> {
  const lexicalNodes: Array<LexicalNode> = [];

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
    if (childLexicalNodes.length > 0) {
      // If it hasn't been converted to a LexicalNode, we hoist its children
      // up to the same level as it.
      for (const childNode of childLexicalNodes) {
        lexicalNodes.push(childNode);
      }
    } else {
      if (isBlockDomNode(node) && isDomNodeBetweenTwoInlineNodes(node)) {
        // Empty block dom node that hasnt been converted, we replace it with a linebreak if its between inline nodes
        lexicalNodes.push($createLineBreakNode());
      }
    }
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
      if (textAlign && !node.getFormat()) {
        node.setFormat(textAlign);
      }
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

function $unwrapArtificialNodes(
  allArtificialNodes: Array<ArtificialNode__DO_NOT_USE>,
) {
  // Replace artificial node with its children, inserting a linebreak
  // between adjacent artificial nodes
  for (const node of allArtificialNodes) {
    if (
      node.getParent() &&
      node.getNextSibling() instanceof ArtificialNode__DO_NOT_USE
    ) {
      node.insertAfter($createLineBreakNode());
    }
  }
  for (const node of allArtificialNodes) {
    const parent = node.getParent();
    if (parent) {
      parent.splice(node.getIndexWithinParent(), 1, node.getChildren());
    }
  }
}

function isDomNodeBetweenTwoInlineNodes(node: Node): boolean {
  if (node.nextSibling == null || node.previousSibling == null) {
    return false;
  }
  return (
    isInlineDomNode(node.nextSibling) && isInlineDomNode(node.previousSibling)
  );
}
