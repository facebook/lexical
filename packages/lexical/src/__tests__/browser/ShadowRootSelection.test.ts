/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerRichText} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  createEditor,
  getActiveElement,
  getActiveElementDeep,
  getComposedStaticRange,
  getDOMSelection,
  getDOMSelectionPoints,
  getDOMShadowRoots,
  isDOMShadowRoot,
  type LexicalEditor,
} from 'lexical';
import {beforeEach, describe, expect, onTestFinished, test} from 'vitest';
import {userEvent} from 'vitest/browser';

// These tests exercise the DOM shadow root support that relies on platform
// selection APIs (Selection.getComposedRanges / Selection.direction /
// ShadowRoot.activeElement / Selection.modify). jsdom implements none of these
// realistically, so the behavior can only be asserted in a real browser. See
// the `browser` project in vitest.config.mts.

// `getComposedRanges` etc. only exist in Chromium/WebKit/Firefox builds new
// enough to support them. When the host browser predates the API the helpers
// degrade to the light-DOM reads, so we skip the shadow-specific assertions
// rather than fail on an old engine.
const SUPPORTS_COMPOSED_RANGES =
  typeof Selection !== 'undefined' &&
  typeof Selection.prototype.getComposedRanges === 'function';

interface ShadowEditor {
  editor: LexicalEditor;
  host: HTMLElement;
  shadow: ShadowRoot;
  contentEditable: HTMLElement;
}

function $prepopulate(text: string): void {
  const root = $getRoot();
  root.clear();
  root.append($createParagraphNode().append($createTextNode(text)));
}

function setUpShadowEditor(text = 'Hello world'): ShadowEditor {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadow = host.attachShadow({mode: 'open'});
  const contentEditable = document.createElement('div');
  contentEditable.contentEditable = 'true';
  shadow.appendChild(contentEditable);

  const editor = createEditor({
    namespace: 'shadow-root-selection',
    nodes: [],
    onError: error => {
      throw error;
    },
  });
  editor.setRootElement(contentEditable);
  editor.update(() => $prepopulate(text), {discrete: true});

  onTestFinished(() => {
    editor.setRootElement(null);
    document.body.removeChild(host);
  });
  return {contentEditable, editor, host, shadow};
}

function getInnerTextNode(contentEditable: HTMLElement): Text {
  const span = contentEditable.querySelector('[data-lexical-text="true"]');
  return span!.firstChild as Text;
}

function selectInnerText(
  contentEditable: HTMLElement,
  start: number,
  end: number,
): {domSelection: Selection; textNode: Text} {
  const textNode = getInnerTextNode(contentEditable);
  const domSelection = getDOMSelection(window)!;
  // setBaseAndExtent rather than addRange: WebKit does not reliably register a
  // Range added with addRange when it points inside a shadow tree.
  domSelection.setBaseAndExtent(textNode, start, textNode, end);
  return {domSelection, textNode};
}

describe('DOM shadow root selection (browser)', () => {
  beforeEach(() => {
    const domSelection = getDOMSelection(window);
    if (domSelection) {
      domSelection.removeAllRanges();
    }
  });

  test('getDOMShadowRoots walks out of nested shadow trees', () => {
    const {contentEditable, shadow, host} = setUpShadowEditor();
    expect(getDOMShadowRoots(contentEditable)).toEqual([shadow]);
    // The host itself lives in the light DOM.
    expect(getDOMShadowRoots(host)).toEqual([]);
    expect(getDOMShadowRoots(document.body)).toEqual([]);
    expect(isDOMShadowRoot(shadow)).toBe(true);
    expect(isDOMShadowRoot(document)).toBe(false);
    expect(isDOMShadowRoot(document.createDocumentFragment())).toBe(false);

    // A nested shadow tree resolves innermost-first.
    const innerHost = document.createElement('div');
    contentEditable.appendChild(innerHost);
    const innerShadow = innerHost.attachShadow({mode: 'open'});
    const leaf = document.createElement('span');
    innerShadow.appendChild(leaf);
    expect(getDOMShadowRoots(leaf)).toEqual([innerShadow, shadow]);
  });

  test('getDOMSelectionPoints resolves a retargeted shadow selection', () => {
    const {contentEditable, host} = setUpShadowEditor();
    if (!SUPPORTS_COMPOSED_RANGES) {
      return;
    }
    const {domSelection, textNode} = selectInnerText(contentEditable, 1, 4);

    const points = getDOMSelectionPoints(domSelection, contentEditable);
    expect(points.anchorNode).toBe(textNode);
    expect(points.anchorOffset).toBe(1);
    expect(points.focusNode).toBe(textNode);
    expect(points.focusOffset).toBe(4);

    // The composed StaticRange is in tree order.
    const staticRange = getComposedStaticRange(domSelection, contentEditable);
    expect(staticRange!.startContainer).toBe(textNode);
    expect(staticRange!.startOffset).toBe(1);
    expect(staticRange!.endOffset).toBe(4);

    // host is unused beyond proving the selection is inside its shadow tree.
    expect(host.shadowRoot!.contains(textNode)).toBe(true);
  });

  test('getDOMSelectionPoints honors backward selections', () => {
    const {contentEditable} = setUpShadowEditor();
    if (!SUPPORTS_COMPOSED_RANGES) {
      return;
    }
    const textNode = getInnerTextNode(contentEditable);
    const domSelection = getDOMSelection(window)!;
    domSelection.removeAllRanges();
    // setBaseAndExtent with base after extent makes a backward selection.
    domSelection.setBaseAndExtent(textNode, 5, textNode, 2);

    const points = getDOMSelectionPoints(domSelection, contentEditable);
    // anchor is the base (5), focus is the extent (2).
    expect(points.anchorOffset).toBe(5);
    expect(points.focusOffset).toBe(2);
  });

  test('falls back to the Selection itself in the light DOM', () => {
    const light = document.createElement('div');
    light.contentEditable = 'true';
    document.body.appendChild(light);
    onTestFinished(() => {
      document.body.removeChild(light);
    });
    const editor = createEditor({
      namespace: 'light',
      nodes: [],
      onError: error => {
        throw error;
      },
    });
    editor.setRootElement(light);
    editor.update(() => $prepopulate('Hello world'), {discrete: true});
    onTestFinished(() => editor.setRootElement(null));

    const {domSelection} = selectInnerText(light, 0, 5);
    expect(getComposedStaticRange(domSelection, light)).toBeNull();
    // No shadow root to resolve through, so the Selection is returned as-is.
    expect(getDOMSelectionPoints(domSelection, light)).toBe(domSelection);
  });

  test('getActiveElement / getActiveElementDeep see through the shadow host', () => {
    const {contentEditable, host} = setUpShadowEditor();
    contentEditable.focus();

    // document.activeElement is retargeted to the host...
    expect(document.activeElement).toBe(host);
    // ...but the shadow-aware helpers resolve the real focused element.
    expect(getActiveElement(contentEditable)).toBe(contentEditable);
    expect(getActiveElementDeep(document)).toBe(contentEditable);
  });

  test('the reconciler writes selection onto the shadow inner nodes', () => {
    const {contentEditable, editor, shadow} = setUpShadowEditor();
    if (!SUPPORTS_COMPOSED_RANGES) {
      return;
    }
    contentEditable.focus();
    editor.update(
      () => {
        const text = $getRoot().getAllTextNodes()[0];
        const selection = $createRangeSelection();
        selection.anchor.set(text.getKey(), 0, 'text');
        selection.focus.set(text.getKey(), 5, 'text');
        $setSelection(selection);
      },
      {discrete: true},
    );

    const textNode = getInnerTextNode(contentEditable);
    const domSelection = getDOMSelection(window)!;
    const points = getDOMSelectionPoints(domSelection, contentEditable);
    expect(points.anchorNode).toBe(textNode);
    expect(points.anchorOffset).toBe(0);
    expect(points.focusNode).toBe(textNode);
    expect(points.focusOffset).toBe(5);
    // Focus landed inside the shadow tree.
    expect(shadow.activeElement).toBe(contentEditable);
  });

  test('reading the DOM selection resolves shadow nodes into the model', () => {
    const {contentEditable, editor} = setUpShadowEditor();
    if (!SUPPORTS_COMPOSED_RANGES) {
      return;
    }
    contentEditable.focus();
    selectInnerText(contentEditable, 2, 7);

    // This is the same DOM->model read that the document 'selectionchange'
    // handler performs internally ($internalCreateSelection); passing the event
    // option drives it deterministically without depending on the asynchronous
    // native selectionchange dispatch.
    editor.update(() => {}, {
      discrete: true,
      event: new Event('selectionchange'),
    });

    editor.read(() => {
      const selection = $getSelection();
      expect($isRangeSelection(selection)).toBe(true);
      if ($isRangeSelection(selection)) {
        expect(selection.anchor.offset).toBe(2);
        expect(selection.focus.offset).toBe(7);
        expect(selection.getTextContent()).toBe('llo w');
      }
    });
  });

  test('RangeSelection.modify uses native modify() inside a shadow root', () => {
    const {contentEditable, editor} = setUpShadowEditor();
    if (!SUPPORTS_COMPOSED_RANGES) {
      return;
    }
    contentEditable.focus();

    // Character granularity is deterministic across browsers.
    editor.update(
      () => {
        const text = $getRoot().getAllTextNodes()[0];
        const selection = $createRangeSelection();
        selection.anchor.set(text.getKey(), 0, 'text');
        selection.focus.set(text.getKey(), 0, 'text');
        $setSelection(selection);
        selection.modify('extend', false, 'character');
      },
      {discrete: true},
    );
    editor.read(() => {
      const selection = $getSelection();
      expect($isRangeSelection(selection)).toBe(true);
      if ($isRangeSelection(selection)) {
        expect(selection.getTextContent()).toBe('H');
      }
    });

    // Word granularity should at least cover the first word.
    editor.update(
      () => {
        const text = $getRoot().getAllTextNodes()[0];
        const selection = $createRangeSelection();
        selection.anchor.set(text.getKey(), 0, 'text');
        selection.focus.set(text.getKey(), 0, 'text');
        $setSelection(selection);
        selection.modify('extend', false, 'word');
      },
      {discrete: true},
    );
    editor.read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        expect(selection.getTextContent().startsWith('Hello')).toBe(true);
        expect(selection.isCollapsed()).toBe(false);
      }
    });
  });

  // Regression test for #2119 and #8125: an editor hosted in a web
  // component's shadow root must accept real keyboard input (key events,
  // beforeinput, mutation handling) — previously characters never appeared
  // because the retargeted DOM selection could not be resolved.
  test('real keyboard input works in a web component shadow root', async () => {
    if (!SUPPORTS_COMPOSED_RANGES) {
      return;
    }
    if (customElements.get('test-lexical-host') === undefined) {
      customElements.define(
        'test-lexical-host',
        class extends HTMLElement {
          connectedCallback() {
            const shadow = this.shadowRoot ?? this.attachShadow({mode: 'open'});
            const contentEditable = document.createElement('div');
            contentEditable.contentEditable = 'true';
            shadow.appendChild(contentEditable);
          }
        },
      );
    }
    const host = document.createElement('test-lexical-host');
    document.body.appendChild(host);
    const contentEditable = host.shadowRoot!.firstElementChild as HTMLElement;
    const editor = createEditor({
      namespace: 'web-component',
      nodes: [],
      onError: error => {
        throw error;
      },
    });
    // Command handlers for backspace/delete/etc.; insertion of plain typed
    // text is otherwise handled by the mutation observer path.
    const removeRichText = registerRichText(editor);
    editor.setRootElement(contentEditable);
    editor.update(() => $prepopulate('Hi'), {discrete: true});
    onTestFinished(() => {
      removeRichText();
      editor.setRootElement(null);
      document.body.removeChild(host);
    });

    // Place the caret at the end of "Hi" with the native selection, and sync
    // it into the editor the same way the selectionchange handler would.
    contentEditable.focus();
    const textNode = getInnerTextNode(contentEditable);
    getDOMSelection(window)!.setBaseAndExtent(textNode, 2, textNode, 2);
    editor.update(() => {}, {
      discrete: true,
      event: new Event('selectionchange'),
    });

    await userEvent.keyboard('abc');

    expect(editor.read(() => $getRoot().getTextContent())).toBe('Hiabc');

    // Backspace exercises the deletion path through the same selection
    // resolution machinery.
    await userEvent.keyboard('{Backspace}');
    expect(editor.read(() => $getRoot().getTextContent())).toBe('Hiab');
  });
});
