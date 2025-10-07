/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {AnyDOMConfigMatch, DOMConfig, DOMExtensionOutput} from './types';

import {
  $isElementNode,
  DEFAULT_EDITOR_DOM_CONFIG,
  defineExtension,
  EditorDOMConfig,
  type LexicalNode,
  RootNode,
  shallowMergeConfig,
} from 'lexical';

import {DOMExtensionName} from './constants';
import {contextFromPairs} from './ContextRecord';

export function compileDOMConfigOverrides(
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

/** @internal @experimental */

export const DOMExtension = defineExtension<
  DOMConfig,
  typeof DOMExtensionName,
  DOMExtensionOutput,
  void
>({
  build(editor, config, state) {
    return {
      defaults: contextFromPairs(config.contextDefaults) || new Map(),
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
    editorConfig.dom = compileDOMConfigOverrides(config, {
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
