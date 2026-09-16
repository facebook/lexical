/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {PagesLayout, PagesLayoutSlotProvider} from './PagesLayout';
import type {
  ActivePageSlot,
  PageSetup,
  PageSlotKind,
  PageSlotVariant,
  SlotHeights,
} from './types';

import {
  getPeerDependencyFromEditor,
  type LexicalEditorWithDispose,
  type Signal,
} from '@lexical/extension';
import {
  mountReactPluginHost,
  ReactPluginHostExtension,
} from '@lexical/react/ReactPluginHostExtension';
import {
  $addUpdateTag,
  $createParagraphNode,
  $createRangeSelectionFromDom,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $getStateChange,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  type EditorState,
  getComposedEventTarget,
  getDOMSelection,
  HISTORY_MERGE_TAG,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
  mergeRegister,
  type PointType,
  type RangeSelection,
  registerEventListeners,
  RootNode,
  type SerializedEditorState,
} from 'lexical';

import {HEADER_FOOTER_COMMIT_TAG, SLOT_WRITE_BACK_DELAY_MS} from './constants';
import {
  $getPageSlotContent,
  $setPageSlotContent,
  CLOSE_PAGE_SLOT_COMMAND,
  EDIT_PAGE_SLOT_COMMAND,
  resolveSlotVariant,
  type SlotEditorBuilder,
  slotStateFor,
} from './headerFooter';
import {
  $writeCountersIntoEditor,
  writeCountersIntoDOM,
} from './PageCounterNodes';

const SLOT_KINDS: readonly PageSlotKind[] = ['header', 'footer'];
const CLONE_ATTRIBUTES_TO_STRIP = [
  'contenteditable',
  'data-lexical-editor',
  'role',
  'spellcheck',
  'autocapitalize',
  'autocorrect',
];
const LIVE_CONTENT_CLASS = 'Pages__slotContent--live';
const LIVE_SLOT_CLASS = 'Pages__slot--live';

type SlotKey = `${PageSlotKind}:${PageSlotVariant}`;

interface Point {
  x: number;
  y: number;
}

/**
 * Whether a selection point saved from an earlier editor state still refers
 * to a node and offset that exist in the active one.
 */
function $isPointValid(point: PointType): boolean {
  const node = $getNodeByKey(point.key);
  if (node === null) {
    return false;
  }
  const size = $isElementNode(node)
    ? node.getChildrenSize()
    : node.getTextContentSize();
  return point.offset <= size;
}

/** The caret position under a client point, using whichever API exists. */
function caretRangeAt(doc: Document, point: Point): Range | null {
  const withPosition = doc as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => {offsetNode: Node; offset: number} | null;
  };
  if (typeof withPosition.caretPositionFromPoint === 'function') {
    const position = withPosition.caretPositionFromPoint(point.x, point.y);
    if (position) {
      const range = doc.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
      return range;
    }
    return null;
  }
  return doc.caretRangeFromPoint
    ? doc.caretRangeFromPoint(point.x, point.y)
    : null;
}

interface SlotEditor {
  kind: PageSlotKind;
  variant: PageSlotVariant;
  editor: LexicalEditorWithDispose;
  /** The nested editor's root element; parked in the layer when not live. */
  root: HTMLElement;
  /** Cached static render, recreated after every nested update. */
  clone: HTMLElement | null;
  /** Hosts the React root that renders the editor's decorators and plugins. */
  reactHost: HTMLElement;
  refreshRafId: number | null;
  empty: boolean;
  cleanup: () => void;
}

interface ActiveSession {
  slotEditor: SlotEditor;
  slot: HTMLElement;
  pageIndex: number;
  /** Whether this session already produced a parent history entry. */
  committed: boolean;
}

export interface HeaderFooterSessionOptions {
  activeSlot: Signal<ActivePageSlot | null>;
  activeSlotEditor: Signal<LexicalEditor | null>;
  buildSlotEditor: SlotEditorBuilder;
}

/**
 * Header and footer content for the page layer.
 *
 * Content lives on the RootNode as NodeState (`pageHeaderState`,
 * `pageFooterState`), one serialized editor state per variant. Each
 * `(kind, variant)` that a page needs gets a nested editor, created lazily
 * and parked in the layer; every slot on every page shows a static DOM
 * clone of that editor's root, so pages cost no JavaScript. Clicking a slot
 * (or `EDIT_PAGE_SLOT_COMMAND`) moves the nested editor's root into
 * that slot and makes it editable; edits refresh the clones live and are
 * written back to the root, debounced, as one undo step per session.
 */
export class HeaderFooterSession implements PagesLayoutSlotProvider {
  private readonly editors = new Map<SlotKey, SlotEditor>();
  private readonly heightObserver: ResizeObserver | null;
  private readonly cleanup: () => void;
  private pageSetup: PageSetup | null = null;
  private active: ActiveSession | null = null;
  private writeBackTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * The document's last non-null selection. Focusing a nested editor sets
   * the parent's selection to null, so this is where the caret goes back to
   * when a header or footer is closed from the keyboard.
   */
  private parentSelection: RangeSelection | null = null;
  private disposed = false;

  constructor(
    private readonly parent: LexicalEditor,
    private readonly layout: PagesLayout,
    private readonly options: HeaderFooterSessionOptions,
  ) {
    this.heightObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => this.measureHeights())
        : null;
    this.cleanup = mergeRegister(
      registerEventListeners(layout.layer, {
        click: event => this.onClick(event),
      }),
      // The user clicked back into the document.
      registerEventListeners(layout.rootElement, {
        focusin: () => this.close(true),
      }),
      parent.registerCommand(
        EDIT_PAGE_SLOT_COMMAND,
        ({kind, pageIndex, variant}) => {
          const index =
            variant !== undefined
              ? this.findPageForVariant(kind, variant)
              : (pageIndex ?? 0);
          return index !== null && this.open(kind, index);
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      parent.registerCommand(
        CLOSE_PAGE_SLOT_COMMAND,
        () => {
          const wasOpen = this.active !== null;
          this.close(true);
          return wasOpen;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      parent.registerMutationListener(
        RootNode,
        (_mutations, {prevEditorState, updateTags}) =>
          this.onRootMutation(prevEditorState, updateTags),
      ),
      parent.registerEditableListener(editable => {
        this.setEditable(editable);
      }),
      parent.registerUpdateListener(({editorState}) => {
        const selection = editorState.read($getSelection);
        if ($isRangeSelection(selection)) {
          this.parentSelection = selection.clone();
        }
      }),
    );
    layout.setSlotProvider(this);
    this.setEditable(parent.isEditable());
  }

  /**
   * Mirror the document's editable state onto the layer, so the stylesheet
   * can drop the "Click to add a header" hint and text cursor while the
   * document is read-only, and close whatever is open.
   */
  private setEditable(editable: boolean): void {
    this.layout.layer.dataset.pageEditable = String(editable);
    if (!editable) {
      this.close(true);
    }
  }

  setPageSetup(pageSetup: PageSetup): void {
    this.pageSetup = pageSetup;
    const active = this.active;
    if (active) {
      const setup = pageSetup[active.slotEditor.kind];
      if (
        !setup.enabled ||
        resolveSlotVariant(setup, active.pageIndex) !==
          active.slotEditor.variant
      ) {
        this.close(true);
      }
    }
    this.layout.refreshSlots();
    this.measureHeights();
  }

  getActive(): ActivePageSlot | null {
    return this.options.activeSlot.peek();
  }

  /** The first rendered page whose `kind` slot shows `variant`, if any. */
  findPageForVariant(
    kind: PageSlotKind,
    variant: PageSlotVariant,
  ): number | null {
    const setup = this.pageSetup?.[kind];
    if (!setup || !setup.enabled) {
      return null;
    }
    for (let i = 0; i < this.layout.getPageCount(); i++) {
      if (resolveSlotVariant(setup, i) === variant) {
        return i;
      }
    }
    return null;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.close(true);
    this.disposed = true;
    this.cleanup();
    this.heightObserver?.disconnect();
    for (const slotEditor of this.editors.values()) {
      slotEditor.cleanup();
      slotEditor.editor.dispose();
      slotEditor.root.remove();
      slotEditor.reactHost.remove();
    }
    this.editors.clear();
  }

  // ---- PagesLayoutSlotProvider ------------------------------------------

  fillSlot(slot: HTMLElement, kind: PageSlotKind, pageIndex: number): void {
    const setup = this.pageSetup?.[kind];
    const enabled = setup !== undefined && setup.enabled;
    const variant = enabled ? resolveSlotVariant(setup, pageIndex) : null;
    const active = this.active;
    if (active && active.slot === slot) {
      if (
        variant !== null &&
        active.slotEditor.variant === variant &&
        active.slotEditor.kind === kind
      ) {
        active.pageIndex = pageIndex;
        this.syncLiveCounters(active);
        return;
      }
      this.close(true);
    }
    slot.dataset.pageSlotEnabled = String(enabled);
    const content = slot.firstElementChild;
    if (variant === null) {
      delete slot.dataset.pageVariant;
      slot.dataset.empty = 'true';
      if (content) {
        content.replaceChildren();
      }
      return;
    }
    const slotEditor = this.getSlotEditor(kind, variant);
    slot.dataset.pageVariant = variant;
    slot.dataset.empty = String(slotEditor.empty);
    const clone = this.cloneFor(slotEditor);
    writeCountersIntoDOM(clone, pageIndex + 1, this.layout.getPageCount());
    if (content) {
      content.replaceWith(clone);
    } else {
      slot.appendChild(clone);
    }
  }

  /** Show the real page number / count in the editor of the live slot. */
  private syncLiveCounters(active: ActiveSession): void {
    const pageNumber = active.pageIndex + 1;
    const pageCount = this.layout.getPageCount();
    active.slotEditor.editor.update(
      () => $writeCountersIntoEditor(pageNumber, pageCount),
      {tag: HISTORY_MERGE_TAG},
    );
  }

  // ---- live editing -----------------------------------------------------

  /**
   * Open a slot for editing. With `point` (the click's client coordinates)
   * the caret lands where the user clicked; otherwise at the end.
   */
  open(kind: PageSlotKind, pageIndex: number, point?: Point): boolean {
    const setup = this.pageSetup?.[kind];
    if (
      this.disposed ||
      !this.parent.isEditable() ||
      !setup ||
      !setup.enabled
    ) {
      return false;
    }
    const slot = this.layout.getSlot(kind, pageIndex);
    if (slot === null) {
      return false;
    }
    const slotEditor = this.getSlotEditor(
      kind,
      resolveSlotVariant(setup, pageIndex),
    );
    if (this.active) {
      if (this.active.slot === slot) {
        return true;
      }
      this.close(true);
    }
    const content = slot.firstElementChild;
    if (content) {
      content.replaceWith(slotEditor.root);
    } else {
      slot.appendChild(slotEditor.root);
    }
    slot.classList.add(LIVE_SLOT_CLASS);
    this.layout.layer.removeAttribute('aria-hidden');
    this.active = {committed: false, pageIndex, slot, slotEditor};
    // `setEditable` only flips the editor's flag; the DOM attribute is the
    // host's job (the React ContentEditable does the same).
    slotEditor.root.contentEditable = 'true';
    slotEditor.editor.setEditable(true);
    this.options.activeSlot.value = {
      kind,
      pageIndex,
      variant: slotEditor.variant,
    };
    this.options.activeSlotEditor.value = slotEditor.editor;
    this.syncLiveCounters(this.active);
    this.placeCaret(slotEditor, point);
    slotEditor.editor.focus(undefined, {defaultSelection: 'rootEnd'});
    return true;
  }

  /**
   * The live root replaced a clone with the same layout, so the caret
   * position under the click resolves against the live editor's DOM.
   */
  private placeCaret(slotEditor: SlotEditor, point: Point | undefined): void {
    const {editor, root} = slotEditor;
    const doc = root.ownerDocument;
    const win = doc.defaultView;
    const range = point ? caretRangeAt(doc, point) : null;
    if (!win || range === null || !root.contains(range.startContainer)) {
      return;
    }
    const domSelection = getDOMSelection(win);
    if (domSelection === null) {
      return;
    }
    domSelection.removeAllRanges();
    domSelection.addRange(range);
    editor.update(
      () => {
        const selection = $createRangeSelectionFromDom(domSelection, editor);
        if (selection !== null) {
          $setSelection(selection);
        }
      },
      {discrete: true},
    );
  }

  close(commit: boolean): void {
    const active = this.active;
    if (active === null) {
      return;
    }
    this.active = null;
    if (this.writeBackTimer !== null) {
      clearTimeout(this.writeBackTimer);
      this.writeBackTimer = null;
    }
    if (commit) {
      this.writeBack(active);
    }
    const {slotEditor, slot} = active;
    slotEditor.editor.setEditable(false);
    slotEditor.root.contentEditable = 'false';
    slot.classList.remove(LIVE_SLOT_CLASS);
    slotEditor.root.replaceWith(this.cloneFor(slotEditor));
    slot.dataset.empty = String(slotEditor.empty);
    this.layout.parking.appendChild(slotEditor.root);
    this.layout.layer.setAttribute('aria-hidden', 'true');
    this.options.activeSlot.value = null;
    this.options.activeSlotEditor.value = null;
  }

  /**
   * Close the live slot and put the caret back where it was in the document
   * before the slot opened (the parent's selection was cleared when the
   * nested editor took focus), rather than at the end of the document.
   */
  private closeAndFocusParent(): void {
    this.close(true);
    const saved = this.parentSelection;
    this.parent.update(() => {
      if (
        $getSelection() === null &&
        saved !== null &&
        $isPointValid(saved.anchor) &&
        $isPointValid(saved.focus)
      ) {
        $setSelection(saved.clone());
      }
    });
    this.parent.focus();
  }

  private onClick(event: MouseEvent): void {
    const target = getComposedEventTarget(event);
    if (!(target instanceof Element)) {
      return;
    }
    const slot = target.closest<HTMLElement>('[data-page-slot]');
    if (
      slot === null ||
      slot.dataset.pageSlotEnabled !== 'true' ||
      slot.classList.contains(LIVE_SLOT_CLASS)
    ) {
      return;
    }
    const kind = slot.dataset.pageSlot as PageSlotKind;
    const pageIndex = Number(slot.dataset.pageIndex);
    if (Number.isInteger(pageIndex)) {
      event.preventDefault();
      this.open(kind, pageIndex, {x: event.clientX, y: event.clientY});
    }
  }

  // ---- write-back and external changes ----------------------------------

  private scheduleWriteBack(): void {
    if (this.writeBackTimer !== null) {
      clearTimeout(this.writeBackTimer);
    }
    this.writeBackTimer = setTimeout(() => {
      this.writeBackTimer = null;
      if (this.active) {
        this.writeBack(this.active);
      }
    }, SLOT_WRITE_BACK_DELAY_MS);
  }

  private writeBack(session: ActiveSession): void {
    const {slotEditor} = session;
    const content = slotEditor.editor.getEditorState().toJSON();
    this.parent.update(
      () => {
        $setPageSlotContent(slotEditor.kind, slotEditor.variant, content);
        $addUpdateTag(HEADER_FOOTER_COMMIT_TAG);
      },
      // One undo step per editing session.
      session.committed ? {tag: HISTORY_MERGE_TAG} : undefined,
    );
    session.committed = true;
  }

  private onRootMutation(
    prevEditorState: EditorState,
    updateTags: Set<string>,
  ): void {
    if (this.disposed || updateTags.has(HEADER_FOOTER_COMMIT_TAG)) {
      return;
    }
    const root = this.parent.read('latest', $getRoot);
    const prevRoot = prevEditorState.read($getRoot);
    for (const kind of SLOT_KINDS) {
      const change = $getStateChange(root, prevRoot, slotStateFor(kind));
      if (change === null) {
        continue;
      }
      const [content] = change;
      for (const slotEditor of this.editors.values()) {
        if (slotEditor.kind !== kind) {
          continue;
        }
        if (this.active && this.active.slotEditor === slotEditor) {
          // Undo, collaboration or a load replaced what is being edited.
          this.close(false);
        }
        this.load(slotEditor, content?.[slotEditor.variant] ?? null);
      }
    }
  }

  // ---- nested editors ---------------------------------------------------

  private getSlotEditor(
    kind: PageSlotKind,
    variant: PageSlotVariant,
  ): SlotEditor {
    const key: SlotKey = `${kind}:${variant}`;
    let slotEditor = this.editors.get(key);
    if (slotEditor) {
      return slotEditor;
    }
    const editor = this.options.buildSlotEditor(this.parent);
    const doc = this.layout.layer.ownerDocument;
    const root = doc.createElement('div');
    root.className = `Pages__slotContent ${LIVE_CONTENT_CLASS}`;
    root.dataset.pageSlotEditor = key;
    this.layout.parking.appendChild(root);
    const reactHost = doc.createElement('div');
    reactHost.className = 'Pages__reactHost';
    this.layout.parking.appendChild(reactHost);
    editor.setRootElement(root);
    editor.setEditable(false);
    root.contentEditable = 'false';
    // Editors built with ReactPluginHostExtension render their React
    // decorators (images, polls, ...) and plugins from this host.
    if (
      getPeerDependencyFromEditor<typeof ReactPluginHostExtension>(
        editor,
        ReactPluginHostExtension.name,
      ) !== undefined
    ) {
      mountReactPluginHost(editor, reactHost);
    }
    slotEditor = {
      cleanup: () => {},
      clone: null,
      editor,
      empty: true,
      kind,
      reactHost,
      refreshRafId: null,
      root,
      variant,
    };
    this.editors.set(key, slotEditor);
    // React renders decorators (images, polls, ...) into the root after the
    // Lexical update that created them, so the clones also follow the DOM.
    const domObserver =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => this.scheduleCloneRefresh(slotEditor!))
        : null;
    domObserver?.observe(root, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    // Listen before loading so the initial content refreshes `empty` and
    // the clones like any later change.
    slotEditor.cleanup = mergeRegister(
      () => {
        domObserver?.disconnect();
        if (slotEditor!.refreshRafId !== null) {
          cancelAnimationFrame(slotEditor!.refreshRafId);
        }
      },
      editor.registerUpdateListener(({dirtyElements, dirtyLeaves}) => {
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
          this.onNestedUpdate(slotEditor!);
        }
      }),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (this.active && this.active.slotEditor === slotEditor) {
            this.closeAndFocusParent();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
    this.load(
      slotEditor,
      this.parent.read('latest', () => $getPageSlotContent(kind))?.[variant] ??
        null,
    );
    this.heightObserver?.observe(root);
    return slotEditor;
  }

  private load(
    slotEditor: SlotEditor,
    content: SerializedEditorState | null,
  ): void {
    const {editor} = slotEditor;
    if (content !== null) {
      try {
        editor.setEditorState(editor.parseEditorState(content));
        return;
      } catch {
        // Unknown nodes in the stored header: fall back to empty below.
      }
    }
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      },
      {discrete: true},
    );
  }

  /** Coalesce DOM-driven clone refreshes to one per frame. */
  private scheduleCloneRefresh(slotEditor: SlotEditor): void {
    if (this.disposed || slotEditor.refreshRafId !== null) {
      return;
    }
    slotEditor.refreshRafId = requestAnimationFrame(() => {
      slotEditor.refreshRafId = null;
      if (!this.disposed) {
        slotEditor.clone = null;
        this.layout.refreshSlots(slotEditor.kind);
      }
    });
  }

  private onNestedUpdate(slotEditor: SlotEditor): void {
    slotEditor.clone = null;
    slotEditor.empty = slotEditor.editor.read(
      'latest',
      () => $getRoot().getTextContent().trim() === '',
    );
    this.layout.refreshSlots(slotEditor.kind);
    if (this.active && this.active.slotEditor === slotEditor) {
      this.scheduleWriteBack();
    }
  }

  private cloneFor(slotEditor: SlotEditor): HTMLElement {
    if (slotEditor.clone === null) {
      const clone = slotEditor.root.cloneNode(true) as HTMLElement;
      clone.classList.remove(LIVE_CONTENT_CLASS);
      for (const attribute of CLONE_ATTRIBUTES_TO_STRIP) {
        clone.removeAttribute(attribute);
      }
      delete clone.dataset.pageSlotEditor;
      clone.setAttribute('aria-hidden', 'true');
      slotEditor.clone = clone;
    }
    return slotEditor.clone.cloneNode(true) as HTMLElement;
  }

  private measureHeights(): void {
    if (this.disposed || this.pageSetup === null) {
      return;
    }
    const heights: SlotHeights = {footer: {}, header: {}};
    for (const slotEditor of this.editors.values()) {
      if (!this.pageSetup[slotEditor.kind].enabled) {
        continue;
      }
      heights[slotEditor.kind][slotEditor.variant] = this.measureHeight(
        slotEditor.root,
      );
    }
    this.layout.setSlotHeights(heights);
  }

  /**
   * Fractional height in the host's own CSS px. `offsetHeight` rounds to
   * whole pixels, and a band whose real height is a fraction taller than
   * the geometry assumes would end past a printed page boundary.
   */
  private measureHeight(element: HTMLElement): number {
    const zoom =
      parseFloat(this.layout.host.style.getPropertyValue('--page-zoom')) || 1;
    return element.getBoundingClientRect().height / zoom;
  }
}
