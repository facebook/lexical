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
  isHTMLElement,
  LineBreakNode,
} from 'lexical';
import {IS_APPLE_WEBKIT, IS_IOS, IS_SAFARI} from 'shared/environment';

import {$isCodeNode, CodeNode} from './CodeNode';

const LINE_NUMBER_ATTR = 'data-line-number';
const TRAILING_LINE_NUMBER_ATTR = 'data-line-number-trailing';
/**
 * Marker attribute set on the `<code>` element while this extension is
 * registered. CSS hooks (e.g. the gutter background `::before`) target
 * this attribute. Not part of any cross-extension protocol — purely a
 * CSS hook.
 */
const CODE_GUTTER_ACTIVE_ATTR = 'data-lexical-code-gutter-active';
const CODE_LINEBREAK_WRAP_CLASS = 'code-linebreak-wrap';
const CODE_LINEBREAK_WRAP_ATTR = 'data-lexical-code-linebreak-wrap';

// Identifies the wrap span produced by this extension's `$createDOM`
// override. If another extension at higher priority wraps the
// LineBreakNode further, the keyed DOM would no longer be our wrap and
// this check would force a full recreate every reconcile — current
// lexical does not stack `LineBreakNode` overrides, but the invariant
// is fragile and worth surfacing.
function hasOurLineBreakWrap(dom: HTMLElement): boolean {
  return dom.tagName === 'SPAN' && dom.hasAttribute(CODE_LINEBREAK_WRAP_ATTR);
}

function $needsWrap(node: LineBreakNode): boolean {
  if (!$isCodeNode(node.getParent())) {
    return false;
  }
  const prev = node.getPreviousSibling();
  const next = node.getNextSibling();
  // Line-starter (prev null or LineBreakNode) → represents an empty line
  // that needs its own line number.
  // Trailing (last child) → reconciler will add a placeholder `<br>`
  // after; we need the wrap to host the trailing line number.
  // Content-line-ending BRs (prev is content, next is content) stay
  // bare so webkit's native cursor traversal works around them.
  const isLineStarter = prev === null || $isLineBreakNode(prev);
  const isTrailing = next === null;
  return isLineStarter || isTrailing;
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
 * the parent always re-runs the pass. The pass only cleans children that
 * remain inside the `CodeNode`; a child whose DOM is preserved across a
 * move to a non-`CodeNode` parent could carry a stale `data-line-number`
 * with it, but in practice cross-class reparenting recreates the DOM, so
 * the attribute does not survive.
 *
 * Declared as a `peerDependency` of `CodePrismExtension` /
 * `CodeShikiExtension` (not a hard dependency). Their `register`
 * callbacks check `state.getPeer('@lexical/code/CodeGutter')` and skip
 * the legacy `data-gutter` mutation listener when this extension is
 * registered, so the two line-number paths never run together.
 *
 * Because it's a peer (not a hard dep), projects that register only a
 * highlighter extension don't get this for free — add it explicitly to
 * the editor's extension list to enable per-line gutter decoration.
 */
export const CodeGutterExtension = defineExtension({
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride([LineBreakNode], {
          $createDOM: (node, $next, _editor) => {
            const inner = $next();
            if (!$needsWrap(node)) {
              return inner;
            }
            const wrap = document.createElement('span');
            wrap.setAttribute(CODE_LINEBREAK_WRAP_ATTR, 'true');
            wrap.className = CODE_LINEBREAK_WRAP_CLASS;
            // Mirrors the `decorator`-mode branch of `setManagedLineBreak`
            // in `LexicalDOMSlot` — a zero-size inline `<img>` next to
            // the `<br>` keeps webkit's cursor algorithm working when
            // an inline element surrounds the `<br>`. Applied
            // unconditionally on wrap (not gated like the canonical
            // hack's `'decorator'` check) because the wrap itself
            // creates the inline-element-surrounds-`<br>` shape the
            // hack was designed for. We only pay the selection-offset
            // cost on lines that actually need the wrap (empty /
            // trailing), so content-line-ending BRs stay bare and
            // webkit's native cursor handles them directly.
            if (IS_APPLE_WEBKIT || IS_IOS || IS_SAFARI) {
              const img = document.createElement('img');
              img.setAttribute('data-lexical-linebreak', 'true');
              img.style.setProperty('display', 'inline', 'important');
              img.style.setProperty('border', '0px', 'important');
              img.style.setProperty('margin', '0px', 'important');
              img.alt = '';
              wrap.appendChild(img);
            }
            wrap.appendChild(inner);
            return wrap;
          },
          $getDOMSlot: (_node, dom, $next, _editor) => {
            // Match a `<br>` anywhere inside the wrap, not just as a
            // direct child — another extension (e.g. VisibleLineBreak)
            // may wrap the `<br>` again inside this wrap.
            const br = dom.querySelector('br');
            return isHTMLElement(br) ? $next().withElement(br) : $next();
          },
          $updateDOM: (node, _prev, dom, $next, _editor) => {
            const wantsWrap = $needsWrap(node);
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
