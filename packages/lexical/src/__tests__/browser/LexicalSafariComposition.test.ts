/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {PlainTextExtension} from '@lexical/plain-text';
import {RichTextExtension} from '@lexical/rich-text';
import {$sliceSelectedTextNodeContent} from '@lexical/selection';
import {
  $cloneWithPropertiesEphemeral,
  $create,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMPOSITION_END_TAG,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  TextNode,
  UNDO_COMMAND,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test, vi} from 'vitest';

// Exercise Safari's DOM event handlers in CI's Chromium as well as WebKit.
// These are synthetic event replays, not a substitute for a system IME test.
vi.mock('lexical/src/environment', async importOriginal => ({
  ...(await importOriginal<typeof import('lexical/src/environment')>()),
  IS_APPLE: true,
  IS_APPLE_WEBKIT: true,
  IS_CHROME: false,
  IS_FIREFOX: false,
  IS_IOS: false,
  IS_SAFARI: true,
}));

class CustomTextNode extends TextNode {
  $config() {
    return this.config('custom-text', {extends: TextNode});
  }
}

function mount(
  richText: boolean,
  initialize: () => void,
  options: {withoutTextInput?: boolean; history?: boolean} = {},
) {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.append(root);
  const editor = buildEditorFromExtensions({
    dependencies: [
      ...(options.withoutTextInput
        ? []
        : [richText ? RichTextExtension : PlainTextExtension]),
      ...(options.history ? [HistoryExtension] : []),
    ],
    name: 'safari-composition-test',
    nodes: [CustomTextNode],
  });
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    root.remove();
  });
  root.focus();
  editor.update(
    () => {
      $getRoot().clear();
      initialize();
    },
    {discrete: true},
  );
  const commands: string[] = [];
  editor.registerCommand(
    KEY_ENTER_COMMAND,
    event => {
      event?.preventDefault();
      commands.push('enter');
      return true;
    },
    COMMAND_PRIORITY_CRITICAL,
  );
  editor.registerCommand(
    KEY_BACKSPACE_COMMAND,
    () => {
      commands.push('backspace');
      return false;
    },
    COMMAND_PRIORITY_CRITICAL,
  );
  const tags: string[] = [];
  editor.registerUpdateListener(update => tags.push(...update.tags));
  const keyDown = (key: string, keyCode: number) =>
    root.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key,
        keyCode,
      }),
    );
  const composition = (type: string, data = '') =>
    root.dispatchEvent(new CompositionEvent(type, {bubbles: true, data}));
  const dispatchInput = (
    type: 'input' | 'beforeinput',
    inputType: string,
    data: string | null,
  ) => {
    const event = new InputEvent(type, {
      bubbles: true,
      cancelable: type === 'beforeinput',
      data,
      inputType,
      isComposing: inputType === 'insertCompositionText',
    });
    // Chromium normalizes Safari-only input types to the empty string.
    Object.defineProperty(event, 'inputType', {value: inputType});
    root.dispatchEvent(event);
  };
  const input = (inputType: string, data: string | null) =>
    dispatchInput('input', inputType, data);
  const beforeInput = (inputType: string, data: string | null) =>
    dispatchInput('beforeinput', inputType, data);
  const setDOMText = (text: string, offset: number) => {
    const domSelection = document.getSelection();
    assert(domSelection);
    const textDOM = domSelection.anchorNode;
    assert(textDOM instanceof Text && root.contains(textDOM));
    textDOM.data = text;
    domSelection.setBaseAndExtent(textDOM, offset, textDOM, offset);
  };
  const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));
  const composeText = async (
    data: string,
    text: string,
    offset: number,
    key: string,
  ) => {
    composition('compositionupdate', data);
    beforeInput('insertCompositionText', data);
    setDOMText(text, offset);
    input('insertCompositionText', data);
    await flush();
    keyDown(key, 229);
  };
  const expectText = (text: string) => {
    expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
    expect(root.textContent).toBe(text);
  };
  return {
    beforeInput,
    commands,
    composeText,
    composition,
    editor,
    expectText,
    flush,
    input,
    keyDown,
    root,
    setDOMText,
    tags,
  };
}

function $paragraph(text: string, start = text.length, end = start) {
  const node = $createTextNode(text);
  $getRoot().append($createParagraphNode().append(node));
  node.select(start, end);
}

describe.each([false, true])('Safari composition (richText=%s)', richText => {
  test.each([
    {backward: false, nbsp: false},
    {backward: true, nbsp: false},
    {backward: false, nbsp: true},
    {backward: true, nbsp: true},
  ])(
    'cancellation keeps the unselected text across paragraphs (%j)',
    async options => {
      const t = mount(richText, () => {
        const first = $createTextNode(options.nbsp ? 'a\u00a0bc' : 'abcd');
        const last = $createTextNode(options.nbsp ? 'DEF\u00a0Z' : 'DEFZ');
        $getRoot().append(
          $createParagraphNode().append(first),
          $createParagraphNode().append(last),
        );
        const selection = first.select();
        selection.setTextNodeRange(
          options.backward ? last : first,
          options.backward ? 3 : 2,
          options.backward ? first : last,
          options.backward ? 2 : 3,
        );
      });
      t.composition('compositionstart');
      await t.flush();
      // Normalization has merged the unselected suffix into the composing node.
      const expected = options.nbsp ? 'a\u00a0\u00a0Z' : 'abZ';
      t.composition('compositionend');
      await t.flush();
      t.expectText(expected);
      expect(t.editor.isComposing()).toBe(false);
      t.keyDown('Enter', 13);
      expect(t.commands).toEqual(['enter']);
    },
  );

  test.each(['insert', 'delete'])(
    'cancellation retains a model %s made while composing',
    async operation => {
      const t = mount(richText, () => $paragraph('abc'));
      t.composition('compositionstart');
      await t.flush();
      await t.composeText('ni', 'abcni\u00a0', 5, 'i');
      t.editor.update(
        () => {
          $getRoot()
            .getAllTextNodes()[0]
            .spliceText(
              0,
              operation === 'delete' ? 1 : 0,
              operation === 'insert' ? 'X' : '',
            );
        },
        {discrete: true},
      );
      const expected = operation === 'insert' ? 'Xabc' : 'bc';
      t.setDOMText(expected + '\u00a0', expected.length);
      t.input('deleteCompositionText', null);
      await t.flush();
      expect(t.editor.read(() => $getRoot().getTextContent())).toBe(expected);
      t.composition('compositionend');
      await t.flush();
      t.expectText(expected);
    },
  );

  test.each([
    {method: 'splice', operation: 'insert'},
    {method: 'splice', operation: 'delete'},
    {method: 'set', operation: 'insert'},
    {method: 'set', operation: 'delete'},
  ])(
    'cancellation preserves model edits to the prepared target (%j)',
    async ({method, operation}) => {
      const t = mount(richText, () => $paragraph('abZ', 2, 3));
      t.composition('compositionstart');
      await t.flush();
      t.editor.update(
        () => {
          const node = $getRoot().getAllTextNodes()[0];
          if (method === 'splice') {
            node.spliceText(
              0,
              operation === 'delete' ? 1 : 0,
              operation === 'insert' ? 'X' : '',
            );
          } else {
            node.setTextContent(
              operation === 'insert'
                ? 'X' + node.getTextContent()
                : node.getTextContent().slice(1),
            );
          }
        },
        {discrete: true},
      );
      t.composition('compositionend');
      await t.flush();
      t.expectText(operation === 'insert' ? 'Xab' : 'b');
    },
  );

  test.each(['insert', 'delete', 'replace', 'ambiguous', 'unchanged'])(
    'cancellation preserves JSON text updates (%s)',
    async operation => {
      const t = mount(richText, () => $paragraph('a\u00a0b', 1, 2));
      t.composition('compositionstart');
      await t.flush();
      t.editor.update(
        () => {
          const node = $getRoot().getAllTextNodes()[0];
          if (operation === 'ambiguous') {
            node.spliceText(2, 0, '\u00a0');
          }
          const text =
            operation === 'insert'
              ? 'X' + node.getTextContent()
              : operation === 'delete'
                ? node.getTextContent().slice(1)
                : operation === 'replace'
                  ? 'X\u00a0Z'
                  : operation === 'ambiguous'
                    ? 'a\u00a0b'
                    : node.getTextContent();
          node.updateFromJSON({...node.exportJSON(), text});
        },
        {discrete: true},
      );
      t.composition('compositionend');
      await t.flush();
      t.expectText(
        operation === 'insert'
          ? 'Xab'
          : operation === 'delete'
            ? 'b'
            : operation === 'replace'
              ? 'X\u00a0Z'
              : operation === 'ambiguous'
                ? 'a\u00a0b'
                : 'ab',
      );
      expect(t.editor.isComposing()).toBe(false);
      t.keyDown('Enter', 13);
      expect(t.commands).toEqual(['enter']);
    },
  );

  test.each(['set', 'splice', 'json'])(
    'ephemeral %s edits leave the composing text unchanged',
    async method => {
      const t = mount(richText, () => $paragraph('a\u00a0b\u00a0c', 1, 2));
      t.composition('compositionstart');
      await t.flush();
      t.editor.read(() => {
        const live = $getRoot().getAllTextNodes()[0];
        const copy = $cloneWithPropertiesEphemeral(live);
        const text = 'XX' + copy.getTextContent();
        if (method === 'set') {
          copy.setTextContent(text);
        } else if (method === 'splice') {
          copy.spliceText(0, 0, 'XX');
        } else {
          copy.updateFromJSON({...copy.exportJSON(), text});
        }
        expect(copy.getTextContent()).toBe(text);
        expect(live.getTextContent()).toBe('ab\u00a0c');
      });
      t.composition('compositionend');
      await t.flush();
      t.expectText('ab\u00a0c');
    },
  );

  test.each(['set', 'splice', 'json'])(
    'an insertion handler that only edits an ephemeral copy preserves the body (%s)',
    async method => {
      const t = mount(richText, () => $paragraph('a\u00a0b', 1, 2));
      t.editor.registerCommand(
        CONTROLLED_TEXT_INSERTION_COMMAND,
        () => {
          const copy = $cloneWithPropertiesEphemeral(
            $getRoot().getAllTextNodes()[0],
          );
          if (method === 'set') {
            copy.setTextContent('a\u00a0\u00a0b');
          } else if (method === 'splice') {
            copy.spliceText(1, 0, '\u00a0');
          } else {
            copy.updateFromJSON({...copy.exportJSON(), text: 'a\u00a0\u00a0b'});
          }
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      );
      t.composition('compositionstart');
      await t.flush();
      t.composition('compositionend');
      await t.flush();
      t.expectText('a\u00a0b');
    },
  );

  test.each(['set', 'splice', 'json'])(
    'ephemeral %s edits do not require an active editor',
    async method => {
      const t = mount(richText, () => $paragraph('a\u00a0b\u00a0c', 1, 2));
      t.composition('compositionstart');
      await t.flush();
      const copy = t.editor.read(() =>
        $cloneWithPropertiesEphemeral($getRoot().getAllTextNodes()[0]),
      );
      // EditorState.read does not supply an active editor.
      t.editor.getEditorState().read(() => {
        if (method === 'set') {
          copy.setTextContent('XX' + copy.getTextContent());
        } else if (method === 'splice') {
          copy.spliceText(0, 0, 'XX');
        } else {
          copy.updateFromJSON({
            ...copy.exportJSON(),
            text: 'XX' + copy.getTextContent(),
          });
        }
        expect(copy.getTextContent()).toBe('XXab\u00a0c');
      });
      t.composition('compositionend');
      await t.flush();
      t.expectText('ab\u00a0c');
    },
  );

  test.each(
    (['live', 'clone', 'ephemeral'] as const).flatMap(mode =>
      [0, 1].map(start => ({mode, start})),
    ),
  )(
    'selection slices affect only the requested node (%j)',
    async ({mode, start}) => {
      const t = mount(richText, () => $paragraph('a\u00a0b\u00a0c', 1, 2));
      t.composition('compositionstart');
      await t.flush();
      const $slice = () => {
        const live = $getRoot().getAllTextNodes()[0];
        const node =
          mode === 'live'
            ? live.getWritable()
            : mode === 'ephemeral'
              ? $cloneWithPropertiesEphemeral(live)
              : live;
        const selection = $createRangeSelection();
        selection.setTextNodeRange(
          node,
          start,
          node,
          node.getTextContentSize(),
        );
        const result = $sliceSelectedTextNodeContent(
          selection,
          node,
          mode === 'clone' ? 'clone' : 'self',
        );
        expect(result.getTextContent()).toBe('ab\u00a0c'.slice(start));
      };
      if (mode === 'live') {
        t.editor.update($slice, {discrete: true});
      } else {
        t.editor.read($slice);
      }
      t.composition('compositionend');
      await t.flush();
      t.expectText(mode === 'live' ? 'ab\u00a0c'.slice(start) : 'ab\u00a0c');
      expect(t.editor.isComposing()).toBe(false);
      t.keyDown('Enter', 13);
      expect(t.commands).toEqual(['enter']);
    },
  );

  test.each([1, 2])(
    'a live slice preserves the selected character at offset %s',
    async offset => {
      const t = mount(richText, () => $paragraph('a\u00a0b\u00a0c', 1, 2));
      t.composition('compositionstart');
      await t.flush();
      t.editor.update(
        () => {
          const node = $getRoot().getAllTextNodes()[0].getWritable();
          const selection = $createRangeSelection();
          selection.setTextNodeRange(node, offset, node, offset + 1);
          $sliceSelectedTextNodeContent(selection, node);
        },
        {discrete: true},
      );
      t.composition('compositionend');
      await t.flush();
      t.expectText(offset === 1 ? 'b' : '\u00a0');
    },
  );

  test.each(['consumed', 'unhandled', 'real-nbsp'])(
    'a %s insertion command preserves the existing text',
    async kind => {
      const initial = kind === 'real-nbsp' ? 'a\u00a0b' : 'abc';
      const t = mount(
        richText,
        () => {
          $paragraph(initial, 1, kind === 'real-nbsp' ? 2 : 1);
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          selection.format = 1;
        },
        {withoutTextInput: kind === 'unhandled'},
      );
      if (kind !== 'unhandled') {
        t.editor.registerCommand(
          CONTROLLED_TEXT_INSERTION_COMMAND,
          () => true,
          COMMAND_PRIORITY_CRITICAL,
        );
      }
      t.composition('compositionstart');
      await t.flush();
      t.composition('compositionend');
      await t.flush();
      t.expectText(initial);
    },
  );

  test.each(['split', 'merge', 'insert-nbsp', 'replace'])(
    'cancellation preserves text mutations (%s)',
    async operation => {
      const t = mount(richText, () => $paragraph('a\u00a0b', 1, 2));
      t.composition('compositionstart');
      await t.flush();
      t.editor.update(
        () => {
          const node = $getRoot().getAllTextNodes()[0];
          if (operation === 'split') {
            node.splitText(1).forEach(part => part.toggleUnmergeable());
          } else if (operation === 'merge') {
            const prefix = $createTextNode('X');
            node.insertBefore(prefix);
            prefix.mergeWithSibling(node.getLatest());
          } else if (operation === 'insert-nbsp') {
            node.spliceText(1, 0, '\u00a0');
          } else {
            node.setTextContent('a\u00a0b');
          }
        },
        {discrete: true},
      );
      t.composition('compositionend');
      await t.flush();
      t.expectText(
        operation === 'merge'
          ? 'Xab'
          : operation === 'insert-nbsp' || operation === 'replace'
            ? 'a\u00a0b'
            : 'ab',
      );
    },
  );

  test.each(['Backspace', 'Escape'])(
    'an empty native compositionend after %s releases the next Enter',
    async cancelKey => {
      const t = mount(richText, () => $paragraph('abc'));
      // Safari starts composition before the Process keydown.
      t.composition('compositionstart');
      await t.flush();
      await t.composeText('n', 'abcn\u00a0', 4, 'n');
      await t.composeText('ni', 'abcni\u00a0', 5, 'i');
      expect(t.editor.isComposing()).toBe(true);

      // Cancellation has deleteCompositionText and no insertFromComposition.
      if (cancelKey === 'Backspace') {
        await t.composeText('n', 'abcn\u00a0', 4, 'Backspace');
      }
      t.beforeInput('deleteCompositionText', null);
      t.setDOMText('abc\u00a0', 3);
      t.input('deleteCompositionText', null);
      t.composition('compositionend');
      // WebKit can deliver the key consumed by the IME after compositionend.
      t.keyDown(cancelKey, 229);
      await t.flush();

      expect(t.commands).toEqual([]);
      t.keyDown('Enter', 13);
      expect(t.commands).toEqual(['enter']);
      expect(t.editor.isComposing()).toBe(false);
      t.expectText('abc');
      expect(t.tags).toContain(COMPOSITION_END_TAG);
      t.keyDown('Backspace', 8);
      await t.flush();
      expect(t.commands).toEqual(['enter', 'backspace']);
      t.expectText('ab');
    },
  );

  test('normal confirmation consumes the IME Enter but handles a later Backspace', async () => {
    const t = mount(richText, () => $paragraph('abc'));
    t.composition('compositionstart');
    await t.flush();
    await t.composeText('ni', 'abcni\u00a0', 5, 'i');
    t.beforeInput('deleteCompositionText', null);
    t.setDOMText('abc\u00a0', 3);
    t.input('deleteCompositionText', null);
    // Real WebKit commits via beforeinput before reporting compositionend.
    t.beforeInput('insertFromComposition', '你');
    await t.flush();
    t.composition('compositionend', '你');
    t.keyDown('Enter', 229);
    await t.flush();
    expect(t.commands).toEqual([]);
    t.expectText('abc你');
    t.keyDown('Backspace', 8);
    await t.flush();
    expect(t.commands).toEqual(['backspace']);
    t.expectText('abc');
    t.keyDown('Enter', 13);
    expect(t.commands).toEqual(['backspace', 'enter']);
  });

  test.each(['a\u00a0b\u00a0', '\u00a0\u00a0'])(
    'cancellation preserves real NBSP in %j',
    async text => {
      const t = mount(richText, () => $paragraph(text));
      t.composition('compositionstart');
      await t.flush();
      t.setDOMText(text + 'ni\u00a0', text.length + 2);
      t.input('insertCompositionText', 'ni');
      await t.flush();
      t.setDOMText(text + '\u00a0', text.length);
      t.input('deleteCompositionText', null);
      t.composition('compositionend');
      await t.flush();
      t.expectText(text);
      t.editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.anchor.offset).toBe(text.length);
      });
      t.keyDown('Enter', 229);
      expect(t.commands).toEqual([]);
      t.keyDown('Enter', 13);
      expect(t.commands).toEqual(['enter']);
    },
  );

  test.each(['empty', 'format', 'token'])(
    'an empty target survives DOM readback and selection normalization (%s)',
    async kind => {
      const t = mount(richText, () => {
        if (kind === 'empty') {
          $getRoot().append($createParagraphNode()).selectEnd();
        } else {
          $paragraph('abc', 1);
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          if (kind === 'format') {
            selection.format = 1;
          } else {
            const node = selection.anchor.getNode();
            assert(node instanceof TextNode);
            node.setMode('token').selectEnd();
          }
        }
      });
      const expected = kind === 'empty' ? '' : 'abc';
      t.composition('compositionstart');
      await t.flush();
      const key = t.editor._compositionKey;
      assert(key !== null);
      t.setDOMText('\u00a0', 0);
      t.input('deleteCompositionText', null);
      document.dispatchEvent(new Event('selectionchange'));
      await t.flush();
      t.editor.update(
        () => {
          // Dirty both sides so normalization cannot remove the empty target
          // while processing a neighboring text node.
          for (const node of $getRoot().getAllTextNodes()) {
            node.markDirty();
          }
        },
        {discrete: true},
      );
      expect(t.editor._compositionKey).toBe(key);
      expect(t.editor.read(() => $getRoot().getTextContent())).toBe(expected);
      t.editor.read(() => {
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        expect(selection.anchor.key).toBe(key);
      });
      t.composition('compositionend');
      await t.flush();
      t.expectText(expected);
      expect(t.editor.isComposing()).toBe(false);
      expect(
        t.editor.read(() =>
          $getRoot()
            .getAllTextNodes()
            .some(node => node.getTextContent() === ''),
        ),
      ).toBe(false);
    },
  );

  test('browser editing replaces the DOM suffix in the prepared formatted target', async () => {
    const t = mount(richText, () => {
      $paragraph('abc', 1);
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      selection.format = 1;
    });
    t.composition('compositionstart');
    await t.flush();
    const key = t.editor._compositionKey;
    const selection = document.getSelection();
    assert(selection);
    // The model has a collapsed caret in empty text. The browser must replace
    // the rendered suffix, rather than insert into the previous text node.
    expect(selection.getRangeAt(0).toString()).toBe('\u00a0');
    document.execCommand('insertText', false, 'n');
    await t.flush();
    expect(t.editor._compositionKey).toBe(key);
    t.editor.read(() => {
      const node = $getRoot()
        .getAllTextNodes()
        .find(text => text.getKey() === key);
      assert(node);
      expect(node.getTextContent()).toBe('n');
      expect(node.hasFormat('bold')).toBe(true);
    });
    t.setDOMText('\u00a0', 0);
    t.input('deleteCompositionText', null);
    t.composition('compositionend');
    await t.flush();
    t.expectText('abc');
  });

  test.each(['selection', 'root', 'state', 'repeat'])(
    'an empty composition target is released after %s changes',
    async kind => {
      const t = mount(richText, () => {
        $paragraph('abc', 1);
        const selection = $getSelection();
        assert($isRangeSelection(selection));
        selection.format = 1;
      });
      const initial = t.editor.getEditorState();
      t.composition('compositionstart');
      await t.flush();
      if (kind === 'selection') {
        t.editor.update(
          () => $getRoot().getAllTextNodes().at(-1)!.selectEnd(),
          {discrete: true},
        );
      } else if (kind === 'root') {
        t.editor.setRootElement(null);
        t.editor.setRootElement(t.root);
        // Root remount reconciles existing nodes without normalizing them.
        // The next normalization must no longer reserve the old target.
        t.editor.update(
          () => {
            for (const node of $getRoot().getAllTextNodes()) {
              node.markDirty();
            }
          },
          {discrete: true},
        );
      } else if (kind === 'state') {
        t.editor.setEditorState(initial);
      }
      t.composition('compositionend');
      await t.flush();
      if (kind === 'repeat') {
        t.composition('compositionstart');
        await t.flush();
        t.composition('compositionend');
        await t.flush();
      }
      t.expectText('abc');
      expect(t.editor.isComposing()).toBe(false);
      expect(
        t.editor.read(() =>
          $getRoot()
            .getAllTextNodes()
            .some(node => node.getTextContent() === ''),
        ),
      ).toBe(false);
      t.keyDown('Enter', 13);
      expect(t.commands).toEqual(['enter']);
    },
  );

  test.each(['', 'a\u00a0b\u00a0'])(
    'confirmation preserves document text and creates one undo step (%j)',
    async text => {
      const t = mount(richText, () => $paragraph(text), {history: true});
      t.composition('compositionstart');
      await t.flush();
      await t.composeText('ni', text + 'ni\u00a0', text.length + 2, 'i');
      t.beforeInput('deleteCompositionText', null);
      t.setDOMText(text + '\u00a0', text.length);
      t.input('deleteCompositionText', null);
      t.beforeInput('insertFromComposition', '你');
      await t.flush();
      t.composition('compositionend', '你');
      t.keyDown('Enter', 229);
      await t.flush();
      t.expectText(text + '你');
      expect(t.commands).toEqual([]);
      t.editor.dispatchCommand(UNDO_COMMAND, undefined);
      await t.flush();
      t.expectText(text);
      expect(t.editor.isComposing()).toBe(false);
    },
  );

  test.each([
    'empty',
    'selection',
    'backward-selection',
    'format',
    'token',
    'subclass',
    'segmented-subclass',
  ])(
    'composition prepares a DOM target without changing document text (%s)',
    async kind => {
      const t = mount(richText, () => {
        if (kind === 'empty') {
          $getRoot().append($createParagraphNode()).selectEnd();
        } else if (kind === 'subclass' || kind === 'segmented-subclass') {
          const node = $create(CustomTextNode).setTextContent('abc');
          $getRoot().append($createParagraphNode().append(node));
          if (kind === 'segmented-subclass') {
            node.setMode('segmented').select(1, 1);
          } else {
            node.selectEnd();
          }
        } else {
          $paragraph(
            'a\u00a0bc',
            kind === 'selection' ? 2 : 4,
            kind === 'backward-selection' ? 2 : 4,
          );
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          if (kind === 'format') {
            selection.format = 1;
          } else if (kind === 'token') {
            const node = selection.anchor.getNode();
            assert(node instanceof TextNode);
            node.setMode('token');
          }
        }
      });
      const expected =
        kind === 'empty'
          ? ''
          : kind === 'selection' || kind === 'backward-selection'
            ? 'a\u00a0'
            : kind === 'subclass' || kind === 'segmented-subclass'
              ? 'abc'
              : 'a\u00a0bc';
      t.composition('compositionstart');
      await t.flush();
      expect(t.editor.read(() => $getRoot().getTextContent())).toBe(expected);
      const key = t.editor._compositionKey;
      assert(key !== null);
      expect(t.editor.getElementByKey(key)?.textContent).toBe(
        t.editor.read(() => {
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          return selection.anchor.getNode().getTextContent() + '\u00a0';
        }),
      );
      t.composition('compositionend');
      t.keyDown('Escape', 229);
      await t.flush();
      expect(t.editor.isComposing()).toBe(false);
      t.expectText(expected);
      if (kind === 'subclass' || kind === 'segmented-subclass') {
        expect(
          t.editor.read(() => $getRoot().getAllTextNodes()[0].getType()),
        ).toBe(kind === 'subclass' ? 'custom-text' : 'text');
      }
    },
  );
});
