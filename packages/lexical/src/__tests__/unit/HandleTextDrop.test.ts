/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getClipboardDataFromSelection,
  $handleTextDrop,
  $insertDataTransferForRichText,
  setLexicalClipboardDataTransfer,
} from '@lexical/clipboard';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isRangeSelection,
  $setSelection,
  LexicalEditor,
  TextNode,
} from 'lexical';
import {
  $createTestDecoratorNode,
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
    test('preserves DecoratorNodes in the source when moved to a new location', async () => {
      const {editor} = testEnv;
      let targetParagraphKey = '';
      await editor.update(() => {
        const root = $getRoot().clear();
        // Source paragraph: "before" + DecoratorNode + "after"
        const sourceParagraph = $createParagraphNode();
        const beforeText = $createTextNode('before');
        const decorator = $createTestDecoratorNode();
        const afterText = $createTextNode('after');
        sourceParagraph.append(beforeText, decorator, afterText);

        // Target paragraph (drop destination)
        const targetParagraph = $createParagraphNode();
        const targetText = $createTextNode('target');
        targetParagraph.append(targetText);
        targetParagraphKey = targetText.getKey();

        root.append(sourceParagraph, targetParagraph);

        // Select from start of "before" to end of "after" — covers the decorator.
        const selection = $createRangeSelection();
        selection.anchor.set(beforeText.getKey(), 0, 'text');
        selection.focus.set(afterText.getKey(), 5, 'text');
        $setSelection(selection);
      });

      // Populate the DataTransfer the same way DRAGSTART does — with Lexical's
      // own serialization so custom nodes survive the drop.
      await editor.update(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'expected range selection');

        const domText = getParagraphTextDOM(editor, targetParagraphKey);
        setCaretFromPoint(domText, 6); // drop at end of "target"

        const {dataTransfer, event} = createDropEvent();
        setLexicalClipboardDataTransfer(
          dataTransfer,
          $getClipboardDataFromSelection(selection),
        );
        $handleTextDrop(event, editor, $insertDataTransferForRichText);
      });

      await editor.read(() => {
        const root = $getRoot();
        const topLevelChildren = root.getChildren();
        // Two paragraphs at the top level: the (now-empty) source and the
        // target (now containing the moved content).
        expect(topLevelChildren.length).toBe(2);

        const allDecorators = topLevelChildren
          .flatMap((c) =>
            'getChildren' in c && typeof c.getChildren === 'function'
              ? c.getChildren()
              : [],
          )
          .filter($isDecoratorNode);
        // Exactly one decorator in the whole tree (preserved, not duplicated).
        expect(allDecorators.length).toBe(1);

        // The decorator must live under the target paragraph, not the source.
        const sourceParagraph = topLevelChildren[0];
        const targetParagraph = topLevelChildren[1];
        invariant(
          'getChildren' in sourceParagraph &&
            typeof sourceParagraph.getChildren === 'function',
          'expected source paragraph',
        );
        invariant(
          'getChildren' in targetParagraph &&
            typeof targetParagraph.getChildren === 'function',
          'expected target paragraph',
        );
        const sourceDecorators = sourceParagraph
          .getChildren()
          .filter($isDecoratorNode);
        const targetDecorators = targetParagraph
          .getChildren()
          .filter($isDecoratorNode);
        expect(sourceDecorators.length).toBe(0);
        expect(targetDecorators.length).toBe(1);

        // Full text content should be "target" + "before" + decorator's text +
        // "after". TestDecoratorNode.getTextContent() is 'Hello world', so the
        // decorator appears between "before" and "after" in textContent.
        expect(sourceParagraph.getTextContent()).toBe('');
        expect(targetParagraph.getTextContent()).toBe(
          'targetbeforeHello worldafter',
        );
      });
    });

    test('no-op when drop is inside a multi-node source range', async () => {
      const {editor} = testEnv;
      let innerKey = '';
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const t1 = $createTextNode('one');
        const t2 = $createTextNode('two').toggleFormat('bold');
        const t3 = $createTextNode('three');
        paragraph.append(t1, t2, t3);
        $getRoot().clear().append(paragraph);
        innerKey = t2.getKey();

        // Selection spans t1..t3 (all three text nodes).
        const selection = $createRangeSelection();
        selection.anchor.set(t1.getKey(), 0, 'text');
        selection.focus.set(t3.getKey(), 5, 'text');
        $setSelection(selection);
      });

      await editor.update(() => {
        // Drop INSIDE the "two" text node, which is strictly between the
        // source's anchor and focus.
        const domText = getParagraphTextDOM(editor, innerKey);
        setCaretFromPoint(domText, 1);
        const {dataTransfer, event, preventDefault} = createDropEvent();
        dataTransfer.setData('text/plain', 'onetwothree');
        const handled = $handleTextDrop(
          event,
          editor,
          $insertDataTransferForRichText,
        );
        expect(handled).toBe(true);
        expect(preventDefault).toHaveBeenCalled();
      });

      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('onetwothree');
      });
    });
  });
});

// Keep the TextNode import referenced for future cases.
void TextNode;
