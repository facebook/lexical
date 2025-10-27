/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  AnyImportStateConfigPairOrUpdater,
  ContextRecord,
  DOMImportConfig,
  DOMImportConfigMatch,
  DOMImportContextFinalizer,
  DOMImportExtensionOutput,
  DOMImportOutput,
  DOMTextWrapMode,
  DOMWhiteSpaceCollapse,
} from './types';

import {
  $isBlockElementNode,
  $isElementNode,
  $isRootOrShadowRoot,
  ArtificialNode__DO_NOT_USE,
  isDOMDocumentNode,
  isHTMLElement,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {$unwrapArtificialNodes} from './$unwrapArtificialNodes';
import {
  ALWAYS_NULL,
  DOMImportContextSymbol,
  DOMTextWrapModeKeys,
  DOMWhiteSpaceCollapseKeys,
  EMPTY_ARRAY,
} from './constants';
import {
  $withFullContext,
  contextValue,
  createChildContext,
  popOwnContextValue,
  updateContextFromPairs,
} from './ContextRecord';
import {
  $getImportContextValue,
  ImportChildContext,
  ImportContextArtificialNodes,
  ImportContextDOMNode,
  ImportContextFinalizers,
  ImportContextHasBlockAncestorLexicalNode,
  ImportContextParentLexicalNode,
  ImportContextTextWrapMode,
  ImportContextWhiteSpaceCollapse,
} from './ImportContext';

class MatchesImport<Tag extends string> {
  tag: Tag;
  matches: DOMImportConfigMatch[] = [];
  constructor(tag: Tag) {
    this.tag = tag;
  }
  push(match: DOMImportConfigMatch) {
    invariant(
      match.tag === this.tag,
      'MatchesImport.push: match tag %s !== this tag %s',
      match.tag,
      this.tag,
    );
    this.matches.push(match);
  }
  compile(
    $nextImport: (node: Node) => null | undefined | DOMImportOutput,
    editor: LexicalEditor,
  ): (node: Node) => null | undefined | DOMImportOutput {
    const {matches, tag} = this;
    return (node) => {
      const el = isHTMLElement(node) ? node : null;
      const $importAt = (start: number): null | undefined | DOMImportOutput => {
        let rval: undefined | null | DOMImportOutput;
        let $importFallback = $nextImport;
        for (
          let i = start;
          i >= 0 && !rval && $importFallback !== ALWAYS_NULL;
          i--
        ) {
          const match = matches[i];
          if (match) {
            const {$import, selector} = matches[i];
            if (!selector || (el && el.matches(selector))) {
              rval = $import(
                node,
                () => {
                  $importFallback = ALWAYS_NULL;
                  return $importAt(i - 1);
                },
                editor,
              );
            }
          }
        }
        return rval || $importFallback(node);
      };

      return $importAt(
        (tag === node.nodeName.toLowerCase() || (el && tag === '*')
          ? matches.length
          : 0) - 1,
      );
    };
  }
}

class TagImport {
  tags: Map<string, MatchesImport<string>> = new Map();
  push(match: DOMImportConfigMatch) {
    invariant(
      match.tag !== '*',
      'TagImport can not handle wildcard tag %s',
      match.tag,
    );
    const matches = this.tags.get(match.tag) || new MatchesImport(match.tag);
    this.tags.set(match.tag, matches);
    matches.push(match);
  }
  compile(
    $nextImport: (node: Node) => null | undefined | DOMImportOutput,
    editor: LexicalEditor,
  ): DOMImportExtensionOutput['$importNode'] {
    const compiled = new Map<string, DOMImportExtensionOutput['$importNode']>();
    for (const [tag, matches] of this.tags.entries()) {
      compiled.set(tag, matches.compile($nextImport, editor));
    }
    return compiled.size === 0
      ? $nextImport
      : (node: Node) =>
          (compiled.get(node.nodeName.toLowerCase()) || $nextImport)(node);
  }
}

/**
 * Sort matches by lowest priority first. This is to preserve the invariant
 * that overrides added "later" (closer to the root of the extension tree,
 * or later in a given array) should run at a higher priority.
 *
 * For example given the overrides `[a,b,c]` it is expected that the execution
 * order is `c -> b -> a` assuming equal priorities. This is because the
 * "least specific" behavior is going to be naturally "earlier" in the array
 * (e.g. the initial implementation).
 */
function importOverrideSort(
  a: DOMImportConfigMatch,
  b: DOMImportConfigMatch,
): number {
  return (a.priority || 0) - (b.priority || 0);
}

type ImportStackEntry = [
  dom: Node,
  ctx: ContextRecord<typeof DOMImportContextSymbol>,
  $importNode: DOMImportExtensionOutput['$importNode'],
  $appendChild: NonNullable<DOMImportOutput['$appendChild']>,
];

function parseDOMWhiteSpaceCollapseFromNode(
  ctx: ContextRecord<typeof DOMImportContextSymbol>,
  node: Node,
): ContextRecord<typeof DOMImportContextSymbol> {
  if (isHTMLElement(node)) {
    const {style} = node;
    let textWrapMode: undefined | DOMTextWrapMode;
    let whiteSpaceCollapse: undefined | DOMWhiteSpaceCollapse;
    switch (style.whiteSpace) {
      case 'normal':
        whiteSpaceCollapse = 'collapse';
        textWrapMode = 'wrap';
        break;
      case 'pre':
        whiteSpaceCollapse = 'preserve';
        textWrapMode = 'nowrap';
        break;
      case 'pre-wrap':
        whiteSpaceCollapse = 'preserve';
        textWrapMode = 'wrap';
        break;
      case 'pre-line':
        whiteSpaceCollapse = 'preserve-breaks';
        textWrapMode = 'nowrap';
        break;
      default:
        break;
    }
    whiteSpaceCollapse =
      (
        DOMWhiteSpaceCollapseKeys as Record<
          string,
          undefined | DOMWhiteSpaceCollapse
        >
      )[style.whiteSpaceCollapse] || whiteSpaceCollapse;
    textWrapMode =
      (DOMTextWrapModeKeys as Record<string, undefined | DOMTextWrapMode>)[
        style.textWrapMode
      ] || textWrapMode;
    if (textWrapMode) {
      ctx[ImportContextTextWrapMode.key] = textWrapMode;
    }
    if (whiteSpaceCollapse) {
      ctx[ImportContextWhiteSpaceCollapse.key] = whiteSpaceCollapse;
    }
  }
  return ctx;
}

function makeFinalizer(
  outputNode: null | LexicalNode | LexicalNode[],
  finalizers: DOMImportContextFinalizer[],
): () => DOMImportOutput {
  return () => {
    let node = outputNode;
    for (
      let finalizer = finalizers.pop();
      finalizer;
      finalizer = finalizers.pop()
    ) {
      node = finalizer(node);
    }
    return {childNodes: EMPTY_ARRAY, node};
  };
}

function compileImportNodes(
  editor: LexicalEditor,
  $importNode: DOMImportExtensionOutput['$importNode'],
) {
  return function $importNodes(
    rootOrDocument: ParentNode | Document,
  ): LexicalNode[] {
    const artificialNodes: ArtificialNode__DO_NOT_USE[] = [];
    const nodes: LexicalNode[] = [];
    const rootNode = isDOMDocumentNode(rootOrDocument)
      ? rootOrDocument.body
      : rootOrDocument;
    const stack: ImportStackEntry[] = [
      [
        rootNode,
        updateContextFromPairs(createChildContext(undefined), [
          contextValue(ImportContextArtificialNodes, artificialNodes),
        ]),
        () => ({node: null}),
        (node) => {
          nodes.push(node);
        },
      ],
    ];
    for (let entry = stack.pop(); entry; entry = stack.pop()) {
      const [node, ctx, fn, $parentAppendChild] = entry;
      ctx[ImportContextDOMNode.key] = node;
      parseDOMWhiteSpaceCollapseFromNode(ctx, node);
      let childContext:
        | undefined
        | ContextRecord<typeof DOMImportContextSymbol>;
      const updateChildContext = (
        pairs: undefined | readonly AnyImportStateConfigPairOrUpdater[],
      ) => {
        if (pairs) {
          childContext = updateContextFromPairs(
            childContext || createChildContext(ctx),
            pairs,
          );
        }
      };
      const output = $withFullContext(
        DOMImportContextSymbol,
        ctx,
        fn.bind(null, node),
        editor,
      );
      let children: NodeListOf<ChildNode> | readonly ChildNode[] =
        isHTMLElement(node) ? node.childNodes : EMPTY_ARRAY;
      let $appendChild = $parentAppendChild;
      updateChildContext(popOwnContextValue(ctx, ImportChildContext));
      delete ctx[ImportChildContext.key];
      if (output) {
        const outputNode = output.node;
        if (output.$appendChild) {
          $appendChild = output.$appendChild;
        } else if (Array.isArray(outputNode)) {
          $appendChild = (childNode, _dom) => outputNode.push(childNode);
        } else if ($isElementNode(outputNode)) {
          $appendChild = (childNode, _dom) => outputNode.append(childNode);
        }
        children = output.childNodes || children;
        const finalizers = popOwnContextValue(ctx, ImportContextFinalizers);
        if (finalizers && finalizers.length > 0) {
          stack.push([
            node,
            ctx,
            makeFinalizer(outputNode, finalizers),
            $parentAppendChild,
          ]);
        } else if (outputNode) {
          for (const addNode of Array.isArray(outputNode)
            ? outputNode
            : [outputNode]) {
            $parentAppendChild(addNode, node as ChildNode);
          }
        }

        const currentLexicalNode = Array.isArray(outputNode)
          ? outputNode[outputNode.length - 1] || null
          : outputNode;
        const hasBlockAncestorLexicalNode = $getImportContextValue(
          ImportContextHasBlockAncestorLexicalNode,
        );
        const hasBlockAncestorLexicalNodeForChildren =
          currentLexicalNode && $isRootOrShadowRoot(currentLexicalNode)
            ? false
            : (currentLexicalNode && $isBlockElementNode(currentLexicalNode)) ||
              hasBlockAncestorLexicalNode;

        if (
          hasBlockAncestorLexicalNode !== hasBlockAncestorLexicalNodeForChildren
        ) {
          updateChildContext([
            contextValue(
              ImportContextHasBlockAncestorLexicalNode,
              hasBlockAncestorLexicalNodeForChildren,
            ),
          ]);
        }
        if ($isElementNode(currentLexicalNode)) {
          updateChildContext([
            contextValue(ImportContextParentLexicalNode, currentLexicalNode),
          ]);
        }
      }
      // Push children in reverse so they are popped off the stack in-order
      for (let i = children.length - 1; i >= 0; i--) {
        const childDom = children[i];
        stack.push([
          childDom,
          createChildContext(childContext || ctx),
          $importNode,
          $appendChild,
        ]);
      }
    }
    $unwrapArtificialNodes(artificialNodes);
    return nodes;
  };
}

function matchHasTag<T extends string>(
  match: DOMImportConfigMatch,
  tag: T,
): match is DOMImportConfigMatch & {tag: T} {
  return match.tag === tag;
}

function compileImportNode(editor: LexicalEditor, config: DOMImportConfig) {
  let $importNode = config.compileLegacyImportNode(editor);
  let importer: TagImport | MatchesImport<'*'> = new TagImport();
  const sortedOverrides = config.overrides.sort(importOverrideSort);
  for (const match of sortedOverrides) {
    if (matchHasTag(match, '*')) {
      if (importer instanceof TagImport) {
        $importNode = importer.compile($importNode, editor);
        importer = new MatchesImport(match.tag);
      }
    } else if (importer instanceof MatchesImport) {
      $importNode = importer.compile($importNode, editor);
      importer = new TagImport();
    }
    importer.push(match);
  }
  return importer.compile($importNode, editor);
}

export function compileDOMImportOverrides(
  editor: LexicalEditor,
  config: DOMImportConfig,
): DOMImportExtensionOutput {
  const $importNode = compileImportNode(editor, config);
  return {
    $importNode,
    $importNodes: compileImportNodes(editor, $importNode),
  };
}
