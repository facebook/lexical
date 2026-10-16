/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, configExtension} from '@lexical/extension';
import {$createLinkNode, ClickableLinkExtension} from '@lexical/link';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from 'lexical';
import {expect, onTestFinished, test, vi} from 'vitest';

const url = 'https://lexical.dev/';

test.each([
  {button: 0, newTab: false, target: '_self'},
  {button: 1, newTab: false, target: '_blank'},
  {button: 0, newTab: true, target: '_blank'},
])(
  'iframe link click: $button, newTab: $newTab',
  ({button, newTab, target}) => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const frameDocument = iframe.contentDocument!;
    const frameWindow = iframe.contentWindow!;
    const parentOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    const frameOpen = vi
      .spyOn(frameWindow, 'open')
      .mockImplementation(() => null);
    const root = frameDocument.createElement('div');
    root.contentEditable = 'true';
    frameDocument.body.append(root);
    const editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          RichTextExtension,
          configExtension(ClickableLinkExtension, {newTab}),
        ],
        name: 'ClickableLinkIframe',
      }),
    );
    onTestFinished(() => {
      editor.dispose();
      parentOpen.mockRestore();
      frameOpen.mockRestore();
      iframe.remove();
    });
    editor.setRootElement(root);
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append(
            $createLinkNode(url).append($createTextNode('Link')),
          ),
        );
      },
      {discrete: true},
    );

    const event = new MouseEvent(button === 0 ? 'click' : 'auxclick', {
      bubbles: true,
      button,
      cancelable: true,
    });
    root.querySelector('a')!.dispatchEvent(event);

    expect(frameOpen).toHaveBeenCalledExactlyOnceWith(
      url,
      target,
      ...(target === '_blank' ? ['noopener'] : []),
    );
    expect(parentOpen).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  },
);
