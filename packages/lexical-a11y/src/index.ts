/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  effect,
  namedSignals,
  type NamedSignalsOutput,
  signal,
  watchedSignal,
} from '@lexical/extension';
import {mergeRegister} from '@lexical/utils';
import {
  COMMAND_PRIORITY_LOW,
  createRefCountedRegistry,
  defineExtension,
  getActiveElementDeep,
  getComposedEventTarget,
  isDOMShadowRoot,
  isHTMLElement,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  REDO_COMMAND,
  type RefCountedRegistry,
  safeCast,
  UNDO_COMMAND,
} from 'lexical';

export type AriaPoliteness = 'polite' | 'assertive';

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
 * Creates a visually hidden live-region element as a child of `owner` and
 * returns it. WAI-ARIA status message pattern (WCAG 4.1.3). The caller owns
 * the element's lifetime (removal) and applies the `aria-live` politeness and
 * `textContent` reactively.
 */
function createLiveRegion(owner: HTMLElement): HTMLElement {
  const region = owner.ownerDocument.createElement('div');
  region.setAttribute('aria-atomic', 'true');
  region.setAttribute('role', 'status');
  applyVisuallyHidden(region);
  owner.appendChild(region);
  return region;
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
        nextIdx = currentIdx + 1;
        break;
      case 'ArrowLeft':
        if (!horizontal) {
          return;
        }
        nextIdx = currentIdx - 1;
        break;
      case 'ArrowDown':
        if (!vertical) {
          return;
        }
        nextIdx = currentIdx + 1;
        break;
      case 'ArrowUp':
        if (!vertical) {
          return;
        }
        nextIdx = currentIdx - 1;
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
    // Single wrap for every case: the only out-of-range value is -1 (left/up
    // from the first item), and `currentIdx >= 0` keeps `nextIdx >= -1`, so one
    // `+ length` is enough to normalize.
    nextIdx = (nextIdx + items.length) % items.length;
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

  return mergeRegister(
    editor.registerCommand(
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
    ),
    () => {
      toolbar.removeEventListener('keydown', handler);
    },
  );
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
 * Public output of {@link AriaLiveRegionExtension}. The `politeness` and
 * `owner` config values are exposed as runtime-tunable signals — setting
 * `politeness` updates the mounted region's `aria-live`, setting `owner`
 * re-mounts the region — alongside a stable `announce` sink that is valid for
 * the editor's lifetime (callers never see the region element or its disposal).
 */
export type AriaLiveRegion =
  NamedSignalsOutput<AriaLiveRegionExtensionConfig> & {
    /**
     * Write a message into the editor's live region. Announcing the same
     * string back-to-back appends a zero-width space so screen readers
     * register the change and re-announce. A no-op until a region is mounted
     * (the editor has a root element, or an `owner` is configured).
     */
    announce: (message: string) => void;
  };

/**
 * Platform-independent extension that owns a single `aria-live` region for
 * the editor and exposes a stable {@link AriaLiveRegion} sink as its output.
 * Other a11y extensions (`HistoryAnnounceExtension`,
 * `EditorModeAnnounceExtension`) depend on it and announce through
 * `output.announce`.
 *
 * The sink writes to a private `message` signal created in `init`. The
 * `politeness` / `owner` config are exposed as signals (via `namedSignals`).
 * `register` tracks the editor's root element reactively and runs three
 * effects: one creates / disposes the region element as the root document (or
 * `owner`) changes, one applies the current `politeness` to the mounted region,
 * and one mirrors the current message into it. Buffering through signals
 * decouples the stable `announce` (from `build`) from the region element —
 * which comes and goes with the root — and creates the region in the editor's
 * own document (e.g. an iframe-portaled editor) rather than the top-level
 * `document`.
 */
export const AriaLiveRegionExtension = /* @__PURE__ */ defineExtension({
  build(_editor, config, state): AriaLiveRegion {
    const message = state.getInitResult();
    return {
      ...namedSignals(config),
      announce(text) {
        // Toggle a trailing zero-width space on repeats so re-announcing the
        // same text still registers as a textContent change downstream.
        message.value = text === message.peek() ? text + '\u200B' : text;
      },
    };
  },
  config: /* @__PURE__ */ safeCast<AriaLiveRegionExtensionConfig>({
    owner: null,
    politeness: 'polite',
  }),
  // Private reactive message buffer shared by `build` (writer) and `register`
  // (renderer); see the extension doc comment.
  init: () => signal<string>(''),
  name: '@lexical/a11y/AriaLiveRegion',
  register(editor, _config, state) {
    const message = state.getInitResult();
    const {owner, politeness} = state.getOutput();
    const rootElement = watchedSignal(
      () => editor.getRootElement(),
      self =>
        editor.registerRootListener(el => {
          self.value = el;
        }),
    );
    const region = signal<HTMLElement | null>(null);
    return mergeRegister(
      // Create / dispose the region as the root document (or `owner`) changes.
      effect(() => {
        const root = rootElement.value;
        const host = owner.value ?? (root ? root.ownerDocument.body : null);
        if (host === null) {
          return undefined;
        }
        const el = createLiveRegion(host);
        region.value = el;
        return () => {
          el.remove();
          region.value = null;
        };
      }),
      // Apply the (runtime-tunable) politeness to whatever region is mounted.
      effect(() => {
        const el = region.value;
        if (el !== null) {
          el.setAttribute('aria-live', politeness.value);
        }
      }),
      // Mirror the current message into whatever region is mounted.
      effect(() => {
        const el = region.value;
        if (el !== null) {
          el.textContent = message.value;
        }
      }),
    );
  },
});

export interface HistoryAnnounceExtensionConfig {
  /** Message announced after an undo. */
  undone: string;
  /** Message announced after a redo. */
  redone: string;
  /** When `true`, undo / redo are not announced. Toggle at runtime via the
   * output signal. Default `false`. */
  disabled: boolean;
}

/**
 * Platform-independent extension that announces undo / redo through the
 * `AriaLiveRegionExtension`'s shared sink.
 */
export const HistoryAnnounceExtension = /* @__PURE__ */ defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: /* @__PURE__ */ safeCast<HistoryAnnounceExtensionConfig>({
    disabled: false,
    redone: 'Redone',
    undone: 'Undone',
  }),
  dependencies: [AriaLiveRegionExtension],
  name: '@lexical/a11y/HistoryAnnounce',
  register(editor, _config, state) {
    const {disabled, redone, undone} = state.getOutput();
    const {announce} = state.getDependency(AriaLiveRegionExtension).output;
    // Read the signals at dispatch time so the commands register once and
    // pick up message / disabled changes without re-registering. Both return
    // false to keep the history command chain intact.
    return mergeRegister(
      editor.registerCommand(
        UNDO_COMMAND,
        () => {
          if (!disabled.value) {
            announce(undone.value);
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        REDO_COMMAND,
        () => {
          if (!disabled.value) {
            announce(redone.value);
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  },
});

export interface EditorModeAnnounceExtensionConfig {
  /** Message announced when the editor becomes editable. */
  editable: string;
  /** Message announced when the editor becomes read-only. */
  readOnly: string;
  /** When `true`, editable / read-only transitions are not announced. Toggle
   * at runtime via the output signal. Default `false`. */
  disabled: boolean;
}

/**
 * Platform-independent extension that announces
 * `editor.setEditable(true|false)` transitions through the
 * `AriaLiveRegionExtension`'s shared sink.
 */
export const EditorModeAnnounceExtension = /* @__PURE__ */ defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: /* @__PURE__ */ safeCast<EditorModeAnnounceExtensionConfig>({
    disabled: false,
    editable: 'Editor is editable',
    readOnly: 'Editor is read-only',
  }),
  dependencies: [AriaLiveRegionExtension],
  name: '@lexical/a11y/EditorModeAnnounce',
  register(editor, _config, state) {
    const {disabled, editable, readOnly} = state.getOutput();
    const {announce} = state.getDependency(AriaLiveRegionExtension).output;
    // Read the signals at listener time so the listener registers once and
    // picks up message / disabled changes without re-registering.
    return editor.registerEditableListener(isEditable => {
      if (!disabled.value) {
        announce(isEditable ? editable.value : readOnly.value);
      }
    });
  },
});

/**
 * The public output of the focus-trap, roving-tabindex and focus-manager
 * extensions: register a container (reference counted) and get back an
 * idempotent disposer. Callers register through this method instead of a
 * mutable map and never see the container bookkeeping or the teardown. It is
 * the core {@link RefCountedRegistry} keyed by `HTMLElement`.
 *
 * Each extension creates the registry in its `init` phase, binds the
 * per-container activation in `build` (where the editor is available), exposes
 * the narrowed registry as its output, and disposes it on `register` teardown.
 */
export type ContainerRegistry<Options> = RefCountedRegistry<
  HTMLElement,
  Options
>;

/**
 * Platform-independent extension that traps Tab / Shift+Tab focus inside one
 * or more containers. Register a container through the extension output
 * ({@link ContainerRegistry.register}); the React adapter is
 * `useLexicalFocusTrapRef` from `@lexical/react`.
 */
export const FocusTrapExtension = /* @__PURE__ */ defineExtension({
  build: (_editor, _config, state): ContainerRegistry<FocusTrapOptions> => {
    const registry = state.getInitResult();
    registry.setActivate(registerFocusTrap);
    return registry;
  },
  init: () => createRefCountedRegistry<HTMLElement, FocusTrapOptions>(),
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
    const registry = state.getInitResult();
    registry.setActivate(registerRovingTabIndex);
    return registry;
  },
  init: () => createRefCountedRegistry<HTMLElement, RovingTabIndexOptions>(),
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
    const registry = state.getInitResult();
    registry.setActivate((toolbar, options) =>
      registerFocusManager(editor, toolbar, options),
    );
    return registry;
  },
  init: () => createRefCountedRegistry<HTMLElement, FocusManagerOptions>(),
  name: '@lexical/a11y/FocusManager',
  register: (_editor, _config, state) => () => state.getInitResult().dispose(),
});
