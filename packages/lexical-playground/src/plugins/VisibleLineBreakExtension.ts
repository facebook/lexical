/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isCodeNode} from '@lexical/code-core';
import {
  effect,
  getExtensionDependencyFromEditor,
  namedSignals,
} from '@lexical/extension';
import {domOverride, DOMRenderExtension} from '@lexical/html';
import {
  configExtension,
  defineExtension,
  isHTMLElement,
  type LexicalEditor,
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
 * `disabled` toggles the wrap at runtime without recreating the editor.
 * Flipping the signal forces a no-op `LineBreakNode` transform so every
 * existing `LineBreakNode` gets re-rendered through the `$createDOM` /
 * `$updateDOM` overrides below.
 */
const VISIBLE_LINEBREAK_CLASS = 'visible-linebreak';
const VISIBLE_LINEBREAK_ATTR = 'data-lexical-visible-linebreak';

export interface VisibleLineBreakConfig {
  disabled: boolean;
}

function $isDisabled(editor: LexicalEditor): boolean {
  return getExtensionDependencyFromEditor(
    editor,
    VisibleLineBreakExtension,
  ).output.disabled.peek();
}

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
      // TODO use an #8567 overlay when we have that feature
      overrides: [
        domOverride([LineBreakNode], {
          $createDOM: (node, $next, editor) => {
            const inner = $next();
            if ($isDisabled(editor) || $skipForCodeChild(node)) {
              return inner;
            }
            const wrapper = document.createElement('span');
            wrapper.className = VISIBLE_LINEBREAK_CLASS;
            wrapper.setAttribute(VISIBLE_LINEBREAK_ATTR, 'true');
            wrapper.appendChild(inner);
            return wrapper;
          },
          $getDOMSlot: (_node, dom, $next, _editor) => {
            const br = dom.querySelector(':scope > br');
            return isHTMLElement(br) ? $next().withElement(br) : $next();
          },
          $updateDOM: (node, _prev, dom, $next, editor) => {
            const wantsWrap = !$isDisabled(editor) && !$skipForCodeChild(node);
            if (wantsWrap !== hasOurWrap(dom)) {
              return true;
            }
            return $next();
          },
        }),
      ],
    }),
  ],
  name: '@lexical/playground/visible-linebreak',
  register: (editor, _config, state) => {
    const stores = state.getOutput();
    return effect(() => {
      // Subscribe to the signal so the effect re-runs on every flip.
      void stores.disabled.value;
      // Force every existing LineBreakNode to re-render via the overrides
      // by registering and immediately unregistering a no-op transform —
      // the register call marks all existing LineBreakNode instances dirty.
      editor.registerNodeTransform(LineBreakNode, () => {})();
    });
  },
});
