/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {ClipboardDOMImportExtension} from '@lexical/clipboard';
import {buildEditorFromExtensions} from '@lexical/extension';
import {$isLinkNode, LinkExtension} from '@lexical/link';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
} from 'lexical';
import {assert, expect, onTestFinished, test} from 'vitest';

// The structure from #4830, omitting Gmail's unrelated font/color styles.
const GMAIL_HTML =
  '<div dir="ltr">Text' +
  '<div><b><br></b></div>' +
  '<div><b>Te<i>xt 2</i></b></div>' +
  '<div><b><i><br></i></b></div>' +
  '<div><b><i><br></i></b></div>' +
  '<div><b><i><u>Text 3</u></i></b></div></div>' +
  '<div class="gmail_quote"><div><br></div><div><br></div>' +
  '<div>Text 4\u00a0</div><div>\u00a0</div>' +
  '<div><a href="http://google.com/" target="_blank">google</a></div></div>';

test('extension paste preserves Gmail blank paragraphs, formatting, and link', () => {
  const rootElement = document.createElement('div');
  rootElement.contentEditable = 'true';
  document.body.appendChild(rootElement);
  const editor = buildEditorFromExtensions({
    $initialEditorState: null,
    dependencies: [
      RichTextExtension,
      LinkExtension,
      ClipboardDOMImportExtension,
    ],
    name: '[empty-block-import-extension-browser]',
  });
  onTestFinished(() => {
    editor.setRootElement(null);
    rootElement.remove();
    editor.dispose();
  });
  editor.setRootElement(rootElement);
  rootElement.focus();
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      $getRoot().clear().append(paragraph);
      paragraph.select();
    },
    {discrete: true},
  );

  const event = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: new DataTransfer(),
  });
  // Firefox creates its own DataTransfer, so populate the event's instance.
  assert(event.clipboardData);
  event.clipboardData.setData('text/html', GMAIL_HTML);
  event.clipboardData.setData('text/plain', 'plain-text fallback');
  rootElement.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);

  const paragraphs = [
    'Text',
    '',
    'Text 2',
    '',
    '',
    'Text 3',
    '',
    '',
    'Text 4\u00a0',
    '\u00a0',
    'google',
  ];
  editor.read(() => {
    const nodes = $getRoot().getChildren();
    expect(nodes.every($isParagraphNode)).toBe(true);
    expect(nodes.map(node => node.getTextContent())).toEqual(paragraphs);
    const formattedParagraph = nodes[5];
    assert($isParagraphNode(formattedParagraph));
    const text = formattedParagraph.getFirstChild();
    assert($isTextNode(text));
    expect(text.hasFormat('bold')).toBe(true);
    expect(text.hasFormat('italic')).toBe(true);
    expect(text.hasFormat('underline')).toBe(true);
    const linkParagraph = nodes[10];
    assert($isParagraphNode(linkParagraph));
    const link = linkParagraph.getFirstChild();
    assert($isLinkNode(link));
    expect(link.getURL()).toBe('http://google.com/');
  });
  expect(Array.from(rootElement.children, child => child.textContent)).toEqual(
    paragraphs,
  );
});
