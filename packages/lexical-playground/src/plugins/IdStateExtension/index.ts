/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {domOverride, DOMRenderExtension} from '@lexical/html';
import {
  $getState,
  $getStateChange,
  configExtension,
  createState,
  defineExtension,
} from 'lexical';

export const idState = createState('id', {
  parse: (v) => (typeof v === 'string' && v ? v : null),
});

export const IdStateExtension = defineExtension({
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride('*', {
          $createDOM(node, $next) {
            const result = $next();
            const id = $getState(node, idState);
            if (id) {
              result.setAttribute('id', id);
            }
            return result;
          },
          $updateDOM(nextNode, prevNode, dom, $next) {
            if ($next()) {
              return true;
            }
            const change = $getStateChange(nextNode, prevNode, idState);
            if (change) {
              const [id] = change;
              if (id) {
                dom.setAttribute('id', id);
              } else {
                dom.removeAttribute('id');
              }
            }
            return false;
          },
        }),
      ],
    }),
  ],
  name: '@lexical/playground/IdState',
});
