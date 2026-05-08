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
  $setState,
  configExtension,
  createState,
  defineExtension,
  DOMConversionMap,
  isHTMLElement,
} from 'lexical';

export const idState = createState('id', {
  parse: v => (typeof v === 'string' && v ? v : null),
});

export const IdStateExtension = defineExtension({
  // config: safeCast<AnyKlass[]>([]),
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
          $exportDOM(node, $next) {
            const result = $next();
            const id = $getState(node, idState);
            if (id && isHTMLElement(result.element)) {
              result.element.setAttribute('id', id);
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
  init: editorConfig => {
    const registeredNodes =
      typeof editorConfig.nodes === 'function'
        ? editorConfig.nodes()
        : editorConfig.nodes;
    if (!registeredNodes) {
      return;
    }

    for (const klass of registeredNodes) {
      // skip replacement config
      if ('replace' in klass) return;

      const importMap: DOMConversionMap = {};

      // Wrap all node importers with a function that sets id
      // TODO: This doesn't work for classes where `importDOM` is declared via `config()`
      for (const [tag, fn] of Object.entries(klass.importDOM?.() || {})) {
        importMap[tag] = importNode => {
          const importer = fn(importNode);
          if (!importer) {
            return null;
          }
          return {
            ...importer,
            conversion: element => {
              const output = importer.conversion(element);
              if (element.id && output?.node && !Array.isArray(output.node)) {
                $setState(output.node, idState, element.id);
              }
              return output;
            },
          };
        };
      }

      klass.importDOM = () => importMap;
    }
  },
  name: '@lexical/playground/IdState',
});
