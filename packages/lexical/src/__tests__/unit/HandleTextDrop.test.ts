/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $handleTextDrop,
  $insertDataTransferForRichText,
} from '@lexical/clipboard';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  LexicalEditor,
  TextNode,
} from 'lexical';
import {
  DataTransferMock,
  initializeUnitTest,
  invariant,
} from 'lexical/src/__tests__/utils';
import {beforeEach, describe, expect, test, vi} from 'vitest';

const caretFromPointState = vi.hoisted(() => ({
  current: (_x: number, _y: number): null | {node: Node; offset: number} =>
    null,
}));

vi.mock('shared/caretFromPoint', () => ({
  default: (x: number, y: number) => caretFromPointState.current(x, y),
}));

function setCaretFromPoint(node: Node, offset: number): void {
  caretFromPointState.current = () => ({node, offset});
}

function createDropEvent(): {
  event: DragEvent;
  dataTransfer: DataTransferMock;
  preventDefault: ReturnType<typeof vi.fn>;
} {
  const dataTransfer = new DataTransferMock();
  const preventDefault = vi.fn();
  const event = {
    clientX: 0,
    clientY: 0,
    dataTransfer,
    preventDefault,
  } as unknown as DragEvent;
  return {dataTransfer, event, preventDefault};
}

function getParagraphTextDOM(editor: LexicalEditor, textKey: string): Text {
  const span = editor.getElementByKey(textKey);
  invariant(span !== null, 'span is null');
  const textNode = span.firstChild;
  invariant(
    textNode !== null && textNode.nodeType === Node.TEXT_NODE,
    'expected DOM text node',
  );
  return textNode as Text;
}

describe('$handleTextDrop', () => {
  initializeUnitTest((testEnv) => {
    beforeEach(() => {
      caretFromPointState.current = () => null;
    });

    test('moves a selected word later within the same TextNode', async () => {
      const {editor} = testEnv;
      let textKey = '';
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello foo world');
        paragraph.append(text);
        $getRoot().clear().append(paragraph);
        textKey = text.getKey();

        const selection = $createRangeSelection();
        selection.anchor.set(textKey, 6, 'text');
        selection.focus.set(textKey, 9, 'text');
        $setSelection(selection);
      });

      await editor.update(() => {
        const domText = getParagraphTextDOM(editor, textKey);
        // Drop position at offset 15 ("Hello foo world|"), past the source's end.
        setCaretFromPoint(domText, 15);
        const {dataTransfer, event, preventDefault} = createDropEvent();
        dataTransfer.setData('text/plain', 'foo');
        const handled = $handleTextDrop(
          event,
          editor,
          $insertDataTransferForRichText,
        );
        expect(handled).toBe(true);
        expect(preventDefault).toHaveBeenCalled();
      });

      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('Hello  worldfoo');
      });
    });

    test('moves a selected word earlier within the same TextNode', async () => {
      const {editor} = testEnv;
      let textKey = '';
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello foo world');
        paragraph.append(text);
        $getRoot().clear().append(paragraph);
        textKey = text.getKey();

        const selection = $createRangeSelection();
        selection.anchor.set(textKey, 6, 'text');
        selection.focus.set(textKey, 9, 'text');
        $setSelection(selection);
      });

      await editor.update(() => {
        const domText = getParagraphTextDOM(editor, textKey);
        // Drop position at offset 0 (before the source).
        setCaretFromPoint(domText, 0);
        const {dataTransfer, event} = createDropEvent();
        dataTransfer.setData('text/plain', 'foo');
        $handleTextDrop(event, editor, $insertDataTransferForRichText);
      });

      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('fooHello  world');
      });
    });

    test('no-op when the drop point is inside the source range', async () => {
      const {editor} = testEnv;
      let textKey = '';
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello foo world');
        paragraph.append(text);
        $getRoot().clear().append(paragraph);
        textKey = text.getKey();

        const selection = $createRangeSelection();
        selection.anchor.set(textKey, 6, 'text');
        selection.focus.set(textKey, 9, 'text');
        $setSelection(selection);
      });

      await editor.update(() => {
        const domText = getParagraphTextDOM(editor, textKey);
        // Drop inside the selected "foo" range.
        setCaretFromPoint(domText, 7);
        const {dataTransfer, event, preventDefault} = createDropEvent();
        dataTransfer.setData('text/plain', 'foo');
        const handled = $handleTextDrop(
          event,
          editor,
          $insertDataTransferForRichText,
        );
        expect(handled).toBe(true);
        expect(preventDefault).toHaveBeenCalled();
      });

      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('Hello foo world');
      });
    });

    test('moves a selection across TextNodes in the same block', async () => {
      const {editor} = testEnv;
      let sourceKey = '';
      let destKey = '';
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const source = $createTextNode('source ').toggleFormat('bold');
        const dest = $createTextNode('destination');
        paragraph.append(source, dest);
        $getRoot().clear().append(paragraph);
        sourceKey = source.getKey();
        destKey = dest.getKey();

        const selection = $createRangeSelection();
        selection.anchor.set(sourceKey, 0, 'text');
        selection.focus.set(sourceKey, 6, 'text');
        $setSelection(selection);
      });

      await editor.update(() => {
        const domText = getParagraphTextDOM(editor, destKey);
        // Drop just after the "t" of "destination" (offset 4 into "destination").
        setCaretFromPoint(domText, 4);
        const {dataTransfer, event} = createDropEvent();
        dataTransfer.setData('text/plain', 'source');
        $handleTextDrop(event, editor, $insertDataTransferForRichText);
      });

      await editor.read(() => {
        // " " from the source TextNode is preserved where it was, and "source"
        // is inserted into the destination TextNode at offset 4.
        expect($getRoot().getTextContent()).toBe(' destsourceination');
      });
    });

    test('inserts DataTransfer content at drop point when there is no source selection', async () => {
      const {editor} = testEnv;
      let textKey = '';
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello world');
        paragraph.append(text);
        $getRoot().clear().append(paragraph);
        textKey = text.getKey();

        // Collapsed selection = no internal source.
        const selection = $createRangeSelection();
        selection.anchor.set(textKey, 0, 'text');
        selection.focus.set(textKey, 0, 'text');
        $setSelection(selection);
      });

      await editor.update(() => {
        const domText = getParagraphTextDOM(editor, textKey);
        setCaretFromPoint(domText, 6);
        const {dataTransfer, event} = createDropEvent();
        dataTransfer.setData('text/plain', 'brave ');
        $handleTextDrop(event, editor, $insertDataTransferForRichText);
      });

      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('Hello brave world');
      });
    });

    test('returns false when caretFromPoint cannot resolve a location', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('Hello'));
        $getRoot().clear().append(paragraph);
      });

      let handled = true;
      let preventDefault: ReturnType<typeof vi.fn> | null = null;
      await editor.update(() => {
        const {event, preventDefault: pd} = createDropEvent();
        preventDefault = pd;
        handled = $handleTextDrop(
          event,
          editor,
          $insertDataTransferForRichText,
        );
      });
      expect(handled).toBe(false);
      expect(preventDefault).not.toBeNull();
      expect(preventDefault!).not.toHaveBeenCalled();
    });

    test('handles a backward (right-to-left) source selection', async () => {
      const {editor} = testEnv;
      let textKey = '';
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello foo world');
        paragraph.append(text);
        $getRoot().clear().append(paragraph);
        textKey = text.getKey();

        // Backward selection: anchor > focus in "foo".
        const selection = $createRangeSelection();
        selection.anchor.set(textKey, 9, 'text');
        selection.focus.set(textKey, 6, 'text');
        $setSelection(selection);
        const current = $getSelection();
        invariant(
          $isRangeSelection(current) && current.isBackward(),
          'expected backward selection',
        );
      });

      await editor.update(() => {
        const domText = getParagraphTextDOM(editor, textKey);
        setCaretFromPoint(domText, 15);
        const {dataTransfer, event} = createDropEvent();
        dataTransfer.setData('text/plain', 'foo');
        $handleTextDrop(event, editor, $insertDataTransferForRichText);
      });

      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('Hello  worldfoo');
      });
    });
  });
});

// Silence unused warnings for imports that future tests may want.
void TextNode;
