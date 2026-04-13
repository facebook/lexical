/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {DOMImportNodeFn, DOMImportOutput} from './types';

import {type LexicalEditor, type LexicalNode} from 'lexical';

import {getConversionFunction} from '.';
import {EMPTY_ARRAY, IGNORE_TAGS} from './constants';
import {contextUpdater} from './ContextRecord';
import {
  $addImportChildContext,
  $addImportContextFinalizer,
  $getImportContextValue,
  ImportContextForChildMap,
  ImportContextParentLexicalNode,
} from './ImportContext';

export function compileLegacyImportDOM(editor: LexicalEditor): DOMImportNodeFn {
  return (node) => {
    if (IGNORE_TAGS.has(node.nodeName)) {
      return {childNodes: EMPTY_ARRAY, node: null};
    }
    const output: DOMImportOutput = {
      node: null,
    };

    let currentLexicalNode: null | LexicalNode = null;
    const transformFunction = getConversionFunction(node, editor);
    const transformOutput = transformFunction
      ? transformFunction(node as HTMLElement)
      : null;

    if (transformOutput !== null) {
      const forChildMap = $getImportContextValue(
        ImportContextForChildMap,
        editor,
      );
      const parentLexicalNode = $getImportContextValue(
        ImportContextParentLexicalNode,
        editor,
      );
      let transformNodeArray = Array.isArray(transformOutput.node)
        ? transformOutput.node
        : transformOutput.node
          ? [transformOutput.node]
          : [];

      if (transformNodeArray.length > 0 && forChildMap) {
        const transformWithForChild = (initial: LexicalNode) => {
          let current: null | undefined | LexicalNode = initial;
          for (const forChildFunction of forChildMap.values()) {
            current = forChildFunction(current, parentLexicalNode);

            if (!current) {
              return [];
            }
          }
          return [current];
        };
        transformNodeArray = transformNodeArray.flatMap(transformWithForChild);
      }
      currentLexicalNode =
        transformNodeArray[transformNodeArray.length - 1] || null;
      output.node =
        transformNodeArray.length > 1 ? transformNodeArray : currentLexicalNode;

      const {forChild, after} = transformOutput;
      if (forChild) {
        $addImportChildContext(
          contextUpdater(ImportContextForChildMap, (prev) => {
            return new Map(prev || forChildMap || []).set(
              node.nodeName,
              forChild,
            );
          }),
        );
      }
      if (after) {
        $addImportContextFinalizer((nodeOrNodes) => {
          return after(
            Array.isArray(nodeOrNodes)
              ? nodeOrNodes
              : nodeOrNodes
                ? [nodeOrNodes]
                : [],
          );
        });
      }
    }

    return output;
  };
}
