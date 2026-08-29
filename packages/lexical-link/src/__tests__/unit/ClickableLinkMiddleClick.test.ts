/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {$createLinkNode, ClickableLinkExtension} from '@lexical/link';
import {RichTextExtension} from '@lexical/rich-text';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  test,
  vi,
} from 'vitest';

const URL = 'https://lexical.dev/';

const extension = defineExtension({
  $initialEditorState: () => {
    const paragraph = $createParagraphNode();
    const link = $createLinkNode(URL);
    link.append($createTextNode('Hello'));
    paragraph.append(link);
    $getRoot().append(paragraph);
  },
  dependencies: [ClickableLinkExtension, RichTextExtension],
  name: '[root]',
});

describe('ClickableLinkExtension middle click', () => {
  let windowOpen: Mock<(typeof window)['open']>;

  beforeEach(() => {
    windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    windowOpen.mockRestore();
  });

  function withEditor(fn: (anchor: HTMLAnchorElement) => void): void {
    using editor = buildEditorFromExtensions(extension);
    const rootElement = document.createElement('div');
    rootElement.contentEditable = 'true';
    document.body.appendChild(rootElement);
    editor.setRootElement(rootElement);
    editor.update(() => {}, {discrete: true});
    try {
      fn(rootElement.querySelector('a')!);
    } finally {
      editor.setRootElement(null);
      rootElement.remove();
    }
  }

  test('middle click opens the link in a new tab', () => {
    withEditor(anchor => {
      // Browsers do not fire `click` for the middle button, so the extension
      // routes middle clicks through its own `auxclick` listener.
      anchor.dispatchEvent(
        new MouseEvent('auxclick', {
          bubbles: true,
          button: 1,
          cancelable: true,
        }),
      );

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(URL, '_blank');
    });
  });

  test('a plain left click still opens the link in the same tab', () => {
    withEditor(anchor => {
      anchor.dispatchEvent(
        new MouseEvent('click', {bubbles: true, button: 0, cancelable: true}),
      );

      expect(windowOpen).toHaveBeenCalledTimes(1);
      expect(windowOpen).toHaveBeenCalledWith(URL, '_self');
    });
  });
});
