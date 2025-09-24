/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, namedSignals, NamedSignalsOutput} from '@lexical/extension';
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

export interface LinkConfig {
  /**
   * If this function is specified a {@link PASTE_COMMAND}
   * listener will be registered to wrap selected nodes
   * when a URL is pasted and `validateUrl(url)` returns true.
   * The default of `undefined` will not register this listener.
   *
   * In the implementation of {@link TOGGLE_LINK_COMMAND}
   * it will reject URLs that return false when specified.
   * The default of `undefined` will always accept URLs.
   */
  validateUrl: undefined | ((url: string) => boolean);
  /**
   * The default anchor tag attributes to use for
   * {@link TOGGLE_LINK_COMMAND}
   */
  attributes: undefined | LinkAttributes;
}

const defaultProps: LinkConfig = {
  attributes: undefined,
  validateUrl: undefined,
};

/** @internal */
export function registerLink(
  editor: LexicalEditor,
  stores: NamedSignalsOutput<LinkConfig>,
) {
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

/**
 * Provides {@link LinkNode}, an implementation of
 * {@link TOGGLE_LINK_COMMAND}, and a {@link PASTE_COMMAND}
 * listener to wrap selected nodes in a link when a
 * URL is pasted and `validateUrl` is defined.
 */
export const LinkExtension = defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: defaultProps,
  name: '@lexical/link/Link',
  nodes: [LinkNode],
  register(editor, config, state) {
    return registerLink(editor, state.getOutput());
  },
});
