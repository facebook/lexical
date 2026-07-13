/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  buildEditorFromExtensions,
  configExtension,
  getExtensionDependencyFromEditor,
  OnChangeExtension,
} from '@lexical/extension';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  HISTORY_MERGE_TAG,
} from 'lexical';
import {describe, expect, test, vi} from 'vitest';

describe('OnChangeExtension', () => {
  test('exposes the default config values as signals', () => {
    using editor = buildEditorFromExtensions({
      dependencies: [OnChangeExtension],
      name: 'OnChangeTest',
    });
    const {output} = getExtensionDependencyFromEditor(
      editor,
      OnChangeExtension,
    );
    expect(output.ignoreHistoryMergeTagChange.value).toBe(true);
    expect(output.ignoreSelectionChange.value).toBe(false);
    expect(output.skipInitialization.value).toBe(true);
    expect(output.onChange.value).toBe(undefined);
  });

  test('does not register a listener or throw when onChange is not configured', () => {
    using editor = buildEditorFromExtensions({
      dependencies: [OnChangeExtension],
      name: 'OnChangeTest',
    });
    expect(() => {
      editor.update(
        () => {
          $getRoot().append($createParagraphNode());
        },
        {discrete: true},
      );
      editor.update(
        () => {
          $getRoot().append($createParagraphNode());
        },
        {discrete: true},
      );
    }).not.toThrow();
  });

  test('ignores the first update, where prevEditorState is empty', () => {
    const onChange = vi.fn();
    using editor = buildEditorFromExtensions({
      dependencies: [configExtension(OnChangeExtension, {onChange})],
      name: 'OnChangeTest',
    });
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  test('does not ignores the first update, where prevEditorState is empty, skipInitialization is false, and ignoreHistoryMergeTagChange is false ', () => {
    const onChange = vi.fn();
    using editor = buildEditorFromExtensions({
      dependencies: [
        configExtension(OnChangeExtension, {
          ignoreHistoryMergeTagChange: false,
          onChange,
          skipInitialization: false,
        }),
      ],
      name: 'OnChangeTest',
    });
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('calls onChange with the latest editor state, editor instance, and tags', () => {
    const onChange = vi.fn();
    using editor = buildEditorFromExtensions({
      dependencies: [configExtension(OnChangeExtension, {onChange})],
      name: 'OnChangeTest',
    });
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('hello')),
        );
      },
      {discrete: true},
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    const [editorState, editorArg, tags] = onChange.mock.calls[0];
    expect(editorArg).toBe(editor);
    expect(tags).toBeInstanceOf(Set);
    expect(editorState).toBe(editor.getEditorState());
  });

  test('calls onChange for selection-only updates by default', () => {
    const onChange = vi.fn();
    using editor = buildEditorFromExtensions({
      dependencies: [configExtension(OnChangeExtension, {onChange})],
      name: 'OnChangeTest',
    });
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('hello')),
        );
      },
      {discrete: true},
    );
    editor.update(
      () => {
        $getRoot().selectEnd();
      },
      {discrete: true},
    );
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('ignores selection-only updates when ignoreSelectionChange is true', () => {
    const onChange = vi.fn();
    using editor = buildEditorFromExtensions({
      dependencies: [
        configExtension(OnChangeExtension, {
          ignoreSelectionChange: true,
          onChange,
        }),
      ],
      name: 'OnChangeTest',
    });
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('hello')),
        );
      },
      {discrete: true},
    );
    editor.update(
      () => {
        $getRoot().selectEnd();
      },
      {discrete: true},
    );
    expect(onChange).not.toHaveBeenCalled();

    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('ignores updates tagged with HISTORY_MERGE_TAG by default', () => {
    const onChange = vi.fn();
    using editor = buildEditorFromExtensions({
      dependencies: [configExtension(OnChangeExtension, {onChange})],
      name: 'OnChangeTest',
    });
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true, tag: HISTORY_MERGE_TAG},
    );
    expect(onChange).not.toHaveBeenCalled();

    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test('calls onChange for HISTORY_MERGE_TAG updates when ignoreHistoryMergeTagChange is false', () => {
    const onChange = vi.fn();
    using editor = buildEditorFromExtensions({
      dependencies: [
        configExtension(OnChangeExtension, {
          ignoreHistoryMergeTagChange: false,
          onChange,
        }),
      ],
      name: 'OnChangeTest',
    });
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true, tag: HISTORY_MERGE_TAG},
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    const [, , tags] = onChange.mock.calls[0];
    expect(tags.has(HISTORY_MERGE_TAG)).toBe(true);
  });

  test('reactively swaps the onChange handler when the config signal changes', () => {
    const firstOnChange = vi.fn();
    const secondOnChange = vi.fn();
    using editor = buildEditorFromExtensions({
      dependencies: [
        configExtension(OnChangeExtension, {onChange: firstOnChange}),
      ],
      name: 'OnChangeTest',
    });
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    expect(firstOnChange).toHaveBeenCalledTimes(1);
    expect(secondOnChange).not.toHaveBeenCalled();

    getExtensionDependencyFromEditor(
      editor,
      OnChangeExtension,
    ).output.onChange.value = secondOnChange;

    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    expect(firstOnChange).toHaveBeenCalledTimes(1);
    expect(secondOnChange).toHaveBeenCalledTimes(1);
  });

  test('stops calling onChange once it is cleared', () => {
    const onChange = vi.fn();
    using editor = buildEditorFromExtensions({
      dependencies: [configExtension(OnChangeExtension, {onChange})],
      name: 'OnChangeTest',
    });
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    expect(onChange).toHaveBeenCalledTimes(1);

    getExtensionDependencyFromEditor(
      editor,
      OnChangeExtension,
    ).output.onChange.value = undefined;

    editor.update(
      () => {
        $getRoot().append($createParagraphNode());
      },
      {discrete: true},
    );
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
