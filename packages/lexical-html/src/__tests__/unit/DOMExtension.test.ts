/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $generateDOMFromRoot,
  $getRenderContextValue,
  domOverride,
  DOMRenderExtension,
  RenderContextRoot,
} from '@lexical/html';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getState,
  $getStateChange,
  $setState,
  configExtension,
  createState,
  defineExtension,
  isHTMLElement,
  TextNode,
} from 'lexical';
import {expectHtmlToBeEqual, html} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

const idState = createState('id', {
  parse: (v) => (typeof v === 'string' ? v : null),
});

describe('DOMRenderExtension', () => {
  test('can override DOM create + update', () => {
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          const root = $getRoot();
          $setState(root, idState, 'root').append(
            $setState($createParagraphNode(), idState, 'paragraph').append(
              $setState($createTextNode('text!'), idState, 'text'),
            ),
          );
        },
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
        name: 'root',
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);
    expect(
      editor.read(() => {
        expectHtmlToBeEqual(
          root.innerHTML,
          html`
            <p id="paragraph" dir="auto">
              <span id="text" data-lexical-text="true">text!</span>
            </p>
          `,
        );
      }),
    );
    editor.update(
      () =>
        $getRoot()
          .getAllTextNodes()
          .forEach((node) =>
            $setState(node, idState, (prev) => `${prev}-updated`),
          ),
      {discrete: true},
    );
    // Update works too
    expect(
      editor.read(() => {
        expectHtmlToBeEqual(
          root.innerHTML,
          html`
            <p id="paragraph" dir="auto">
              <span id="text-updated" data-lexical-text="true">text!</span>
            </p>
          `,
        );
      }),
    );
    editor.update(
      () =>
        $getRoot()
          .getAllTextNodes()
          .forEach((node) => $setState(node, idState, null)),
      {discrete: true},
    );
    expect(
      editor.read(() => {
        expectHtmlToBeEqual(
          root.innerHTML,
          html`
            <p id="paragraph" dir="auto">
              <span data-lexical-text="true">text!</span>
            </p>
          `,
        );
      }),
    );
  });
  test('can override DOM export', () => {
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          const root = $getRoot();
          $setState(root, idState, 'root').append(
            $setState($createParagraphNode(), idState, 'paragraph').append(
              $setState($createTextNode('text!'), idState, 'text'),
            ),
          );
        },
        dependencies: [
          configExtension(DOMRenderExtension, {
            overrides: [
              domOverride('*', {
                $exportDOM(node, $next) {
                  const result = $next();
                  const id = $getState(node, idState);
                  if (id && isHTMLElement(result.element)) {
                    result.element.setAttribute('id', id);
                  }
                  return result;
                },
              }),
              domOverride([TextNode], {
                $exportDOM(node, $next) {
                  const result = $next();
                  if (
                    $getRenderContextValue(RenderContextRoot) &&
                    isHTMLElement(result.element) &&
                    result.element.style.getPropertyValue('white-space')
                  ) {
                    result.element.style.setProperty('white-space', null);
                    if (result.element.style.cssText === '') {
                      result.element.removeAttribute('style');
                    }
                  }
                  return result;
                },
              }),
            ],
          }),
        ],
        name: 'root',
      }),
    );
    expect(
      editor.read(() => {
        expectHtmlToBeEqual(
          $generateDOMFromRoot(document.createElement('div')).innerHTML,
          html`
            <div id="root" role="textbox">
              <p id="paragraph">
                <span id="text">text!</span>
              </p>
            </div>
          `,
        );
      }),
    );
  });
});
