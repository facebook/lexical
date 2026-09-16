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
} from './types';

import {type LexicalEditorWithDispose, type Signal} from '@lexical/extension';
import {
  $addUpdateTag,
  $createParagraphNode,
  $getRoot,
  $getStateChange,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  type EditorState,
  getComposedEventTarget,
  HISTORY_MERGE_TAG,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
  mergeRegister,
  registerEventListeners,
  RootNode,
  type SerializedEditorState,
} from 'lexical';

import {HEADER_FOOTER_COMMIT_TAG, SLOT_WRITE_BACK_DELAY_MS} from './constants';
import {
  $getPageSlotContent,
  $setPageSlotContent,
  buildHeaderFooterEditor,
  CLOSE_PAGE_SLOT_COMMAND,
  EDIT_PAGE_SLOT_COMMAND,
  resolveSlotVariant,
  slotStateFor,
} from './headerFooter';

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

interface SlotEditor {
  kind: PageSlotKind;
  variant: PageSlotVariant;
  editor: LexicalEditorWithDispose;
  /** The nested editor's root element; parked in the layer when not live. */
  root: HTMLElement;
  /** Cached static render, recreated after every nested update. */
  clone: HTMLElement | null;
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
}

/**
 * Header and footer content for the page layer.
 *
 * Content lives on the RootNode as NodeState (`pageHeaderState`,
 * `pageFooterState`), one serialized editor state per variant. Each
 * `(kind, variant)` that a page needs gets a nested editor, created lazily
 * and parked in the layer; every slot on every page shows a static DOM
 * clone of that editor's root, so pages cost no JavaScript. Double-clicking
 * a slot (or `EDIT_PAGE_SLOT_COMMAND`) moves the nested editor's root into
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
        dblclick: event => this.onDoubleClick(event),
      }),
      // The user clicked back into the document.
      registerEventListeners(layout.rootElement, {
        focusin: () => this.close(true),
      }),
      parent.registerCommand(
        EDIT_PAGE_SLOT_COMMAND,
        ({kind, pageIndex = 0}) => this.open(kind, pageIndex),
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
        if (!editable) {
          this.close(true);
        }
      }),
    );
    layout.setSlotProvider(this);
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
    if (content) {
      content.replaceWith(clone);
    } else {
      slot.appendChild(clone);
    }
  }

  // ---- live editing -----------------------------------------------------

  open(kind: PageSlotKind, pageIndex: number): boolean {
    const setup = this.pageSetup?.[kind];
    if (this.disposed || !setup || !setup.enabled) {
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
    slotEditor.editor.focus(undefined, {defaultSelection: 'rootEnd'});
    return true;
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
    this.layout.parking.appendChild(slotEditor.root);
    this.layout.layer.setAttribute('aria-hidden', 'true');
    this.options.activeSlot.value = null;
    this.options.activeSlotEditor.value = null;
  }

  private onDoubleClick(event: MouseEvent): void {
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
      this.open(kind, pageIndex);
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
    const editor = buildHeaderFooterEditor(this.parent);
    const root = this.layout.layer.ownerDocument.createElement('div');
    root.className = `Pages__slotContent ${LIVE_CONTENT_CLASS}`;
    root.dataset.pageSlotEditor = key;
    this.layout.parking.appendChild(root);
    editor.setRootElement(root);
    editor.setEditable(false);
    root.contentEditable = 'false';
    slotEditor = {
      cleanup: () => {},
      clone: null,
      editor,
      empty: true,
      kind,
      root,
      variant,
    };
    this.editors.set(key, slotEditor);
    this.load(
      slotEditor,
      this.parent.read('latest', () => $getPageSlotContent(kind))?.[variant] ??
        null,
    );
    slotEditor.cleanup = mergeRegister(
      editor.registerUpdateListener(({dirtyElements, dirtyLeaves}) => {
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
          this.onNestedUpdate(slotEditor!);
        }
      }),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (this.active && this.active.slotEditor === slotEditor) {
            this.close(true);
            this.parent.focus();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
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
    const heights = {footer: 0, header: 0};
    for (const slotEditor of this.editors.values()) {
      const setup = this.pageSetup[slotEditor.kind];
      if (!setup.enabled) {
        continue;
      }
      if (
        slotEditor.variant !== 'default' &&
        !(slotEditor.variant === 'first'
          ? setup.differentFirstPage
          : setup.differentEvenPages)
      ) {
        continue;
      }
      heights[slotEditor.kind] = Math.max(
        heights[slotEditor.kind],
        slotEditor.root.offsetHeight,
      );
    }
    this.layout.setSlotHeights(heights.header, heights.footer);
  }
}
