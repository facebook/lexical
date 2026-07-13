/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$appendNodeToHTML, $getRenderContextValue} from '@lexical/html';
import {RenderContextMarkdownExport} from '@lexical/mdast';
import {
  $create,
  $createParagraphNode,
  $getDocument,
  $getSlot,
  $getState,
  $getStateChange,
  $isElementNode,
  $setSlot,
  $setState,
  createState,
  type DOMExportOutput,
  type EditorConfig,
  type ElementDOMSlot,
  ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeStateVersion,
  registerEventListener,
  type StateValueOrUpdater,
} from 'lexical';

// Whether the section is expanded, stored as NodeState (rather than a bespoke
// serialized field) so it rides copy/paste, undo, and JSON for free. The
// default is open so freshly inserted collapsibles show their content;
// markdown `<details>` without the `open` attribute imports as closed.
const collapsibleOpenState = createState('open', {
  parse: (v): boolean => (typeof v === 'boolean' ? v : true),
});

/**
 * The collapsible section demonstrated by this example: an ElementNode host
 * whose *summary* line lives in a named slot (its own isolated single-line
 * editable region, see the named-slots docs) while the collapsed body is the
 * node's regular children channel. In Markdown it round-trips through the
 * GFM-style raw HTML encoding:
 *
 * ```
 * <details><summary>
 * The *summary* line
 * </summary>
 *
 * The body blocks
 * </details>
 * ```
 *
 * See `MdastCollapsibleExtension` for the mdast wiring.
 */
export class CollapsibleNode extends ElementNode {
  $config() {
    return this.config('collapsible', {
      // The body must always have a block to put the caret in; the summary
      // slot needs no equivalent because a slot value is never removed by
      // editing within it.
      $transform(node: CollapsibleNode) {
        if (node.isEmpty()) {
          node.append($createParagraphNode());
        }
      },
      extends: ElementNode,
      slots: ['summary'],
      stateConfigs: [{flat: true, stateConfig: collapsibleOpenState}],
    });
  }

  isOpen(version?: NodeStateVersion): boolean {
    return $getState(this, collapsibleOpenState, version);
  }

  setOpen(open: StateValueOrUpdater<typeof collapsibleOpenState>): this {
    return $setState(this, collapsibleOpenState, open);
  }

  // Block-level inserts (and the markdown shortcut transforms) land in the
  // body instead of splitting the collapsible, and selection helpers treat
  // the body like a nested document.
  isShadowRoot(): true {
    return true;
  }

  // The host DOM is a styled stand-in for `<details>`: a summary row of
  // chrome (the toggle chevron plus the revealed `summary` slot container)
  // followed by a content element the children channel renders into (see
  // getDOMSlot). A real `<details>` element is deliberately not used —
  // native summary activation inside contentEditable is inconsistent
  // across browsers — so the chevron drives the model state and CSS hides
  // the content element when closed.
  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    // $getDocument, not the global document: the editor's root may live in
    // a Shadow DOM or another realm (iframe).
    const doc = $getDocument();
    const dom = doc.createElement('div');
    dom.className = 'collapsible-container';
    if (this.isOpen()) {
      dom.setAttribute('data-open', 'true');
    }
    const row = doc.createElement('div');
    row.className = 'collapsible-summary-row';
    const toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'collapsible-toggle';
    // Chrome, not content: keep the caret out of the button.
    toggle.contentEditable = 'false';
    toggle.setAttribute('aria-label', 'Toggle collapsible section');
    // The listener's lifetime is the DOM's own; `void` marks the disposer
    // as intentionally discarded.
    void registerEventListener(toggle, 'click', event => {
      event.preventDefault();
      editor.update(() => {
        this.setOpen(open => !open);
      });
    });
    row.appendChild(toggle);
    dom.appendChild(row);
    const content = doc.createElement('div');
    content.className = 'collapsible-content';
    dom.appendChild(content);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement): boolean {
    const change = $getStateChange(this, prevNode, collapsibleOpenState);
    if (change !== null) {
      if (change[0]) {
        dom.setAttribute('data-open', 'true');
      } else {
        dom.removeAttribute('data-open');
      }
    }
    return false;
  }

  // The linked-list children (the body blocks) render into the content
  // element rather than the host, so the summary row stays chrome. When the
  // reconciler asks about the summary slot's own subtree it passes the slot
  // container as `element`; the `:scope >` query misses there and falls back
  // to the default slot, which is exactly right.
  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
    const content = element.querySelector<HTMLElement>(
      ':scope > .collapsible-content',
    );
    const domSlot = super.getDOMSlot(element);
    return content !== null ? domSlot.withElement(content) : domSlot;
  }

  // HTML export mirrors the GFM encoding: a real `<details>`/`<summary>`.
  // Slots ride a separate Map, so the exporter never descends into them on
  // its own — emit the summary explicitly; the body children serialize
  // through the normal child path into this element. This shell is the
  // single source of truth for the Markdown encoding too, where the two
  // destinations diverge on the summary element:
  //
  // - Markdown (`$exportViaDOM`): a `data-lexical-slot` marker tells the
  //   exporter which slot embeds here; it swaps the wrapper's content (and
  //   the children position) for embedded Markdown and strips the marker.
  // - HTML clipboard: the serialized slot content itself — the import rule
  //   maps `<summary>` back by tag, so no internal marker leaks out.
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const doc = $getDocument();
    const element = doc.createElement('details');
    if (this.isOpen()) {
      element.setAttribute('open', '');
    }
    const summary = $getSlot(this, 'summary');
    if ($isElementNode(summary)) {
      const summaryElement = doc.createElement('summary');
      if ($getRenderContextValue(RenderContextMarkdownExport, editor)) {
        summaryElement.setAttribute('data-lexical-slot', 'summary');
      } else {
        $appendNodeToHTML(editor, summary, summaryElement);
      }
      element.append(summaryElement);
    }
    return {element};
  }
}

export function $createCollapsibleNode(open: boolean = true): CollapsibleNode {
  // Single-line summary: the bare paragraph IS the slot value (the slot link
  // itself is the virtual shadow root, no container wrapper needed).
  return $setSlot($create(CollapsibleNode), 'summary', $createParagraphNode())
    .append($createParagraphNode())
    .setOpen(open);
}

export function $isCollapsibleNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleNode {
  return node instanceof CollapsibleNode;
}
