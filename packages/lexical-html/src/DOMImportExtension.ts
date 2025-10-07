/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  DOMImportConfig,
  DOMImportConfigMatch,
  DOMImportExtensionOutput,
  DOMImportNodeFunction,
  DOMImportOutput,
} from './types';

import {
  $createLineBreakNode,
  $createParagraphNode,
  $isBlockElementNode,
  $isElementNode,
  $isRootOrShadowRoot,
  ArtificialNode__DO_NOT_USE,
  defineExtension,
  DOMConversionOutput,
  isBlockDomNode,
  isDOMDocumentNode,
  isHTMLElement,
  type LexicalEditor,
  type LexicalNode,
  shallowMergeConfig,
} from 'lexical';
import invariant from 'shared/invariant';

import {$unwrapArtificialNodes} from './$unwrapArtificialNodes';
import {DOMImportExtensionName, IGNORE_TAGS} from './constants';
import {
  $getDOMImportContextValue,
  $withDOMImportContext,
  AnyStateConfigPair,
  DOMContextArtificialNodes,
  DOMContextForChildMap,
  DOMContextHasBlockAncestorLexicalNode,
  DOMContextParentLexicalNode,
} from './ContextRecord';
import {DOMExtension} from './DOMExtension';
import {getConversionFunction} from './getConversionFunction';
import {isDomNodeBetweenTwoInlineNodes} from './isDomNodeBetweenTwoInlineNodes';
import {$wrapContinuousInlines} from './wrapContinuousInlines';

class MatchesImport {
  tag: string;
  matches: DOMImportConfigMatch[] = [];
  constructor(tag: string) {
    this.tag = tag;
  }
  push(match: DOMImportConfigMatch) {
    invariant(
      match.tag === this.tag,
      'MatchesImport requires all to use the same tag',
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
              rval = $import(node, $importAt.bind(null, i - 1), editor);
            }
          }
        }
        return rval;
      };
      return (
        ((tag === node.nodeName.toLowerCase() || (el && tag === '*')) &&
          $importAt(matches.length - 1)) ||
        $nextImport(node)
      );
    };
  }
}

class TagImport {
  tags: Map<string, MatchesImport> = new Map();
  push(match: DOMImportConfigMatch) {
    invariant(match.tag !== '*', 'TagImport can not handle wildcards');
    const matches = this.tags.get(match.tag) || new MatchesImport(match.tag);
    this.tags.set(match.tag, matches);
    matches.push(match);
  }
  compile(
    $nextImport: (node: Node) => null | undefined | DOMImportOutput,
    editor: LexicalEditor,
  ): DOMImportExtensionOutput['$importNode'] {
    const compiled = new Map<string, DOMImportNodeFunction>();
    for (const [tag, matches] of this.tags.entries()) {
      compiled.set(tag, matches.compile($nextImport, editor));
    }
    return compiled.size === 0
      ? $nextImport
      : (node: Node) => {
          const $import = compiled.get(node.nodeName.toLowerCase());
          return $import ? $import(node) : $nextImport(node);
        };
  }
}

const EMPTY_ARRAY = [] as const;
const emptyGetChildren = () => EMPTY_ARRAY;

function compileLegacyImportDOM(
  editor: LexicalEditor,
): DOMImportExtensionOutput['$importNode'] {
  return (node) => {
    if (IGNORE_TAGS.has(node.nodeName)) {
      return {getChildren: emptyGetChildren, node: null};
    }
    // If the DOM node doesn't have a transformer, we don't know what
    // to do with it but we still need to process any childNodes.
    let childLexicalNodes: LexicalNode[] = [];
    let postTransform: DOMConversionOutput['after'];
    let hasBlockAncestorLexicalNodeForChildren = false;
    const output: DOMImportOutput & {node: LexicalNode[]} = {
      $appendChild: (childNode) => childLexicalNodes.push(childNode),
      $finalize: (nodeOrNodes) => {
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
          if (!hasBlockAncestorLexicalNodeForChildren) {
            childLexicalNodes = $wrapContinuousInlines(
              node,
              childLexicalNodes,
              $createParagraphNode,
            );
          } else {
            const allArtificialNodes = $getDOMImportContextValue(
              DOMContextArtificialNodes,
            );
            invariant(
              allArtificialNodes !== null,
              'Missing DOMContextArtificialNodes',
            );
            childLexicalNodes = $wrapContinuousInlines(
              node,
              childLexicalNodes,
              () => {
                const artificialNode = new ArtificialNode__DO_NOT_USE();
                allArtificialNodes.push(artificialNode);
                return artificialNode;
              },
            );
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
            finalLexicalNode.splice(
              finalLexicalNode.getChildrenSize(),
              0,
              childLexicalNodes,
            );
          }
        }

        return finalLexicalNodes;
      },
      node: [],
    };
    let currentLexicalNode = null;
    const transformFunction = getConversionFunction(node, editor);
    const transformOutput = transformFunction
      ? transformFunction(node as HTMLElement)
      : null;
    const addChildContext = (cfg: AnyStateConfigPair) => {
      output.childContext = output.childContext || [];
      output.childContext.push(cfg);
    };

    if (transformOutput !== null) {
      const forChildMap = $getDOMImportContextValue(
        DOMContextForChildMap,
        editor,
      );
      const parentLexicalNode = $getDOMImportContextValue(
        DOMContextParentLexicalNode,
        editor,
      );
      postTransform = transformOutput.after;
      const transformNodes = transformOutput.node;
      currentLexicalNode = Array.isArray(transformNodes)
        ? transformNodes[transformNodes.length - 1]
        : transformNodes;

      if (currentLexicalNode !== null && forChildMap) {
        for (const forChildFunction of forChildMap.values()) {
          currentLexicalNode = forChildFunction(
            currentLexicalNode,
            parentLexicalNode,
          );

          if (!currentLexicalNode) {
            break;
          }
        }

        if (currentLexicalNode) {
          output.node.push(
            ...(Array.isArray(transformNodes)
              ? transformNodes
              : [currentLexicalNode]),
          );
        }
      }

      if (transformOutput.forChild != null) {
        addChildContext(
          DOMContextForChildMap.pair(
            new Map(forChildMap || []).set(
              node.nodeName,
              transformOutput.forChild,
            ),
          ),
        );
      }
    }

    const hasBlockAncestorLexicalNode = $getDOMImportContextValue(
      DOMContextHasBlockAncestorLexicalNode,
    );
    hasBlockAncestorLexicalNodeForChildren =
      currentLexicalNode != null && $isRootOrShadowRoot(currentLexicalNode)
        ? false
        : (currentLexicalNode != null &&
            $isBlockElementNode(currentLexicalNode)) ||
          $getDOMImportContextValue(DOMContextHasBlockAncestorLexicalNode);
    if (
      hasBlockAncestorLexicalNode !== hasBlockAncestorLexicalNodeForChildren
    ) {
      addChildContext(
        DOMContextHasBlockAncestorLexicalNode.pair(
          hasBlockAncestorLexicalNodeForChildren,
        ),
      );
    }
    return output;
  };
}

function importOverrideSort(
  a: DOMImportConfigMatch,
  b: DOMImportConfigMatch,
): number {
  // Lowest priority and non-wildcards first
  return (
    (a.priority || 0) - (b.priority || 0) ||
    Number(a.tag === '*') - Number(b.tag === '*')
  );
}

export function $compileImportOverrides(
  editor: LexicalEditor,
  config: DOMImportConfig,
): DOMImportExtensionOutput {
  let $importNode = compileLegacyImportDOM(editor);
  let importer: TagImport | MatchesImport = new TagImport();
  const sortedOverrides = config.overrides.sort(importOverrideSort);
  for (const match of sortedOverrides) {
    if (match.tag === '*') {
      if (!(importer instanceof MatchesImport && importer.tag === match.tag)) {
        $importNode = importer.compile($importNode, editor);
        importer = new MatchesImport(match.tag);
      }
    } else if (importer instanceof MatchesImport) {
      $importNode = importer.compile($importNode, editor);
      importer = new TagImport();
    }
    importer.push(match);
  }
  $importNode = importer.compile($importNode, editor);
  const $importNodes = (
    rootOrDocument: ParentNode | Document,
  ): LexicalNode[] => {
    const artificialNodes: ArtificialNode__DO_NOT_USE[] = [];
    return $withDOMImportContext([
      DOMContextArtificialNodes.pair(artificialNodes),
    ])(() => {
      const nodes: LexicalNode[] = [];
      const stack: [
        Node,
        AnyStateConfigPair[],
        DOMImportNodeFunction,
        NonNullable<DOMImportOutput['$appendChild']>,
      ][] = [
        [
          isDOMDocumentNode(rootOrDocument)
            ? rootOrDocument.body
            : rootOrDocument,
          [],
          () => ({node: null}),
          (node) => {
            nodes.push(node);
          },
        ],
      ];
      for (let entry = stack.pop(); entry; ) {
        const [node, ctx, fn, $parentAppendChild] = entry;
        const output = $withDOMImportContext(ctx)(() => fn(node));
        const children =
          output && output.getChildren
            ? output.getChildren()
            : isHTMLElement(node)
              ? node.childNodes
              : EMPTY_ARRAY;
        const mergedContext =
          output && output.childContext && output.childContext.length > 0
            ? [...ctx, ...output.childContext]
            : ctx;
        let $appendChild = $parentAppendChild;
        if (output) {
          const outputNode = output.node;
          if (output.$appendChild) {
            $appendChild = output.$appendChild;
          } else if (Array.isArray(outputNode)) {
            $appendChild = (childNode, _dom) => outputNode.push(childNode);
          } else if ($isElementNode(outputNode)) {
            $appendChild = (childNode, _dom) => outputNode.append(childNode);
          }
        }
        for (let i = children.length - 1; i >= 0; i--) {
          const childDom = children[i];
          stack.push([childDom, mergedContext, $importNode, $appendChild]);
        }
      }
      $unwrapArtificialNodes(artificialNodes);
      return nodes;
    });
  };

  return {
    $importNode,
    $importNodes,
  };
}

/** @internal @experimental */
export const DOMImportExtension = defineExtension<
  DOMImportConfig,
  typeof DOMImportExtensionName,
  DOMImportExtensionOutput,
  null
>({
  build: $compileImportOverrides,
  config: {overrides: []},
  dependencies: [DOMExtension],
  mergeConfig(config, partial) {
    const merged = shallowMergeConfig(config, partial);
    for (const k of ['overrides'] as const) {
      if (partial[k]) {
        (merged[k] as unknown[]) = [...merged[k], ...partial[k]];
      }
    }
    return merged;
  },
  name: DOMImportExtensionName,
});
