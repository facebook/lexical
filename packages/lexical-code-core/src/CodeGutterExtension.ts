/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {domOverride, DOMRenderExtension} from '@lexical/html';
import {$isLineBreakNode, configExtension, defineExtension} from 'lexical';

import {CodeNode} from './CodeNode';

const CODE_GUTTER_CLASS = 'code-gutter';
const CODE_GUTTER_ATTR = 'data-lexical-code-gutter';

function $countCodeLines(node: CodeNode): number {
  let lines = 1;
  for (const child of node.getChildren()) {
    if ($isLineBreakNode(child)) {
      lines += 1;
    }
  }
  return lines;
}

function renderGutter(lines: number): string {
  let out = '1';
  for (let i = 2; i <= lines; i++) {
    out += '\n' + i;
  }
  return out;
}

function syncGutter(dom: HTMLElement, lines: number): void {
  // The legacy `registerCodeHighlighting` path also runs a mutation
  // listener that writes a `data-gutter` attribute to the same `<code>`
  // element for the CSS pseudo-element fallback. When this extension is
  // active the slot-managed span is the visible gutter, so strip the
  // attribute to keep the DOM output clean.
  if (dom.hasAttribute('data-gutter')) {
    dom.removeAttribute('data-gutter');
  }
  let gutter = dom.querySelector<HTMLElement>(`:scope > [${CODE_GUTTER_ATTR}]`);
  if (!gutter) {
    gutter = document.createElement('span');
    gutter.className = CODE_GUTTER_CLASS;
    gutter.setAttribute(CODE_GUTTER_ATTR, 'true');
    gutter.setAttribute('aria-hidden', 'true');
    gutter.contentEditable = 'false';
    dom.prepend(gutter);
  }
  const next = renderGutter(lines);
  if (gutter.textContent !== next) {
    gutter.textContent = next;
  }
}

/**
 * Decorates each `CodeNode`'s `<code>` element with a `contentEditable=false`
 * line-number gutter span and brackets the lexical-managed children behind
 * it via `slot.after`.
 *
 * Picks up etrepum's suggestion on the #8201 thread that the code
 * highlighting extensions should "embed the line number in the gutter by
 * decorating the first TextNode (or LineBreak?) of each line", replacing
 * the previous ad-hoc `data-gutter` attribute that the highlighter
 * transforms set outside the reconciler.
 *
 * The gutter element holds the numbered text as `"1\n2\n…"` and is
 * positioned with `white-space: pre` + sticky / absolute layout in
 * consumer CSS, aligning each number with the corresponding code line
 * via shared `line-height` and the matching newline structure.
 *
 * Listed as a dependency of `CodePrismExtension` / `CodeShikiExtension`
 * so any project that opts into a syntax highlighter keeps the
 * existing line-number behaviour. Projects using `CodeExtension`
 * without a highlighter can add this extension explicitly.
 */
export const CodeGutterExtension = defineExtension({
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride([CodeNode], {
          $decorateDOM: (node, _prevNode, dom, _editor) => {
            syncGutter(dom, $countCodeLines(node));
          },
          $getDOMSlot: (_node, dom, $next, _editor) => {
            const gutter = dom.querySelector<HTMLElement>(
              `:scope > [${CODE_GUTTER_ATTR}]`,
            );
            return gutter ? $next().withAfter(gutter) : $next();
          },
        }),
      ],
    }),
  ],
  name: '@lexical/code/CodeGutter',
});
