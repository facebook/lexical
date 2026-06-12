/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {DragonExtension, installDragonSupport} from '@lexical/dragon';
import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  defineExtension,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

function setUpEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('Hello world')),
        );
      },
      dependencies: [DragonExtension],
      name: 'dragon-test',
      register: editor => {
        const rootElement = document.createElement('div');
        rootElement.setAttribute('contenteditable', 'true');
        rootElement.tabIndex = 0;
        document.body.appendChild(rootElement);
        editor.setRootElement(rootElement);
        rootElement.focus();
        return () => rootElement.remove();
      },
    }),
  );
}

function $selectStartOfFirstTextNode() {
  const paragraph = $getRoot().getFirstChild();
  assert($isParagraphNode(paragraph));
  const textNode = paragraph.getFirstChild();
  assert($isTextNode(textNode));
  textNode.select(0, 0);
}

// The Dragon NaturallySpeaking web extension sends makeChanges messages with
// args [elementStart, elementLength, text, selStart, selLength, formatCommand].
// A text of -1 (a number, not a string) means "change the selection without
// touching the text", which is how Select-and-Say corrections and cursor moves
// by voice arrive. The optional sixth argument carries an execCommand name
// (bold, italic, underline, ...) for voice commands such as "bold that".
function dispatchMakeChanges(args: unknown): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: JSON.stringify({
        payload: {args, functionId: 'makeChanges'},
        protocol: 'nuanria_messaging',
        type: 'request',
      }),
      origin: window.location.origin,
    }),
  );
}

describe('DragonExtension', () => {
  test('installDragonSupport at the entrypoint wins the registration race', () => {
    const uninstall = installDragonSupport();
    const extensionEdits: unknown[] = [];
    const extensionListener = (event: MessageEvent) => {
      extensionEdits.push(event.data);
    };
    window.addEventListener('message', extensionListener);
    try {
      using editor = setUpEditor();
      editor.update($selectStartOfFirstTextNode, {discrete: true});

      dispatchMakeChanges([0, 5, 'Howdy', 5, 0]);

      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('Howdy world');
      });
      // stopImmediatePropagation kept the message from the extension's
      // listener even though the editor mounted after it
      expect(extensionEdits).toEqual([]);
    } finally {
      window.removeEventListener('message', extensionListener);
      uninstall();
    }
  });

  test('dispatches to the focused editor', () => {
    using first = setUpEditor();
    using second = setUpEditor();
    second.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, 'Howdy', 5, 0]);

    first.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
    });
    second.read(() => {
      expect($getRoot().getTextContent()).toBe('Howdy world');
    });
  });

  test('keeps working for editors created after others are disposed', () => {
    {
      using disposed = setUpEditor();
      void disposed;
    }
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, 'Howdy', 5, 0]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Howdy world');
    });
  });

  test('replaces the addressed range on makeChanges', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, 'Howdy', 5, 0]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Howdy world');
    });
  });

  test('moves the selection without touching the text when text is -1', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, 6, 5]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.anchor.offset).toBe(6);
      expect(selection.focus.offset).toBe(11);
    });
  });

  test('applies a correction after a selection-only makeChanges', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, 0, 5]);
    dispatchMakeChanges([0, 5, 'Howdy', 5, 0]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Howdy world');
    });
  });

  test('collapses a final selection whose end precedes its start', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, 8, -3]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.anchor.offset).toBe(8);
      expect(selection.focus.offset).toBe(8);
    });
  });

  test('collapses a final selection with negative offsets', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, -5, 100]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.anchor.offset).toBe(0);
      expect(selection.focus.offset).toBe(0);
    });
  });

  test('ignores malformed makeChanges payloads', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges('garbage');
    dispatchMakeChanges({blockStart: 4});
    dispatchMakeChanges(['4', '9', 'Hi', 0, 0]);
    dispatchMakeChanges([0, 5, 5, 0, 0]);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
    });
  });

  test('formats the final selection when formatCommand is present', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, 0, 5, 'bold']);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
      const paragraph = $getRoot().getFirstChild();
      assert($isParagraphNode(paragraph));
      const textNode = paragraph.getFirstChild();
      assert($isTextNode(textNode));
      expect(textNode.getTextContent()).toBe('Hello');
      expect(textNode.hasFormat('bold')).toBe(true);
    });
  });

  test('does not toggle format when the final selection is collapsed', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, 20, 5, 'bold']);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.format).toBe(0);
    });
  });

  test('ignores unknown formatCommand values', () => {
    using editor = setUpEditor();
    editor.update($selectStartOfFirstTextNode, {discrete: true});

    dispatchMakeChanges([0, 5, -1, 0, 5, 'fontName']);
    dispatchMakeChanges([0, 5, -1, 0, 5, 'toString']);

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('Hello world');
      const paragraph = $getRoot().getFirstChild();
      assert($isParagraphNode(paragraph));
      const textNode = paragraph.getFirstChild();
      assert($isTextNode(textNode));
      expect(textNode.getFormat()).toBe(0);
    });
  });

  test('handles editors mounted inside an iframe', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const iframeWindow = iframe.contentWindow;
    assert(iframeWindow !== null);
    const iframeDocument = iframeWindow.document;
    iframeDocument.open();
    iframeDocument.write('<!doctype html><html><body></body></html>');
    iframeDocument.close();

    const uninstall = installDragonSupport(iframeWindow);
    const topEdits: unknown[] = [];
    const topListener = (event: MessageEvent) => topEdits.push(event.data);
    window.addEventListener('message', topListener);
    try {
      const editor = buildEditorFromExtensions(
        defineExtension({
          $initialEditorState: () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Hello world')),
            );
          },
          dependencies: [DragonExtension],
          name: 'dragon-iframe-test',
          register: theEditor => {
            const rootElement = iframeDocument.createElement('div');
            rootElement.setAttribute('contenteditable', 'true');
            rootElement.tabIndex = 0;
            iframeDocument.body.appendChild(rootElement);
            theEditor.setRootElement(rootElement);
            rootElement.focus();
            return () => rootElement.remove();
          },
        }),
      );
      try {
        editor.update($selectStartOfFirstTextNode, {discrete: true});

        iframeWindow.dispatchEvent(
          new MessageEvent('message', {
            data: JSON.stringify({
              payload: {
                args: [0, 5, 'Howdy', 5, 0],
                functionId: 'makeChanges',
              },
              protocol: 'nuanria_messaging',
              type: 'request',
            }),
            origin: iframeWindow.location.origin,
          }),
        );

        editor.read(() => {
          expect($getRoot().getTextContent()).toBe('Howdy world');
        });
        // The top window's listener never saw the iframe's message
        expect(topEdits).toEqual([]);
      } finally {
        editor.dispose();
      }
    } finally {
      window.removeEventListener('message', topListener);
      uninstall();
      iframe.remove();
    }
  });
});
