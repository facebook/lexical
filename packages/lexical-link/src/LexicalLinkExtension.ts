/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, namedSignals} from '@lexical/extension';
import {mergeRegister, objectKlassEquals} from '@lexical/utils';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  LexicalEditor,
  PASTE_COMMAND,
} from 'lexical';

import {
  $toggleLink,
  LinkAttributes,
  LinkNode,
  TOGGLE_LINK_COMMAND,
} from './LexicalLinkNode';

type Props = {
  validateUrl: undefined | ((url: string) => boolean);
  attributes: undefined | LinkAttributes;
};
const defaultProps: Props = {attributes: undefined, validateUrl: undefined};

/** @internal */
export function registerLink(
  editor: LexicalEditor,
  props: Props = defaultProps,
) {
  const stores = namedSignals(defaultProps, props);
  return mergeRegister(
    effect(() =>
      editor.registerCommand(
        TOGGLE_LINK_COMMAND,
        (payload) => {
          const validateUrl = stores.validateUrl.peek();
          const attributes = stores.attributes.peek();
          if (payload === null) {
            $toggleLink(null);
            return true;
          } else if (typeof payload === 'string') {
            if (validateUrl === undefined || validateUrl(payload)) {
              $toggleLink(payload, attributes);
              return true;
            }
            return false;
          } else {
            const {url, target, rel, title} = payload;
            $toggleLink(url, {
              ...attributes,
              rel,
              target,
              title,
            });
            return true;
          }
        },
        COMMAND_PRIORITY_LOW,
      ),
    ),
    effect(() => {
      const validateUrl = stores.validateUrl.value;
      if (!validateUrl) {
        return;
      }
      const attributes = stores.attributes.value;
      return editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (
            !$isRangeSelection(selection) ||
            selection.isCollapsed() ||
            !objectKlassEquals(event, ClipboardEvent)
          ) {
            return false;
          }
          if (event.clipboardData === null) {
            return false;
          }
          const clipboardText = event.clipboardData.getData('text');
          if (!validateUrl(clipboardText)) {
            return false;
          }
          // If we select nodes that are elements then avoid applying the link.
          if (!selection.getNodes().some((node) => $isElementNode(node))) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
              ...attributes,
              url: clipboardText,
            });
            event.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      );
    }),
  );
}

export const LinkExtension = defineExtension({
  config: defaultProps,
  name: '@lexical/link/Link',
  nodes: [LinkNode],
  register: registerLink,
});
