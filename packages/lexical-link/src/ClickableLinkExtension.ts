/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {namedSignals, NamedSignalsOutput} from '@lexical/extension';
import {$findMatchingParent, isHTMLAnchorElement} from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  defineExtension,
  getNearestEditorFromDOMNode,
  isDOMNode,
  LexicalEditor,
  safeCast,
} from 'lexical';

import {LinkExtension} from './LexicalLinkExtension';
import {$isLinkNode} from './LexicalLinkNode';

function findMatchingDOM<T extends Node>(
  startNode: Node,
  predicate: (node: Node) => node is T,
): T | null {
  let node: Node | null = startNode;
  while (node != null) {
    if (predicate(node)) {
      return node;
    }
    node = node.parentNode;
  }
  return null;
}

export interface ClickableLinkConfig {
  /** Open clicked links in a new tab when true (default false) */
  newTab: boolean;
  /** Disable this extension when true (default false) */
  disabled: boolean;
}

export function registerClickableLink(
  editor: LexicalEditor,
  stores: NamedSignalsOutput<ClickableLinkConfig>,
  eventOptions: Pick<AddEventListenerOptions, 'signal'> = {},
): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!isDOMNode(target)) {
      return;
    }
    const nearestEditor = getNearestEditorFromDOMNode(target);

    if (nearestEditor === null) {
      return;
    }

    let url = null;
    let urlTarget = null;
    nearestEditor.update(() => {
      const clickedNode = $getNearestNodeFromDOMNode(target);
      if (clickedNode !== null) {
        const maybeLinkNode = $findMatchingParent(clickedNode, $isElementNode);
        if (!stores.disabled.peek()) {
          if ($isLinkNode(maybeLinkNode)) {
            url = maybeLinkNode.sanitizeUrl(maybeLinkNode.getURL());
            urlTarget = maybeLinkNode.getTarget();
          } else {
            const a = findMatchingDOM(target, isHTMLAnchorElement);
            if (a !== null) {
              url = a.href;
              urlTarget = a.target;
            }
          }
        }
      }
    });

    if (url === null || url === '') {
      return;
    }

    // Allow user to select link text without following url
    const selection = editor.getEditorState().read($getSelection);
    if ($isRangeSelection(selection) && !selection.isCollapsed()) {
      event.preventDefault();
      return;
    }

    const isMiddle = event.type === 'auxclick' && event.button === 1;
    window.open(
      url,
      stores.newTab.peek() ||
        isMiddle ||
        event.metaKey ||
        event.ctrlKey ||
        urlTarget === '_blank'
        ? '_blank'
        : '_self',
    );
    event.preventDefault();
  };

  const onMouseUp = (event: MouseEvent) => {
    if (event.button === 1) {
      onClick(event);
    }
  };

  return editor.registerRootListener((rootElement, prevRootElement) => {
    if (prevRootElement !== null) {
      prevRootElement.removeEventListener('click', onClick);
      prevRootElement.removeEventListener('mouseup', onMouseUp);
    }
    if (rootElement !== null) {
      rootElement.addEventListener('click', onClick, eventOptions);
      rootElement.addEventListener('mouseup', onMouseUp, eventOptions);
    }
  });
}

/**
 * Normally in a Lexical editor the `CLICK_COMMAND` on a LinkNode will cause the
 * selection to change instead of opening a link. This extension can be used to
 * restore the default behavior, e.g. when the editor is not editable.
 */
export const ClickableLinkExtension = defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: safeCast<ClickableLinkConfig>({disabled: false, newTab: false}),
  dependencies: [LinkExtension],
  name: '@lexical/link/ClickableLink',
  register(editor, config, state) {
    return registerClickableLink(editor, state.getOutput());
  },
});
