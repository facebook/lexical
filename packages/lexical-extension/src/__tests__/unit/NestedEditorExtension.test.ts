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
  NestedEditorExtension,
} from '@lexical/extension';
import {describe, expect, test} from 'vitest';

describe('NestedEditorExtension', () => {
  test('it sets _parentEditor implicitly', () => {
    const editor = buildEditorFromExtensions({name: 'parent'});
    const childEditor = editor.read(() =>
      buildEditorFromExtensions({
        dependencies: [NestedEditorExtension],
        name: 'child',
      }),
    );
    expect(childEditor._parentEditor).toBe(editor);
  });
  test('$getParentEditor can be overridden', () => {
    const editor = buildEditorFromExtensions({name: 'parent'});
    const childEditor = buildEditorFromExtensions({
      dependencies: [
        configExtension(NestedEditorExtension, {
          $getParentEditor: () => editor,
        }),
      ],
      name: 'child',
    });
    expect(childEditor._parentEditor).toBe(editor);
  });
  test('The theme is inherited by default', () => {
    const editor = buildEditorFromExtensions({
      name: 'parent',
      theme: {text: {bold: 'bold'}},
    });
    const childEditor = editor.read(() =>
      buildEditorFromExtensions({
        dependencies: [NestedEditorExtension],
        name: 'child',
      }),
    );
    expect(childEditor._config.theme.text?.bold).toBe('bold');
  });
  test('If the child has a theme it is not inherited', () => {
    const editor = buildEditorFromExtensions({
      name: 'parent',
      theme: {text: {bold: 'bold', italic: 'italic'}},
    });
    const childEditor = editor.read(() =>
      buildEditorFromExtensions({
        dependencies: [NestedEditorExtension],
        name: 'child',
        theme: {text: {italic: 'child-italic'}},
      }),
    );
    expect(childEditor._config.theme.text?.bold).toBe(undefined);
    expect(childEditor._config.theme.text?.italic).toBe('child-italic');
  });
  test('inheritEditableFromParent defaults false but can be enabled later', () => {
    const editor = buildEditorFromExtensions({
      name: 'parent',
    });
    const childEditor = editor.read(() =>
      buildEditorFromExtensions({
        dependencies: [NestedEditorExtension],
        editable: false,
        name: 'child',
      }),
    );
    expect(editor.isEditable()).toBe(true);
    expect(childEditor.isEditable()).toBe(false);
    getExtensionDependencyFromEditor(
      childEditor,
      NestedEditorExtension,
    ).output.inheritEditableFromParent.value = true;
    expect(childEditor.isEditable()).toBe(true);
    editor.setEditable(false);
    expect(editor.isEditable()).toBe(false);
    expect(childEditor.isEditable()).toBe(false);
  });
  test('inheritEditableFromParent works when configured true', () => {
    const editor = buildEditorFromExtensions({
      editable: false,
      name: 'parent',
    });
    const childEditor = editor.read(() =>
      buildEditorFromExtensions({
        dependencies: [
          configExtension(NestedEditorExtension, {
            inheritEditableFromParent: true,
          }),
        ],
        editable: false,
        name: 'child',
      }),
    );
    expect(editor.isEditable()).toBe(false);
    expect(childEditor.isEditable()).toBe(false);
    editor.setEditable(true);
    expect(editor.isEditable()).toBe(true);
    expect(childEditor.isEditable()).toBe(true);
  });
});
