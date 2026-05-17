/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {domOverride, DOMRenderExtension} from '@lexical/html';
import {
  $isLineBreakNode,
  configExtension,
  defineExtension,
  LineBreakNode,
} from 'lexical';

import {$isCodeNode, CodeNode} from './CodeNode';

const LINE_NUMBER_ATTR = 'data-line-number';
const TRAILING_LINE_NUMBER_ATTR = 'data-line-number-trailing';
const CODE_GUTTER_ACTIVE_ATTR = 'data-lexical-code-gutter-active';
const CODE_LINEBREAK_WRAP_CLASS = 'code-linebreak-wrap';
const CODE_LINEBREAK_WRAP_ATTR = 'data-lexical-code-linebreak-wrap';

function hasOurLineBreakWrap(dom: HTMLElement): boolean {
  return dom.tagName === 'SPAN' && dom.hasAttribute(CODE_LINEBREAK_WRAP_ATTR);
}

/**
 * Decorates the first node of each line inside a `CodeNode` with a
 * `data-line-number="N"` attribute so consumer CSS can render line numbers
 * as `::before` pseudo-elements positioned at each line's start. Each line
 * starter (the first `CodeHighlightNode` of the line, or a `LineBreakNode`
 * whose previous sibling is `null` or another `LineBreakNode` — i.e. an
 * empty line) carries its own number, so layout follows the actual DOM
 * positions and stays accurate under line wrap.
 *
 * Because `<br>` is a void element and cannot host CSS pseudo-elements,
 * `LineBreakNode`s inside a `CodeNode` are wrapped in a `<span>` via a
 * `$createDOM` override; the wrap composes through `$next()` so a sibling
 * `VisibleLineBreak`-style extension still applies. The wrap is the keyed
 * DOM Lexical hands back from `getElementByKey`, so `data-line-number`
 * goes on the wrap and the CSS `::before` renders normally.
 *
 * `CodeNode`'s `$decorateDOM` walks its children once after they've been
 * reconciled and sets the attribute on every line-starter, so insertion
 * and deletion of lines re-numbers consistently — individual leaf nodes
 * carrying stale numbers from a previous structure isn't possible because
 * the parent always re-runs the pass.
 *
 * A sentinel `data-lexical-code-gutter-active` attribute is set on the
 * `<code>` element so the legacy `data-gutter` mutation listener path
 * (`@lexical/code-prism`, `@lexical/code-shiki`) can skip its write when
 * this extension is active and avoid double-rendering.
 *
 * Listed as a dependency of `CodePrismExtension` / `CodeShikiExtension`
 * so any project that opts into a syntax highlighter keeps the existing
 * line-number behaviour. Projects using `CodeExtension` without a
 * highlighter can add this extension explicitly.
 */
export const CodeGutterExtension = defineExtension({
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride([LineBreakNode], {
          $createDOM: (node, $next, _editor) => {
            const inner = $next();
            if (!$isCodeNode(node.getParent())) {
              return inner;
            }
            const wrap = document.createElement('span');
            wrap.setAttribute(CODE_LINEBREAK_WRAP_ATTR, 'true');
            wrap.className = CODE_LINEBREAK_WRAP_CLASS;
            wrap.appendChild(inner);
            return wrap;
          },
          $updateDOM: (node, _prev, dom, $next, _editor) => {
            const wantsWrap = $isCodeNode(node.getParent());
            if (wantsWrap !== hasOurLineBreakWrap(dom)) {
              return true;
            }
            return $next();
          },
        }),
        domOverride([CodeNode], {
          $decorateDOM: (node, _prevNode, dom, editor) => {
            // Legacy `data-gutter` attribute and slot-managed gutter span
            // are obsolete under per-line decoration. Strip the attribute
            // when the legacy listener may have set it on a prior path.
            if (dom.hasAttribute('data-gutter')) {
              dom.removeAttribute('data-gutter');
            }
            dom.setAttribute(CODE_GUTTER_ACTIVE_ATTR, 'true');
            let lineN = 1;
            let prevChild = null;
            let lastLineBreakDOM: HTMLElement | null = null;
            for (const child of node.getChildren()) {
              const isLineStart =
                prevChild === null || $isLineBreakNode(prevChild);
              const childDOM = editor.getElementByKey(child.getKey());
              if (childDOM) {
                if (isLineStart) {
                  childDOM.setAttribute(LINE_NUMBER_ATTR, String(lineN));
                } else if (childDOM.hasAttribute(LINE_NUMBER_ATTR)) {
                  childDOM.removeAttribute(LINE_NUMBER_ATTR);
                }
                if ($isLineBreakNode(child)) {
                  if (childDOM.hasAttribute(TRAILING_LINE_NUMBER_ATTR)) {
                    childDOM.removeAttribute(TRAILING_LINE_NUMBER_ATTR);
                  }
                  lastLineBreakDOM = childDOM;
                } else {
                  lastLineBreakDOM = null;
                }
              }
              if ($isLineBreakNode(child)) {
                lineN++;
              }
              prevChild = child;
            }
            if (lastLineBreakDOM) {
              lastLineBreakDOM.setAttribute(
                TRAILING_LINE_NUMBER_ATTR,
                String(lineN),
              );
            }
          },
        }),
      ],
    }),
  ],
  name: '@lexical/code/CodeGutter',
});
