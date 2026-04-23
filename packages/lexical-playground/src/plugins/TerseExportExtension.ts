/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $getRenderContextValue,
  createRenderState,
  domOverride,
  DOMRenderExtension,
} from '@lexical/html';
import {
  configExtension,
  defineExtension,
  isHTMLElement,
  ParagraphNode,
} from 'lexical';

export const RenderContextTerse = createRenderState('isTerse', Boolean);
export const TerseExportExtension = defineExtension({
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride('*', {
          $exportDOM: (node, $next, editor) => {
            const rval = $next();
            const {element} = rval;
            if (
              isHTMLElement(element) &&
              $getRenderContextValue(RenderContextTerse)
            ) {
              // Strip all theme classes
              for (const className of Array.from(element.classList)) {
                if (className.startsWith('PlaygroundEditorTheme__')) {
                  element.classList.remove(className);
                }
              }
              // Strip white-space: pre-wrap when not necessary
              if (
                element.style.getPropertyValue('white-space') === 'pre-wrap' &&
                !/^\s|\s$|\s\s/.test(element.textContent)
              ) {
                element.style.setProperty('white-space', null);
              }
              if (element.classList.length === 0) {
                element.removeAttribute('class');
              }
              if (element.style.length === 0) {
                // For some reason this getAttribute prevents style=""
                element.getAttribute('style');
                element.removeAttribute('style');
              }
            }
            return rval;
          },
        }),
        domOverride([ParagraphNode], {
          $exportDOM: (node, $next, editor) => {
            const rval = $next();
            const {element} = rval;
            if (
              isHTMLElement(element) &&
              $getRenderContextValue(RenderContextTerse)
            ) {
              // clear any empty br
              if (node.isEmpty()) {
                for (const el of element.querySelectorAll(':scope > br')) {
                  el.remove();
                }
              }
            }
            return rval;
          },
        }),
      ],
    }),
  ],
  name: '@lexical/playground/TerseExport',
});
