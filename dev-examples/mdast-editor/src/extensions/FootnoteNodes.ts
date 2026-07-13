/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$applyFormatToDom, DecoratorTextNode} from '@lexical/extension';
import {
  $create,
  $createParagraphNode,
  $getDocument,
  $getRoot,
  $getSelection,
  $getSlot,
  $getSlotHost,
  $getSlotNames,
  $getState,
  $getStateChange,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isRootNode,
  $removeSlot,
  $setSelection,
  $setSlot,
  $setState,
  createState,
  type DOMExportOutput,
  type EditorConfig,
  type ElementDOMSlot,
  ElementNode,
  type LexicalEditor,
  type LexicalNode,
  registerEventListener,
  setDOMUnmanaged,
} from 'lexical';

/**
 * The name of the {@link RootNode} slot the {@link FootnotesNode} lives in.
 * Slots accept undeclared names at runtime, so the root can host one without
 * a subclass — the value rides the root's slot Map, outside the children
 * channel, so document editing, selection walks, and the Markdown export of
 * the body never see it.
 */
export const FOOTNOTES_SLOT = 'footnotes';

/** The label as written (`[^label]`); matching is by {@link normalizeLabel}. */
const footnoteLabelState = createState('footnoteLabel', {
  parse: (v): string => (typeof v === 'string' ? v : ''),
});

/** mdast matches footnote identifiers case-insensitively. */
export function normalizeLabel(label: string): string {
  return label.toLowerCase();
}

/* -------------------------------------------------------------------------- *
 * Ref <-> definition navigation                                              *
 * -------------------------------------------------------------------------- */

// Navigation is real fragment navigation (GitHub's shape: `fn-*` ids on the
// definitions, `fnref-*` ids on the references, `<a href="#...">` both
// ways), so the BROWSER owns the scrolling, focus, and history behavior;
// the click listeners only move the lexical selection along with it.

/** The footnotes title's id; every ref's aria-describedby points here. */
const FOOTNOTES_LABEL_ID = 'footnote-label';

function definitionDomId(label: string): string {
  return `fn-${normalizeLabel(label)}`;
}

/** `fnref-label`, `fnref-label-2`, ... for repeated references. */
function referenceDomId(label: string, index: number): string {
  const base = `fnref-${normalizeLabel(label)}`;
  return index === 0 ? base : `${base}-${index + 1}`;
}

// The fragment is percent-decoded before it is matched against ids, so
// encoding here supports any character a label can carry.
function fragmentHref(id: string): string {
  return `#${encodeURIComponent(id)}`;
}

/**
 * Every reference in the document grouped by normalized label, each group in
 * document order (slot subtrees included).
 */
function $collectFootnoteRefsByLabel(): Map<string, FootnoteRefNode[]> {
  const refs = new Map<string, FootnoteRefNode[]>();
  const visit = (node: LexicalNode): void => {
    if ($isFootnoteRefNode(node)) {
      const normalized = normalizeLabel(node.getLabel());
      const group = refs.get(normalized);
      if (group === undefined) {
        refs.set(normalized, [node]);
      } else {
        group.push(node);
      }
    }
    for (const name of $getSlotNames(node)) {
      const value = $getSlot(node, name);
      if (value !== null && !$isFootnotesNode(value)) {
        visit(value);
      }
    }
    if ($isElementNode(node)) {
      node.getChildren().forEach(visit);
    }
  };
  $getRoot().getChildren().forEach(visit);
  return refs;
}

/** Every reference to `label`, in document order (slot subtrees included). */
function $collectFootnoteRefs(label: string): FootnoteRefNode[] {
  return $collectFootnoteRefsByLabel().get(normalizeLabel(label)) ?? [];
}

/**
 * Follows a reference click with the selection: caret to the definition
 * body's start. The scroll is the anchor's own fragment navigation, but
 * following the link moves the focus out of the editor (to the target, or
 * to the body when the target isn't focusable), so restore it — the caret
 * sits exactly where the browser scrolled to, so the focus does not fight
 * the navigation.
 */
function selectDefinition(editor: LexicalEditor, ref: FootnoteRefNode): void {
  editor.update(
    () => {
      const definition = $findFootnoteDefinition(ref.getLatest().getLabel());
      if (definition !== null) {
        definition.selectStart();
      }
    },
    {onUpdate: () => editor.focus()},
  );
}

/**
 * Follows a backlink click with the selection: caret to just after the
 * reference at `index` within the label's references (each rendered
 * backlink is bound to one reference, GitHub-style). Scroll and focus are
 * handled as in {@link selectDefinition}.
 */
function selectReference(
  editor: LexicalEditor,
  definition: FootnoteDefinitionNode,
  index: number,
): void {
  editor.update(
    () => {
      const refs = $collectFootnoteRefs(definition.getLatest().getLabel());
      const ref = refs[index];
      if (ref === undefined) {
        return;
      }
      const offset = ref.getIndexWithinParent() + 1;
      ref.getParentOrThrow().select(offset, offset);
    },
    {onUpdate: () => editor.focus()},
  );
}

/**
 * (Re)builds one definition's backlink chrome: a `↩` anchor per reference
 * (`↩` then `↩²`, `↩³`, ... GitHub-style), each a real fragment link
 * (`role="doc-backlink"`) to its own reference's id — the browser does the
 * jump, the click listener moves the selection along. The container is
 * marked unmanaged so the reconciler and the mutation observer leave it
 * alone inside the managed content DOM.
 */
function renderBacklinks(
  editor: LexicalEditor,
  definition: FootnoteDefinitionNode,
  host: HTMLElement,
  count: number,
): void {
  const doc = host.ownerDocument;
  const label = definition.getLabel();
  const container = doc.createElement('span');
  container.className = 'footnote-def-backlinks';
  container.contentEditable = 'false';
  setDOMUnmanaged(container);
  for (let index = 0; index < count; index++) {
    const backlink = doc.createElement('a');
    backlink.href = fragmentHref(referenceDomId(label, index));
    backlink.className = 'footnote-def-backlink';
    backlink.setAttribute('role', 'doc-backlink');
    backlink.setAttribute('aria-label', `Back to reference ${index + 1}`);
    backlink.setAttribute('title', `Back to reference ${index + 1}`);
    backlink.textContent = '↩';
    if (index > 0) {
      const sup = doc.createElement('sup');
      sup.textContent = String(index + 1);
      backlink.append(sup);
    }
    // See the ref's createDOM for the listener-lifetime and mousedown notes.
    void registerEventListener(backlink, 'mousedown', event => {
      event.preventDefault();
    });
    void registerEventListener(backlink, 'click', () => {
      // The default action (the fragment navigation) runs AFTER this
      // listener and moves focus out of the editor; follow it with the
      // selection on the next task so the follow-up wins.
      setTimeout(() => selectReference(editor, definition, index), 0);
    });
    container.append(backlink);
  }
  host.append(container);
}

/**
 * Keeps the anchor bookkeeping in sync with the document after each update:
 *
 * - Every reference's `<a>` gets its per-label ordinal id (`fnref-a`,
 *   `fnref-a-2`, ...) so definition backlinks can target it. Ids depend on
 *   document order, which createDOM cannot know, so they are (re)assigned
 *   here.
 * - Every definition gets one backlink per reference to its label,
 *   rendered after the note text (inside the body's last paragraph when
 *   there is one, like GitHub, otherwise appended to the body). The chrome
 *   depends on state OUTSIDE the definition node — the references live
 *   anywhere in the document — so it cannot be produced by
 *   createDOM/updateDOM alone; this listener re-anchors and re-counts it
 *   instead, and reconciliation recreating the body DOM simply drops the
 *   chrome for the next pass to rebuild.
 */
export function registerFootnoteAnchors(editor: LexicalEditor): () => void {
  return editor.registerUpdateListener(({editorState}) => {
    editorState.read(() => {
      const refsByLabel = $collectFootnoteRefsByLabel();
      for (const [label, refs] of refsByLabel) {
        refs.forEach((ref, index) => {
          const dom = editor.getElementByKey(ref.getKey());
          const anchor = dom !== null ? dom.querySelector('a') : null;
          if (anchor !== null) {
            anchor.id = referenceDomId(label, index);
          }
        });
      }
      const footnotes = $getSlot($getRoot(), FOOTNOTES_SLOT);
      if (!$isFootnotesNode(footnotes)) {
        return;
      }
      for (const definition of footnotes.getChildren()) {
        if (!$isFootnoteDefinitionNode(definition)) {
          continue;
        }
        const dom = editor.getElementByKey(definition.getKey());
        if (dom === null) {
          continue;
        }
        const count = (
          refsByLabel.get(normalizeLabel(definition.getLabel())) ?? []
        ).length;
        const lastChild = definition.getLastChild();
        const host =
          ($isParagraphNode(lastChild)
            ? editor.getElementByKey(lastChild.getKey())
            : null) ??
          dom.querySelector<HTMLElement>(':scope > .footnote-def-content');
        const existing = dom.querySelector<HTMLElement>(
          '.footnote-def-backlinks',
        );
        if (
          existing !== null &&
          (host === null ||
            existing.parentElement !== host ||
            existing.childElementCount !== count)
        ) {
          existing.remove();
        } else if (existing !== null) {
          continue;
        }
        if (host !== null && count > 0) {
          renderBacklinks(editor, definition, host, count);
        }
      }
    });
  });
}

/**
 * An inline, atomic footnote reference (`[^label]`). A DecoratorTextNode
 * with no framework content — the superscript marker is plain DOM chrome —
 * so it deletes as a unit and the label is not text the caret can enter,
 * while still carrying a text format bitmask (InlineFormattableNode) so
 * FORMAT_TEXT_COMMAND and format alignment treat it like the text around it.
 */
export class FootnoteRefNode extends DecoratorTextNode {
  $config() {
    return this.config('footnote-ref', {
      extends: DecoratorTextNode,
      stateConfigs: [{flat: true, stateConfig: footnoteLabelState}],
    });
  }

  getLabel(): string {
    return $getState(this, footnoteLabelState);
  }

  setLabel(label: string): this {
    return $setState(this, footnoteLabelState, label);
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const doc = $getDocument();
    const dom = doc.createElement('sup');
    dom.className = 'footnote-ref';
    dom.contentEditable = 'false';
    // A real fragment link (GitHub's markup: role="doc-noteref", described
    // by the footnotes title): the browser owns the click's navigation and
    // scrolling. The per-label ordinal id lands on this anchor via
    // registerFootnoteAnchors.
    const anchor = doc.createElement('a');
    anchor.href = fragmentHref(definitionDomId(this.getLabel()));
    anchor.setAttribute('role', 'doc-noteref');
    anchor.setAttribute('aria-describedby', FOOTNOTES_LABEL_ID);
    anchor.setAttribute('title', 'Go to footnote');
    anchor.textContent = this.getLabel();
    dom.append(anchor);
    // The listeners' lifetimes are the DOM's own; `void` marks the
    // disposers as intentionally discarded. mousedown preventDefault keeps
    // the click from moving the caret; the click keeps its DEFAULT action
    // (the fragment navigation) and the listener only moves the selection
    // along with it.
    void registerEventListener(anchor, 'mousedown', event => {
      event.preventDefault();
    });
    void registerEventListener(anchor, 'click', () => {
      // The default action (the fragment navigation) runs AFTER this
      // listener and moves focus out of the editor; follow it with the
      // selection on the next task so the follow-up wins.
      setTimeout(() => selectDefinition(editor, this), 0);
    });
    // The format bitmask renders as real wrapper tags (<b>, <em>, ...)
    // around the marker, mirroring the text serialization.
    return $applyFormatToDom(this, dom) as HTMLElement;
  }

  updateDOM(prevNode: this): boolean {
    // Label or format changes rebuild the whole marker: a format change
    // alters the wrapper structure around the <sup>, which is not worth
    // patching in place.
    return (
      this.getLabel() !== prevNode.getLabel() ||
      this.getFormat() !== prevNode.getFormat()
    );
  }

  // Plain-text copy carries the Markdown syntax.
  getTextContent(): string {
    return `[^${this.getLabel()}]`;
  }

  exportDOM(): DOMExportOutput {
    const element = $getDocument().createElement('sup');
    element.setAttribute('data-footnote-ref', this.getLabel());
    element.textContent = `[^${this.getLabel()}]`;
    return {element: $applyFormatToDom(this, element)};
  }

  decorate(): null {
    return null;
  }
}

export function $createFootnoteRefNode(label: string): FootnoteRefNode {
  return $create(FootnoteRefNode).setLabel(label);
}

export function $isFootnoteRefNode(
  node: LexicalNode | null | undefined,
): node is FootnoteRefNode {
  return node instanceof FootnoteRefNode;
}

/**
 * One footnote definition: a `[^label]:` marker (chrome, with a remove
 * button) beside an editable block body. Lives as a child of
 * {@link FootnotesNode}; the node-level transform relocates any definition
 * that lands in the document flow (Markdown import, paste) into the
 * footnotes section, so the body never holds one.
 */
export class FootnoteDefinitionNode extends ElementNode {
  $config() {
    return this.config('footnote-def', {
      $transform(node: FootnoteDefinitionNode) {
        if (node.isEmpty()) {
          node.append($createParagraphNode());
        }
        const parent = node.getParent();
        if (parent !== null && !$isFootnotesNode(parent)) {
          $getFootnotesNode().append(node);
        }
      },
      extends: ElementNode,
      stateConfigs: [{flat: true, stateConfig: footnoteLabelState}],
    });
  }

  getLabel(): string {
    return $getState(this, footnoteLabelState);
  }

  setLabel(label: string): this {
    return $setState(this, footnoteLabelState, label);
  }

  // The body behaves like a nested document (block inserts stay inside).
  isShadowRoot(): true {
    return true;
  }

  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const doc = $getDocument();
    const dom = doc.createElement('div');
    dom.className = 'footnote-def';
    // The refs' anchors target this id; doc-endnote per the DPUB-ARIA
    // (DAISY/EPUB) note vocabulary, matching GitHub's rendered footnotes.
    dom.id = definitionDomId(this.getLabel());
    dom.setAttribute('role', 'doc-endnote');
    const marker = doc.createElement('div');
    marker.className = 'footnote-def-marker';
    // Chrome, not content: keep the caret out of the marker column.
    marker.contentEditable = 'false';
    const label = doc.createElement('span');
    label.className = 'footnote-def-label';
    label.textContent = this.getLabel();
    marker.append(label);
    const remove = doc.createElement('button');
    remove.type = 'button';
    remove.className = 'footnote-def-remove';
    remove.setAttribute('aria-label', 'Remove footnote');
    remove.textContent = '×';
    // The listener's lifetime is the DOM's own; `void` marks the disposer
    // as intentionally discarded.
    void registerEventListener(remove, 'click', event => {
      event.preventDefault();
      editor.update(() => {
        $removeFootnoteDefinition(this.getLatest());
      });
    });
    marker.append(remove);
    dom.append(marker);
    const content = doc.createElement('div');
    content.className = 'footnote-def-content';
    dom.append(content);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement): boolean {
    const change = $getStateChange(this, prevNode, footnoteLabelState);
    if (change !== null) {
      dom.id = definitionDomId(change[0]);
      const label = dom.querySelector<HTMLElement>(
        ':scope > .footnote-def-marker > .footnote-def-label',
      );
      if (label !== null) {
        label.textContent = change[0];
      }
    }
    return false;
  }

  // The block children render beside the marker chrome.
  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
    const content = element.querySelector<HTMLElement>(
      ':scope > .footnote-def-content',
    );
    const domSlot = super.getDOMSlot(element);
    return content !== null ? domSlot.withElement(content) : domSlot;
  }

  // Clipboard HTML: a recognizable envelope (the DOM import rule reads
  // `data-footnote-def` back) with a plain `[^label]:` marker so external
  // paste targets still see which note this is. The marker span is chrome —
  // the import rule skips it; the block children append after it.
  exportDOM(): DOMExportOutput {
    const doc = $getDocument();
    const element = doc.createElement('div');
    element.setAttribute('data-footnote-def', this.getLabel());
    const label = doc.createElement('span');
    label.setAttribute('data-footnote-def-label', '');
    label.textContent = `[^${this.getLabel()}]: `;
    element.append(label);
    return {element};
  }
}

export function $createFootnoteDefinitionNode(
  label: string,
): FootnoteDefinitionNode {
  const node = $create(FootnoteDefinitionNode).setLabel(label);
  node.append($createParagraphNode());
  return node;
}

export function $isFootnoteDefinitionNode(
  node: LexicalNode | null | undefined,
): node is FootnoteDefinitionNode {
  return node instanceof FootnoteDefinitionNode;
}

/**
 * The footnotes section: the value of the root's `footnotes` slot, holding
 * the {@link FootnoteDefinitionNode}s as ordinary children. Rendered at the
 * bottom of the editor by MdastFootnoteExtension's RootNode render override;
 * removed (via the transform) when its last definition goes.
 */
export class FootnotesNode extends ElementNode {
  $config() {
    return this.config('footnotes', {
      $transform(node: FootnotesNode) {
        if (node.isEmpty()) {
          const host = $getSlotHost(node);
          if ($isRootNode(host)) {
            $removeSlot(host, FOOTNOTES_SLOT);
          }
        }
      },
      extends: ElementNode,
    });
  }

  isShadowRoot(): true {
    return true;
  }

  createDOM(): HTMLElement {
    const doc = $getDocument();
    const dom = doc.createElement('section');
    dom.className = 'footnotes';
    // doc-endnotes per the DPUB-ARIA (DAISY/EPUB) note vocabulary.
    dom.setAttribute('role', 'doc-endnotes');
    const title = doc.createElement('div');
    title.className = 'footnotes-title';
    // Chrome, not content. Every ref's aria-describedby points at this
    // title, GitHub-style.
    title.id = FOOTNOTES_LABEL_ID;
    title.contentEditable = 'false';
    title.textContent = 'Footnotes';
    dom.append(title);
    const list = doc.createElement('div');
    list.className = 'footnotes-list';
    dom.append(list);
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
    const list = element.querySelector<HTMLElement>(':scope > .footnotes-list');
    const domSlot = super.getDOMSlot(element);
    return list !== null ? domSlot.withElement(list) : domSlot;
  }
}

export function $isFootnotesNode(
  node: LexicalNode | null | undefined,
): node is FootnotesNode {
  return node instanceof FootnotesNode;
}

/**
 * The document's footnotes section, created (and slotted onto the root) on
 * first use.
 */
export function $getFootnotesNode(): FootnotesNode {
  const root = $getRoot();
  const existing = $getSlot(root, FOOTNOTES_SLOT);
  if ($isFootnotesNode(existing)) {
    return existing;
  }
  const node = $create(FootnotesNode);
  $setSlot(root, FOOTNOTES_SLOT, node);
  return node;
}

/** The definition matching `label`, if the document has one. */
export function $findFootnoteDefinition(
  label: string,
): FootnoteDefinitionNode | null {
  const footnotes = $getSlot($getRoot(), FOOTNOTES_SLOT);
  if (!$isFootnotesNode(footnotes)) {
    return null;
  }
  const normalized = normalizeLabel(label);
  for (const child of footnotes.getChildren()) {
    if (
      $isFootnoteDefinitionNode(child) &&
      normalizeLabel(child.getLabel()) === normalized
    ) {
      return child;
    }
  }
  return null;
}

/** The definition matching `label`, created (empty) when missing. */
export function $ensureFootnoteDefinition(
  label: string,
): FootnoteDefinitionNode {
  const existing = $findFootnoteDefinition(label);
  if (existing !== null) {
    return existing;
  }
  const definition = $createFootnoteDefinitionNode(label);
  $getFootnotesNode().append(definition);
  return definition;
}

/**
 * Removes a definition and cascades to every reference carrying its label —
 * a `[^label]` marker with no definition would be dead chrome. This is what
 * the × button in the definition's marker calls; the section itself cleans
 * up via the FootnotesNode transform once its last definition goes.
 */
export function $removeFootnoteDefinition(
  definition: FootnoteDefinitionNode,
): void {
  // A caret inside the removed body would dangle (and abort the update);
  // drop the selection first.
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    const anchorNode = selection.anchor.getNode();
    if (
      anchorNode === definition ||
      anchorNode.getParents().some(parent => parent === definition)
    ) {
      $setSelection(null);
    }
  }
  for (const ref of $collectFootnoteRefs(definition.getLabel())) {
    ref.remove();
  }
  definition.remove();
}

/**
 * Drops the footnotes section entirely. MdastFootnoteExtension hooks this
 * up to CLEAR_EDITOR_COMMAND: `$convertFromMarkdownString` (and the default
 * clear handler) only clear the root's children, and slots are a separate
 * channel, so a stale section would otherwise survive a document
 * replacement (loading a repro link, Reset).
 */
export function $clearFootnotes(): void {
  const root = $getRoot();
  if ($isFootnotesNode($getSlot(root, FOOTNOTES_SLOT))) {
    $removeSlot(root, FOOTNOTES_SLOT);
  }
}
