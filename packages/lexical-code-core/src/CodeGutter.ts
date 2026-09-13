/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CodeNode} from './CodeNode';

import {$isLineBreakNode, type LexicalEditor} from 'lexical';

/**
 * @internal
 * Write the line numbers of a {@link CodeNode} to the `data-gutter`
 * attribute of its DOM element as a newline separated list (`"1\n2\n3"`),
 * so a theme can render them with `content: attr(data-gutter)`. There is
 * one line per `LineBreakNode` child plus one. The attribute is only
 * rewritten when the number of children has changed since the last call.
 *
 * Both `@lexical/code-prism` and `@lexical/code-shiki` call this from their
 * CodeNode mutation listener.
 *
 * @param node The CodeNode whose gutter should be updated.
 * @param editor The editor that rendered the node.
 */
export function $updateCodeGutter(node: CodeNode, editor: LexicalEditor): void {
  const codeElement = editor.getElementByKey(node.getKey());
  if (codeElement === null) {
    return;
  }
  const children = node.getChildren();
  const childrenLength = children.length;
  // @ts-ignore: internal field
  if (childrenLength === codeElement.__cachedChildrenLength) {
    // Avoid updating the attribute if the children length hasn't changed.
    return;
  }
  // @ts-ignore:: internal field
  codeElement.__cachedChildrenLength = childrenLength;
  let gutter = '1';
  let count = 1;
  for (let i = 0; i < childrenLength; i++) {
    if ($isLineBreakNode(children[i])) {
      gutter += '\n' + ++count;
    }
  }
  codeElement.setAttribute('data-gutter', gutter);
}
