/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {vi} from 'vitest';

// `warnOnlyOnce` is auto-mocked so each test observes the warning
// independently — the real implementation dedupes via a module-level
// closure that would otherwise leak state across tests. `invariant` and
// `devInvariant` are NOT mocked: their real implementations interpolate
// `%s` and throw without the build-time transform, so tests exercise the
// shipped behavior directly.
vi.mock('@lexical/internal/warnOnlyOnce');

// jsdom workarounds for the unit-test environment. Real browsers (and the
// playwright e2e suite) do not need any of these patches, so we gate on the
// jsdom-specific user-agent string and only patch when running there.
//
// 1. jsdom >= 24.1.1 collapses an existing text-node DOM selection to the
//    start of the focused element when HTMLElement.focus() is called on a
//    contenteditable ancestor. Real browsers (and happy-dom) preserve the
//    selection. Restore the pre-focus selection when this happens.
// 2. jsdom does not implement Range.prototype.getBoundingClientRect, so
//    Lexical's scroll-into-view path throws when reading it. Stub it.
const isJsdom =
  typeof navigator !== 'undefined' && /\bjsdom\//.test(navigator.userAgent);
if (isJsdom) {
  const polyfill =
    <Name extends string>(k: Name) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    <T extends Function>(o: T): void => {
      const g = globalThis as {[K in Name]?: T};
      if (typeof g[k] !== 'function') {
        g[k] = Object.defineProperty(o, 'name', {value: k});
      }
    };
  const originalFocus = HTMLElement.prototype.focus;
  function focusPreservingSelection(
    this: HTMLElement,
    options?: FocusOptions,
  ): void {
    const sel = document.getSelection();
    const snapshot =
      sel && sel.rangeCount > 0
        ? {
            anchorNode: sel.anchorNode,
            anchorOffset: sel.anchorOffset,
            focusNode: sel.focusNode,
            focusOffset: sel.focusOffset,
          }
        : null;
    originalFocus.call(this, options);
    if (
      snapshot !== null &&
      snapshot.anchorNode !== null &&
      snapshot.focusNode !== null &&
      this.contains(snapshot.anchorNode) &&
      this.contains(snapshot.focusNode) &&
      sel !== null &&
      (sel.anchorNode !== snapshot.anchorNode ||
        sel.anchorOffset !== snapshot.anchorOffset ||
        sel.focusNode !== snapshot.focusNode ||
        sel.focusOffset !== snapshot.focusOffset)
    ) {
      try {
        sel.setBaseAndExtent(
          snapshot.anchorNode,
          snapshot.anchorOffset,
          snapshot.focusNode,
          snapshot.focusOffset,
        );
      } catch {
        // Ignore restoration failures; tests that depend on selection will
        // surface them downstream.
      }
    }
  }
  HTMLElement.prototype.focus = focusPreservingSelection;

  // jsdom's HTMLElement.contentEditable is a plain property that doesn't
  // synchronize with the 'contenteditable' DOM attribute. Real browsers
  // (and the spec) require them to stay in sync, so override the
  // property to delegate to getAttribute/setAttribute.
  const ceDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'contentEditable',
  );
  if (!ceDescriptor || ceDescriptor.configurable !== false) {
    Object.defineProperty(HTMLElement.prototype, 'contentEditable', {
      configurable: true,
      get(this: HTMLElement) {
        const attr = this.getAttribute('contenteditable');
        if (attr === 'true' || attr === '') {
          return 'true';
        }
        if (attr === 'false') {
          return 'false';
        }
        return 'inherit';
      },
      set(this: HTMLElement, value: string) {
        if (value === 'inherit') {
          this.removeAttribute('contenteditable');
        } else {
          this.setAttribute('contenteditable', value);
        }
      },
    });
  }

  if (typeof Range.prototype.getBoundingClientRect !== 'function') {
    // jsdom does not implement layout, so a zero-rect stub is sufficient
    // for code paths that only need a DOMRect-shaped value (like
    // Lexical's scroll-into-view computation).
    Range.prototype.getBoundingClientRect = function (): DOMRect {
      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        toJSON() {
          return this;
        },
        top: 0,
        width: 0,
        x: 0,
        y: 0,
      } as DOMRect;
    };
  }

  // jsdom does not implement PointerEvent. Provide a minimal subclass of
  // Event carrying the fields our event handlers read (button, buttons,
  // clientX/Y, pointerType). Tests that need richer behavior can extend
  // or override per-event.
  polyfill('PointerEvent')(
    class PointerEventMock extends MouseEvent {
      pointerType: string;
      constructor(type: string, options?: PointerEventInit) {
        super(type, options);
        this.pointerType = (options && options.pointerType) || 'mouse';
      }
    },
  );

  polyfill('ClipboardEvent')(
    class ClipboardEventMock extends Event implements ClipboardEvent {
      clipboardData: null | DataTransfer;
      constructor(type: string, options?: ClipboardEventInit) {
        super(type, options);
        this.clipboardData = (options && options.clipboardData) || null;
      }
    },
  );

  polyfill('execCommand')(function execCommandMock(
    commandId: string,
    showUI?: boolean,
    value?: string,
  ): boolean {
    return true;
  });

  polyfill('DragEvent')(
    class DragEventMock extends MouseEvent implements DragEvent {
      dataTransfer: DataTransfer | null = null;
      constructor(type: string, options?: DragEventInit) {
        super(type, options);
        this.dataTransfer = (options && options.dataTransfer) || null;
      }
    },
  );

  polyfill('DataTransfer')(
    class DataTransferMock implements DataTransfer {
      _data: Map<string, string> = new Map();
      #normalizeType(key: string): string {
        const lowercase = key.toLowerCase();
        return lowercase === 'text'
          ? 'text/plain'
          : lowercase === 'url'
            ? 'text/uri-list'
            : lowercase;
      }
      get dropEffect(): DataTransfer['dropEffect'] {
        throw new Error('Getter not implemented.');
      }
      get effectAllowed(): DataTransfer['effectAllowed'] {
        throw new Error('Getter not implemented.');
      }
      get files(): FileList {
        const files: File[] = [];
        return {
          item: (index: number) => files[index] || null,
          get length() {
            return files.length;
          },
          get [Symbol.iterator]() {
            return files[Symbol.iterator];
          },
        };
      }
      get items(): DataTransferItemList {
        throw new Error('Getter not implemented.');
      }
      get types(): ReadonlyArray<string> {
        return [...this._data.keys()];
      }
      clearData(dataType?: string): void {
        if (dataType) {
          this._data.delete(this.#normalizeType(dataType));
        } else {
          this._data.clear();
        }
      }
      getData(dataType: string): string {
        const normalized = this.#normalizeType(dataType);
        const data = this._data.get(normalized) || '';
        return dataType === 'url'
          ? data.split(/\r?\n/).find(line => /^[^#]/.test(line)) || ''
          : data;
      }
      setData(dataType: string, data: string): void {
        this._data.set(this.#normalizeType(dataType), data);
      }
      setDragImage(image: Element, x: number, y: number): void {
        // ignored
      }
    },
  );
}
