/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  NestedEditorExtension,
} from '@lexical/extension';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {LexicalExtensionEditorComposer} from '@lexical/react/LexicalExtensionEditorComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {ReactProviderExtension} from '@lexical/react/ReactProviderExtension';
import {toHaveNoViolations} from 'jest-axe';
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $createTextNode,
  $getEditor,
  $getRoot,
  $getState,
  $getStateChange,
  $setState,
  createState,
  DecoratorNode,
  defineExtension,
  EditorConfig,
  LexicalEditor,
  LexicalEditorWithDispose,
  StateConfigValue,
  StateValueOrUpdater,
} from 'lexical';
import {
  expectHtmlToBeEqual,
  html,
  invariant,
} from 'lexical/src/__tests__/utils';
import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';

expect.extend(toHaveNoViolations);

const DecorateState = createState('decorate', {
  parse:
    () =>
    (node: ReactDecoratorNode): React.ReactNode =>
      null,
});
const InlineState = createState('inline', {parse: (v) => !!v});

class ReactDecoratorNode extends DecoratorNode<React.ReactNode> {
  $config() {
    return this.config('react-decorator', {
      extends: DecoratorNode,
    });
  }
  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    return (editor._window || window).document.createElement(
      $getState(this, InlineState) ? 'span' : 'div',
    );
  }
  updateDOM(prevNode: this, _dom: HTMLElement, _config: EditorConfig): boolean {
    return $getStateChange(this, prevNode, InlineState) !== null;
  }
  setDecorate(decorate: StateConfigValue<typeof DecorateState>): this {
    return $setState(this, DecorateState, () => decorate);
  }
  setInline(inline: StateValueOrUpdater<typeof InlineState>): this {
    return $setState(this, InlineState, inline);
  }
  isInline(): boolean {
    return $getState(this, InlineState);
  }
  decorate() {
    return $getState(this, DecorateState)(this);
  }
}
function $createReactDecoratorNode() {
  return $applyNodeReplacement(new ReactDecoratorNode());
}

describe('LexicalExtensionEditorComposer', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container!);
    container = null;
  });

  test('can render', async () => {
    let editor: undefined | LexicalEditor;
    let nestedEditor: undefined | LexicalEditorWithDispose;
    const ParentExtension = defineExtension({
      $initialEditorState: () => {
        editor = $getEditor();
        nestedEditor = buildEditorFromExtensions({
          dependencies: [
            NestedEditorExtension,
            RichTextPlugin,
            ReactProviderExtension,
            ReactExtension,
          ],
          name: 'nested',
        });
        nestedEditor.update(() =>
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode('nested'))),
        );
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append($createTextNode('parent')),
            $createReactDecoratorNode()
              .setInline(false)
              .setDecorate(() => {
                return nestedEditor ? (
                  <LexicalExtensionEditorComposer
                    initialEditor={nestedEditor}
                  />
                ) : null;
              }),
          );
      },
      dependencies: [RichTextPlugin],
      name: 'parent',
      namespace: 'parent',
      nodes: [ReactDecoratorNode],
    });
    function App() {
      return <LexicalExtensionComposer extension={ParentExtension} />;
    }
    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
    invariant(editor !== undefined, 'editor defined');
    invariant(nestedEditor !== undefined, 'nestedEditor defined');
    // namespace inherited by default
    expect(editor._config.namespace).toBe('parent');
    expect(nestedEditor._config.namespace).toBe('parent');
    // Unlike createEditor, node configuration is not inherited
    expect(nestedEditor._nodes.has(ReactDecoratorNode.getType())).toBe(false);

    expectHtmlToBeEqual(
      container?.innerHTML || '',
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          data-lexical-editor="true">
          <p dir="auto"><span data-lexical-text="true">parent</span></p>
          <div data-lexical-decorator="true">
            <div
              contenteditable="true"
              role="textbox"
              spellcheck="true"
              style="user-select: text; white-space: pre-wrap; word-break: break-word"
              data-lexical-editor="true">
              <p dir="auto"><span data-lexical-text="true">nested</span></p>
            </div>
          </div>
        </div>
      `,
    );
    // By default editors are editable
    expect(editor.isEditable()).toBe(true);
    expect(nestedEditor.isEditable()).toBe(true);
    await ReactTestUtils.act(async () => {
      editor!.setEditable(false);
    });
    // By default editable is not inherited
    expect(editor.isEditable()).toBe(false);
    expect(nestedEditor.isEditable()).toBe(true);

    await ReactTestUtils.act(async () => {
      reactRoot.render(null);
      await Promise.resolve();
    });
  });
});
