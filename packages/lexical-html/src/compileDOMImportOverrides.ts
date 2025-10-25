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
  DOMImportExtensionOutput,
  DOMImportNext,
  DOMImportOutput,
  DOMImportOutputContinue,
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
  DOMImportContextSymbol,
  DOMImportNextSymbol,
  DOMTextWrapModeKeys,
  DOMWhiteSpaceCollapseKeys,
  EMPTY_ARRAY,
} from './constants';
import {
  $withFullContext,
  createChildContext,
  updateContextFromPairs,
} from './ContextRecord';
import {
  $getImportContextValue,
  ImportContextArtificialNodes,
  ImportContextDOMNode,
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
  ): DOMImportExtensionOutput['$importNode'] {
    const {matches, tag} = this;
    return (node) => {
      const el = isHTMLElement(node) ? node : null;
      const $importAt = (start: number): null | undefined | DOMImportOutput => {
        let rval: undefined | null | DOMImportOutput;
        for (let i = start; !rval && i >= 0; i--) {
          const match = matches[i];
          if (match) {
            const {$import, selector} = matches[i];
            if (!selector || (el && el.matches(selector))) {
              rval = $import(
                node,
                withImportNextSymbol($importAt.bind(null, i - 1)),
                editor,
              );
            }
          }
        }
        return (
          rval || {
            node: withImportNextSymbol($nextImport.bind(null, node)),
          }
        );
      };

      return $importAt(
        (tag === node.nodeName.toLowerCase() || (el && tag === '*')
          ? matches.length
          : 0) - 1,
      );
    };
  }
}

function $isImportOutputContinue(
  rval: undefined | null | DOMImportOutput,
): rval is DOMImportOutputContinue {
  return (
    !!rval &&
    typeof rval.node === 'function' &&
    DOMImportNextSymbol in rval.node
  );
}

function withImportNextSymbol(
  fn: () => null | undefined | DOMImportOutput,
): DOMImportNext {
  return Object.assign(fn, {[DOMImportNextSymbol]: true} as const);
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

function composeFinalizers<T>(
  outer: undefined | ((v: T) => T),
  inner: undefined | ((v: T) => T),
): undefined | ((v: T) => T) {
  return outer ? (inner ? (v) => outer(inner(v)) : outer) : inner;
}

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
          ImportContextArtificialNodes.pair(artificialNodes),
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
      const outputContinue: DOMImportOutputContinue = {
        node: withImportNextSymbol(fn.bind(null, node)),
      };
      parseDOMWhiteSpaceCollapseFromNode(ctx, node);
      let currentOutput: null | undefined | DOMImportOutput = outputContinue;
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
      while ($isImportOutputContinue(currentOutput)) {
        updateContextFromPairs(ctx, currentOutput.nextContext);
        updateChildContext(currentOutput.childContext);
        outputContinue.$finalize = composeFinalizers(
          outputContinue.$finalize,
          currentOutput.$finalize,
        );
        currentOutput = $withFullContext(
          DOMImportContextSymbol,
          ctx,
          currentOutput.node,
          editor,
        );
      }
      invariant(
        !$isImportOutputContinue(currentOutput),
        'currentOutput can not be a continue',
      );
      const output = currentOutput;
      let children: NodeListOf<ChildNode> | readonly ChildNode[] =
        isHTMLElement(node) ? node.childNodes : EMPTY_ARRAY;
      let $finalize = outputContinue.$finalize;
      let $appendChild = $parentAppendChild;
      const outputNode = output ? output.node : null;
      invariant(
        typeof outputNode !== 'function',
        'outputNode must not be a function',
      );
      const pushFinalize = () => {
        if ($finalize) {
          const $boundFinalize = $finalize.bind(null, outputNode);
          stack.push([
            node,
            ctx,
            () => ({childNodes: EMPTY_ARRAY, node: $boundFinalize()}),
            $parentAppendChild,
          ]);
        }
      };
      if (!output) {
        pushFinalize();
      } else {
        if (output.$appendChild) {
          $appendChild = output.$appendChild;
        } else if (Array.isArray(outputNode)) {
          $appendChild = (childNode, _dom) => outputNode.push(childNode);
        } else if ($isElementNode(outputNode)) {
          $appendChild = (childNode, _dom) => outputNode.append(childNode);
        }
        children = output.childNodes || children;
        $finalize = composeFinalizers($finalize, output.$finalize);
        if ($finalize) {
          pushFinalize();
        } else if (outputNode) {
          for (const addNode of Array.isArray(outputNode)
            ? outputNode
            : [outputNode]) {
            $parentAppendChild(addNode, node as ChildNode);
          }
        }

        updateChildContext(output.childContext);
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
            ImportContextHasBlockAncestorLexicalNode.pair(
              hasBlockAncestorLexicalNodeForChildren,
            ),
          ]);
        }
        if ($isElementNode(currentLexicalNode)) {
          updateChildContext([
            ImportContextParentLexicalNode.pair(currentLexicalNode),
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
