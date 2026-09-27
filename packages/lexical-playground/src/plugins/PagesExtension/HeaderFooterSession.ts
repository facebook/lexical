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

import {type LexicalEditorWithDispose, type Signal} from '@lexical/extension';
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
  $onUpdate,
  $setSelection,
  COMMAND_PRIORITY_BEFORE_EDITOR,
  COMMAND_PRIORITY_EDITOR,
  type EditorState,
  getComposedEventTarget,
  getDOMSelection,
  getParentElement,
  HISTORY_MERGE_TAG,
  isDOMNode,
  isHTMLElement,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
  mergeRegister,
  type PointType,
  type RangeSelection,
  registerEventListeners,
  RootNode,
  SELECTION_CHANGE_COMMAND,
  type SerializedEditorState,
} from 'lexical';

import {
  HEADER_FOOTER_COMMIT_TAG,
  SLOT_SYNC_TAG,
  SLOT_WRITE_BACK_DELAY_MS,
} from './constants';
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
  normalizeCounterText,
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

/**
 * The form in which header/footer content is compared: what the document
 * stores for one variant, or `null` when it stores nothing.
 */
function serializeSlotContent(content: SerializedEditorState | null): string {
  return JSON.stringify(content ?? null);
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
  refreshRafId: number | null;
  empty: boolean;
  /** The user has edited this editor since its content was last stored. */
  dirty: boolean;
  /**
   * What the document stored for this variant when the editor last loaded
   * or wrote it (see {@link serializeSlotContent}). A document whose copy no
   * longer matches was changed by someone else, and that change wins.
   */
  baseline: string;
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
  /**
   * Every nested editor created so far. A React host renders each one's
   * decorators and plugins inside the application's own tree, where the
   * application's contexts are available.
   */
  slotEditors: Signal<readonly LexicalEditorWithDispose[]>;
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
  /** The window that owns the page layer (it may be an iframe's). */
  private readonly win: Window & typeof globalThis;

  constructor(
    private readonly parent: LexicalEditor,
    private readonly layout: PagesLayout,
    private readonly options: HeaderFooterSessionOptions,
  ) {
    this.win = layout.win;
    this.heightObserver =
      typeof this.win.ResizeObserver !== 'undefined'
        ? new this.win.ResizeObserver(() => this.measureHeights())
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
    // Commits only real edits, and only if the document still holds what
    // they were made against (not, say, a document loaded meanwhile). The
    // toolbar is not handed back: the editor may be going away.
    this.close(true, false);
    this.disposed = true;
    this.cleanup();
    this.heightObserver?.disconnect();
    for (const slotEditor of this.editors.values()) {
      slotEditor.cleanup();
      slotEditor.editor.dispose();
      slotEditor.root.remove();
    }
    this.editors.clear();
    this.options.slotEditors.value = [];
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

  /**
   * The layout is about to remove `slot` (its page no longer exists). A
   * live editor in it would be detached from the page while still active,
   * so close it first.
   */
  releaseSlot(slot: HTMLElement): void {
    if (this.active !== null && this.active.slot === slot) {
      this.close(true);
    }
  }

  /** Show the real page number / count in the editor of the live slot. */
  private syncLiveCounters(active: ActiveSession): void {
    const pageNumber = active.pageIndex + 1;
    const pageCount = this.layout.getPageCount();
    active.slotEditor.editor.update(
      () => $writeCountersIntoEditor(pageNumber, pageCount),
      {tag: [HISTORY_MERGE_TAG, SLOT_SYNC_TAG]},
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
    this.handOver(this.parent, slotEditor.editor);
    return true;
  }

  /**
   * Tell the toolbar and the floating editors (which follow
   * SELECTION_CHANGE_COMMAND to learn which editor is active) that `to`
   * is active now instead of `from`.
   *
   * `from`'s selection is cleared, and `to` announced only after that
   * update has committed: the core notifies a selection change as it
   * commits, so announcing first would let `from`'s own notification
   * (its selection becoming null, which the browser's selectionchange
   * causes anyway, possibly later) point them back at `from`. `to` is
   * announced explicitly because its selection may not have changed
   * (reopening a header at the caret it was closed with).
   */
  private handOver(from: LexicalEditor, to: LexicalEditor): void {
    const target = this.active?.slotEditor.editor ?? this.parent;
    if (target !== to) {
      return;
    }
    from.update(
      () => {
        $setSelection(null);
        // After the commit, and outside it: a command dispatched while
        // `from` is still committing does not reach a parent's listeners.
        $onUpdate(() =>
          this.win.queueMicrotask(() => {
            const current = this.active?.slotEditor.editor ?? this.parent;
            if (!this.disposed && current === to) {
              to.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
            }
          }),
        );
      },
      {tag: [HISTORY_MERGE_TAG, SLOT_SYNC_TAG]},
    );
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

  /**
   * Close the live slot. With `commit`, edits not yet written back are
   * written now. With `handBack` (the default), the toolbar and floating
   * editors are told the document is the active editor again; otherwise
   * they would keep targeting the hidden header editor.
   */
  close(commit: boolean, handBack = true): void {
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
    if (handBack) {
      this.handOver(slotEditor.editor, this.parent);
    }
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
    const element = isHTMLElement(target)
      ? target
      : isDOMNode(target)
        ? getParentElement(target)
        : null;
    if (element === null) {
      return;
    }
    const slot = element.closest<HTMLElement>('[data-page-slot]');
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

  /**
   * Store the live editor's content in the document, if the user changed
   * it, and only over the content those changes were made against: when
   * the document's copy changed meanwhile (another document was loaded, a
   * collaborator or undo replaced it), that change wins.
   */
  private writeBack(session: ActiveSession): void {
    const {slotEditor} = session;
    if (!slotEditor.dirty) {
      return;
    }
    slotEditor.dirty = false;
    const content = normalizeCounterText(
      slotEditor.editor.getEditorState().toJSON(),
    );
    this.parent.update(
      () => {
        const stored =
          $getPageSlotContent(slotEditor.kind)?.[slotEditor.variant] ?? null;
        if (serializeSlotContent(stored) !== slotEditor.baseline) {
          return;
        }
        $setPageSlotContent(slotEditor.kind, slotEditor.variant, content);
        $addUpdateTag(HEADER_FOOTER_COMMIT_TAG);
        slotEditor.baseline = serializeSlotContent(content);
        session.committed = true;
      },
      // One undo step per editing session.
      session.committed ? {tag: HISTORY_MERGE_TAG} : undefined,
    );
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
        const next = content?.[slotEditor.variant] ?? null;
        if (serializeSlotContent(next) === slotEditor.baseline) {
          // Another variant of this kind changed, not this one.
          continue;
        }
        if (this.active && this.active.slotEditor === slotEditor) {
          // Undo, collaboration or a load replaced what is being edited.
          this.close(false);
        }
        this.load(slotEditor, next);
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
    editor.setRootElement(root);
    editor.setEditable(false);
    root.contentEditable = 'false';
    slotEditor = {
      baseline: serializeSlotContent(null),
      cleanup: () => {},
      clone: null,
      dirty: false,
      editor,
      empty: true,
      kind,
      refreshRafId: null,
      root,
      variant,
    };
    this.editors.set(key, slotEditor);
    this.options.slotEditors.value = [
      ...this.options.slotEditors.value,
      editor,
    ];
    // React renders decorators (images, polls, ...) into the root after the
    // Lexical update that created them, so the clones also follow the DOM.
    const domObserver =
      typeof this.win.MutationObserver !== 'undefined'
        ? new this.win.MutationObserver(() =>
            this.scheduleCloneRefresh(slotEditor!),
          )
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
          this.win.cancelAnimationFrame(slotEditor!.refreshRafId);
        }
      },
      editor.registerUpdateListener(({dirtyElements, dirtyLeaves, tags}) => {
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
          this.onNestedUpdate(slotEditor!, !tags.has(SLOT_SYNC_TAG));
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
        // After an open typeahead menu (the component picker, emoji and
        // mention pickers handle Escape at LOW and only close themselves),
        // but before rich text's own Escape handler, which blurs.
        COMMAND_PRIORITY_BEFORE_EDITOR,
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
    slotEditor.baseline = serializeSlotContent(content);
    slotEditor.dirty = false;
    if (content !== null) {
      try {
        editor.setEditorState(editor.parseEditorState(content), {
          tag: SLOT_SYNC_TAG,
        });
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
      {discrete: true, tag: SLOT_SYNC_TAG},
    );
  }

  /** Coalesce DOM-driven clone refreshes to one per frame. */
  private scheduleCloneRefresh(slotEditor: SlotEditor): void {
    if (this.disposed || slotEditor.refreshRafId !== null) {
      return;
    }
    slotEditor.refreshRafId = this.win.requestAnimationFrame(() => {
      slotEditor.refreshRafId = null;
      if (!this.disposed) {
        slotEditor.clone = null;
        this.layout.refreshSlots(slotEditor.kind);
      }
    });
  }

  /**
   * @param userEdit Whether the update is the user's edit, as opposed to
   * loading stored content or showing the live page's numbers.
   */
  private onNestedUpdate(slotEditor: SlotEditor, userEdit: boolean): void {
    if (userEdit) {
      slotEditor.dirty = true;
    }
    slotEditor.clone = null;
    slotEditor.empty = slotEditor.editor.read(
      'latest',
      () => $getRoot().getTextContent().trim() === '',
    );
    this.layout.refreshSlots(slotEditor.kind);
    if (userEdit && this.active && this.active.slotEditor === slotEditor) {
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
