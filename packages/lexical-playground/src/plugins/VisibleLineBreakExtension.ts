/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isCodeNode} from '@lexical/code-core';
import {effect, namedSignals} from '@lexical/extension';
import {
  $setRenderContextValue,
  createRenderState,
  domOverride,
  DOMRenderExtension,
} from '@lexical/html';
import {
  configExtension,
  defineExtension,
  isHTMLElement,
  LineBreakNode,
  safeCast,
} from 'lexical';

/**
 * Worked example for the generalized `getDOMSlot` abstraction — wraps each
 * `LineBreakNode`'s `<br>` in a `<span>` carrying a visible `↵` marker, and
 * exposes the inner `<br>` through `$getDOMSlot` so selection / caret logic
 * targets the canonical content element instead of the wrapper.
 *
 * Demonstrates the extension-driven path for a leaf node category: no
 * `LineBreakNode` subclass required, behaviour attaches via
 * `DOMRenderExtension` configuration.
 *
 * `disabled` toggles the wrap at runtime without recreating the editor. The
 * override is installed conditionally via `disabledForEditor`, so when disabled
 * it is removed from the render pipeline entirely rather than no-oping per
 * node. Flipping the signal mirrors it into the editor render context with
 * `$setRenderContextValue`, which recompiles the render config and recreates
 * the existing `LineBreakNode` DOM through the new config.
 */
const VISIBLE_LINEBREAK_CLASS = 'visible-linebreak';
const VISIBLE_LINEBREAK_ATTR = 'data-lexical-visible-linebreak';

export interface VisibleLineBreakConfig {
  disabled: boolean;
}

/**
 * Editor render context state mirroring the extension's `disabled` signal.
 */
export const VisibleLineBreakDisabled = createRenderState(
  'visibleLineBreakDisabled',
  () => false,
);

function $skipForCodeChild(node: LineBreakNode): boolean {
  // Code blocks convey line structure visually — skip the visible
  // linebreak wrap anywhere inside a `CodeNode`.
  for (
    let ancestor = node.getParent();
    ancestor !== null;
    ancestor = ancestor.getParent()
  ) {
    if ($isCodeNode(ancestor)) {
      return true;
    }
  }
  return false;
}

function hasOurWrap(dom: HTMLElement): boolean {
  return dom.tagName === 'SPAN' && dom.hasAttribute(VISIBLE_LINEBREAK_ATTR);
}

export const VisibleLineBreakExtension = defineExtension({
  build: (editor, config) => namedSignals(config),
  config: safeCast<VisibleLineBreakConfig>({disabled: false}),
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride(
          [LineBreakNode],
          {
            $createDOM: (node, $next) => {
              const inner = $next();
              if ($skipForCodeChild(node)) {
                return inner;
              }
              const wrapper = document.createElement('span');
              wrapper.className = VISIBLE_LINEBREAK_CLASS;
              wrapper.setAttribute(VISIBLE_LINEBREAK_ATTR, 'true');
              wrapper.appendChild(inner);
              return wrapper;
            },
            $getDOMSlot: (_node, dom, $next) => {
              const br = dom.querySelector(':scope > br');
              return isHTMLElement(br) ? $next().withElement(br) : $next();
            },
            $updateDOM: (node, _prev, dom, $next) => {
              const wantsWrap = !$skipForCodeChild(node);
              if (wantsWrap !== hasOurWrap(dom)) {
                return true;
              }
              return $next();
            },
          },
          {disabledForEditor: ctx => ctx.get(VisibleLineBreakDisabled)},
        ),
      ],
    }),
  ],
  name: '@lexical/playground/visible-linebreak',
  register: (editor, _config, state) => {
    const stores = state.getOutput();
    return effect(() => {
      $setRenderContextValue(
        VisibleLineBreakDisabled,
        stores.disabled.value,
        editor,
      );
    });
  },
});
