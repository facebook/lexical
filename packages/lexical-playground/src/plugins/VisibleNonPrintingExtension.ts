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
import {$canShowPlaceholder} from '@lexical/text';
import {
  configExtension,
  defineExtension,
  isHTMLElement,
  LineBreakNode,
  ParagraphNode,
  safeCast,
} from 'lexical';

/**
 * Surfaces a visible marker for each non-printing character in the editor.
 * Currently covers:
 * - `LineBreakNode` (`↵`) — wraps each `<br>` in a `<span>` carrying the
 *   marker, and exposes the inner `<br>` through `$getDOMSlot` so selection /
 *   caret logic targets the canonical content element.
 * - `ParagraphNode` (`¶`) — adds a marker `data-` attribute to the block;
 *   the visual is rendered via CSS `::after`.
 *
 * Demonstrates the extension-driven path for leaf and block node categories:
 * no subclassing required, behaviour attaches via `DOMRenderExtension`
 * configuration.
 *
 * `disabled` toggles the markers at runtime without recreating the editor.
 * The overrides are installed conditionally via `disabledForEditor`, so when
 * disabled they are removed from the render pipeline entirely rather than
 * no-oping per node. Flipping the signal mirrors it into the editor render
 * context with `$setRenderContextValue`, which recompiles the render config
 * and recreates the existing DOM through the new config.
 */
const VISIBLE_NON_PRINTING_LINEBREAK_CLASS = 'visible-non-printing-linebreak';
const VISIBLE_NON_PRINTING_LINEBREAK_ATTR =
  'data-lexical-visible-non-printing-linebreak';
const VISIBLE_NON_PRINTING_PARAGRAPH_ATTR =
  'data-lexical-visible-non-printing-paragraph';
const VISIBLE_NON_PRINTING_EMPTY_ROOT_ATTR =
  'data-lexical-visible-non-printing-empty-root';

export interface VisibleNonPrintingConfig {
  disabled: boolean;
}

/**
 * Editor render context state mirroring the extension's `disabled` signal.
 */
export const VisibleNonPrintingDisabled = createRenderState(
  'visibleNonPrintingDisabled',
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
  return (
    dom.tagName === 'SPAN' &&
    dom.hasAttribute(VISIBLE_NON_PRINTING_LINEBREAK_ATTR)
  );
}

export const VisibleNonPrintingExtension = defineExtension({
  build: (editor, config) => namedSignals(config),
  config: safeCast<VisibleNonPrintingConfig>({disabled: false}),
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
              wrapper.className = VISIBLE_NON_PRINTING_LINEBREAK_CLASS;
              wrapper.setAttribute(VISIBLE_NON_PRINTING_LINEBREAK_ATTR, 'true');
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
          {disabledForEditor: ctx => ctx.get(VisibleNonPrintingDisabled)},
        ),
        domOverride(
          [ParagraphNode],
          {
            $createDOM: (_node, $next) => {
              const dom = $next();
              if (isHTMLElement(dom)) {
                dom.setAttribute(VISIBLE_NON_PRINTING_PARAGRAPH_ATTR, 'true');
              }
              return dom;
            },
          },
          {disabledForEditor: ctx => ctx.get(VisibleNonPrintingDisabled)},
        ),
      ],
    }),
  ],
  name: '@lexical/playground/visible-non-printing',
  register: (editor, _config, state) => {
    const stores = state.getOutput();
    const syncEmptyRootAttr = () => {
      const rootElement = editor.getRootElement();
      if (rootElement === null) {
        return;
      }
      const showPlaceholder = editor
        .getEditorState()
        .read(() => $canShowPlaceholder(editor.isComposing()));
      rootElement.toggleAttribute(
        VISIBLE_NON_PRINTING_EMPTY_ROOT_ATTR,
        showPlaceholder,
      );
    };
    const cleanupSignal = effect(() => {
      $setRenderContextValue(
        VisibleNonPrintingDisabled,
        stores.disabled.value,
        editor,
      );
    });
    const cleanupUpdateListener =
      editor.registerUpdateListener(syncEmptyRootAttr);
    syncEmptyRootAttr();
    return () => {
      cleanupSignal();
      cleanupUpdateListener();
    };
  },
});
