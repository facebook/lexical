/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AnyStateConfig,
  BaseSelection,
  DOMChildConversion,
  DOMConversion,
  DOMConversionFn,
  DOMExportOutput,
  EditorDOMConfig,
  ElementDOMSlot,
  ElementFormatType,
  Klass,
  LexicalEditor,
  LexicalNode,
  StateConfig,
} from 'lexical';

import {
  getExtensionDependencyFromEditor,
  LexicalBuilder,
} from '@lexical/extension';
import {$sliceSelectedTextNodeContent} from '@lexical/selection';
import {isBlockDomNode, isHTMLElement} from '@lexical/utils';
import {
  $cloneWithProperties,
  $createLineBreakNode,
  $createParagraphNode,
  $getEditor,
  $getRoot,
  $isBlockElementNode,
  $isElementNode,
  $isRootOrShadowRoot,
  $isTextNode,
  ArtificialNode__DO_NOT_USE,
  createState,
  DEFAULT_EDITOR_DOM_CONFIG,
  defineExtension,
  ElementNode,
  isDocumentFragment,
  isDOMDocumentNode,
  isInlineDomNode,
  RootNode,
  shallowMergeConfig,
} from 'lexical';
import invariant from 'shared/invariant';

/**
 * How you parse your html string to get a document is left up to you. In the browser you can use the native
 * DOMParser API to generate a document (see clipboard.ts), but to use in a headless environment you can use JSDom
 * or an equivalent library and pass in the document here.
 */
export function $generateNodesFromDOM(
  editor: LexicalEditor,
  dom: Document | ParentNode,
): Array<LexicalNode> {
  const elements = isDOMDocumentNode(dom)
    ? dom.body.childNodes
    : dom.childNodes;
  let lexicalNodes: Array<LexicalNode> = [];
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
        lexicalNodes = lexicalNodes.concat(lexicalNode);
      }
    }
  }
  $unwrapArtificialNodes(allArtificialNodes);

  return lexicalNodes;
}

function getEditorDOMConfig(editor: LexicalEditor): EditorDOMConfig {
  return editor._config.dom || DEFAULT_EDITOR_DOM_CONFIG;
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
  domConfig: EditorDOMConfig = getEditorDOMConfig(editor),
): boolean {
  let shouldInclude = domConfig.$shouldInclude(currentNode, selection, editor);
  const shouldExclude = domConfig.$shouldExclude(
    currentNode,
    selection,
    editor,
  );
  let target = currentNode;

  if (selection && $isTextNode(currentNode)) {
    for (const pt of selection.getStartEndPoints() || []) {
      if (pt.key === currentNode.getKey()) {
        target = $sliceSelectedTextNodeContent(
          selection,
          $cloneWithProperties(currentNode),
        );
        break;
      }
    }
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
    if (childLexicalNodes.length > 0) {
      // If it hasn't been converted to a LexicalNode, we hoist its children
      // up to the same level as it.
      lexicalNodes = lexicalNodes.concat(childLexicalNodes);
    } else {
      if (isBlockDomNode(node) && isDomNodeBetweenTwoInlineNodes(node)) {
        // Empty block dom node that hasnt been converted, we replace it with a linebreak if its between inline nodes
        lexicalNodes = lexicalNodes.concat($createLineBreakNode());
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

function isDomNodeBetweenTwoInlineNodes(node: Node): boolean {
  if (node.nextSibling == null || node.previousSibling == null) {
    return false;
  }
  return (
    isInlineDomNode(node.nextSibling) && isInlineDomNode(node.previousSibling)
  );
}

/** @internal @experimental */
export interface DOMConfig {
  overrides: AnyDOMConfigMatch[];
  contextDefaults: AnyStateConfigPair[];
}

/** @internal @experimental */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDOMConfigMatch = DOMConfigMatch<any>;

type NodeMatch<T extends LexicalNode> =
  | Klass<T>
  | ((node: LexicalNode) => node is T);

/** @internal @experimental */
export interface DOMConfigMatch<T extends LexicalNode> {
  readonly nodes: '*' | readonly NodeMatch<T>[];
  $getDOMSlot?: <N extends ElementNode>(
    node: N,
    $next: () => ElementDOMSlot<HTMLElement>,
    editor: LexicalEditor,
  ) => ElementDOMSlot<HTMLElement>;
  $createDOM?: (
    node: T,
    $next: () => HTMLElement,
    editor: LexicalEditor,
  ) => HTMLElement;
  $updateDOM?: (
    nextNode: T,
    prevNode: T,
    dom: HTMLElement,
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
  $exportDOM?: (
    node: T,
    $next: () => DOMExportOutput,
    editor: LexicalEditor,
  ) => DOMExportOutput;
  $shouldExclude?: (
    node: T,
    selection: null | BaseSelection,
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
  $shouldInclude?: (
    node: T,
    selection: null | BaseSelection,
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
  $extractWithChild?: (
    node: T,
    childNode: LexicalNode,
    selection: null | BaseSelection,
    destination: 'clone' | 'html',
    $next: () => boolean,
    editor: LexicalEditor,
  ) => boolean;
}

function compileOverrides(
  {overrides}: DOMConfig,
  defaults: EditorDOMConfig,
): EditorDOMConfig {
  function mergeDOMConfigMatch(
    acc: EditorDOMConfig,
    match: AnyDOMConfigMatch,
  ): EditorDOMConfig {
    // TODO Consider using a node type map to make this more efficient when
    // there are more overrides
    const {
      nodes,
      $getDOMSlot,
      $createDOM,
      $updateDOM,
      $exportDOM,
      $shouldExclude,
      $shouldInclude,
      $extractWithChild,
    } = match;
    const matcher = (node: LexicalNode): boolean => {
      for (const predicate of nodes) {
        if (predicate === '*') {
          return true;
        } else if ('getType' in predicate || '$config' in predicate.prototype) {
          if (node instanceof predicate) {
            return true;
          }
        } else if (predicate(node)) {
          return true;
        }
      }
      return false;
    };
    return {
      $createDOM: $createDOM
        ? (node, editor) => {
            const $next = () => acc.$createDOM(node, editor);
            return matcher(node) ? $createDOM(node, $next, editor) : $next();
          }
        : acc.$createDOM,
      $exportDOM: $exportDOM
        ? (node, editor) => {
            const $next = () => acc.$exportDOM(node, editor);
            return matcher(node) ? $exportDOM(node, $next, editor) : $next();
          }
        : acc.$exportDOM,
      $extractWithChild: $extractWithChild
        ? (node, childNode, selection, destination, editor) => {
            const $next = () =>
              acc.$extractWithChild(
                node,
                childNode,
                selection,
                destination,
                editor,
              );
            return matcher(node)
              ? $extractWithChild(
                  node,
                  childNode,
                  selection,
                  destination,
                  $next,
                  editor,
                )
              : $next();
          }
        : acc.$extractWithChild,
      $getDOMSlot: $getDOMSlot
        ? (node, dom, editor) => {
            const $next = () => acc.$getDOMSlot(node, dom, editor);
            return $isElementNode(node) && matcher(node)
              ? $getDOMSlot(node, $next, editor)
              : $next();
          }
        : acc.$getDOMSlot,
      $shouldExclude: $shouldExclude
        ? (node, selection, editor) => {
            const $next = () => acc.$shouldExclude(node, selection, editor);
            return matcher(node)
              ? $shouldExclude(node, selection, $next, editor)
              : $next();
          }
        : acc.$shouldExclude,
      $shouldInclude: $shouldInclude
        ? (node, selection, editor) => {
            const $next = () => acc.$shouldInclude(node, selection, editor);
            return matcher(node)
              ? $shouldInclude(node, selection, $next, editor)
              : $next();
          }
        : acc.$shouldInclude,
      $updateDOM: $updateDOM
        ? (nextNode, prevNode, dom, editor) => {
            const $next = () => acc.$updateDOM(nextNode, prevNode, dom, editor);
            return matcher(nextNode)
              ? $updateDOM(nextNode, prevNode, dom, $next, editor)
              : $next();
          }
        : acc.$updateDOM,
    };
  }
  // The beginning of the array will be the overrides towards the top
  // of the tree so should be higher precedence, so we compose the functions
  // from the right
  return overrides.reduceRight(mergeDOMConfigMatch, defaults);
}

/** true if this is a whole document export operation ($generateDOMFromRoot) */
export const DOMContextRoot = createState('@lexical/html/root', {
  parse: (v) => !!v,
});

/** true if this is an export operation ($generateHtmlFromNodes) */
export const DOMContextExport = createState('@lexical/html/export', {
  parse: (v) => !!v,
});
/** true if the DOM is for or from the clipboard */
export const DOMContextClipboard = createState('@lexical/html/clipboard', {
  parse: (v) => !!v,
});

export type StateConfigPair<K extends string, V> = readonly [
  StateConfig<K, V>,
  V,
];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyStateConfigPair = StateConfigPair<any, any>;

export interface DOMExtensionOutput {
  defaults: ContextRecord;
}

type ContextRecord = Map<AnyStateConfig, unknown>;

function contextFromPairs(pairs: Iterable<AnyStateConfigPair>): ContextRecord {
  return new Map(pairs);
}

function mergeContext(
  defaults: ContextRecord,
  overrides: ContextRecord | Iterable<AnyStateConfigPair>,
) {
  const ctx = new Map(defaults);
  for (const [k, v] of overrides) {
    ctx.set(k, v);
  }
  return ctx;
}

function getDOMExtensionOutputIfAvailable(
  editor: LexicalEditor,
): undefined | DOMExtensionOutput {
  const builder = LexicalBuilder.maybeFromEditor(editor);
  return builder && builder.hasExtensionByName(DOMExtensionName)
    ? getExtensionDependencyFromEditor(editor, DOMExtension).output
    : undefined;
}

export function getContextValueFromRecord<K extends string, V>(
  context: ContextRecord,
  cfg: StateConfig<K, V>,
): V {
  const v = context.get(cfg);
  return v !== undefined || context.has(cfg) ? (v as V) : cfg.defaultValue;
}

export function $getDOMContextValue<K extends string, V>(
  cfg: StateConfig<K, V>,
  editor: LexicalEditor = $getEditor(),
): V {
  const context =
    activeDOMContext && activeDOMContext.editor === editor
      ? activeDOMContext.context
      : getExtensionDependencyFromEditor(editor, DOMExtension).output.defaults;
  return getContextValueFromRecord(context, cfg);
}

export function $withDOMContext(
  cfg: Iterable<AnyStateConfigPair>,
  editor = $getEditor(),
): <T>(f: () => T) => T {
  const updates = contextFromPairs(cfg);
  return (f) => {
    const prevDOMContext = activeDOMContext;
    let context: ContextRecord;
    if (prevDOMContext && prevDOMContext.editor === editor) {
      context = mergeContext(prevDOMContext.context, updates);
    } else {
      const ext = getDOMExtensionOutputIfAvailable(editor);
      context = ext ? mergeContext(ext.defaults, updates) : updates;
    }
    try {
      activeDOMContext = {context, editor};
      return f();
    } finally {
      activeDOMContext = prevDOMContext;
    }
  };
}

export function $generateDOMFromNodes<T extends HTMLElement | DocumentFragment>(
  container: T,
  selection: null | BaseSelection = null,
  editor: LexicalEditor = $getEditor(),
): T {
  return $withDOMContext(
    [DOMContextExport.pair(true)],
    editor,
  )(() => {
    const root = $getRoot();
    const domConfig = getEditorDOMConfig(editor);

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

export function $generateDOMFromRoot<T extends HTMLElement | DocumentFragment>(
  container: T,
  root: LexicalNode = $getRoot(),
): T {
  const editor = $getEditor();
  return $withDOMContext(
    [DOMContextExport.pair(true), DOMContextRoot.pair(true)],
    editor,
  )(() => {
    const selection = null;
    const domConfig = getEditorDOMConfig(editor);
    const parentElementAppend = container.append.bind(container);
    $appendNodesToHTML(editor, root, parentElementAppend, selection, domConfig);
    return container;
  });
}

let activeDOMContext:
  | undefined
  | {editor: LexicalEditor; context: ContextRecord};

/**
 * A convenience function for type inference when constructing DOM overrides for
 * use with {@link DOMExtension}.
 *
 * @__NO_SIDE_EFFECTS__
 */
export function domOverride(
  nodes: '*',
  config: Omit<DOMConfigMatch<LexicalNode>, 'nodes'>,
): DOMConfigMatch<LexicalNode>;
export function domOverride<T extends LexicalNode>(
  nodes: readonly NodeMatch<T>[],
  config: Omit<DOMConfigMatch<T>, 'nodes'>,
): DOMConfigMatch<T>;
export function domOverride(
  nodes: AnyDOMConfigMatch['nodes'],
  config: Omit<AnyDOMConfigMatch, 'nodes'>,
): AnyDOMConfigMatch {
  return {...config, nodes};
}

const DOMExtensionName = '@lexical/html/DOM';
/** @internal @experimental */
export const DOMExtension = defineExtension<
  DOMConfig,
  typeof DOMExtensionName,
  DOMExtensionOutput,
  void
>({
  build(editor, config, state) {
    return {
      defaults: contextFromPairs(config.contextDefaults),
    };
  },
  config: {
    contextDefaults: [],
    overrides: [],
  },
  html: {
    // Define a RootNode export for $generateDOMFromRoot
    export: new Map([
      [
        RootNode,
        () => {
          const element = document.createElement('div');
          element.role = 'textbox';
          return {element};
        },
      ],
    ]),
  },
  init(editorConfig, config) {
    editorConfig.dom = compileOverrides(config, {
      ...DEFAULT_EDITOR_DOM_CONFIG,
      ...editorConfig.dom,
    });
  },
  mergeConfig(config, partial) {
    const merged = shallowMergeConfig(config, partial);
    for (const k of ['overrides', 'contextDefaults'] as const) {
      if (partial[k]) {
        (merged[k] as unknown[]) = [...merged[k], ...partial[k]];
      }
    }
    return merged;
  },
  name: DOMExtensionName,
});
