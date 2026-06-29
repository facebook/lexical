/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, namedSignals} from '@lexical/extension';
import {mergeRegister} from '@lexical/utils';
import {
  COMMAND_PRIORITY_LOW,
  defineExtension,
  getActiveElementDeep,
  getComposedEventTarget,
  isDOMShadowRoot,
  isHTMLElement,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  REDO_COMMAND,
  safeCast,
  UNDO_COMMAND,
} from 'lexical';

export type AriaPoliteness = 'polite' | 'assertive';

export interface AriaLiveRegionOptions {
  /**
   * How insistently the screen reader announces updates.
   * - `polite` (default): announce after the current speech completes.
   * - `assertive`: interrupt the current speech.
   */
  politeness?: AriaPoliteness;
  /**
   * Owner element to append the live region to. Defaults to `document.body`.
   * Passing a specific element keeps the region in the same accessibility
   * subtree as the editor when the editor lives inside a shadow root or a
   * portaled overlay.
   */
  owner?: HTMLElement;
}

export interface AriaLiveRegionHandle {
  /**
   * Write a message into the live region. Calling with the same string
   * back-to-back appends a zero-width space so screen readers register
   * the change and re-announce.
   */
  announce: (message: string) => void;
  /**
   * Remove the live region element from its owner. Safe to call more
   * than once.
   */
  dispose: () => void;
}

const NOOP_HANDLE: AriaLiveRegionHandle = {
  announce: () => {},
  dispose: () => {},
};

function applyVisuallyHidden(el: HTMLElement): void {
  const style = el.style;
  style.border = '0';
  style.clip = 'rect(0 0 0 0)';
  style.height = '1px';
  style.margin = '-1px';
  style.overflow = 'hidden';
  style.padding = '0';
  style.position = 'absolute';
  style.whiteSpace = 'nowrap';
  style.width = '1px';
}

/**
 * Mounts a visually hidden `aria-live` region as a child of `owner`
 * (default `document.body`) and returns a handle that announces messages
 * and disposes the region when called. WAI-ARIA status message pattern
 * (WCAG 4.1.3).
 *
 * If neither `owner` nor `document.body` is available (e.g. SSR), the
 * returned handle is a no-op.
 */
function registerAriaLiveRegion(
  options: AriaLiveRegionOptions = {},
): AriaLiveRegionHandle {
  const politeness = options.politeness ?? 'polite';
  const host =
    options.owner ?? (typeof document !== 'undefined' ? document.body : null);
  if (host === null) {
    return NOOP_HANDLE;
  }
  const region = host.ownerDocument.createElement('div');
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('role', 'status');
  applyVisuallyHidden(region);
  host.appendChild(region);
  let disposed = false;
  return {
    announce(message) {
      if (disposed) {
        return;
      }
      // Toggle a trailing zero-width space when the message would repeat
      // so the screen reader detects a textContent change and re-announces.
      const next =
        region.textContent === message ? message + '\u200B' : message;
      region.textContent = next;
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      if (region.parentNode !== null) {
        region.parentNode.removeChild(region);
      }
    },
  };
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
}

function containsComposed(container: Node, target: Node): boolean {
  let current: Node | null = target;
  while (current !== null) {
    if (current === container) {
      return true;
    }
    if (isDOMShadowRoot(current)) {
      current = current.host;
    } else {
      current = current.parentNode;
    }
  }
  return false;
}

export type FocusTrapInitialFocus = 'firstFocusable' | 'container';

export interface FocusTrapOptions {
  /**
   * Where to land focus when the trap activates:
   * - `'firstFocusable'` (default): focus the first focusable descendant.
   * - `'container'`: focus the container itself. The container must
   *   satisfy `tabIndex >= -1`; callers typically set `tabIndex={-1}` to
   *   keep it out of the natural Tab order while remaining programmatically
   *   focusable. Use for dialogs whose first focusable is a dismiss/close
   *   action so the user lands on the dialog body and screen readers
   *   announce the dialog label before any control.
   */
  initialFocus?: FocusTrapInitialFocus;
  /**
   * Predicate that exempts an element from the pull-back. When it
   * returns `true` for `event.target`, the focusin handler lets focus
   * stay outside the container. Useful for portaled panels (e.g.
   * autocomplete popups) that live outside the trap container yet
   * logically belong to it.
   */
  allowOutside?: (target: HTMLElement) => boolean;
}

/**
 * Traps Tab / Shift+Tab focus inside `container` and restores focus to
 * the previously-focused element when the returned dispose runs.
 * Intended for modal dialogs and other transient overlays.
 *
 * While active, *any* focus that lands outside the container is pulled
 * back inside via a document-level `focusin` listener. This recovers
 * from Safari's default Tab routing through the browser chrome, but it
 * also means descendants that mount into a portal outside `container`
 * (autocomplete panels, tooltips, toasts that auto-focus themselves)
 * will be yanked back as soon as they take focus. Portal them inside
 * `container`, or skip this helper for those dialogs. The pull-back
 * always lands on the first focusable descendant (or the container as a
 * fallback) — `initialFocus` only applies to the activation-time
 * landing, not to subsequent escape recoveries. Only one trap should be
 * mounted at a time — two active traps install competing document-level
 * `focusin` listeners and will fight over focus.
 *
 * Escape is not intercepted — the owner handles close-key behavior.
 */
function registerFocusTrap(
  container: HTMLElement,
  options: FocusTrapOptions = {},
): () => void {
  const initialFocus = options.initialFocus ?? 'firstFocusable';

  const doc = container.ownerDocument;
  const deepActive = getActiveElementDeep(doc);
  const previouslyFocused = isHTMLElement(deepActive) ? deepActive : null;

  const focusable = getFocusableElements(container);
  if (initialFocus === 'container' && container.hasAttribute('tabindex')) {
    container.focus();
  } else if (focusable.length > 0) {
    focusable[0].focus();
  } else if (container.hasAttribute('tabindex')) {
    container.focus();
  }

  // Full Tab management — every Tab / Shift+Tab is handled here.
  // Boundary-only cycling let Safari's default Tab route out to the
  // browser chrome (URL bar) between presses, producing a visible
  // focus flash. This trades contentEditable Tab indent for a reliable
  // trap; the helper is Modal-only today.
  const keydownHandler = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') {
      return;
    }
    const currentFocusable = getFocusableElements(container);
    if (currentFocusable.length === 0) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const first = currentFocusable[0];
    const last = currentFocusable[currentFocusable.length - 1];
    const active = getActiveElementDeep(doc);
    const activeIndex =
      isHTMLElement(active) && containsComposed(container, active)
        ? currentFocusable.indexOf(active)
        : -1;
    if (event.shiftKey) {
      (activeIndex <= 0 ? last : currentFocusable[activeIndex - 1]).focus();
    } else {
      (activeIndex === -1 || activeIndex === currentFocusable.length - 1
        ? first
        : currentFocusable[activeIndex + 1]
      ).focus();
    }
  };

  // Safety net — if focus ever escapes the container (e.g. portal
  // ordering routes the browser's default Tab past the modal in
  // Safari), pull it back to the first focusable inside.
  const focusinHandler = (event: FocusEvent) => {
    const target = getComposedEventTarget(event);
    if (!isHTMLElement(target) || containsComposed(container, target)) {
      return;
    }
    if (options.allowOutside != null && options.allowOutside(target)) {
      return;
    }
    const currentFocusable = getFocusableElements(container);
    if (currentFocusable.length > 0) {
      currentFocusable[0].focus();
    } else if (container.hasAttribute('tabindex')) {
      container.focus();
    }
  };

  container.addEventListener('keydown', keydownHandler);
  doc.addEventListener('focusin', focusinHandler);

  return () => {
    container.removeEventListener('keydown', keydownHandler);
    doc.removeEventListener('focusin', focusinHandler);
    if (
      previouslyFocused !== null &&
      typeof previouslyFocused.focus === 'function' &&
      containsComposed(doc, previouslyFocused)
    ) {
      previouslyFocused.focus();
    }
  };
}

export type RovingOrientation = 'horizontal' | 'vertical' | 'both';

export interface RovingTabIndexOptions {
  /**
   * Which arrow keys move focus.
   * - `horizontal` (default): ArrowLeft / ArrowRight
   * - `vertical`: ArrowUp / ArrowDown
   * - `both`: any arrow key
   */
  orientation?: RovingOrientation;
  /**
   * Selector for the group's roving items. The default matches direct-child
   * non-disabled buttons. Pass a custom selector to include other focusables
   * or to scope to a marker attribute (e.g. `[data-roving-item]`).
   */
  itemSelector?: string;
}

const DEFAULT_ROVING_SELECTOR = ':scope > button:not([disabled])';

/**
 * Implements the WAI-ARIA roving-tabindex pattern on `container`. One
 * item carries `tabindex="0"` at a time; the rest are `-1`. Arrow keys
 * move focus inside the group; Home / End jump to the ends. Tab leaves
 * the group as a unit, matching the toolbar / menubar pattern.
 *
 * Items are queried lazily on every interaction so additions or
 * removals during the lifetime of the group are picked up without
 * extra wiring.
 */
function registerRovingTabIndex(
  container: HTMLElement,
  options: RovingTabIndexOptions = {},
): () => void {
  const orientation = options.orientation ?? 'horizontal';
  const selector = options.itemSelector ?? DEFAULT_ROVING_SELECTOR;

  const getItems = (): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>(selector));

  const applyTabIndex = (items: HTMLElement[], activeIndex: number): void => {
    items.forEach((item, i) => {
      item.tabIndex = i === activeIndex ? 0 : -1;
    });
  };

  const init = (): void => {
    const items = getItems();
    if (items.length === 0) {
      return;
    }
    const active = getActiveElementDeep(container.ownerDocument);
    const activeIdx = items.findIndex(el => el === active);
    applyTabIndex(items, activeIdx >= 0 ? activeIdx : 0);
  };

  init();

  const handler = (event: KeyboardEvent): void => {
    const items = getItems();
    if (items.length === 0) {
      return;
    }
    const active = getActiveElementDeep(container.ownerDocument);
    const currentIdx = items.findIndex(el => el === active);
    if (currentIdx < 0) {
      return;
    }

    const horizontal = orientation === 'horizontal' || orientation === 'both';
    const vertical = orientation === 'vertical' || orientation === 'both';
    let nextIdx = currentIdx;
    switch (event.key) {
      case 'ArrowRight':
        if (!horizontal) {
          return;
        }
        nextIdx = (currentIdx + 1) % items.length;
        break;
      case 'ArrowLeft':
        if (!horizontal) {
          return;
        }
        nextIdx = (currentIdx - 1 + items.length) % items.length;
        break;
      case 'ArrowDown':
        if (!vertical) {
          return;
        }
        nextIdx = (currentIdx + 1) % items.length;
        break;
      case 'ArrowUp':
        if (!vertical) {
          return;
        }
        nextIdx = (currentIdx - 1 + items.length) % items.length;
        break;
      case 'Home':
        nextIdx = 0;
        break;
      case 'End':
        nextIdx = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    applyTabIndex(items, nextIdx);
    items[nextIdx].focus();
  };

  container.addEventListener('keydown', handler);
  return () => {
    container.removeEventListener('keydown', handler);
    const items = getItems();
    items.forEach(item => {
      item.tabIndex = 0;
    });
  };
}

const DEFAULT_TOOLBAR_FOCUSABLE_SELECTOR =
  ':scope > button:not([disabled]), :scope > [tabindex="0"]';

export interface FocusManagerOptions {
  /**
   * Selector used to find the toolbar's first focusable item when
   * activating via the shortcut. Defaults to non-disabled direct-child
   * buttons (the same scope used by `registerRovingTabIndex`), so the
   * active roving item naturally receives focus.
   */
  toolbarItemSelector?: string;
}

/**
 * Implements the editor-to-toolbar focus jump recommended by the
 * WAI-ARIA APG editor menubar pattern: Alt+F10 inside the editor moves
 * focus to the first focusable in `toolbar`, and Escape inside the
 * toolbar returns focus to the editor.
 *
 * Wires the navigation only. Selection restoration relies on the
 * editor's own focus handling; the editor's last selection is preserved
 * across the jump so toolbar commands act on the same range.
 */
function registerFocusManager(
  editor: LexicalEditor,
  toolbar: HTMLElement,
  options: FocusManagerOptions = {},
): () => void {
  const selector =
    options.toolbarItemSelector ?? DEFAULT_TOOLBAR_FOCUSABLE_SELECTOR;

  const removeCommand = editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event: KeyboardEvent) => {
      if (!event.altKey || event.key !== 'F10') {
        return false;
      }
      const firstItem =
        toolbar.querySelector<HTMLElement>('[tabindex="0"]') ??
        toolbar.querySelector<HTMLElement>(selector);
      if (firstItem === null) {
        return false;
      }
      event.preventDefault();
      firstItem.focus();
      return true;
    },
    COMMAND_PRIORITY_LOW,
  );

  const handler = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    const target = getComposedEventTarget(event);
    if (isHTMLElement(target)) {
      const items = toolbar.querySelectorAll<HTMLElement>(selector);
      let isRovingItem = false;
      for (const item of items) {
        if (item === target || containsComposed(item, target)) {
          isRovingItem = true;
          break;
        }
      }
      if (!isRovingItem) {
        return;
      }
    }
    const rootElement = editor.getRootElement();
    if (rootElement === null) {
      return;
    }
    event.preventDefault();
    // Keep Escape inside the toolbar — don't let it bubble to any
    // window-level Modal close handler.
    event.stopPropagation();
    // `editor.focus()` restores the prior selection so commands resume
    // where the cursor was before the jump; the `rootElement.focus()`
    // fallback covers test environments where `editor.focus()` does not
    // also move DOM focus.
    editor.focus();
    rootElement.focus();
  };
  toolbar.addEventListener('keydown', handler);

  return mergeRegister(removeCommand, () => {
    toolbar.removeEventListener('keydown', handler);
  });
}

interface HistoryAnnounceOptions {
  /** Message announced after an undo. Default: 'Undone'. */
  undone?: string;
  /** Message announced after a redo. Default: 'Redone'. */
  redone?: string;
}

/**
 * Announces undo / redo into the supplied `announce` sink so screen
 * readers pick up history navigation. The announcement fires at
 * `COMMAND_PRIORITY_LOW` so the history extension's own handler runs
 * first and is unaffected; the handler returns `false` to keep the
 * command chain intact.
 *
 */
function registerHistoryAnnounce(
  editor: LexicalEditor,
  announce: (message: string) => void,
  options: HistoryAnnounceOptions = {},
): () => void {
  const undoneMessage = options.undone ?? 'Undone';
  const redoneMessage = options.redone ?? 'Redone';
  const removeUndo = editor.registerCommand(
    UNDO_COMMAND,
    () => {
      announce(undoneMessage);
      return false;
    },
    COMMAND_PRIORITY_LOW,
  );
  const removeRedo = editor.registerCommand(
    REDO_COMMAND,
    () => {
      announce(redoneMessage);
      return false;
    },
    COMMAND_PRIORITY_LOW,
  );
  return mergeRegister(removeUndo, removeRedo);
}

interface EditorModeAnnounceOptions {
  /** Message announced when the editor becomes editable. Default: 'Editor is editable'. */
  editable?: string;
  /** Message announced when the editor becomes read-only. Default: 'Editor is read-only'. */
  readOnly?: string;
}

/**
 * Announces editor mode transitions (`editor.setEditable(true|false)`)
 * into the supplied `announce` sink. The `aria-readonly` attribute on
 * the editor root is already managed by other layers; this helper only
 * contributes the announcement.
 *
 */
function registerEditorModeAnnounce(
  editor: LexicalEditor,
  announce: (message: string) => void,
  options: EditorModeAnnounceOptions = {},
): () => void {
  const editableMessage = options.editable ?? 'Editor is editable';
  const readOnlyMessage = options.readOnly ?? 'Editor is read-only';
  return editor.registerEditableListener(editable => {
    announce(editable ? editableMessage : readOnlyMessage);
  });
}

export interface AriaLiveRegionExtensionConfig {
  /** {@link AriaPoliteness} for the mounted region. */
  politeness: AriaPoliteness;
  /**
   * Owner element to append the live region to. `null` falls back to
   * `document.body`; an explicit element keeps the region in the same
   * accessibility subtree as the editor (shadow root or portaled overlay).
   */
  owner: HTMLElement | null;
}

/**
 * Stable handle ref shared between {@link AriaLiveRegionExtension} and
 * its dependents. The `register` step swaps `current` to a live handle
 * for the editor's lifetime and restores `NOOP_HANDLE` on disposal, so
 * dependent extensions can capture the ref in `build` while the actual
 * sink is created without violating the "build must not require
 * cleanup" contract.
 */
export interface AriaLiveRegionRef {
  current: AriaLiveRegionHandle;
}

/**
 * Platform-independent extension that owns a single `aria-live` region
 * for the editor and exposes a stable {@link AriaLiveRegionRef} as the
 * extension output. Other a11y extensions (`HistoryAnnounceExtension`,
 * `EditorModeAnnounceExtension`) take this as a dependency and announce
 * through `output.current.announce`.
 *
 * Mount / dispose happens in `register` (the "build must not require
 * cleanup" contract); the ref's `current` is swapped to the live handle
 * there and restored to `NOOP_HANDLE` on disposal.
 */
export const AriaLiveRegionExtension = /* @__PURE__ */ defineExtension({
  build(_editor, _config): AriaLiveRegionRef {
    return {current: NOOP_HANDLE};
  },
  config: /* @__PURE__ */ safeCast<AriaLiveRegionExtensionConfig>({
    owner: null,
    politeness: 'polite',
  }),
  name: '@lexical/a11y/AriaLiveRegion',
  register(_editor, config, state) {
    const ref = state.getOutput();
    const handle = registerAriaLiveRegion({
      owner: config.owner ?? undefined,
      politeness: config.politeness,
    });
    ref.current = handle;
    return () => {
      handle.dispose();
      ref.current = NOOP_HANDLE;
    };
  },
});

export interface HistoryAnnounceExtensionConfig {
  /** Message announced after an undo. */
  undone: string;
  /** Message announced after a redo. */
  redone: string;
}

/**
 * Platform-independent extension that announces undo / redo through the
 * `AriaLiveRegionExtension`'s shared sink.
 */
export const HistoryAnnounceExtension = /* @__PURE__ */ defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: /* @__PURE__ */ safeCast<HistoryAnnounceExtensionConfig>({
    redone: 'Redone',
    undone: 'Undone',
  }),
  dependencies: [AriaLiveRegionExtension],
  name: '@lexical/a11y/HistoryAnnounce',
  register(editor, _config, state) {
    const {redone, undone} = state.getOutput();
    const ref = state.getDependency(AriaLiveRegionExtension).output;
    return effect(() =>
      registerHistoryAnnounce(editor, ref.current.announce, {
        redone: redone.value,
        undone: undone.value,
      }),
    );
  },
});

export interface EditorModeAnnounceExtensionConfig {
  /** Message announced when the editor becomes editable. */
  editable: string;
  /** Message announced when the editor becomes read-only. */
  readOnly: string;
}

/**
 * Platform-independent extension that announces
 * `editor.setEditable(true|false)` transitions through the
 * `AriaLiveRegionExtension`'s shared sink.
 */
export const EditorModeAnnounceExtension = /* @__PURE__ */ defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: /* @__PURE__ */ safeCast<EditorModeAnnounceExtensionConfig>({
    editable: 'Editor is editable',
    readOnly: 'Editor is read-only',
  }),
  dependencies: [AriaLiveRegionExtension],
  name: '@lexical/a11y/EditorModeAnnounce',
  register(editor, _config, state) {
    const {editable, readOnly} = state.getOutput();
    const ref = state.getDependency(AriaLiveRegionExtension).output;
    return effect(() =>
      registerEditorModeAnnounce(editor, ref.current.announce, {
        editable: editable.value,
        readOnly: readOnly.value,
      }),
    );
  },
});

/**
 * A reference-counted registry mapping DOM containers to a per-container
 * activation. The first {@link ContainerRegistry.register} call for a
 * container activates it; every call returns its own disposer, and the
 * activation is torn down only once the last outstanding registration for
 * that container is released. This lets the same element be driven by more
 * than one caller (e.g. two React refs, or a Strict-Mode double mount)
 * without double-wiring or premature teardown.
 *
 * This is the public output of the focus-trap, roving-tabindex and
 * focus-manager extensions: callers register through a method rather than a
 * mutable map, and never see the container bookkeeping or the teardown.
 */
export interface ContainerRegistry<Options> {
  /**
   * Activate `container` (reference counted) and return a disposer that
   * releases this registration. The disposer is idempotent.
   */
  register: (container: HTMLElement, options?: Options) => () => void;
}

/**
 * Internal handle for a {@link ContainerRegistry}, created in an extension's
 * `init` phase and shared with `build` (which binds the per-container
 * activation once the editor exists) and `register` (which disposes it on
 * teardown). Keeping the container map and teardown here — rather than on the
 * public {@link ContainerRegistry} output — is what hides them from callers.
 */
interface ManagedContainerRegistry<Options> {
  /** The public, consumer-facing registry exposed as the extension output. */
  readonly registry: ContainerRegistry<Options>;
  /** Bind the per-container activation; called from `build`. */
  setActivate: (
    activate: (container: HTMLElement, options?: Options) => () => void,
  ) => void;
  /** Dispose every live registration; called from the `register` teardown. */
  dispose: () => void;
}

function createManagedContainerRegistry<
  Options,
>(): ManagedContainerRegistry<Options> {
  interface Entry {
    count: number;
    dispose: () => void;
  }
  let activate:
    | ((container: HTMLElement, options?: Options) => () => void)
    | null = null;
  const entries = new Map<HTMLElement, Entry>();
  const registry: ContainerRegistry<Options> = {
    register(container, options) {
      if (activate === null) {
        throw new Error(
          '@lexical/a11y: container registered before the extension was built',
        );
      }
      let entry = entries.get(container);
      if (entry === undefined) {
        entry = {count: 0, dispose: activate(container, options)};
        entries.set(container, entry);
      }
      entry.count += 1;
      const ownEntry = entry;
      let released = false;
      return () => {
        if (released) {
          return;
        }
        released = true;
        // No-op if the registry was already torn down, or this container was
        // released to zero and re-registered as a fresh entry since.
        if (entries.get(container) !== ownEntry) {
          return;
        }
        ownEntry.count -= 1;
        if (ownEntry.count === 0) {
          entries.delete(container);
          ownEntry.dispose();
        }
      };
    },
  };
  return {
    dispose() {
      for (const entry of entries.values()) {
        entry.dispose();
      }
      entries.clear();
      activate = null;
    },
    registry,
    setActivate(fn) {
      activate = fn;
    },
  };
}

/**
 * Platform-independent extension that traps Tab / Shift+Tab focus inside one
 * or more containers. Register a container through the extension output
 * ({@link ContainerRegistry.register}); the React adapter is
 * `useLexicalFocusTrapRef` from `@lexical/react`.
 */
export const FocusTrapExtension = /* @__PURE__ */ defineExtension({
  build: (_editor, _config, state): ContainerRegistry<FocusTrapOptions> => {
    const managed = state.getInitResult();
    managed.setActivate(registerFocusTrap);
    return managed.registry;
  },
  init: () => createManagedContainerRegistry<FocusTrapOptions>(),
  name: '@lexical/a11y/FocusTrap',
  register: (_editor, _config, state) => () => state.getInitResult().dispose(),
});

/**
 * Platform-independent extension that wires the WAI-ARIA roving-tabindex
 * pattern on one or more containers. Register a container through the
 * extension output ({@link ContainerRegistry.register}); the React adapter is
 * `useLexicalRovingTabIndexRef` from `@lexical/react`.
 */
export const RovingTabIndexExtension = /* @__PURE__ */ defineExtension({
  build: (
    _editor,
    _config,
    state,
  ): ContainerRegistry<RovingTabIndexOptions> => {
    const managed = state.getInitResult();
    managed.setActivate(registerRovingTabIndex);
    return managed.registry;
  },
  init: () => createManagedContainerRegistry<RovingTabIndexOptions>(),
  name: '@lexical/a11y/RovingTabIndex',
  register: (_editor, _config, state) => () => state.getInitResult().dispose(),
});

/**
 * Platform-independent extension that wires the editor-to-toolbar focus jump
 * (Alt+F10 / Escape return) on one or more toolbars. Register a toolbar
 * through the extension output ({@link ContainerRegistry.register}); the React
 * adapter is `useLexicalFocusManagerRef` from `@lexical/react`.
 */
export const FocusManagerExtension = /* @__PURE__ */ defineExtension({
  build: (editor, _config, state): ContainerRegistry<FocusManagerOptions> => {
    const managed = state.getInitResult();
    managed.setActivate((toolbar, options) =>
      registerFocusManager(editor, toolbar, options),
    );
    return managed.registry;
  },
  init: () => createManagedContainerRegistry<FocusManagerOptions>(),
  name: '@lexical/a11y/FocusManager',
  register: (_editor, _config, state) => () => state.getInitResult().dispose(),
});
