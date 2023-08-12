/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createCodeNode,
  $isCodeHighlightNode,
  registerCodeHighlighting,
} from '@lexical/code';
import {registerTabIndentation} from '@lexical/react/LexicalTabIndentationPlugin';
import {registerRichText} from '@lexical/rich-text';
import {$dfs} from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTabNode,
  $setSelection,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_TAB_COMMAND,
  MOVE_TO_END,
  MOVE_TO_START,
} from 'lexical';
import {
  initializeUnitTest,
  invariant,
  KeyboardEventMock,
  shiftTabKeyboardEvent,
  tabKeyboardEvent,
} from 'lexical/src/__tests__/utils';

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    code: 'my-code-class',
  },
});

const SPACES4 = ' '.repeat(4);

describe('LexicalCodeNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('CodeNode.constructor', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const codeNode = $createCodeNode();
        expect(codeNode.getType()).toBe('code');
        expect(codeNode.getTextContent()).toBe('');
      });
      expect(() => $createCodeNode()).toThrow();
    });

    test('CodeNode.createDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const codeNode = $createCodeNode();
        expect(codeNode.createDOM(editorConfig).outerHTML).toBe(
          '<code class="my-code-class" spellcheck="false"></code>',
        );
        expect(
          codeNode.createDOM({
            namespace: '',
            theme: {},
          }).outerHTML,
        ).toBe('<code spellcheck="false"></code>');
      });
    });

    test('CodeNode.updateDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const newCodeNode = $createCodeNode();
        const codeNode = $createCodeNode();
        const domElement = codeNode.createDOM({
          namespace: '',
          theme: {},
        });
        expect(domElement.outerHTML).toBe('<code spellcheck="false"></code>');
        const result = newCodeNode.updateDOM(
          codeNode,
          domElement,
          editorConfig,
        );
        expect(result).toBe(false);
        expect(domElement.outerHTML).toBe('<code spellcheck="false"></code>');
      });
    });

    test('CodeNode.exportJSON() should return and object conforming to the expected schema', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = $createCodeNode('javascript');
        // If you broke this test, you changed the public interface of a
        // serialized Lexical Core Node. Please ensure the correct adapter
        // logic is in place in the corresponding importJSON  method
        // to accomodate these changes.import { moveSelectionPointToSibling } from '../../../../lexical/src/LexicalSelection';

        expect(node.exportJSON()).toStrictEqual({
          children: [],
          direction: null,
          format: '',
          indent: 0,
          language: 'javascript',
          type: 'code',
          version: 1,
        });
      });
    });

    test.skip('CodeNode.insertNewAfter()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const root = $getRoot();
        const paragraphNode = $createParagraphNode();
        const textNode = $createTextNode('foo');
        paragraphNode.append(textNode);
        root.append(paragraphNode);
        textNode.select(0, 0);
        const selection = $getSelection();
        expect(selection).toEqual({
          anchorKey: '_2',
          anchorOffset: 0,
          dirty: true,
          focusKey: '_2',
          focusOffset: 0,
          needsSync: false,
        });
      });
      expect(testEnv.outerHTML).toBe(
        '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span>foo</span></p></div>',
      );

      await editor.update(() => {
        const codeNode = $createCodeNode();
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          codeNode.insertNewAfter(selection);
        }
      });
    });

    test('$createCodeNode()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const codeNode = $createCodeNode();
        const createdCodeNode = $createCodeNode();
        expect(codeNode.__type).toEqual(createdCodeNode.__type);
        expect(codeNode.__parent).toEqual(createdCodeNode.__parent);
        expect(codeNode.__key).not.toEqual(createdCodeNode.__key);
      });
    });

    test('can tab with collapsed selection', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerTabIndentation(editor);
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertText('function');
      });
      await editor.dispatchCommand(KEY_TAB_COMMAND, tabKeyboardEvent());
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">function</span><span data-lexical-text="true">\t</span></code>',
      );

      // CodeNode should only render diffs, make sure that the TabNode is not cloned when
      // appending more text
      let tabKey;
      await editor.update(() => {
        tabKey = $dfs()
          .find(({node}) => $isTabNode(node))
          .node.getKey();
        $getSelection().insertText('foo');
      });
      expect(
        editor.getEditorState().read(() => {
          return $getNodeByKey(tabKey) !== null;
        }),
      );
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">function</span><span data-lexical-text="true">\t</span><span data-lexical-text="true">foo</span></code>',
      );
    });

    test('can tab with non-collapsed selection', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerTabIndentation(editor);
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertText('function');
      });
      // TODO consolidate editor.update - there's some bad logic in updateAndRetainSelection
      await editor.update(() => {
        const codeText = $getRoot().getFirstDescendant();
        codeText.select(1, 'function'.length);
      });
      await editor.dispatchCommand(KEY_TAB_COMMAND, tabKeyboardEvent());
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">f</span><span data-lexical-text="true">\t</span></code>',
      );
    });

    test('can indent/outdent one line by selecting all line (with tabs)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerTabIndentation(editor);
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertText('function');
      });
      // TODO consolidate editor.update - there's some bad logic in updateAndRetainSelection
      await editor.update(() => {
        const codeText = $getRoot().getFirstDescendant();
        codeText.select(0, 'function'.length);
      });
      await editor.dispatchCommand(KEY_TAB_COMMAND, tabKeyboardEvent());
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">\t</span><span data-lexical-text="true">function</span></code>',
      );

      await editor.update(() => {
        const root = $getRoot();
        const codeTab = root.getFirstDescendant();
        const codeText = root.getLastDescendant();
        const selection = $createRangeSelection();
        selection.anchor.set(codeTab.getKey(), 0, 'text');
        selection.focus.set(codeText.getKey(), 'function'.length, 'text');
      });
      await editor.dispatchCommand(KEY_TAB_COMMAND, shiftTabKeyboardEvent());
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">function</span></code>',
      );
    });

    test('can indent/outdent with collapsed selection at start of line (with tabs)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerTabIndentation(editor);
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertText('function');
      });
      // TODO consolidate editor.update - there's some bad logic in updateAndRetainSelection
      await editor.update(() => {
        const codeText = $getRoot().getFirstDescendant();
        codeText.select(0, 0);
      });
      await editor.dispatchCommand(KEY_TAB_COMMAND, tabKeyboardEvent());
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">\t</span><span data-lexical-text="true">function</span></code>',
      );

      await editor.update(() => {
        const root = $getRoot();
        const codeTab = root.getFirstDescendant();
        const codeText = root.getLastDescendant();
        const selection = $createRangeSelection();
        selection.anchor.set(codeTab.getKey(), 0, 'text');
        selection.focus.set(codeText.getKey(), 0, 'text');
        $setSelection(selection);
      });
      await editor.dispatchCommand(KEY_TAB_COMMAND, shiftTabKeyboardEvent());
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">function</span></code>',
      );
    });

    test('can indent/outdent multiline (with tabs)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerTabIndentation(editor);
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertRawText('hello\tworld\nhello\tworld');
      });
      // TODO consolidate editor.update - there's some bad logic in updateAndRetainSelection
      await editor.update(() => {
        const firstCodeText = $getRoot().getFirstDescendant();
        const lastCodeText = $getRoot().getLastDescendant();
        const selection = $createRangeSelection();
        selection.anchor.set(firstCodeText.getKey(), 1, 'text');
        selection.focus.set(lastCodeText.getKey(), 1, 'text');
        $setSelection(selection);
      });
      await editor.dispatchCommand(KEY_TAB_COMMAND, tabKeyboardEvent());
      expect(testEnv.innerHTML).toBe(
        `<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1
2"><span data-lexical-text="true">\t</span><span data-lexical-text="true">hello</span><span data-lexical-text="true">\t</span><span data-lexical-text="true">world</span><br><span data-lexical-text="true">\t</span><span data-lexical-text="true">hello</span><span data-lexical-text="true">\t</span><span data-lexical-text="true">world</span></code>`,
      );

      await editor.dispatchCommand(KEY_TAB_COMMAND, shiftTabKeyboardEvent());
      expect(testEnv.innerHTML).toBe(
        `<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1
2"><span data-lexical-text="true">hello</span><span data-lexical-text="true">\t</span><span data-lexical-text="true">world</span><br><span data-lexical-text="true">hello</span><span data-lexical-text="true">\t</span><span data-lexical-text="true">world</span></code>`,
      );
    });

    test('can indent at the start of the second line', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerTabIndentation(editor);
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertRawText('hello\n');
      });
      await editor.dispatchCommand(KEY_TAB_COMMAND, tabKeyboardEvent());
      expect(testEnv.innerHTML)
        .toBe(`<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1
2"><span data-lexical-text="true">hello</span><br><span data-lexical-text="true">\t</span></code>`);
    });

    test('can outdent at arbitrary points in the line (with tabs)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerTabIndentation(editor);
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertRawText('\thello');
      });
      // TODO consolidate editor.update - there's some bad logic in updateAndRetainSelection
      await editor.update(() => {
        const codeText = $getRoot().getLastDescendant();
        codeText.select(1, 1);
      });
      await editor.dispatchCommand(KEY_TAB_COMMAND, shiftTabKeyboardEvent());
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">hello</span></code>',
      );
    });

    test('code blocks can shift lines (with tab)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerTabIndentation(editor);
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertRawText('abc\tdef\nghi\tjkl');
      });
      const keyEvent = new KeyboardEventMock();
      keyEvent.altKey = true;
      await editor.dispatchCommand(KEY_ARROW_UP_COMMAND, keyEvent);
      expect(testEnv.innerHTML)
        .toBe(`<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1
2"><span data-lexical-text="true">ghi</span><span data-lexical-text="true">\t</span><span data-lexical-text="true">jkl</span><br><span data-lexical-text="true">abc</span><span data-lexical-text="true">\t</span><span data-lexical-text="true">def</span></code>`);
    });

    test('code blocks can shift multiple lines (with tab)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerTabIndentation(editor);
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertRawText('abc\tdef\nghi\tjkl\nmno\tpqr');
      });
      // TODO consolidate editor.update - there's some bad logic in updateAndRetainSelection
      await editor.update(() => {
        const firstCodeText = $getRoot().getFirstDescendant();
        const secondCodeText = firstCodeText
          .getNextSibling() // tab
          .getNextSibling() // def
          .getNextSibling() // linebreak
          .getNextSibling(); // ghi;
        const selection = $createRangeSelection();
        selection.anchor.set(firstCodeText.getKey(), 1, 'text');
        selection.focus.set(secondCodeText.getKey(), 1, 'text');
        $setSelection(selection);
      });
      const keyEvent = new KeyboardEventMock();
      keyEvent.altKey = true;
      await editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, keyEvent);
      expect(testEnv.innerHTML)
        .toBe(`<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1
2
3"><span data-lexical-text="true">mno</span><span data-lexical-text="true">\t</span><span data-lexical-text="true">pqr</span><br><span data-lexical-text="true">abc</span><span data-lexical-text="true">\t</span><span data-lexical-text="true">def</span><br><span data-lexical-text="true">ghi</span><span data-lexical-text="true">\t</span><span data-lexical-text="true">jkl</span></code>`);
    });

    describe('arrows', () => {
      for (const moveTo of ['start', 'end']) {
        for (const tabOrSpaces of ['tab', 'spaces']) {
          // eslint-disable-next-line no-inner-declarations
          function testMoveTo(
            name: string,
            $beforeFn: () => void,
            $afterFn: () => void,
            only = false,
          ) {
            // eslint-disable-next-line no-only-tests/no-only-tests
            const test_ = only ? test.only : test;
            test_(`${moveTo} ${tabOrSpaces}: ${name}`, async () => {
              const {editor} = testEnv;
              registerRichText(editor);
              registerTabIndentation(editor);
              registerCodeHighlighting(editor);
              await editor.update(() => {
                const root = $getRoot();
                const code = $createCodeNode();
                root.append(code);
                code.selectStart();
                const selection = $getSelection();
                if (tabOrSpaces === 'tab') {
                  selection.insertRawText('\t\tfunction foo\n\t\tfunction bar');
                } else {
                  selection.insertRawText(
                    `${SPACES4}function foo\n${SPACES4}function bar`,
                  );
                }
              });
              await editor.update(() => {
                $beforeFn();
              });
              if (moveTo === 'start') {
                await editor.dispatchCommand(
                  MOVE_TO_START,
                  new KeyboardEventMock('keydown'),
                );
              } else {
                await editor.dispatchCommand(
                  MOVE_TO_END,
                  new KeyboardEventMock('keydown'),
                );
              }
              await editor.update(() => {
                $afterFn();
              });
            });
          }

          testMoveTo(
            'caret at start of line (first line)',
            () => {
              const code = $getRoot().getFirstChild();
              code.selectStart();
            },
            () => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'Expected selection to be RangeSelection',
              );
              expect(selection.isCollapsed()).toBe(true);
              if (moveTo === 'start') {
                if (tabOrSpaces === 'tab') {
                  expect($isTabNode(selection.anchor.getNode())).toBe(true);
                  expect(
                    $isCodeHighlightNode(
                      selection.anchor.getNode().getNextSibling(),
                    ),
                  ).toBe(true);
                  expect(selection.anchor.offset).toBe(1);
                } else {
                  expect(selection.anchor.getNode().getTextContent()).toBe(
                    SPACES4,
                  );
                  expect(selection.anchor.offset).toBe(4);
                }
              } else {
                expect(selection.anchor.getNode().getTextContent()).toBe(
                  ' foo',
                );
                expect(selection.anchor.offset).toBe(' foo'.length);
              }
            },
          );

          testMoveTo(
            'caret at start of line (second line)',
            () => {
              const nodes = $dfs();
              const linebreak = nodes.filter((dfsNode) =>
                $isLineBreakNode(dfsNode.node),
              )[0].node;
              linebreak.selectNext(0, 0);
            },
            () => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'Expected selection to be RangeSelection',
              );
              expect(selection.isCollapsed()).toBe(true);
              if (moveTo === 'start') {
                if (tabOrSpaces === 'tab') {
                  expect($isTabNode(selection.anchor.getNode())).toBe(true);
                  expect(
                    $isCodeHighlightNode(
                      selection.anchor.getNode().getNextSibling(),
                    ),
                  ).toBe(true);
                  expect(selection.anchor.offset).toBe(1);
                } else {
                  expect(selection.anchor.getNode().getTextContent()).toBe(
                    SPACES4,
                  );
                  expect(selection.anchor.offset).toBe(4);
                }
              } else {
                expect(selection.anchor.getNode().getTextContent()).toBe(
                  ' bar',
                );
                expect(selection.anchor.offset).toBe(' bar'.length);
              }
            },
          );

          testMoveTo(
            'caret immediately before code (first line)',
            () => {
              const code = $getRoot().getFirstChild();
              if (tabOrSpaces === 'tab') {
                const firstTab = code.getFirstChild();
                firstTab.getNextSibling().selectNext(0, 0);
              } else {
                code.getFirstChild().select(4, 4);
              }
            },
            () => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'Expected selection to be RangeSelection',
              );
              expect(selection.isCollapsed()).toBe(true);
              if (moveTo === 'start') {
                const code = $getRoot().getFirstChild();
                const firstChild = code.getFirstChild();
                expect(selection.anchor.getNode().is(firstChild)).toBe(true);
                expect(selection.anchor.offset).toBe(0);
              } else {
                expect(selection.anchor.getNode().getTextContent()).toBe(
                  ' foo',
                );
                expect(selection.anchor.offset).toBe(' foo'.length);
              }
            },
          );

          testMoveTo(
            'caret immediately before code (second line)',
            () => {
              const nodes = $dfs();
              const linebreak = nodes.filter((dfsNode) =>
                $isLineBreakNode(dfsNode.node),
              )[0].node;
              if (tabOrSpaces === 'tab') {
                const firstTab = linebreak.getNextSibling();
                firstTab.selectNext();
              } else {
                linebreak.selectNext(4, 4);
              }
            },
            () => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'Expected selection to be RangeSelection',
              );
              expect(selection.isCollapsed()).toBe(true);
              if (moveTo === 'start') {
                const nodes = $dfs();
                const linebreak = nodes.filter((dfsNode) =>
                  $isLineBreakNode(dfsNode.node),
                )[0].node;
                const tabOrSpace = linebreak.getNextSibling();
                expect(selection.anchor.getNode().is(tabOrSpace)).toBe(true);
                expect(selection.anchor.offset).toBe(0);
              } else {
                expect(selection.anchor.getNode().getTextContent()).toBe(
                  ' bar',
                );
                expect(selection.anchor.offset).toBe(' bar'.length);
              }
            },
          );

          testMoveTo(
            'caret in between space (first line)',
            () => {
              const code = $getRoot().getFirstChild();
              if (tabOrSpaces === 'tab') {
                const firstTab = code.getFirstChild();
                firstTab.selectNext(0, 0);
              } else {
                code.getFirstChild().select(2, 2);
              }
            },
            () => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'Expected selection to be RangeSelection',
              );
              expect(selection.isCollapsed()).toBe(true);
              if (moveTo === 'start') {
                if (tabOrSpaces === 'tab') {
                  expect($isTabNode(selection.anchor.getNode())).toBe(true);
                  expect(
                    $isCodeHighlightNode(
                      selection.anchor.getNode().getNextSibling(),
                    ),
                  ).toBe(true);
                  expect(selection.anchor.offset).toBe(1);
                } else {
                  expect(selection.anchor.getNode().getTextContent()).toBe(
                    SPACES4,
                  );
                  expect(selection.anchor.offset).toBe(4);
                }
              } else {
                expect(selection.anchor.getNode().getTextContent()).toBe(
                  ' foo',
                );
                expect(selection.anchor.offset).toBe(' foo'.length);
              }
            },
          );

          testMoveTo(
            'caret in between space (second line)',
            () => {
              const nodes = $dfs();
              const linebreak = nodes.filter((dfsNode) =>
                $isLineBreakNode(dfsNode.node),
              )[0].node;
              if (tabOrSpaces === 'tab') {
                const firstTab = linebreak.getNextSibling();
                firstTab.selectNext(0, 0);
              } else {
                linebreak.selectNext(2, 2);
              }
            },
            () => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'Expected selection to be RangeSelection',
              );
              expect(selection.isCollapsed()).toBe(true);
              if (moveTo === 'start') {
                if (tabOrSpaces === 'tab') {
                  expect($isTabNode(selection.anchor.getNode())).toBe(true);
                  expect(
                    $isCodeHighlightNode(
                      selection.anchor.getNode().getNextSibling(),
                    ),
                  ).toBe(true);
                  expect(selection.anchor.offset).toBe(1);
                } else {
                  expect(selection.anchor.getNode().getTextContent()).toBe(
                    SPACES4,
                  );
                  expect(selection.anchor.offset).toBe(4);
                }
              } else {
                expect(selection.anchor.getNode().getTextContent()).toBe(
                  ' bar',
                );
                expect(selection.anchor.offset).toBe(' bar'.length);
              }
            },
          );

          testMoveTo(
            'caret in between code',
            () => {
              const nodes = $dfs();
              const codeHighlight = nodes.filter((dfsNode) =>
                $isCodeHighlightNode(dfsNode.node),
              )[tabOrSpaces === 'tab' ? 0 : 1].node;
              const index = codeHighlight.getTextContent().indexOf('tion');
              codeHighlight.select(index, index);
            },
            () => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'Expected selection to be RangeSelection',
              );
              expect(selection.isCollapsed()).toBe(true);
              if (moveTo === 'start') {
                if (tabOrSpaces === 'tab') {
                  expect($isTabNode(selection.anchor.getNode())).toBe(true);
                  expect(
                    $isCodeHighlightNode(
                      selection.anchor.getNode().getNextSibling(),
                    ),
                  ).toBe(true);
                  expect(selection.anchor.offset).toBe(1);
                } else {
                  expect(selection.anchor.getNode().getTextContent()).toBe(
                    SPACES4,
                  );
                  expect(selection.anchor.offset).toBe(4);
                }
              } else {
                expect(selection.anchor.getNode().getTextContent()).toBe(
                  ' foo',
                );
                expect(selection.anchor.offset).toBe(' foo'.length);
              }
            },
          );

          testMoveTo(
            'caret in between code (after space)',
            () => {
              const nodes = $dfs();
              const codeHighlight = nodes.filter((dfsNode) =>
                $isCodeHighlightNode(dfsNode.node),
              )[tabOrSpaces === 'tab' ? 1 : 2].node;
              const index = codeHighlight.getTextContent().indexOf('oo');
              codeHighlight.select(index, index);
            },
            () => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'Expected selection to be RangeSelection',
              );
              expect(selection.isCollapsed()).toBe(true);
              if (moveTo === 'start') {
                if (tabOrSpaces === 'tab') {
                  expect($isTabNode(selection.anchor.getNode())).toBe(true);
                  expect(
                    $isCodeHighlightNode(
                      selection.anchor.getNode().getNextSibling(),
                    ),
                  ).toBe(true);
                  expect(selection.anchor.offset).toBe(1);
                } else {
                  expect(selection.anchor.getNode().getTextContent()).toBe(
                    SPACES4,
                  );
                  expect(selection.anchor.offset).toBe(4);
                }
              } else {
                expect(selection.anchor.getNode().getTextContent()).toBe(
                  ' foo',
                );
                expect(selection.anchor.offset).toBe(' foo'.length);
              }
            },
          );

          testMoveTo(
            'non-collapsed multi-line selection',
            () => {
              const nodes = $dfs();
              const codeHighlightDFSNodes = nodes.filter((dfsNode) =>
                $isCodeHighlightNode(dfsNode.node),
              );
              const secondCodeHighlight = codeHighlightDFSNodes[1].node;
              const lastCodeHighlight =
                codeHighlightDFSNodes[codeHighlightDFSNodes.length - 1].node;
              const selection = $createRangeSelection();
              selection.anchor.set(lastCodeHighlight.getKey(), 1, 'text');
              selection.focus.set(secondCodeHighlight.getKey(), 1, 'text');
              $setSelection(selection);
            },
            () => {
              const selection = $getSelection();
              invariant(
                $isRangeSelection(selection),
                'Expected selection to be RangeSelection',
              );
              expect(selection.isCollapsed()).toBe(true);
              if (moveTo === 'start') {
                if (tabOrSpaces === 'tab') {
                  expect($isTabNode(selection.anchor.getNode())).toBe(true);
                  expect(
                    $isCodeHighlightNode(
                      selection.anchor.getNode().getNextSibling(),
                    ),
                  ).toBe(true);
                  expect(selection.anchor.offset).toBe(1);
                } else {
                  expect(selection.anchor.getNode().getTextContent()).toBe(
                    SPACES4,
                  );
                  expect(selection.anchor.offset).toBe(4);
                }
              } else {
                expect(selection.anchor.getNode().getTextContent()).toBe(
                  ' foo',
                );
                expect(selection.anchor.offset).toBe(' foo'.length);
              }
            },
          );
        }
      }
    });
  });
});
