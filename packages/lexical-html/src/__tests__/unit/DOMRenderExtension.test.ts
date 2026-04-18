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
  $create,
  $createLineBreakNode,
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
    using editor = buildEditorFromExtensions(
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
    using editor = buildEditorFromExtensions(
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
                    result.element.style.getPropertyValue('white-space') ===
                      'pre-wrap' &&
                    // we know there aren't tabs or newlines but if there are
                    // leading, trailing, or adjacent spaces then we need the
                    // pre-wrap to preserve the content
                    !/^\s|\s$|\s\s/.test(result.element.textContent)
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
  test('$decorateDOM runs on create and update with correct prevNode', () => {
    type Call = {
      key: string;
      prevKey: null | string;
      id: null | string;
    };
    const calls: Call[] = [];
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $setState($createTextNode('text!'), idState, 'text');
          $getRoot().append(
            $createParagraphNode().append(
              $setState($createTextNode('text!'), idState, 'text'),
            ),
          );
        },
        dependencies: [
          configExtension(DOMRenderExtension, {
            overrides: [
              domOverride([TextNode], {
                $decorateDOM(nextNode, prevNode, dom) {
                  calls.push({
                    id: $getState(nextNode, idState),
                    key: nextNode.getKey(),
                    prevKey: prevNode ? prevNode.getKey() : null,
                  });
                  const id = $getState(nextNode, idState);
                  if (id) {
                    dom.setAttribute('id', id);
                  } else {
                    dom.removeAttribute('id');
                  }
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
    expect(calls).toHaveLength(1);
    expect(calls[0].prevKey).toBe(null);
    expect(calls[0].id).toBe('text');
    expect(
      editor.read(() => {
        expectHtmlToBeEqual(
          root.innerHTML,
          html`
            <p dir="auto">
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
          .forEach((node) => $setState(node, idState, 'updated')),
      {discrete: true},
    );
    expect(calls).toHaveLength(2);
    expect(calls[1].prevKey).toBe(calls[0].key);
    expect(calls[1].id).toBe('updated');
    expect(
      editor.read(() => {
        expectHtmlToBeEqual(
          root.innerHTML,
          html`
            <p dir="auto">
              <span id="updated" data-lexical-text="true">text!</span>
            </p>
          `,
        );
      }),
    );
  });
  test('$decorateDOM overrides all run in order (base, specific, wildcard last)', () => {
    class TextNodeA extends TextNode {
      $config() {
        return this.config('text-a', {extends: TextNode});
      }
    }
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().append(
            $createParagraphNode().append(
              $create(TextNodeA).setTextContent('text a'),
            ),
          );
        },
        dependencies: [
          configExtension(DOMRenderExtension, {
            overrides: [
              domOverride('*', {
                $decorateDOM(_nextNode, _prevNode, dom) {
                  dom.dataset.order = `${dom.dataset.order || ''}wildcard;`;
                },
              }),
              domOverride([TextNodeA], {
                $decorateDOM(_nextNode, _prevNode, dom) {
                  dom.dataset.order = `${dom.dataset.order || ''}text-a;`;
                },
              }),
              domOverride([TextNode], {
                $decorateDOM(_nextNode, _prevNode, dom) {
                  dom.dataset.order = `${dom.dataset.order || ''}text;`;
                },
              }),
            ],
          }),
        ],
        name: 'root',
        nodes: [TextNodeA],
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);
    expect(
      editor.read(() => {
        expectHtmlToBeEqual(
          root.innerHTML,
          html`
            <p dir="auto" data-order="wildcard;">
              <span data-lexical-text="true" data-order="text;text-a;wildcard;">
                text a
              </span>
            </p>
          `,
        );
      }),
    );
  });
  test('$decorateDOM runs after children are reconciled', () => {
    const childCounts: Array<{type: string; count: number}> = [];
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().append(
            $createParagraphNode().append(
              $createTextNode('a'),
              $createLineBreakNode(),
              $createTextNode('b'),
            ),
          );
        },
        dependencies: [
          configExtension(DOMRenderExtension, {
            overrides: [
              domOverride('*', {
                $decorateDOM(nextNode, _prevNode, dom) {
                  const type = nextNode.getType();
                  if (type === 'paragraph' || type === 'root') {
                    childCounts.push({count: dom.childNodes.length, type});
                  }
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
    expect(childCounts).toEqual([
      {count: 3, type: 'paragraph'},
      {count: 1, type: 'root'},
    ]);
  });
  test('type merge', () => {
    class TextNodeA extends TextNode {
      $config() {
        return this.config('text-a', {extends: TextNode});
      }
    }
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().append(
            $createParagraphNode().append(
              $create(TextNodeA).setTextContent('text a'),
              $createLineBreakNode(),
              $createTextNode().setTextContent('plain text'),
            ),
          );
        },
        dependencies: [
          configExtension(DOMRenderExtension, {
            overrides: [
              domOverride([TextNode], {
                $exportDOM(node) {
                  const span = document.createElement('span');
                  span.append(node.getTextContent());
                  return {element: span};
                },
              }),
              domOverride([TextNodeA], {
                $exportDOM(node, $next) {
                  // We want to call $next to get any export behavior
                  // that applies to all TextNode, if we return
                  // a new value we will only get export behavior that
                  // applies to predicates, wildcards, and TextNodeA
                  const r = $next();
                  if (isHTMLElement(r.element)) {
                    r.element.dataset.lexicalType = node.getType();
                  }
                  return r;
                },
              }),
              domOverride([TextNode], {
                $exportDOM(node, $next) {
                  const r = $next();
                  if (isHTMLElement(r.element)) {
                    r.element.dataset.didOverride = 'true';
                  }
                  return r;
                },
              }),
            ],
          }),
        ],
        name: 'root',
        nodes: [TextNodeA],
      }),
    );
    expect(
      editor.read(() => {
        expectHtmlToBeEqual(
          $generateDOMFromRoot(document.createElement('div')).innerHTML,
          html`
            <div role="textbox">
              <p>
                <span data-did-override="true" data-lexical-type="text-a">
                  text a
                </span>
                <br />
                <span data-did-override="true">plain text</span>
              </p>
            </div>
          `,
        );
      }),
    );
  });
});
