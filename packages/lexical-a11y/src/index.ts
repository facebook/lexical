/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, namedSignals} from '@lexical/extension';
import {
  COMMAND_PRIORITY_LOW,
  defineExtension,
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
 * and disposes the region when called.
 *
 * Framework-agnostic — call from React via `useLexicalAriaLiveRegion`,
 * from Svelte via `onMount` / `onDestroy`, or imperatively from vanilla
 * JS. WAI-ARIA status message pattern (WCAG 4.1.3).
 *
 * If neither `owner` nor `document.body` is available (e.g. SSR), the
 * returned handle is a no-op.
 */
export function registerAriaLiveRegion(
  options: AriaLiveRegionOptions = {},
): AriaLiveRegionHandle {
  const politeness = options.politeness ?? 'polite';
  const host =
    options.owner ?? (typeof document !== 'undefined' ? document.body : null);
  if (host === null) {
    return NOOP_HANDLE;
  }
  const region = document.createElement('div');
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
 *
 * Framework-agnostic — React consumers should use
 * `useLexicalFocusTrap` from `@lexical/react`.
 */
export function registerFocusTrap(
  container: HTMLElement,
  options: FocusTrapOptions = {},
): () => void {
  const initialFocus = options.initialFocus ?? 'firstFocusable';

  const previouslyFocused = isHTMLElement(document.activeElement)
    ? document.activeElement
    : null;

  const focusable = getFocusableElements(container);
  if (initialFocus === 'container' && container.tabIndex >= -1) {
    container.focus();
  } else if (focusable.length > 0) {
    focusable[0].focus();
  } else if (container.tabIndex >= -1) {
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
    const active = document.activeElement;
    const activeIndex =
      isHTMLElement(active) && container.contains(active)
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
    if (!isHTMLElement(event.target) || container.contains(event.target)) {
      return;
    }
    const currentFocusable = getFocusableElements(container);
    if (currentFocusable.length > 0) {
      currentFocusable[0].focus();
    } else if (container.tabIndex >= -1) {
      container.focus();
    }
  };

  container.addEventListener('keydown', keydownHandler);
  document.addEventListener('focusin', focusinHandler);

  return () => {
    container.removeEventListener('keydown', keydownHandler);
    document.removeEventListener('focusin', focusinHandler);
    if (
      previouslyFocused !== null &&
      // `isHTMLElement` admits any `Element` whose nodeType is 1, so SVG
      // and other non-focusable elements can pass — keep the runtime
      // `focus` check as a guard against that.
      typeof previouslyFocused.focus === 'function' &&
      document.contains(previouslyFocused)
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
 *
 * Framework-agnostic — React consumers should use
 * `useLexicalRovingTabIndex` from `@lexical/react`.
 */
export function registerRovingTabIndex(
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
    const activeIdx = items.findIndex(el => el === document.activeElement);
    applyTabIndex(items, activeIdx >= 0 ? activeIdx : 0);
  };

  init();

  const handler = (event: KeyboardEvent): void => {
    const items = getItems();
    if (items.length === 0) {
      return;
    }
    const currentIdx = items.findIndex(el => el === document.activeElement);
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
 *
 * Framework-agnostic — React consumers should use
 * `useLexicalFocusManager` from `@lexical/react`.
 */
export function registerFocusManager(
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
      const firstItem = toolbar.querySelector<HTMLElement>(selector);
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

  return () => {
    removeCommand();
    toolbar.removeEventListener('keydown', handler);
  };
}

export interface HistoryAnnounceOptions {
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
 * Framework-agnostic — pair with `registerAriaLiveRegion`'s `announce`
 * for a vanilla integration, or use `HistoryAnnouncePlugin` from
 * `@lexical/react` for the React version.
 */
export function registerHistoryAnnounce(
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
  return () => {
    removeUndo();
    removeRedo();
  };
}

export interface EditorModeAnnounceOptions {
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
 * Framework-agnostic — pair with `registerAriaLiveRegion`'s `announce`
 * for a vanilla integration, or use `EditorModeAnnouncePlugin` from
 * `@lexical/react` for the React version.
 */
export function registerEditorModeAnnounce(
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
 * `AriaLiveRegionExtension`'s shared sink. Replaces the React-only
 * `HistoryAnnouncePlugin` for `@lexical/extension` hosts.
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
 * `AriaLiveRegionExtension`'s shared sink. Replaces the React-only
 * `EditorModeAnnouncePlugin` for `@lexical/extension` hosts.
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
