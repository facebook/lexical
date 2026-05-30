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
import {ListItemNode} from '@lexical/list';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {$canShowPlaceholder} from '@lexical/text';
import {
  configExtension,
  defineExtension,
  ElementNode,
  isHTMLElement,
  LineBreakNode,
  ParagraphNode,
  safeCast,
  TabNode,
} from 'lexical';

/**
 * Surfaces a visible marker for each non-printing character in the editor.
 * Currently covers:
 * - `LineBreakNode` (`↵`) — wraps each `<br>` in a `<span>` carrying the
 *   marker, and exposes the inner `<br>` through `$getDOMSlot` so selection /
 *   caret logic targets the canonical content element.
 * - `ParagraphNode` / `HeadingNode` / `ListItemNode` / `QuoteNode` (`¶`) —
 *   shared `data-lexical-visible-non-printing-block` attribute on the block's
 *   DOM, visual rendered via CSS `::after`. The marker is `position: absolute`
 *   and `:has(> br:last-child)` snaps it to `bottom: 0` so a trailing
 *   placeholder `<br>` (added by `$reconcileElementTerminatingLineBreak` when
 *   Shift+Enter ends the block) shares the empty line instead of bumping the
 *   marker onto a new one. The direct-child selector keeps a wrapped
 *   `LineBreakNode`'s inner `<br>` from accidentally matching.
 * - `TabNode` (`→`) — `data-` attribute marker rendered via CSS `::before`,
 *   centered with `position: absolute; transform: translate(-50%, -50%)` so the
 *   arrow sits in the middle of the tab whitespace rather than at the left
 *   edge. Indent applied via `INDENT_CONTENT_COMMAND` (Tab on a block-start
 *   caret) does not create a `TabNode` and is therefore not marked, matching
 *   Word's "Show formatting marks" behaviour where indent and literal tabs are
 *   distinct.
 * - Space (` `, U+0020) (`·`) — an inline WOFF2 with `unicode-range: U+0020`
 *   remaps only the space glyph to a middle-dot shape, gated by the editor
 *   root's `data-lexical-visible-non-printing-active` attribute. Zero DOM
 *   mutation on `TextNode`, so IME composition, selection, and caret behaviour
 *   stay intact.
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
 * and recreates the existing DOM through the new config. The empty-root
 * listener is registered inside the `effect` callback so it tears down when
 * the extension is disabled instead of running forever.
 */
const VISIBLE_NON_PRINTING_LINEBREAK_ATTR =
  'data-lexical-visible-non-printing-linebreak';
const VISIBLE_NON_PRINTING_BLOCK_ATTR =
  'data-lexical-visible-non-printing-block';
const VISIBLE_NON_PRINTING_EMPTY_ROOT_ATTR =
  'data-lexical-visible-non-printing-empty-root';
const VISIBLE_NON_PRINTING_ACTIVE_ATTR =
  'data-lexical-visible-non-printing-active';
const VISIBLE_NON_PRINTING_TAB_ATTR = 'data-lexical-visible-non-printing-tab';

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

function $createBlockDOM(
  _node: ElementNode,
  $next: () => HTMLElement,
): HTMLElement {
  const dom = $next();
  if (isHTMLElement(dom)) {
    dom.setAttribute(VISIBLE_NON_PRINTING_BLOCK_ATTR, 'true');
  }
  return dom;
}

const disabledForEditor = {
  disabledForEditor: (ctx: {
    get: (state: typeof VisibleNonPrintingDisabled) => boolean;
  }) => ctx.get(VisibleNonPrintingDisabled),
};

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
          disabledForEditor,
        ),
        domOverride<ElementNode>(
          [ParagraphNode, HeadingNode, ListItemNode, QuoteNode],
          {$createDOM: $createBlockDOM},
          disabledForEditor,
        ),
        domOverride(
          [TabNode],
          {
            $createDOM: (_node, $next) => {
              const dom = $next();
              if (isHTMLElement(dom)) {
                dom.setAttribute(VISIBLE_NON_PRINTING_TAB_ATTR, 'true');
              }
              return dom;
            },
          },
          disabledForEditor,
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
    return effect(() => {
      const isDisabled = stores.disabled.value;
      $setRenderContextValue(VisibleNonPrintingDisabled, isDisabled, editor);
      const rootElement = editor.getRootElement();
      if (rootElement !== null) {
        rootElement.toggleAttribute(
          VISIBLE_NON_PRINTING_ACTIVE_ATTR,
          !isDisabled,
        );
      }
      if (isDisabled) {
        if (rootElement !== null) {
          rootElement.removeAttribute(VISIBLE_NON_PRINTING_EMPTY_ROOT_ATTR);
        }
        return;
      }
      const cleanupListener = editor.registerUpdateListener(syncEmptyRootAttr);
      syncEmptyRootAttr();
      return cleanupListener;
    });
  },
});
