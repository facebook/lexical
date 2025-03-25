/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {mergeRegister} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $createTextNode,
  $getEditor,
  $getRoot,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  createEditor,
  DecoratorNode,
  EditorConfig,
  LexicalEditor,
  SerializedLexicalNode,
} from 'lexical';
import {
  expectHtmlToBeEqual,
  html,
  invariant,
} from 'lexical/src/__tests__/utils';
import * as React from 'react';
import {useEffect} from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';

class ReactDecoratorNode extends DecoratorNode<React.ReactNode> {
  __decorate?: (node: this) => React.ReactNode;
  __inline?: boolean;
  static getType() {
    return 'react-decorator';
  }
  static clone(node: ReactDecoratorNode): ReactDecoratorNode {
    return new ReactDecoratorNode(node.__key);
  }
  static importJSON(json: SerializedLexicalNode): ReactDecoratorNode {
    throw new Error('not implemented');
  }
  createDOM(_config: EditorConfig, editor: LexicalEditor): HTMLElement {
    return (editor._window || window).document.createElement(
      this.__inline ? 'span' : 'div',
    );
  }
  updateDOM(prevNode: this, _dom: HTMLElement, _config: EditorConfig): boolean {
    return !!prevNode.__inline !== this.__inline;
  }
  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__decorate = prevNode.__decorate;
  }
  setDecorate(decorate: (typeof this)['__decorate']): this {
    const self = this.getWritable();
    self.__decorate = decorate;
    return self;
  }
  setInline(inline: boolean): this {
    const self = this.getWritable();
    self.__inline = inline;
    return self;
  }
  isInline(): boolean {
    return !!this.__inline;
  }
  decorate() {
    return this.__decorate ? this.__decorate(this) : null;
  }
}
function $createReactDecoratorNode() {
  return $applyNodeReplacement(new ReactDecoratorNode());
}

describe('LexicalNestedComposer', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container!);
    container = null;
    warn.mockReset();

    jest.restoreAllMocks();
  });

  test('with inherited configuration and namespace', async () => {
    let editor: undefined | LexicalEditor;
    let nestedEditor: undefined | LexicalEditor;
    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: () => {
              editor = $getEditor();
              nestedEditor = createEditor();
              nestedEditor.update(() =>
                $getRoot()
                  .clear()
                  .append(
                    $createParagraphNode().append($createTextNode('nested')),
                  ),
              );
              $getRoot()
                .clear()
                .append(
                  $createParagraphNode().append($createTextNode('parent')),
                  $createReactDecoratorNode()
                    .setInline(false)
                    .setDecorate(() => {
                      return nestedEditor ? (
                        <LexicalNestedComposer initialEditor={nestedEditor}>
                          <RichTextPlugin
                            contentEditable={<ContentEditable />}
                            placeholder={<></>}
                            ErrorBoundary={LexicalErrorBoundary}
                          />
                        </LexicalNestedComposer>
                      ) : null;
                    }),
                );
            },
            namespace: 'parent',
            nodes: [ReactDecoratorNode],
            onError: () => {
              throw Error();
            },
          }}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={<></>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
    invariant(editor !== undefined, 'editor defined');
    invariant(nestedEditor !== undefined, 'nestedEditor defined');
    // namespace inherited
    expect(editor._config.namespace).toBe('parent');
    expect(nestedEditor._config.namespace).toBe('parent');
    // nodes inherited
    expect([...nestedEditor._nodes.keys()]).toEqual([...editor._nodes.keys()]);
    expect(warn.mock.calls).toEqual([]);
    expectHtmlToBeEqual(
      container?.innerHTML || '',
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          data-lexical-editor="true">
          <p dir="ltr"><span data-lexical-text="true">parent</span></p>
          <div data-lexical-decorator="true">
            <div
              contenteditable="true"
              role="textbox"
              spellcheck="true"
              style="user-select: text; white-space: pre-wrap; word-break: break-word"
              data-lexical-editor="true">
              <p dir="ltr"><span data-lexical-text="true">nested</span></p>
            </div>
          </div>
        </div>
      `,
    );
    await ReactTestUtils.act(async () => {
      reactRoot.render(null);
    });
  });

  test('with deprecated initialNodes configuration and inherited namespace', async () => {
    let editor: undefined | LexicalEditor;
    let nestedEditor: undefined | LexicalEditor;
    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: () => {
              editor = $getEditor();
              nestedEditor = createEditor();
              nestedEditor.update(() =>
                $getRoot()
                  .clear()
                  .append(
                    $createParagraphNode().append($createTextNode('nested')),
                  ),
              );
              $getRoot()
                .clear()
                .append(
                  $createParagraphNode().append($createTextNode('parent')),
                  $createReactDecoratorNode()
                    .setInline(false)
                    .setDecorate(() => {
                      return nestedEditor ? (
                        <LexicalNestedComposer
                          initialEditor={nestedEditor}
                          initialNodes={[]}>
                          <RichTextPlugin
                            contentEditable={<ContentEditable />}
                            placeholder={<></>}
                            ErrorBoundary={LexicalErrorBoundary}
                          />
                        </LexicalNestedComposer>
                      ) : null;
                    }),
                );
            },
            namespace: 'parent',
            nodes: [ReactDecoratorNode],
            onError: () => {
              throw Error();
            },
          }}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={<></>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
    invariant(editor !== undefined, 'editor defined');
    invariant(nestedEditor !== undefined, 'nestedEditor defined');
    // namespace inherited
    expect(editor._config.namespace).toBe('parent');
    expect(nestedEditor._config.namespace).toBe('parent');
    // nodes inherited
    expect([...nestedEditor._nodes.keys()]).toEqual([...editor._nodes.keys()]);
    expect(warn.mock.calls).toEqual([
      [
        `LexicalNestedComposer initialNodes is deprecated and will be removed in v0.32.0, it has never worked correctly.\nYou can configure your editor's nodes with createEditor({nodes: [], parentEditor: $getEditor()})`,
      ],
      [
        `LexicalNestedComposer initialEditor should explicitly initialize its namespace when the node configuration differs from the parentEditor. For backwards compatibility, the namespace will be initialized from parentEditor until v0.32.0, but this has always had incorrect copy/paste behavior when the configuration differed.\nYou can configure your editor's namespace with createEditor({namespace: 'nested-editor-namespace', nodes: [], parentEditor: $getEditor()}).`,
      ],
    ]);
    expectHtmlToBeEqual(
      container?.innerHTML || '',
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          data-lexical-editor="true">
          <p dir="ltr"><span data-lexical-text="true">parent</span></p>
          <div data-lexical-decorator="true">
            <div
              contenteditable="true"
              role="textbox"
              spellcheck="true"
              style="user-select: text; white-space: pre-wrap; word-break: break-word"
              data-lexical-editor="true">
              <p dir="ltr"><span data-lexical-text="true">nested</span></p>
            </div>
          </div>
        </div>
      `,
    );
    await ReactTestUtils.act(async () => {
      reactRoot.render(null);
    });
  });

  test('with deprecated initialNodes configuration and explicit namespace', async () => {
    let editor: undefined | LexicalEditor;
    let nestedEditor: undefined | LexicalEditor;
    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: () => {
              editor = $getEditor();
              nestedEditor = createEditor({
                namespace: 'nested',
                nodes: [],
                parentEditor: editor,
              });
              nestedEditor.update(() =>
                $getRoot()
                  .clear()
                  .append(
                    $createParagraphNode().append($createTextNode('nested')),
                  ),
              );
              $getRoot()
                .clear()
                .append(
                  $createParagraphNode().append($createTextNode('parent')),
                  $createReactDecoratorNode()
                    .setInline(false)
                    .setDecorate(() => {
                      return nestedEditor ? (
                        <LexicalNestedComposer
                          initialEditor={nestedEditor}
                          initialNodes={[ReactDecoratorNode]}>
                          <RichTextPlugin
                            contentEditable={<ContentEditable />}
                            placeholder={<></>}
                            ErrorBoundary={LexicalErrorBoundary}
                          />
                        </LexicalNestedComposer>
                      ) : null;
                    }),
                );
            },
            namespace: 'parent',
            nodes: [ReactDecoratorNode],
            onError: () => {
              throw Error();
            },
          }}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={<></>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
    invariant(editor !== undefined, 'editor defined');
    invariant(nestedEditor !== undefined, 'nestedEditor defined');
    // namespace inherited
    expect(editor._config.namespace).toBe('parent');
    expect(nestedEditor._config.namespace).toBe('nested');
    // nodes inherited
    expect([...nestedEditor._nodes.keys()].sort()).toEqual(
      [...editor._nodes.keys()].sort(),
    );
    expectHtmlToBeEqual(
      container?.innerHTML || '',
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          data-lexical-editor="true">
          <p dir="ltr"><span data-lexical-text="true">parent</span></p>
          <div data-lexical-decorator="true">
            <div
              contenteditable="true"
              role="textbox"
              spellcheck="true"
              style="user-select: text; white-space: pre-wrap; word-break: break-word"
              data-lexical-editor="true">
              <p dir="ltr"><span data-lexical-text="true">nested</span></p>
            </div>
          </div>
        </div>
      `,
    );
    expect(warn.mock.calls).toEqual([
      [
        `LexicalNestedComposer initialNodes is deprecated and will be removed in v0.32.0, it has never worked correctly.\nYou can configure your editor's nodes with createEditor({nodes: [], parentEditor: $getEditor()})`,
      ],
    ]);
    await ReactTestUtils.act(async () => {
      reactRoot.render(null);
    });
  });

  test('with explicit nodes configuration and explicit namespace', async () => {
    let editor: undefined | LexicalEditor;
    let nestedEditor: undefined | LexicalEditor;
    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: () => {
              editor = $getEditor();
              nestedEditor = createEditor({
                namespace: 'nested',
                nodes: [],
                parentEditor: editor,
              });
              nestedEditor.update(() =>
                $getRoot()
                  .clear()
                  .append(
                    $createParagraphNode().append($createTextNode('nested')),
                  ),
              );
              $getRoot()
                .clear()
                .append(
                  $createParagraphNode().append($createTextNode('parent')),
                  $createReactDecoratorNode()
                    .setInline(false)
                    .setDecorate(() => {
                      return nestedEditor ? (
                        <LexicalNestedComposer initialEditor={nestedEditor}>
                          <RichTextPlugin
                            contentEditable={<ContentEditable />}
                            placeholder={<></>}
                            ErrorBoundary={LexicalErrorBoundary}
                          />
                        </LexicalNestedComposer>
                      ) : null;
                    }),
                );
            },
            namespace: 'parent',
            nodes: [ReactDecoratorNode],
            onError: () => {
              throw Error();
            },
          }}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={<></>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
    invariant(editor !== undefined, 'editor defined');
    invariant(nestedEditor !== undefined, 'nestedEditor defined');
    // namespace inherited
    expect(editor._config.namespace).toBe('parent');
    expect(nestedEditor._config.namespace).toBe('nested');
    // nodes inherited
    expect([...nestedEditor._nodes.keys()].sort()).toEqual(
      [...editor._nodes.keys()]
        .filter((k) => k !== ReactDecoratorNode.getType())
        .sort(),
    );
    expectHtmlToBeEqual(
      container?.innerHTML || '',
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          data-lexical-editor="true">
          <p dir="ltr"><span data-lexical-text="true">parent</span></p>
          <div data-lexical-decorator="true">
            <div
              contenteditable="true"
              role="textbox"
              spellcheck="true"
              style="user-select: text; white-space: pre-wrap; word-break: break-word"
              data-lexical-editor="true">
              <p dir="ltr"><span data-lexical-text="true">nested</span></p>
            </div>
          </div>
        </div>
      `,
    );
    expect(warn.mock.calls).toEqual([]);
    await ReactTestUtils.act(async () => {
      reactRoot.render(null);
    });
  });

  test('default editable inheritance', async () => {
    let editor: undefined | LexicalEditor;
    let nestedEditor: undefined | LexicalEditor;
    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: () => {
              editor = $getEditor();
              nestedEditor = createEditor({
                // this gets overwritten immediately
                editable: false,
                namespace: 'nested',
                nodes: [],
                parentEditor: editor,
              });
              nestedEditor.update(() =>
                $getRoot()
                  .clear()
                  .append(
                    $createParagraphNode().append($createTextNode('nested')),
                  ),
              );
              $getRoot()
                .clear()
                .append(
                  $createParagraphNode().append($createTextNode('parent')),
                  $createReactDecoratorNode()
                    .setInline(false)
                    .setDecorate(() => {
                      return nestedEditor ? (
                        <LexicalNestedComposer initialEditor={nestedEditor}>
                          <RichTextPlugin
                            contentEditable={<ContentEditable />}
                            placeholder={<></>}
                            ErrorBoundary={LexicalErrorBoundary}
                          />
                        </LexicalNestedComposer>
                      ) : null;
                    }),
                );
            },
            namespace: 'parent',
            nodes: [ReactDecoratorNode],
            onError: () => {
              throw Error();
            },
          }}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={<></>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
    invariant(editor !== undefined, 'editor defined');
    invariant(nestedEditor !== undefined, 'nestedEditor defined');
    // namespace inherited
    expect(editor._config.namespace).toBe('parent');
    expect(nestedEditor._config.namespace).toBe('nested');
    // nodes inherited
    expect([...nestedEditor._nodes.keys()].sort()).toEqual(
      [...editor._nodes.keys()]
        .filter((k) => k !== ReactDecoratorNode.getType())
        .sort(),
    );
    expect(editor.isEditable()).toBe(true);
    expect(nestedEditor.isEditable()).toBe(true);
    expectHtmlToBeEqual(
      container?.innerHTML || '',
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          data-lexical-editor="true">
          <p dir="ltr"><span data-lexical-text="true">parent</span></p>
          <div data-lexical-decorator="true">
            <div
              contenteditable="true"
              role="textbox"
              spellcheck="true"
              style="user-select: text; white-space: pre-wrap; word-break: break-word"
              data-lexical-editor="true">
              <p dir="ltr"><span data-lexical-text="true">nested</span></p>
            </div>
          </div>
        </div>
      `,
    );
    expect(warn.mock.calls).toEqual([]);
    await ReactTestUtils.act(async () => {
      editor!.setEditable(false);
    });
    expect(editor.isEditable()).toBe(false);
    expect(nestedEditor.isEditable()).toBe(false);
    expectHtmlToBeEqual(
      container?.innerHTML || '',
      html`
        <div
          contenteditable="false"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          aria-autocomplete="none"
          aria-readonly="true"
          data-lexical-editor="true">
          <p dir="ltr"><span data-lexical-text="true">parent</span></p>
          <div data-lexical-decorator="true">
            <div
              contenteditable="false"
              spellcheck="true"
              style="user-select: text; white-space: pre-wrap; word-break: break-word"
              aria-autocomplete="none"
              aria-readonly="true"
              data-lexical-editor="true">
              <p dir="ltr"><span data-lexical-text="true">nested</span></p>
            </div>
          </div>
        </div>
      `,
    );
    await ReactTestUtils.act(async () => {
      editor!.setEditable(true);
    });
    expect(editor.isEditable()).toBe(true);
    expect(nestedEditor.isEditable()).toBe(true);

    await ReactTestUtils.act(async () => {
      reactRoot.render(null);
    });
  });

  test('skipEditableListener', async () => {
    let editor: undefined | LexicalEditor;
    let nestedEditor: undefined | LexicalEditor;
    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: () => {
              editor = $getEditor();
              nestedEditor = createEditor({
                editable: false,
                namespace: 'nested',
                nodes: [],
                parentEditor: editor,
              });
              nestedEditor.update(() =>
                $getRoot()
                  .clear()
                  .append(
                    $createParagraphNode().append($createTextNode('nested')),
                  ),
              );
              $getRoot()
                .clear()
                .append(
                  $createParagraphNode().append($createTextNode('parent')),
                  $createReactDecoratorNode()
                    .setInline(false)
                    .setDecorate(() => {
                      return nestedEditor ? (
                        <LexicalNestedComposer
                          initialEditor={nestedEditor}
                          skipEditableListener={true}>
                          <RichTextPlugin
                            contentEditable={<ContentEditable />}
                            placeholder={<></>}
                            ErrorBoundary={LexicalErrorBoundary}
                          />
                        </LexicalNestedComposer>
                      ) : null;
                    }),
                );
            },
            namespace: 'parent',
            nodes: [ReactDecoratorNode],
            onError: () => {
              throw Error();
            },
          }}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={<></>}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
    invariant(editor !== undefined, 'editor defined');
    invariant(nestedEditor !== undefined, 'nestedEditor defined');
    // namespace not inherited
    expect(editor._config.namespace).toBe('parent');
    expect(nestedEditor._config.namespace).toBe('nested');
    // nodes not inherited
    expect([...nestedEditor._nodes.keys()].sort()).toEqual(
      [...editor._nodes.keys()]
        .filter((k) => k !== ReactDecoratorNode.getType())
        .sort(),
    );
    expect(editor.isEditable()).toBe(true);
    expect(nestedEditor.isEditable()).toBe(false);
    expectHtmlToBeEqual(
      container?.innerHTML || '',
      html`
        <div
          contenteditable="true"
          role="textbox"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          data-lexical-editor="true">
          <p dir="ltr"><span data-lexical-text="true">parent</span></p>
          <div data-lexical-decorator="true">
            <div
              contenteditable="false"
              spellcheck="true"
              style="user-select: text; white-space: pre-wrap; word-break: break-word"
              aria-autocomplete="none"
              aria-readonly="true"
              data-lexical-editor="true">
              <p dir="ltr"><span data-lexical-text="true">nested</span></p>
            </div>
          </div>
        </div>
      `,
    );
    expect(warn.mock.calls).toEqual([]);
    await ReactTestUtils.act(async () => {
      editor!.setEditable(false);
    });
    expect(editor.isEditable()).toBe(false);
    expect(nestedEditor.isEditable()).toBe(false);
    expectHtmlToBeEqual(
      container?.innerHTML || '',
      html`
        <div
          contenteditable="false"
          spellcheck="true"
          style="user-select: text; white-space: pre-wrap; word-break: break-word"
          aria-autocomplete="none"
          aria-readonly="true"
          data-lexical-editor="true">
          <p dir="ltr"><span data-lexical-text="true">parent</span></p>
          <div data-lexical-decorator="true">
            <div
              contenteditable="false"
              spellcheck="true"
              style="user-select: text; white-space: pre-wrap; word-break: break-word"
              aria-autocomplete="none"
              aria-readonly="true"
              data-lexical-editor="true">
              <p dir="ltr"><span data-lexical-text="true">nested</span></p>
            </div>
          </div>
        </div>
      `,
    );
    await ReactTestUtils.act(async () => {
      editor!.setEditable(true);
    });
    expect(editor.isEditable()).toBe(true);
    expect(nestedEditor.isEditable()).toBe(false);

    await ReactTestUtils.act(async () => {
      reactRoot.render(null);
    });
  });

  test('command listener delegation', async () => {
    let editor: undefined | LexicalEditor;
    let nestedEditor: undefined | LexicalEditor;
    const DELEGATED_COMMAND = createCommand<unknown>('DELEGATED_COMMAND');
    const $commandListener = jest.fn((_) => false);
    function DelegateListenerPlugin() {
      const [currentEditor] = useLexicalComposerContext();
      useEffect(() => {
        return mergeRegister(
          currentEditor.registerCommand(
            DELEGATED_COMMAND,
            (payload, dispatchEditor) =>
              $commandListener({
                currentEditor: $getEditor(),
                dispatchEditor,
                payload,
                priority: COMMAND_PRIORITY_CRITICAL,
              }),
            COMMAND_PRIORITY_CRITICAL,
          ),
          currentEditor.registerCommand(
            DELEGATED_COMMAND,
            (payload, dispatchEditor) =>
              $commandListener({
                currentEditor: $getEditor(),
                dispatchEditor,
                payload,
                priority: COMMAND_PRIORITY_EDITOR,
              }),
            COMMAND_PRIORITY_EDITOR,
          ),
        );
      }, [currentEditor]);
      return null;
    }
    function App() {
      return (
        <LexicalComposer
          initialConfig={{
            editorState: () => {
              editor = $getEditor();
              nestedEditor = createEditor({
                namespace: 'nested',
                nodes: [],
                parentEditor: editor,
              });
              nestedEditor.update(() =>
                $getRoot()
                  .clear()
                  .append(
                    $createParagraphNode().append($createTextNode('nested')),
                  ),
              );
              $getRoot()
                .clear()
                .append(
                  $createParagraphNode().append($createTextNode('parent')),
                  $createReactDecoratorNode()
                    .setInline(false)
                    .setDecorate(() => {
                      return nestedEditor ? (
                        <LexicalNestedComposer
                          initialEditor={nestedEditor}
                          skipEditableListener={true}>
                          <RichTextPlugin
                            contentEditable={<ContentEditable />}
                            placeholder={<></>}
                            ErrorBoundary={LexicalErrorBoundary}
                          />
                          <DelegateListenerPlugin />
                        </LexicalNestedComposer>
                      ) : null;
                    }),
                );
            },
            namespace: 'parent',
            nodes: [ReactDecoratorNode],
            onError: () => {
              throw Error();
            },
          }}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={<></>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <DelegateListenerPlugin />
        </LexicalComposer>
      );
    }

    await ReactTestUtils.act(async () => {
      reactRoot.render(<App />);
    });
    invariant(editor !== undefined, 'editor defined');
    invariant(nestedEditor !== undefined, 'nestedEditor defined');
    // namespace not inherited
    expect(editor._config.namespace).toBe('parent');
    expect(nestedEditor._config.namespace).toBe('nested');
    // nodes not inherited
    expect([...nestedEditor._nodes.keys()].sort()).toEqual(
      [...editor._nodes.keys()]
        .filter((k) => k !== ReactDecoratorNode.getType())
        .sort(),
    );
    expect(warn.mock.calls).toEqual([]);
    await ReactTestUtils.act(async () => {
      expect(editor?.dispatchCommand(DELEGATED_COMMAND, undefined)).toBe(false);
      expect($commandListener.mock.calls).toEqual([
        [
          {
            currentEditor: editor,
            dispatchEditor: editor,
            payload: undefined,
            priority: COMMAND_PRIORITY_CRITICAL,
          },
        ],
        [
          {
            currentEditor: editor,
            dispatchEditor: editor,
            payload: undefined,
            priority: COMMAND_PRIORITY_EDITOR,
          },
        ],
      ]);
      $commandListener.mockClear();
      expect(nestedEditor?.dispatchCommand(DELEGATED_COMMAND, undefined)).toBe(
        false,
      );
      expect($commandListener.mock.calls).toEqual([
        [
          {
            currentEditor: nestedEditor,
            dispatchEditor: nestedEditor,
            payload: undefined,
            priority: COMMAND_PRIORITY_CRITICAL,
          },
        ],
        [
          {
            currentEditor: editor,
            dispatchEditor: nestedEditor,
            payload: undefined,
            priority: COMMAND_PRIORITY_CRITICAL,
          },
        ],
        [
          {
            currentEditor: nestedEditor,
            dispatchEditor: nestedEditor,
            payload: undefined,
            priority: COMMAND_PRIORITY_EDITOR,
          },
        ],
        [
          {
            currentEditor: editor,
            dispatchEditor: nestedEditor,
            payload: undefined,
            priority: COMMAND_PRIORITY_EDITOR,
          },
        ],
      ]);
      $commandListener.mockClear();
      // Can stop propagation from nested editor
      $commandListener.mockImplementation(
        (opts) =>
          opts.dispatchEditor === opts.currentEditor &&
          opts.priority === COMMAND_PRIORITY_EDITOR,
      );
      expect(nestedEditor?.dispatchCommand(DELEGATED_COMMAND, undefined)).toBe(
        true,
      );
      expect($commandListener.mock.calls).toEqual([
        [
          {
            currentEditor: nestedEditor,
            dispatchEditor: nestedEditor,
            payload: undefined,
            priority: COMMAND_PRIORITY_CRITICAL,
          },
        ],
        [
          {
            currentEditor: editor,
            dispatchEditor: nestedEditor,
            payload: undefined,
            priority: COMMAND_PRIORITY_CRITICAL,
          },
        ],
        [
          {
            currentEditor: nestedEditor,
            dispatchEditor: nestedEditor,
            payload: undefined,
            priority: COMMAND_PRIORITY_EDITOR,
          },
        ],
      ]);
      $commandListener.mockClear();

      // Can stop propagation from parent editor
      $commandListener.mockImplementation(
        (opts) => opts.dispatchEditor !== opts.currentEditor,
      );
      expect(nestedEditor?.dispatchCommand(DELEGATED_COMMAND, undefined)).toBe(
        true,
      );
      expect($commandListener.mock.calls).toEqual([
        [
          {
            currentEditor: nestedEditor,
            dispatchEditor: nestedEditor,
            payload: undefined,
            priority: COMMAND_PRIORITY_CRITICAL,
          },
        ],
        [
          {
            currentEditor: editor,
            dispatchEditor: nestedEditor,
            payload: undefined,
            priority: COMMAND_PRIORITY_CRITICAL,
          },
        ],
      ]);
      $commandListener.mockClear();
    });

    await ReactTestUtils.act(async () => {
      reactRoot.render(null);
    });
  });
});
