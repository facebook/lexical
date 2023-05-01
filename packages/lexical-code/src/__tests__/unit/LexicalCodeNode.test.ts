/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createCodeNode,
  $isCodeTabNode,
  registerCodeHighlighting,
} from '@lexical/code';
import {registerRichText} from '@lexical/rich-text';
import {$dfs} from '@lexical/utils';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  INDENT_CONTENT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import {
  initializeUnitTest,
  KeyboardEventMock,
} from 'lexical/src/__tests__/utils';

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    code: 'my-code-class',
  },
});

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
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertText('function');
      });
      await editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">function</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span></code>',
      );

      // CodeNode should only render diffs, make sure that the CodeTabNode is not cloned when
      // appending more text
      let tabKey;
      await editor.update(() => {
        tabKey = $dfs()
          .find(({node}) => $isCodeTabNode(node))
          .node.getKey();
        $getSelection().insertText('foo');
      });
      expect(
        editor.getEditorState().read(() => {
          return $getNodeByKey(tabKey) !== null;
        }),
      );
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">function</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">foo</span></code>',
      );
    });

    test('can tab with non-collapsed selection', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
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
      await editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">f</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span></code>',
      );
    });

    test('can indent/outdent one line by selecting all line (with tabs)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
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
      await editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">function</span></code>',
      );

      await editor.update(() => {
        const root = $getRoot();
        const codeTab = root.getFirstDescendant();
        const codeText = root.getLastDescendant();
        const selection = $createRangeSelection();
        selection.anchor.set(codeTab.getKey(), 0, 'text');
        selection.focus.set(codeText.getKey(), 'function'.length, 'text');
      });
      await editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">function</span></code>',
      );
    });

    test('can indent/outdent with collapsed selection at start of line (with tabs)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
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
      await editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">function</span></code>',
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
      await editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">function</span></code>',
      );
    });

    test('can indent/outdent multiline (with tabs)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
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
      await editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      expect(testEnv.innerHTML).toBe(
        `<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1
2"><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">hello</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">world</span><br><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">hello</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">world</span></code>`,
      );

      await editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
      expect(testEnv.innerHTML).toBe(
        `<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1
2"><span data-lexical-text="true">hello</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">world</span><br><span data-lexical-text="true">hello</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">world</span></code>`,
      );
    });

    test('can indent at the start of the second line', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
      registerCodeHighlighting(editor);
      await editor.update(() => {
        const root = $getRoot();
        const code = $createCodeNode();
        root.append(code);
        code.selectStart();
        $getSelection().insertRawText('hello\n');
      });
      await editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      expect(testEnv.innerHTML)
        .toBe(`<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1
2"><span data-lexical-text="true">hello</span><br><span style="letter-spacing: 15px;" data-lexical-text="true"> </span></code>`);
    });

    test('can outdent at arbitrary points in the line (with tabs)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
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
      await editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
      expect(testEnv.innerHTML).toBe(
        '<code spellcheck="false" data-highlight-language="javascript" dir="ltr" data-gutter="1"><span data-lexical-text="true">hello</span></code>',
      );
    });

    test('code blocks can shift lines (with tab)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
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
2"><span data-lexical-text="true">ghi</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">jkl</span><br><span data-lexical-text="true">abc</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">def</span></code>`);
    });

    test('code blocks can shift multiple lines (with tab)', async () => {
      const {editor} = testEnv;
      registerRichText(editor);
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
3"><span data-lexical-text="true">mno</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">pqr</span><br><span data-lexical-text="true">abc</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">def</span><br><span data-lexical-text="true">ghi</span><span style="letter-spacing: 15px;" data-lexical-text="true"> </span><span data-lexical-text="true">jkl</span></code>`);
    });
  });
});
