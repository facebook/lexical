/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  AnyImportStateConfigPairOrUpdater,
  ChildEmitterConfig,
  ContextRecord,
  DOMImportConfig,
  DOMImportConfigMatch,
  DOMImportContextFinalizer,
  DOMImportExtensionOutput,
  DOMImportNodeFn,
  DOMImportOutput,
  DOMImportTag,
  DOMTextWrapMode,
  DOMWhiteSpaceCollapse,
  StatefulNodeEmitter,
} from './types';

import {
  $copyNode,
  $createParagraphNode,
  $isBlockElementNode,
  $isElementNode,
  $isRootOrShadowRoot,
  isBlockDomNode,
  isDOMDocumentNode,
  isHTMLElement,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {
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
import {$createChildEmitter, $createRootEmitter} from './EmitterState';
import {
  $applyTextAlignToElement,
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

/** @internal */
interface TagImporter<T extends DOMImportTag> {
  push(tag: T, match: DOMImportConfigMatch<T>): void;
  compile($nextImport: DOMImportNodeFn, editor: LexicalEditor): DOMImportNodeFn;
}

/**
 * @internal
 * An importer that wraps an array of {@link DOMImportConfigMatch} by a common
 * tag name (or `'*'` for any tag). This is
 * primarily used to facilitate the {@link TagMapImport} optimization.
 */
class CommonTagImport<Tag extends string> implements TagImporter<Tag> {
  tag: Tag;
  matches: DOMImportConfigMatch<Tag>[] = [];
  constructor(tag: Tag) {
    this.tag = tag;
  }
  push(tag: Tag, match: DOMImportConfigMatch<Tag>) {
    invariant(
      tag === this.tag,
      'CommonTagImport.push: match tag %s !== this tag %s',
      tag,
      this.tag,
    );
    this.matches.push(match);
  }
  compile(
    $nextImport: DOMImportNodeFn,
    editor: LexicalEditor,
  ): DOMImportNodeFn {
    if (this.matches.length === 0) {
      return $nextImport;
    }
    const {matches, tag} = this;
    return (node) => {
      const el = isHTMLElement(node) ? node : null;
      const $importAt = (start: number): null | undefined | DOMImportOutput => {
        let rval: undefined | null | DOMImportOutput;
        let explicitNextCall = false;
        for (let i = start; i >= 0 && !rval && !explicitNextCall; i--) {
          const {$import, selector} = matches[i];
          if (!selector || (el && el.matches(selector))) {
            rval = $import(
              node,
              () => {
                explicitNextCall = true;
                return $importAt(i - 1);
              },
              editor,
            );
          }
        }
        return explicitNextCall || rval ? rval : $nextImport(node);
      };

      return $importAt(
        (tag === node.nodeName.toLowerCase() || (el && tag === '*')
          ? matches.length
          : 0) - 1,
      );
    };
  }
}

class TagMapImport implements TagImporter<DOMImportTag> {
  tags: Map<string, CommonTagImport<string>> = new Map();
  push(tag: DOMImportTag, match: DOMImportConfigMatch<DOMImportTag>) {
    invariant(tag !== '*', 'TagMapImport can not handle wildcard tag %s', tag);
    const matches = this.tags.get(tag) || new CommonTagImport(tag);
    this.tags.set(tag, matches);
    matches.push(tag, match);
  }
  compile(
    $nextImport: DOMImportNodeFn,
    editor: LexicalEditor,
  ): DOMImportNodeFn {
    if (this.tags.size === 0) {
      return $nextImport;
    }
    const compiled = new Map<string, DOMImportNodeFn>();
    for (const [tag, matches] of this.tags.entries()) {
      compiled.set(tag, matches.compile($nextImport, editor));
    }
    return (node: Node) =>
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
  a: DOMImportConfigMatch<DOMImportTag>,
  b: DOMImportConfigMatch<DOMImportTag>,
): number {
  return (a.priority || 0) - (b.priority || 0);
}

type ImportStackEntry = [
  dom: Node,
  ctx: ContextRecord<typeof DOMImportContextSymbol>,
  $importNode: DOMImportNodeFn,
  parentEmitter: StatefulNodeEmitter<unknown>,
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
  $importNode: DOMImportNodeFn,
) {
  return function $importNodes(
    rootOrDocument: ParentNode | Document,
  ): LexicalNode[] {
    const rootNode = isDOMDocumentNode(rootOrDocument)
      ? rootOrDocument.body
      : rootOrDocument;
    const emitterConfig: ChildEmitterConfig = {
      $copyBlock: $copyNode,
      $createBlockNode: (node) =>
        $applyTextAlignToElement(
          node ? node.createParentElementNode() : $createParagraphNode(),
        ),
    };
    const $rootEmitterState = $createRootEmitter($createParagraphNode);
    const stack: ImportStackEntry[] = [
      [
        rootNode,
        updateContextFromPairs(createChildContext(undefined), [
          contextValue(
            ImportContextArtificialNodes,
            $rootEmitterState.artificialNodes,
          ),
        ]),
        () => ({node: null}),
        $rootEmitterState,
      ],
    ];
    for (let entry = stack.pop(); entry; entry = stack.pop()) {
      const [dom, ctx, fn, parentEmitter] = entry;
      const isFinalizer = Object.hasOwn(ctx, ImportContextDOMNode.key);
      if (!isFinalizer) {
        ctx[ImportContextDOMNode.key] = dom;
        parseDOMWhiteSpaceCollapseFromNode(ctx, dom);
      }
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
        fn.bind(null, dom),
        editor,
      );
      updateChildContext(popOwnContextValue(ctx, ImportChildContext));
      let childEmitter: null | StatefulNodeEmitter<void> = null;
      const finalizers = popOwnContextValue(ctx, ImportContextFinalizers) || [];
      const closeAction =
        !output && isBlockDomNode(dom) ? 'softBreak' : undefined;
      const outputNode = output ? output.node : null;
      const currentLexicalNode = Array.isArray(outputNode)
        ? outputNode[outputNode.length - 1] || null
        : outputNode;
      const children: NodeListOf<ChildNode> | readonly ChildNode[] =
        (output && output.childNodes) ||
        (isHTMLElement(dom) ? dom.childNodes : EMPTY_ARRAY);
      if (children.length > 0) {
        childEmitter = $createChildEmitter(
          parentEmitter,
          $isElementNode(currentLexicalNode) ? currentLexicalNode : null,
          closeAction,
          emitterConfig,
        );
        const closeChildEmitter = childEmitter.close.bind(childEmitter);
        finalizers.push((node) => {
          closeChildEmitter();
          return node;
        });
      }
      if (output) {
        if (finalizers.length > 0) {
          stack.push([
            dom,
            ctx,
            makeFinalizer(outputNode, finalizers),
            parentEmitter,
          ]);
        } else if (outputNode) {
          for (const addNode of Array.isArray(outputNode)
            ? outputNode
            : [outputNode]) {
            parentEmitter.$emitNode(addNode);
          }
        }
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
      if (childEmitter) {
        // Push children in reverse so they are popped off the stack in-order
        for (let i = children.length - 1; i >= 0; i--) {
          stack.push([
            children[i],
            createChildContext(childContext || ctx),
            $importNode,
            childEmitter,
          ]);
        }
      } else if (closeAction) {
        parentEmitter[closeAction]();
      }
    }
    return $rootEmitterState.close();
  };
}

function flatTags(
  tag: DOMImportTag | readonly DOMImportTag[],
): readonly DOMImportTag[] {
  if (typeof tag === 'string') {
    return [tag];
  } else if (tag.includes('*')) {
    return ['*'];
  } else {
    return tag;
  }
}

function compileImportNode(
  editor: LexicalEditor,
  config: DOMImportConfig,
  $importNodeFallback: DOMImportNodeFn,
) {
  let $importNode = $importNodeFallback;
  let importer: TagMapImport | CommonTagImport<'*'> = new TagMapImport();
  const sortedOverrides = config.overrides.sort(importOverrideSort);
  for (const match of sortedOverrides) {
    for (const tag of flatTags(match.tag)) {
      if (tag === '*') {
        if (importer instanceof TagMapImport) {
          $importNode = importer.compile($importNode, editor);
          importer = new CommonTagImport('*');
        }
        importer.push('*', match as DOMImportConfigMatch<'*'>);
      } else {
        if (importer instanceof CommonTagImport) {
          $importNode = importer.compile($importNode, editor);
          importer = new TagMapImport();
        }
        importer.push(tag.toLowerCase(), match);
      }
    }
  }
  return importer.compile($importNode, editor);
}

export function compileDOMImportOverrides(
  editor: LexicalEditor,
  config: DOMImportConfig,
): DOMImportExtensionOutput {
  const $legacyImportNode = config.compileLegacyImportNode(editor);
  const $importNode = compileImportNode(editor, config, $legacyImportNode);
  return {
    $importNode,
    $importNodes: compileImportNodes(editor, $importNode),
    $legacyImportNode,
    $legacyImportNodes: compileImportNodes(editor, $legacyImportNode),
  };
}
