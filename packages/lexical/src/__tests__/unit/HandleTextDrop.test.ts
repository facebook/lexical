/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getClipboardDataFromSelection,
  $handlePlainTextDrop,
  $handleRichTextDrop,
  $insertDataTransferForPlainText,
  $writeDragSourceToDataTransfer,
  type LexicalDropTargetResolver,
  setLexicalClipboardDataTransfer,
} from '@lexical/clipboard';
import {CodeNode} from '@lexical/code';
import {createEmptyHistoryState, registerHistory} from '@lexical/history';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $getSiblingCaret,
  $getTextPointCaret,
  $isDecoratorNode,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_EDITOR,
  DROP_COMMAND,
  type LexicalEditor,
  type RangeSelection,
  UNDO_COMMAND,
} from 'lexical';
import {
  $createTestDecoratorNode,
  createTestEditor,
  initializeUnitTest,
  invariant,
  TestTextNode,
} from 'lexical/src/__tests__/utils';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  test,
  vi,
} from 'vitest';

const caretFromPointState = vi.hoisted(() => ({
  current: (_x: number, _y: number): null | {node: Node; offset: number} =>
    null,
}));

// `$handleRichTextDrop` (in @lexical/clipboard) resolves the drop caret via
// `./caretFromPoint`, which jsdom can't hit-test. Mock that exact module via
// its `@lexical/clipboard/src/caretFromPoint` test alias.
vi.mock('@lexical/clipboard/src/caretFromPoint', () => ({
  caretFromPoint: (x: number, y: number) => caretFromPointState.current(x, y),
}));

function setCaretFromPoint(node: Node, offset: number): void {
  caretFromPointState.current = () => ({node, offset});
}

function createDropEvent(): {
  event: DragEvent;
  dataTransfer: DataTransfer;
  preventDefault: Mock<() => void>;
} {
  const dataTransfer = new DataTransfer();
  const event = new DragEvent('drop', {
    cancelable: true,
    clientX: 0,
    clientY: 0,
    dataTransfer,
  });
  const preventDefault = vi.fn(event.preventDefault.bind(event));
  Object.defineProperty(event, 'preventDefault', {
    enumerable: false,
    value: preventDefault,
  });
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

function $markActiveSelectionAsDragSource(
  dataTransfer: DataTransfer,
  editor: LexicalEditor,
): void {
  const sel = $getSelection();
  if ($isRangeSelection(sel) && !sel.isCollapsed()) {
    $writeDragSourceToDataTransfer(dataTransfer, editor);
  }
}

describe('$handleTextDrop', () => {
  initializeUnitTest(testEnv => {
    beforeEach(() => {
      caretFromPointState.current = () => null;
    });

    test.each([$handleRichTextDrop, $handlePlainTextDrop])(
      '%s remaps the active source across an interior text split',
      async handleDrop => {
        const {editor} = testEnv;
        const cleanup = registerHistory(
          editor,
          createEmptyHistoryState(),
          0,
          () => 0,
        );
        try {
          for (const [text, start, end, offset, expected, caret] of [
            ['abcFOOdefXYZ', 3, 6, 9, 'abcdefFOOXYZ', 9],
            ['abcdefFOOxyz', 6, 9, 3, 'abcFOOdefxyz', 6],
          ] as const) {
            let key = '';
            await editor.update(() => {
              const node = $createTextNode(text);
              $getRoot().clear().append($createParagraphNode().append(node));
              key = node.getKey();
              node.select(start, end);
            });
            const {event, dataTransfer} = createDropEvent();
            await editor.update(() => {
              setCaretFromPoint(getParagraphTextDOM(editor, key), offset);
              dataTransfer.setData('text/plain', 'FOO');
              $writeDragSourceToDataTransfer(dataTransfer, editor);
              expect(handleDrop(event, editor)).toBe(true);
            });
            editor.read(() => {
              expect($getRoot().getTextContent()).toBe(expected);
              const selection = $getSelection();
              invariant($isRangeSelection(selection), 'range');
              expect(selection.isCollapsed()).toBe(true);
              expect(selection.anchor.offset).toBe(caret);
            });
            editor.dispatchCommand(UNDO_COMMAND);
            editor.read(() => expect($getRoot().getTextContent()).toBe(text));
          }
        } finally {
          cleanup();
        }
      },
    );

    test.each(
      [false, true].flatMap(crossBlock =>
        [false, true].flatMap(backward =>
          ['start', 'end'].map(edge => ({backward, crossBlock, edge})),
        ),
      ),
    )(
      'preserves excluded $edge text endpoint (crossBlock=$crossBlock, backward=$backward)',
      async ({backward, crossBlock, edge}) => {
        const {editor} = testEnv;
        const cleanup = registerHistory(
          editor,
          createEmptyHistoryState(),
          0,
          () => 0,
        );
        const atStart = edge === 'start';
        const before = crossBlock
          ? atStart
            ? 'abc\n\nFOOdef'
            : 'abcFOO\n\ndef'
          : 'abcFOOdef';
        let targetKey = '';
        try {
          await editor.update(() => {
            const left = $createTextNode('abc').toggleUnmergeable();
            const source = $createTextNode('FOO').toggleUnmergeable();
            const right = $createTextNode('def').toggleUnmergeable();
            const paragraph = $createParagraphNode().append(left);
            $getRoot().clear().append(paragraph);
            if (crossBlock) {
              const next = $createParagraphNode();
              $getRoot().append(next);
              if (atStart) {
                next.append(source, right);
              } else {
                paragraph.append(source);
                next.append(right);
              }
            } else {
              paragraph.append(source, right);
            }
            const selection = $createRangeSelection();
            const start = backward ? selection.focus : selection.anchor;
            const end = backward ? selection.anchor : selection.focus;
            start.set(
              atStart ? left.getKey() : source.getKey(),
              atStart ? 3 : 0,
              'text',
            );
            end.set(
              atStart ? source.getKey() : right.getKey(),
              atStart ? 3 : 0,
              'text',
            );
            $setSelection(selection);
            targetKey = (atStart ? left : right).getKey();
          });
          const {event, dataTransfer} = createDropEvent();
          await editor.update(() => {
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'range');
            dataTransfer.setData('text/plain', selection.getTextContent());
            $writeDragSourceToDataTransfer(dataTransfer, editor);
            setCaretFromPoint(getParagraphTextDOM(editor, targetKey), 1);
            expect($handlePlainTextDrop(event, editor)).toBe(true);
          });
          expect(event.defaultPrevented).toBe(true);
          editor.read(() => {
            expect($getRoot().getTextContent()).toBe(
              atStart
                ? crossBlock
                  ? 'a\nFOObcdef'
                  : 'aFOObcdef'
                : crossBlock
                  ? 'abcdFOO\nef'
                  : 'abcdFOOef',
            );
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'range');
            expect(selection.isCollapsed()).toBe(true);
            const inserted = $getRoot()
              .getAllTextNodes()
              .find(node => node.getTextContent() === 'FOO');
            invariant(inserted !== undefined, 'inserted payload');
            if (crossBlock && !atStart) {
              const suffix = $getRoot().getAllTextNodes().at(-1);
              invariant(suffix !== undefined, 'unselected suffix');
              expect(suffix.getTextContent()).toBe('ef');
              expect(selection.anchor.key).toBe(suffix.getKey());
              expect(selection.anchor.type).toBe('text');
              expect(selection.anchor.offset).toBe(0);
            } else {
              expect(selection.anchor.key).toBe(inserted.getKey());
              expect(selection.anchor.type).toBe('text');
              expect(selection.anchor.offset).toBe(3);
            }
          });
          editor.dispatchCommand(UNDO_COMMAND);
          editor.read(() => expect($getRoot().getTextContent()).toBe(before));
        } finally {
          cleanup();
        }
      },
    );

    test.each(
      (['normal', 'token', 'segmented', 'custom'] as const).flatMap(mode =>
        [false, true].map(prepare => ({mode, prepare})),
      ),
    )(
      'preserves source mode $mode (prepare=$prepare)',
      async ({mode, prepare}) => {
        const {editor} = testEnv;
        const cleanup = registerHistory(
          editor,
          createEmptyHistoryState(),
          0,
          () => 0,
        );
        let targetKey = '';
        try {
          await editor.update(() => {
            const source =
              mode === 'custom'
                ? new TestTextNode('abcFOOdef')
                : $createTextNode('abcFOOdef').setMode(mode);
            const target = $createTextNode('target');
            targetKey = target.getKey();
            $getRoot()
              .clear()
              .append(
                $createParagraphNode().append(source),
                $createParagraphNode().append(target),
              );
            source.select(3, 6);
          });
          const {event, dataTransfer} = createDropEvent();
          await editor.update(() => {
            const source = $getSelection();
            invariant($isRangeSelection(source), 'source range');
            expect(source.anchor.offset).toBe(3);
            expect(source.focus.offset).toBe(6);
            dataTransfer.setData('text/plain', source.getTextContent());
            expect(dataTransfer.getData('text/plain')).toBe('FOO');
            $writeDragSourceToDataTransfer(dataTransfer, editor);
            setCaretFromPoint(getParagraphTextDOM(editor, targetKey), 3);
            expect(
              $handlePlainTextDrop(
                event,
                editor,
                prepare
                  ? caret => ({
                      $beforeInsert: selection => {
                        selection.insertNodes([$createLineBreakNode()]);
                      },
                      caret,
                    })
                  : undefined,
              ),
            ).toBe(true);
          });
          expect(event.defaultPrevented).toBe(true);
          editor.read(() => {
            const source = $getRoot().getFirstChildOrThrow();
            invariant($isElementNode(source), 'source paragraph');
            expect(source.getTextContent()).toBe(
              mode === 'token' ? '' : 'abcdef',
            );
            expect(source.getChildrenSize()).toBe(mode === 'token' ? 0 : 1);
            if (mode !== 'token') {
              const node = source.getFirstChildOrThrow();
              invariant($isTextNode(node), 'remaining text');
              expect(node.getType()).toBe(
                mode === 'custom' ? 'test_text' : 'text',
              );
              expect(node instanceof TestTextNode).toBe(mode === 'custom');
              expect(node.getMode()).toBe('normal');
            }
            const target = $getRoot().getLastChildOrThrow();
            invariant($isElementNode(target), 'target paragraph');
            expect(target.getTextContent()).toBe(
              prepare ? 'tar\nFOOget' : 'tarFOOget',
            );
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'drop range');
            expect(selection.isCollapsed()).toBe(true);
            expect(selection.anchor.key).toBe(
              target.getLastChildOrThrow().getKey(),
            );
            expect(selection.anchor.offset).toBe(prepare ? 3 : 6);
          });
          editor.dispatchCommand(UNDO_COMMAND);
          editor.read(() => {
            expect($getRoot().getTextContent()).toBe('abcFOOdef\n\ntarget');
            const source = $getRoot().getAllTextNodes()[0];
            expect(source.getType()).toBe(
              mode === 'custom' ? 'test_text' : 'text',
            );
            expect(source.getMode()).toBe(mode === 'custom' ? 'normal' : mode);
          });
        } finally {
          cleanup();
        }
      },
    );

    test.each(
      ['plain', 'rich'].flatMap(kind =>
        [false, true].flatMap(backward =>
          [false, true].map(leading => ({backward, kind, leading})),
        ),
      ),
    )(
      '$kind removes an empty source endpoint (leading=$leading, backward=$backward)',
      async ({kind, backward, leading}) => {
        const {editor} = testEnv;
        const history = createEmptyHistoryState();
        const cleanup = registerHistory(editor, history, 0, () => 0);
        let sourceKey = '';
        let emptyKey = '';
        let targetKey = '';
        try {
          await editor.update(() => {
            const source = $createTextNode('FOO');
            const empty = $createTextNode('').toggleUnmergeable();
            const target = $createTextNode('target');
            sourceKey = source.getKey();
            emptyKey = empty.getKey();
            targetKey = target.getKey();
            $getRoot()
              .clear()
              .append(
                $createParagraphNode().append(
                  ...(leading ? [empty, source] : [source, empty]),
                ),
                $createParagraphNode().append(target),
              );
            const range = $createRangeSelection();
            const start = backward ? range.focus : range.anchor;
            const end = backward ? range.anchor : range.focus;
            start.set(leading ? emptyKey : sourceKey, 0, 'text');
            end.set(leading ? sourceKey : emptyKey, leading ? 3 : 0, 'text');
            $setSelection(range);
          });
          const before = editor.getEditorState().toJSON();
          const sourceSelection = editor.read(() => $getSelection()?.clone());
          const paragraphKeys = editor.read(() => $getRoot().getChildrenKeys());
          const textKeys = editor.read(() =>
            $getRoot()
              .getAllTextNodes()
              .map(node => node.getKey()),
          );
          const undoCount = history.undoStack.length;
          const {event, dataTransfer} = createDropEvent();
          await editor.update(() => {
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'source range');
            expect(selection.is(sourceSelection ?? null)).toBe(true);
            expect(selection.isBackward()).toBe(backward);
            expect(selection.getTextContent()).toBe('FOO');
            dataTransfer.setData('text/plain', selection.getTextContent());
            $writeDragSourceToDataTransfer(dataTransfer, editor);
            setCaretFromPoint(getParagraphTextDOM(editor, targetKey), 1);
            expect(
              kind === 'rich'
                ? $handleRichTextDrop(event, editor)
                : $handlePlainTextDrop(event, editor),
            ).toBe(true);
          });
          expect(event.defaultPrevented).toBe(true);
          editor.read(() => {
            const source = $getRoot().getFirstChildOrThrow();
            invariant($isElementNode(source), 'source paragraph');
            expect(source.getChildrenSize()).toBe(0);
            expect($getNodeByKey(emptyKey)?.isAttached() ?? false).toBe(false);
            expect($getNodeByKey(sourceKey)?.isAttached() ?? false).toBe(false);
            expect($getRoot().getChildrenKeys()).toEqual(paragraphKeys);
            expect($getRoot().getTextContent()).toBe('\n\ntFOOarget');
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'inserted range');
            expect(selection.isCollapsed()).toBe(true);
            expect(selection.anchor.key).toBe(targetKey);
            expect(selection.anchor.type).toBe('text');
            expect(selection.anchor.offset).toBe(4);
            expect(selection.focus.is(selection.anchor)).toBe(true);
            expect(selection.anchor.getNode().isAttached()).toBe(true);
            expect(selection.anchor.getNode().getTextContent()).toBe(
              'tFOOarget',
            );
          });
          expect(history.undoStack).toHaveLength(undoCount + 1);
          editor.dispatchCommand(UNDO_COMMAND);
          editor.read(() => {
            expect(editor.getEditorState().toJSON()).toEqual(before);
            expect($getSelection()?.is(sourceSelection ?? null)).toBe(true);
            expect($getRoot().getChildrenKeys()).toEqual(paragraphKeys);
            expect(
              $getRoot()
                .getAllTextNodes()
                .map(node => node.getKey()),
            ).toEqual(textKeys);
          });
          expect(history.undoStack).toHaveLength(undoCount);
        } finally {
          cleanup();
        }
      },
    );

    test.each([
      'preparation',
      'invalid selection',
      'insertion',
      'unsupported payload',
      'partial preparation',
      'async preparation',
      'redirect interior',
      'redirect start',
      'redirect end',
      'redirect empty start before',
      'redirect empty start after',
      'redirect empty end before',
      'redirect empty end after',
    ])(
      '%s preserves source after rethrowing onError and another update',
      async mode => {
        const onError = vi.fn((error: Error) => {
          throw error;
        });
        const editor = createTestEditor({onError});
        const root = document.createElement('div');
        root.contentEditable = 'true';
        document.body.append(root);
        editor.setRootElement(root);
        try {
          let targetKey = '';
          let sourceKey = '';
          await editor.update(() => {
            const source = $createTextNode('source');
            sourceKey = source.getKey();
            const target = $createTextNode('target');
            targetKey = target.getKey();
            $getRoot()
              .clear()
              .append(
                $createParagraphNode().append(source),
                $createParagraphNode().append(target),
              );
            const range = source.select(0, 6);
            if (mode.startsWith('redirect empty')) {
              const empty = $createTextNode('').toggleUnmergeable();
              if (mode.includes('start')) {
                source.insertBefore(empty);
                range.anchor.set(empty.getKey(), 0, 'text');
              } else {
                source.insertAfter(empty);
                range.focus.set(empty.getKey(), 0, 'text');
              }
            }
          });
          const {event, dataTransfer} = createDropEvent();
          dataTransfer.setData(
            mode === 'unsupported payload' ? 'text/html' : 'text/plain',
            mode === 'unsupported payload' ? '<img src="image.png">' : 'source',
          );
          const resolveDropTarget = vi.fn<LexicalDropTargetResolver>(caret => ({
            $beforeInsert: selection => {
              if (mode.startsWith('redirect')) {
                const paragraph = $getRoot().getFirstChildOrThrow();
                invariant($isElementNode(paragraph), 'source paragraph');
                if (mode === 'redirect interior') {
                  const text = paragraph.getFirstChildOrThrow();
                  invariant($isTextNode(text), 'source text');
                  text.select(3, 3);
                } else {
                  const offset = mode.startsWith('redirect empty')
                    ? (mode.includes('start') ? 0 : 1) +
                      (mode.endsWith('after') ? 1 : 0)
                    : mode === 'redirect start'
                      ? 0
                      : 1;
                  paragraph.select(offset, offset);
                }
              }
              if (mode === 'partial preparation') {
                selection.insertNodes([$createLineBreakNode()]);
                throw new Error('partial preparation failed');
              }
              if (mode === 'async preparation') {
                return Promise.resolve() as never;
              }
              if (mode === 'preparation') {
                throw new Error('preparation failed');
              }
              if (mode === 'invalid selection') {
                selection.anchor.set(
                  selection.anchor.key,
                  999,
                  selection.anchor.type,
                );
                selection.focus.set(
                  selection.focus.key,
                  999,
                  selection.focus.type,
                );
              }
              if (mode === 'insertion') {
                vi.spyOn(selection, 'insertRawText').mockImplementation(() => {
                  throw new Error('insertion failed');
                });
              }
            },
            caret,
          }));
          const run = () =>
            editor.update(() => {
              setCaretFromPoint(getParagraphTextDOM(editor, targetKey), 3);
              $writeDragSourceToDataTransfer(dataTransfer, editor);
              $handlePlainTextDrop(event, editor, resolveDropTarget);
            });
          if (mode === 'unsupported payload') {
            expect(run).not.toThrow();
            expect(resolveDropTarget).not.toHaveBeenCalled();
          } else if (mode.startsWith('redirect')) {
            expect(run).toThrow(
              '$handlePlainTextDrop: preparation must leave the target outside the source',
            );
          } else {
            expect(run).toThrow();
          }
          expect(event.defaultPrevented).toBe(true);
          await editor.update(() => {
            $getRoot().getFirstChildOrThrow().getLatest();
          });
          editor.read(() =>
            expect($getRoot().getTextContent()).toBe(
              mode === 'partial preparation'
                ? 'source\n\ntar\nget'
                : 'source\n\ntarget',
            ),
          );
          editor.read(() =>
            expect($getNodeByKey(sourceKey)?.getTextContent()).toBe('source'),
          );
          expect(onError).toHaveBeenCalledTimes(
            mode === 'unsupported payload' ? 0 : 1,
          );
        } finally {
          editor.setRootElement(null);
          root.remove();
        }
      },
    );

    test('plain-text insertion keeps the public empty-string behavior', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const text = $createTextNode('source');
        $getRoot().clear().append($createParagraphNode().append(text));
        const selection = text.select(0, 6);
        const insert = vi.spyOn(selection, 'insertRawText');
        $insertDataTransferForPlainText(new DataTransfer(), selection);
        expect(insert).toHaveBeenCalledWith('');
      });
      editor.read(() => expect($getRoot().getTextContent()).toBe('source'));
    });

    test.each(['detached', 'previous', 'fractional', 'outside'])(
      'rejects a %s target without preparation or source deletion',
      async kind => {
        const {editor} = testEnv;
        let key = '';
        await editor.update(() => {
          const text = $createTextNode('source-target');
          key = text.getKey();
          $getRoot().clear().append($createParagraphNode().append(text));
          text.select(0, 6);
        });
        const prepare = vi.fn();
        const {event, dataTransfer} = createDropEvent();
        await editor.update(() => {
          setCaretFromPoint(getParagraphTextDOM(editor, key), 10);
          dataTransfer.setData('text/plain', 'source');
          $writeDragSourceToDataTransfer(dataTransfer, editor);
          const detached = $createTextNode('detached');
          expect(
            $handlePlainTextDrop(event, editor, caret => ({
              $beforeInsert: prepare,
              caret:
                kind === 'detached'
                  ? $getTextPointCaret(detached, 'next', 0)
                  : Object.assign(
                      Object.create(Object.getPrototypeOf(caret)),
                      caret,
                      {
                        direction: kind === 'previous' ? 'previous' : 'next',
                        offset: kind === 'fractional' ? 1.5 : 100,
                      },
                    ),
            })),
          ).toBe(true);
        });
        expect(event.defaultPrevented).toBe(true);
        expect(prepare).not.toHaveBeenCalled();
        editor.read(() =>
          expect($getRoot().getTextContent()).toBe('source-target'),
        );
      },
    );

    test('preparation can select a new structural destination', async () => {
      const {editor} = testEnv;
      const cleanup = registerHistory(
        editor,
        createEmptyHistoryState(),
        0,
        () => 0,
      );
      try {
        let key = '';
        await editor.update(() => {
          const text = $createTextNode('abcFOOdefXYZ');
          key = text.getKey();
          $getRoot().clear().append($createParagraphNode().append(text));
          text.select(3, 6);
        });
        await editor.update(() => {
          const {event, dataTransfer} = createDropEvent();
          dataTransfer.setData('text/plain', 'FOO');
          $writeDragSourceToDataTransfer(dataTransfer, editor);
          setCaretFromPoint(getParagraphTextDOM(editor, key), 9);
          $handlePlainTextDrop(event, editor, caret => ({
            $beforeInsert: () => {
              const paragraph = $createParagraphNode();
              $getRoot().getFirstChildOrThrow().insertBefore(paragraph);
              $setSelection(null);
              paragraph.selectStart();
            },
            caret,
          }));
        });
        editor.read(() => {
          expect($getRoot().getTextContent()).toBe('FOO\n\nabcdefXYZ');
          const selection = $getSelection();
          invariant($isRangeSelection(selection), 'range');
          expect(selection.anchor.offset).toBe(3);
          expect(selection.isCollapsed()).toBe(true);
        });
        editor.dispatchCommand(UNDO_COMMAND);
        editor.read(() =>
          expect($getRoot().getTextContent()).toBe('abcFOOdefXYZ'),
        );
      } finally {
        cleanup();
      }
    });

    test('preparation can replace a target within a shared source TextNode', async () => {
      const {editor} = testEnv;
      const cleanup = registerHistory(
        editor,
        createEmptyHistoryState(),
        0,
        () => 0,
      );
      let key = '';
      try {
        await editor.update(() => {
          const text = $createTextNode('abcFOOdefXYZ');
          key = text.getKey();
          $getRoot().clear().append($createParagraphNode().append(text));
          text.select(3, 6);
        });
        await editor.update(() => {
          const {event, dataTransfer} = createDropEvent();
          dataTransfer.setData('text/plain', 'FOO');
          $writeDragSourceToDataTransfer(dataTransfer, editor);
          setCaretFromPoint(getParagraphTextDOM(editor, key), 9);
          $handlePlainTextDrop(event, editor, caret => ({
            $beforeInsert: () => {
              const text = $getRoot().getAllTextNodes()[0];
              $setSelection(null);
              text.select(1, 1);
            },
            caret,
          }));
        });
        editor.read(() => {
          expect($getRoot().getTextContent()).toBe('aFOObcdefXYZ');
          const selection = $getSelection();
          invariant($isRangeSelection(selection), 'range');
          expect(selection.isCollapsed()).toBe(true);
          expect(selection.anchor.key).toBe(key);
          expect(selection.anchor.offset).toBe(4);
        });
        editor.dispatchCommand(UNDO_COMMAND);
        editor.read(() =>
          expect($getRoot().getTextContent()).toBe('abcFOOdefXYZ'),
        );
      } finally {
        cleanup();
      }
    });

    test('DROP_COMMAND preparation preserves an element source across root insertion', async () => {
      const {editor} = testEnv;
      const cleanup = registerHistory(
        editor,
        createEmptyHistoryState(),
        0,
        () => 0,
      );
      const unregister = editor.registerCommand(
        DROP_COMMAND,
        event =>
          $handlePlainTextDrop(event, editor, caret => ({
            $beforeInsert: selection => {
              selection.insertNodes([$createLineBreakNode()]);
              const paragraph = $createParagraphNode();
              $getRoot().getFirstChildOrThrow().insertBefore(paragraph);
              paragraph.selectStart();
            },
            caret,
          })),
        COMMAND_PRIORITY_EDITOR,
      );
      let targetKey = '';
      try {
        await editor.update(() => {
          const target = $createTextNode('target');
          targetKey = target.getKey();
          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append($createTextNode('before')),
              $createParagraphNode().append($createTextNode('FOO')),
              $createParagraphNode().append(target),
            )
            .select(1, 2);
        });
        const {event, dataTransfer} = createDropEvent();
        await editor.update(() => {
          const selection = $getSelection();
          invariant($isRangeSelection(selection), 'source range');
          expect(selection.getTextContent()).toBe('FOO\n');
          dataTransfer.setData('text/plain', selection.getTextContent());
          $writeDragSourceToDataTransfer(dataTransfer, editor);
          setCaretFromPoint(getParagraphTextDOM(editor, targetKey), 3);
          expect(editor.dispatchCommand(DROP_COMMAND, event)).toBe(true);
        });
        expect(event.defaultPrevented).toBe(true);
        editor.read(() => {
          expect($getRoot().getTextContent()).toBe(
            'FOO\n\n\nbefore\n\ntar\nget',
          );
          expect($getRoot().getChildrenSize()).toBe(3);
          const selection = $getSelection();
          invariant($isRangeSelection(selection), 'drop range');
          expect(selection.isCollapsed()).toBe(true);
          expect(selection.anchor.key).toBe(
            $getRoot().getFirstChildOrThrow().getKey(),
          );
          expect(selection.anchor.type).toBe('element');
          expect(selection.anchor.offset).toBe(2);
        });
        editor.dispatchCommand(UNDO_COMMAND);
        editor.read(() =>
          expect($getRoot().getTextContent()).toBe('before\n\nFOO\n\ntarget'),
        );
      } finally {
        unregister();
        cleanup();
      }
    });

    test('plain-text insertion preserves element source boundaries', async () => {
      const {editor} = testEnv;
      let key = '';
      await editor.update(() => {
        const target = $createTextNode('def');
        key = target.getKey();
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append($createTextNode('abc')),
            $createParagraphNode().append($createTextNode('FOO')),
            $createParagraphNode().append(target),
          )
          .select(1, 2);
      });
      await editor.update(() => {
        const {event, dataTransfer} = createDropEvent();
        dataTransfer.setData('text/plain', 'FOO');
        $writeDragSourceToDataTransfer(dataTransfer, editor);
        setCaretFromPoint(getParagraphTextDOM(editor, key), 1);
        $handlePlainTextDrop(event, editor);
      });
      editor.read(() => {
        expect($getRoot().getTextContent()).toBe('abc\n\ndFOOef');
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'range');
        expect(selection.anchor.offset).toBe(4);
      });
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
        $markActiveSelectionAsDragSource(dataTransfer, editor);
        const handled = $handleRichTextDrop(event, editor);
        expect(handled).toBe(true);
        expect(preventDefault).toHaveBeenCalled();
      });

      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('Hello  worldfoo');
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'expected range selection');
        expect(selection.isCollapsed()).toBe(true);
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
        $markActiveSelectionAsDragSource(dataTransfer, editor);
        $handleRichTextDrop(event, editor);
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
        $markActiveSelectionAsDragSource(dataTransfer, editor);
        const handled = $handleRichTextDrop(event, editor);
        expect(handled).toBe(true);
        expect(preventDefault).toHaveBeenCalled();
      });

      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('Hello foo world');
      });
    });

    test.each(
      [
        ['rich', 'text'],
        ['plain', 'text'],
        ['rich', 'paragraph'],
        ['plain', 'paragraph'],
        ['prepared', 'paragraph'],
        ['rich', 'element source'],
        ['plain', 'element source'],
        ['rich', 'adjacent'],
        ['plain', 'adjacent'],
        ['plain', 'empty text'],
        ['rich', 'empty text'],
        ['prepared', 'empty text'],
        ['plain', 'empty element source'],
        ['rich', 'empty element source'],
      ].flatMap(([kind, representation]) =>
        [0, 1].flatMap(edge =>
          (representation.startsWith('empty') ? [false, true] : [false]).map(
            backward => ({backward, edge, kind, representation}),
          ),
        ),
      ),
    )(
      '$kind endpoint no-op with $representation representation (edge=$edge, backward=$backward)',
      async ({kind, representation, edge, backward}) => {
        const {editor} = testEnv;
        const history = createEmptyHistoryState();
        const cleanup = registerHistory(editor, history, 0, () => 0);
        try {
          await editor.update(() => {
            const source = $createTextNode('FOO').toggleUnmergeable();
            const paragraph = $createParagraphNode();
            if (representation === 'adjacent') {
              paragraph.append($createTextNode('abc').toggleUnmergeable());
            }
            if (representation.startsWith('empty') && edge === 0) {
              paragraph.append($createTextNode('').toggleUnmergeable());
            }
            paragraph.append(source);
            if (representation.startsWith('empty') && edge === 1) {
              paragraph.append($createTextNode('').toggleUnmergeable());
            }
            if (representation === 'adjacent') {
              paragraph.append($createTextNode('def').toggleUnmergeable());
            }
            $getRoot().clear().append(paragraph);
            source.select(0, 3);
          });
          const before = editor.getEditorState().toJSON();
          const textKeys = editor.read(() =>
            $getRoot()
              .getAllTextNodes()
              .map(node => node.getKey()),
          );
          let expectedRange: RangeSelection | null = null;
          const undoCount = history.undoStack.length;
          const prepare = vi.fn((selection: RangeSelection) => {
            selection.insertNodes([$createLineBreakNode()]);
            return undefined;
          });
          const {event, dataTransfer, preventDefault} = createDropEvent();
          await editor.update(() => {
            const paragraph = $getRoot().getFirstChildOrThrow();
            invariant($isElementNode(paragraph), 'paragraph');
            if (representation === 'element source') {
              paragraph.select(0, 1);
            }
            if (representation.startsWith('empty')) {
              const range = $createRangeSelection();
              const start = backward ? range.focus : range.anchor;
              const end = backward ? range.anchor : range.focus;
              const keys = paragraph.getChildrenKeys();
              const element = representation === 'empty element source';
              start.set(
                edge === 0 && element ? paragraph.getKey() : keys[0],
                0,
                edge === 0 && element ? 'element' : 'text',
              );
              end.set(
                edge === 1 && element ? paragraph.getKey() : keys[1],
                edge === 0 ? 3 : element ? 2 : 0,
                edge === 1 && element ? 'element' : 'text',
              );
              $setSelection(range);
              expect(range.isBackward()).toBe(backward);
            }
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'source range');
            const range = selection.clone();
            expectedRange = range;
            const keys = paragraph.getChildrenKeys();
            const paragraphKey = paragraph.getKey();
            dataTransfer.setData('text/plain', selection.getTextContent());
            $writeDragSourceToDataTransfer(dataTransfer, editor);
            if (
              representation === 'paragraph' ||
              representation.startsWith('empty')
            ) {
              setCaretFromPoint(
                editor.getElementByKey(paragraphKey)!,
                representation.startsWith('empty') ? edge * 2 : edge,
              );
            } else {
              const targetKey =
                representation === 'adjacent'
                  ? keys[edge === 0 ? 0 : 2]
                  : keys[0];
              setCaretFromPoint(
                getParagraphTextDOM(editor, targetKey),
                representation === 'adjacent' ? (edge === 0 ? 3 : 0) : edge * 3,
              );
            }
            expect(
              kind === 'rich'
                ? $handleRichTextDrop(event, editor)
                : $handlePlainTextDrop(
                    event,
                    editor,
                    kind === 'prepared'
                      ? caret => ({$beforeInsert: prepare, caret})
                      : undefined,
                  ),
            ).toBe(true);
            expect($getSelection()?.is(range)).toBe(true);
            expect($getRoot().getChildrenKeys()).toEqual([paragraphKey]);
            expect(paragraph.getChildrenKeys()).toEqual(keys);
          });
          editor.read(() => {
            expect($getSelection()?.is(expectedRange)).toBe(true);
            expect(
              $getRoot()
                .getAllTextNodes()
                .map(node => node.getKey()),
            ).toEqual(textKeys);
          });
          expect(prepare).not.toHaveBeenCalled();
          expect(event.defaultPrevented).toBe(true);
          expect(preventDefault).toHaveBeenCalledOnce();
          expect(editor.getEditorState().toJSON()).toEqual(before);
          expect(history.undoStack).toHaveLength(undoCount);
          editor.dispatchCommand(UNDO_COMMAND);
          editor.read(() =>
            expect($getRoot().getTextContent()).toBe(
              representation === 'adjacent' ? 'abcFOOdef' : 'FOO',
            ),
          );
        } finally {
          cleanup();
        }
      },
    );

    test.each([$handleRichTextDrop, $handlePlainTextDrop])(
      '%s preserves root boundary destinations outside a text source',
      async handleDrop => {
        const {editor} = testEnv;
        for (const offset of [0, 1]) {
          let sourceKey = '';
          await editor.update(() => {
            const source = $createTextNode('FOO');
            sourceKey = source.getKey();
            $getRoot().clear().append($createParagraphNode().append(source));
            source.select(0, 3);
          });
          const {event, dataTransfer} = createDropEvent();
          await editor.update(() => {
            dataTransfer.setData('text/plain', 'FOO');
            $writeDragSourceToDataTransfer(dataTransfer, editor);
            setCaretFromPoint(editor.getRootElement()!, offset);
            expect(handleDrop(event, editor)).toBe(true);
          });
          editor.read(() => {
            expect(
              $getRoot()
                .getAllTextNodes()
                .map(node => node.getTextContent()),
            ).toEqual(['FOO']);
            expect($getRoot().getAllTextNodes()[0].getKey()).not.toBe(
              sourceKey,
            );
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'inserted range');
            expect(selection.isCollapsed()).toBe(true);
            expect(selection.anchor.offset).toBe(3);
          });
        }
      },
    );

    test('an unselected empty neighbor stays outside the source drop bounds', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const source = $createTextNode('FOO');
        const endpoint = $createTextNode('').toggleUnmergeable();
        const neighbor = $createTextNode('').toggleUnmergeable();
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              source,
              endpoint,
              neighbor,
              $createTextNode('target'),
            ),
          );
        const range = source.select(0, 3);
        range.focus.set(endpoint.getKey(), 0, 'text');
      });
      const prepare = vi.fn(() => {
        const target = $getRoot().getAllTextNodes().at(-1);
        invariant(target !== undefined, 'target');
        target.select(1, 1);
        return undefined;
      });
      const {event, dataTransfer} = createDropEvent();
      await editor.update(() => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        setCaretFromPoint(editor.getElementByKey(paragraph.getKey())!, 3);
        dataTransfer.setData('text/plain', 'FOO');
        $writeDragSourceToDataTransfer(dataTransfer, editor);
        expect(
          $handlePlainTextDrop(event, editor, caret => ({
            $beforeInsert: prepare,
            caret,
          })),
        ).toBe(true);
      });
      expect(prepare).toHaveBeenCalledOnce();
      expect(event.defaultPrevented).toBe(true);
      editor.read(() => expect($getRoot().getTextContent()).toBe('tFOOarget'));
    });

    test('plain drops retain the URI-only payload fallback', async () => {
      const {editor} = testEnv;
      let targetKey = '';
      const uri = 'https://example.com/';
      await editor.update(() => {
        const source = $createTextNode(uri);
        const target = $createTextNode('target');
        targetKey = target.getKey();
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(source),
            $createParagraphNode().append(target),
          );
        source.select(0, uri.length);
      });
      const {event, dataTransfer} = createDropEvent();
      await editor.update(() => {
        dataTransfer.setData('text/uri-list', uri);
        $writeDragSourceToDataTransfer(dataTransfer, editor);
        setCaretFromPoint(getParagraphTextDOM(editor, targetKey), 6);
        expect($handlePlainTextDrop(event, editor)).toBe(true);
      });
      expect(event.defaultPrevented).toBe(true);
      editor.read(() =>
        expect($getRoot().getTextContent()).toBe('\n\ntarget' + uri),
      );
    });

    test.each([$handleRichTextDrop, $handlePlainTextDrop])(
      '%s keeps a drop inside an empty code element',
      async handleDrop => {
        const {editor} = testEnv;
        let codeKey = '';
        await editor.update(() => {
          const source = $createParagraphNode().append(
            $createTextNode('source'),
          );
          const code = new CodeNode();
          $getRoot().clear().append(source, code);
          codeKey = code.getKey();
          const sourceText = source.getFirstChildOrThrow();
          const selection = $createRangeSelection();
          selection.anchor.set(sourceText.getKey(), 0, 'text');
          selection.focus.set(sourceText.getKey(), 6, 'text');
          $setSelection(selection);
        });

        await editor.update(() => {
          const codeElement = editor.getElementByKey(codeKey);
          invariant(codeElement !== null, 'code element is null');
          setCaretFromPoint(codeElement, 0);
          const {dataTransfer, event} = createDropEvent();
          dataTransfer.setData('text/plain', 'code');
          $writeDragSourceToDataTransfer(dataTransfer, editor);
          handleDrop(event, editor);
        });

        await editor.read(() => {
          const root = $getRoot();
          expect(root.getChildrenSize()).toBe(2);
          const code = root.getLastChildOrThrow();
          expect(code.getType()).toBe('code');
          expect(code.getTextContent()).toBe('code');
        });
      },
    );

    test.each([false, true])(
      'rejects a root sibling drop caret without errors (crossEditor=%s)',
      async crossEditor => {
        const onError = vi.fn();
        const editors = Array.from({length: crossEditor ? 2 : 1}, () => {
          const editor = createTestEditor({onError});
          const container = document.createElement('div');
          container.contentEditable = 'true';
          document.body.appendChild(container);
          editor.setRootElement(container);
          const history = createEmptyHistoryState();
          const cleanup = registerHistory(editor, history, 0, () => 0);
          return {cleanup, container, editor, history};
        });
        try {
          for (const [index, {editor}] of editors.entries()) {
            await editor.update(() => {
              const text = $createTextNode(
                index === 0 ? 'source-content' : 'target',
              );
              $getRoot().clear().append($createParagraphNode().append(text));
              text.select(index === 0 ? 0 : 1, index === 0 ? 6 : 1);
            });
          }
          const before = editors.map(({editor, history}) =>
            editor.read(() => ({
              json: editor.getEditorState().toJSON(),
              paragraphs: $getRoot().getChildrenKeys(),
              selection: $getSelection()?.clone(),
              textKeys: $getRoot()
                .getAllTextNodes()
                .map(node => node.getKey()),
              undo: history.undoStack.length,
            })),
          );
          const source = editors[0];
          const destination = editors[editors.length - 1].editor;
          const deleteByDrag = vi.fn();
          source.container.addEventListener('beforeinput', deleteByDrag);
          const {event, dataTransfer, preventDefault} = createDropEvent();
          await source.editor.update(() => {
            dataTransfer.setData(
              'text/plain',
              $getSelection()!.getTextContent(),
            );
            $writeDragSourceToDataTransfer(dataTransfer, source.editor);
          });
          const prepare = vi.fn((selection: RangeSelection) => {
            selection.insertNodes([$createLineBreakNode()]);
            return undefined;
          });
          let handled = false;
          await destination.update(() => {
            const text = $getRoot().getAllTextNodes()[0];
            setCaretFromPoint(
              getParagraphTextDOM(destination, text.getKey()),
              text.getTextContentSize(),
            );
            handled = $handlePlainTextDrop(event, destination, () => ({
              $beforeInsert: prepare,
              caret: $getSiblingCaret($getRoot(), 'next'),
            }));
          });
          expect(event.defaultPrevented).toBe(true);
          expect(preventDefault).toHaveBeenCalledOnce();
          expect(onError).not.toHaveBeenCalled();
          expect(handled).toBe(true);
          expect(prepare).not.toHaveBeenCalled();
          expect(deleteByDrag).not.toHaveBeenCalled();
          for (const [index, {editor, history}] of editors.entries()) {
            editor.read(() => {
              expect(editor.getEditorState().toJSON()).toEqual(
                before[index].json,
              );
              expect($getRoot().getChildrenKeys()).toEqual(
                before[index].paragraphs,
              );
              expect(
                $getRoot()
                  .getAllTextNodes()
                  .map(node => node.getKey()),
              ).toEqual(before[index].textKeys);
              expect($getSelection()?.is(before[index].selection ?? null)).toBe(
                true,
              );
            });
            expect(history.undoStack).toHaveLength(before[index].undo);
            expect(history.redoStack).toHaveLength(0);
          }
        } finally {
          for (const {cleanup, container, editor} of editors) {
            cleanup();
            editor.setRootElement(null);
            container.remove();
          }
        }
      },
    );

    test('a target resolver can reject a drop without deleting the source', async () => {
      const {editor} = testEnv;
      let sourceKey = '';
      let targetKey = '';
      await editor.update(() => {
        const source = $createParagraphNode().append($createTextNode('source'));
        const target = $createParagraphNode().append($createTextNode('target'));
        $getRoot().clear().append(source, target);
        sourceKey = source.getFirstChildOrThrow().getKey();
        targetKey = target.getFirstChildOrThrow().getKey();

        const selection = $createRangeSelection();
        selection.anchor.set(sourceKey, 0, 'text');
        selection.focus.set(sourceKey, 6, 'text');
        $setSelection(selection);
      });

      const resolveDropTarget = vi.fn(() => null);
      await editor.update(() => {
        const domText = getParagraphTextDOM(editor, targetKey);
        setCaretFromPoint(domText, 6);
        const {dataTransfer, event, preventDefault} = createDropEvent();
        dataTransfer.setData('text/plain', 'source');
        $writeDragSourceToDataTransfer(dataTransfer, editor);
        expect($handlePlainTextDrop(event, editor, resolveDropTarget)).toBe(
          true,
        );
        expect(preventDefault).toHaveBeenCalled();
      });

      expect(resolveDropTarget).toHaveBeenCalledOnce();
      const invalidResolver = vi.fn(() => ({caret: null as never}));
      await editor.update(() => {
        const domText = getParagraphTextDOM(editor, targetKey);
        setCaretFromPoint(domText, 6);
        const {dataTransfer, event} = createDropEvent();
        dataTransfer.setData('text/plain', 'source');
        $writeDragSourceToDataTransfer(dataTransfer, editor);
        expect($handlePlainTextDrop(event, editor, invalidResolver)).toBe(true);
      });
      expect(invalidResolver).toHaveBeenCalledOnce();
      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('source\n\ntarget');
      });
    });

    test('a remapped drop inside the source is a no-op before preparation', async () => {
      const {editor} = testEnv;
      let textKey = '';
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('source');
        paragraph.append(text);
        $getRoot().clear().append(paragraph);
        textKey = text.getKey();

        const selection = $createRangeSelection();
        selection.anchor.set(textKey, 0, 'text');
        selection.focus.set(textKey, 6, 'text');
        $setSelection(selection);
      });

      const beforeInsert = vi.fn();
      const resolveDropTarget = vi.fn(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'expected range selection');
        const source = selection.anchor.getNode();
        invariant($isTextNode(source), 'expected source text');
        return {
          $beforeInsert: beforeInsert,
          caret: $getTextPointCaret(source, 'next', 3),
        };
      });

      await editor.update(() => {
        const domText = getParagraphTextDOM(editor, textKey);
        setCaretFromPoint(domText, 6);
        const {dataTransfer, event} = createDropEvent();
        dataTransfer.setData('text/plain', 'source');
        $writeDragSourceToDataTransfer(dataTransfer, editor);
        expect($handlePlainTextDrop(event, editor, resolveDropTarget)).toBe(
          true,
        );
      });

      expect(resolveDropTarget).toHaveBeenCalledOnce();
      expect(beforeInsert).not.toHaveBeenCalled();
      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('source');
      });
    });

    test('a rich drop at the source endpoint is a no-op even without a payload', async () => {
      const {editor} = testEnv;
      let textKey = '';
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const text = $createTextNode('source');
        paragraph.append(text);
        $getRoot().clear().append(paragraph);
        textKey = text.getKey();

        const selection = $createRangeSelection();
        selection.anchor.set(textKey, 0, 'text');
        selection.focus.set(textKey, 6, 'text');
        $setSelection(selection);
      });

      await editor.update(() => {
        const domText = getParagraphTextDOM(editor, textKey);
        setCaretFromPoint(domText, 6);
        const {dataTransfer, event, preventDefault} = createDropEvent();
        $writeDragSourceToDataTransfer(dataTransfer, editor);
        expect($handleRichTextDrop(event, editor)).toBe(true);
        expect(preventDefault).toHaveBeenCalled();
      });

      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('source');
      });
    });

    test.each([
      'preparation',
      'insertion',
      'async preparation',
      'async resolver',
      'mutating resolver',
      'invalid selection',
    ])(
      '%s failure cancels native drop and preserves committed content',
      async mode => {
        const onError = vi.fn();
        const editor = createTestEditor({onError});
        const container = document.createElement('div');
        container.contentEditable = 'true';
        document.body.appendChild(container);
        editor.setRootElement(container);
        try {
          let targetKey = '';
          await editor.update(() => {
            const source = $createTextNode('source');
            const target = $createTextNode('target');
            targetKey = target.getKey();
            $getRoot()
              .clear()
              .append(
                $createParagraphNode().append(source),
                $createParagraphNode().append(target),
              );
            source.select(0, 6);
          });
          const before = editor.getEditorState().toJSON();
          const {event, dataTransfer, preventDefault} = createDropEvent();
          dataTransfer.setData('text/plain', 'source');
          await editor.update(() => {
            setCaretFromPoint(getParagraphTextDOM(editor, targetKey), 3);
            $writeDragSourceToDataTransfer(dataTransfer, editor);
            $handlePlainTextDrop(event, editor, caret => {
              if (mode === 'mutating resolver') {
                $getRoot().clear();
              }
              if (mode === 'async resolver') {
                return Promise.resolve({caret}) as never;
              }
              return {
                $beforeInsert: selection => {
                  if (mode === 'preparation') {
                    throw new Error('preparation failed');
                  }
                  if (mode === 'async preparation') {
                    return Promise.resolve() as never;
                  }
                  if (mode === 'invalid selection') {
                    selection.anchor.set(
                      selection.anchor.key,
                      999,
                      selection.anchor.type,
                    );
                    selection.focus.set(
                      selection.focus.key,
                      999,
                      selection.focus.type,
                    );
                  }
                  if (mode === 'insertion') {
                    vi.spyOn(selection, 'insertRawText').mockImplementation(
                      () => {
                        throw new Error('insertion failed');
                      },
                    );
                  }
                },
                caret,
              };
            });
          });
          expect(event.defaultPrevented).toBe(true);
          expect(preventDefault).toHaveBeenCalledOnce();
          expect(onError).toHaveBeenCalledOnce();
          expect(editor.getEditorState().toJSON()).toEqual(before);
        } finally {
          editor.setRootElement(null);
          container.remove();
        }
      },
    );

    test.each([$handlePlainTextDrop])(
      '%s prepares a structural separator at the live destination',
      async handleDrop => {
        const {editor} = testEnv;
        const cleanup = registerHistory(
          editor,
          createEmptyHistoryState(),
          0,
          () => 0,
        );
        try {
          let targetKey = '';
          await editor.update(() => {
            const source = $createTextNode('source');
            const target = $createTextNode('target');
            targetKey = target.getKey();
            $getRoot()
              .clear()
              .append(
                $createParagraphNode().append(source),
                $createParagraphNode().append(target),
              );
            source.select(0, 6);
          });
          const {event, dataTransfer} = createDropEvent();
          await editor.update(() => {
            dataTransfer.setData('text/plain', 'source');
            $writeDragSourceToDataTransfer(dataTransfer, editor);
            setCaretFromPoint(getParagraphTextDOM(editor, targetKey), 3);
            handleDrop(event, editor, caret => ({
              $beforeInsert: selection => {
                expect($getRoot().getFirstChildOrThrow().getTextContent()).toBe(
                  'source',
                );
                selection.insertNodes([$createLineBreakNode()]);
              },
              caret,
            }));
          });
          editor.read(() => {
            expect($getRoot().getTextContent()).toBe('\n\ntar\nsourceget');
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'range');
            expect(selection.isCollapsed()).toBe(true);
            expect(selection.anchor.getNode().getTextContent()).toBe(
              'sourceget',
            );
            expect(selection.anchor.offset).toBe(6);
          });
          editor.dispatchCommand(UNDO_COMMAND);
          editor.read(() =>
            expect($getRoot().getTextContent()).toBe('source\n\ntarget'),
          );
        } finally {
          cleanup();
        }
      },
    );

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
        $markActiveSelectionAsDragSource(dataTransfer, editor);
        $handleRichTextDrop(event, editor);
      });

      await editor.read(() => {
        // " " from the source TextNode is preserved where it was, and "source"
        // is inserted into the destination TextNode at offset 4.
        expect($getRoot().getTextContent()).toBe(' destsourceination');
      });
    });

    test('returns false for an external drag (no marker), letting the browser handle it', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('Hello world'));
        $getRoot().clear().append(paragraph);
      });

      let handled = true;
      let preventDefault: Mock | null = null;
      await editor.update(() => {
        const {dataTransfer, event, preventDefault: pd} = createDropEvent();
        dataTransfer.setData('text/plain', 'brave ');
        // No drag-source marker — this represents an external drag. The
        // handler should bail so the browser's native drag-drop flow (which
        // fires beforeinput insertFromDrop on the destination) takes over.
        preventDefault = pd;
        handled = $handleRichTextDrop(event, editor);
      });
      expect(handled).toBe(false);
      expect(preventDefault).not.toBeNull();
      expect(preventDefault!).not.toHaveBeenCalled();
    });

    test('returns false when caretFromPoint cannot resolve a location', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode('Hello'));
        $getRoot().clear().append(paragraph);
      });

      let handled = true;
      let preventDefault: Mock | null = null;
      await editor.update(() => {
        const {event, preventDefault: pd} = createDropEvent();
        preventDefault = pd;
        handled = $handleRichTextDrop(event, editor);
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
        $markActiveSelectionAsDragSource(dataTransfer, editor);
        $handleRichTextDrop(event, editor);
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
      // own serialization so custom nodes survive the drop, plus a drag-source
      // marker so the handler treats it as a same-editor move.
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
        $writeDragSourceToDataTransfer(
          dataTransfer as unknown as DataTransfer,
          editor,
        );
        $handleRichTextDrop(event, editor);
      });

      await editor.read(() => {
        const root = $getRoot();
        const topLevelChildren = root.getChildren();
        // Two paragraphs at the top level: the (now-empty) source and the
        // target (now containing the moved content).
        expect(topLevelChildren.length).toBe(2);

        const allDecorators = topLevelChildren
          .flatMap(c =>
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
        $markActiveSelectionAsDragSource(dataTransfer, editor);
        const handled = $handleRichTextDrop(event, editor);
        expect(handled).toBe(true);
        expect(preventDefault).toHaveBeenCalled();
      });

      await editor.read(() => {
        expect($getRoot().getTextContent()).toBe('onetwothree');
      });
    });
  });
});

describe('$handleRichTextDrop across editors', () => {
  let sourceContainer: HTMLDivElement;
  let destContainer: HTMLDivElement;
  let sourceEditor: LexicalEditor;
  let destEditor: LexicalEditor;

  beforeEach(() => {
    caretFromPointState.current = () => null;

    sourceContainer = document.createElement('div');
    sourceContainer.setAttribute('data-lexical-editor', 'true');
    sourceContainer.contentEditable = 'true';
    document.body.appendChild(sourceContainer);
    sourceEditor = createTestEditor();
    sourceEditor.setRootElement(sourceContainer);

    destContainer = document.createElement('div');
    destContainer.setAttribute('data-lexical-editor', 'true');
    destContainer.contentEditable = 'true';
    document.body.appendChild(destContainer);
    destEditor = createTestEditor();
    destEditor.setRootElement(destContainer);
  });

  afterEach(() => {
    sourceEditor.setRootElement(null);
    destEditor.setRootElement(null);
    document.body.removeChild(sourceContainer);
    document.body.removeChild(destContainer);
  });

  test('inserts in the destination and dispatches deleteByDrag at the source root', async () => {
    let sourceTextKey = '';
    await sourceEditor.update(() => {
      const paragraph = $createParagraphNode();
      const text = $createTextNode('source-content');
      paragraph.append(text);
      $getRoot().clear().append(paragraph);
      sourceTextKey = text.getKey();

      const selection = $createRangeSelection();
      selection.anchor.set(sourceTextKey, 0, 'text');
      selection.focus.set(sourceTextKey, 6, 'text');
      $setSelection(selection);
    });

    let destTextKey = '';
    await destEditor.update(() => {
      const paragraph = $createParagraphNode();
      const text = $createTextNode('destination');
      paragraph.append(text);
      $getRoot().clear().append(paragraph);
      destTextKey = text.getKey();
    });

    const dataTransfer = new DataTransfer();
    await sourceEditor.update(() => {
      const selection = $getSelection();
      invariant($isRangeSelection(selection), 'expected source selection');
      setLexicalClipboardDataTransfer(
        dataTransfer,
        $getClipboardDataFromSelection(selection),
      );
      $writeDragSourceToDataTransfer(
        dataTransfer as unknown as DataTransfer,
        sourceEditor,
      );
    });

    // Capture the synthetic event dispatched at the source root. The source
    // editor's actual deletion runs through Lexical's beforeinput handler
    // which is only registered when CAN_USE_BEFORE_INPUT is true (jsdom does
    // not expose getTargetRanges on InputEvent), so we verify the dispatch
    // contract here — the end-to-end deletion is covered by the playground
    // browser repro.
    const observedDispatches: InputEvent[] = [];
    sourceContainer.addEventListener(
      'beforeinput',
      e => observedDispatches.push(e as InputEvent),
      true,
    );

    await destEditor.update(() => {
      const destSpan = destEditor.getElementByKey(destTextKey);
      invariant(destSpan !== null, 'dest span null');
      const domText = destSpan.firstChild;
      invariant(
        domText !== null && domText.nodeType === Node.TEXT_NODE,
        'dest dom text',
      );
      setCaretFromPoint(domText as Text, 11);

      const preventDefault = vi.fn();
      const event = {
        clientX: 0,
        clientY: 0,
        dataTransfer,
        preventDefault,
      } as unknown as DragEvent;

      const handled = $handleRichTextDrop(event, destEditor);
      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
    });

    expect(observedDispatches.length).toBe(1);
    expect(observedDispatches[0].type).toBe('beforeinput');
    expect(observedDispatches[0].inputType).toBe('deleteByDrag');
    expect(observedDispatches[0].target).toBe(sourceContainer);

    await destEditor.read(() => {
      expect($getRoot().getTextContent()).toBe('destinationsource');
    });
  });

  test('cancelled cross-editor drag leaves both editors untouched', async () => {
    await sourceEditor.update(() => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode('source-content'));
      $getRoot().clear().append(paragraph);

      const text = paragraph.getFirstChildOrThrow();
      const selection = $createRangeSelection();
      selection.anchor.set(text.getKey(), 0, 'text');
      selection.focus.set(text.getKey(), 6, 'text');
      $setSelection(selection);
    });

    await destEditor.update(() => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode('destination'));
      $getRoot().clear().append(paragraph);
    });

    // No drop event ever fires — there is no DataTransfer to read, so the
    // marker-based design has nothing to act on. Both editors are unchanged.
    await sourceEditor.read(() => {
      expect($getRoot().getTextContent()).toBe('source-content');
    });
    await destEditor.read(() => {
      expect($getRoot().getTextContent()).toBe('destination');
    });
  });
});
