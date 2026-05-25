/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode, $isCodeNode} from '@lexical/code';
import {
  CodeHighlighterShikiExtension,
  CodeShikiExtension,
  isCodeLanguageLoaded,
  loadCodeLanguage,
  loadCodeTheme,
  ShikiTokenizer,
} from '@lexical/code-shiki';
import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {$createTextNode, $getRoot, $isTextNode, configExtension} from 'lexical';
import {assert, beforeAll, describe, expect, test} from 'vitest';

import {isCodeThemeLoaded} from '../../FacadeShiki';

const LIGHT_THEME = 'one-light';
const DARK_THEME = 'one-dark-pro';

function $populateCodeBlock(): void {
  const codeNode = $createCodeNode();
  codeNode.append($createTextNode('const x = 1;'));
  $getRoot().clear().append(codeNode);
}

describe('Shiki multi-theme color mode', () => {
  beforeAll(async () => {
    await loadCodeLanguage(ShikiTokenizer.defaultLanguage);
    expect(isCodeLanguageLoaded(ShikiTokenizer.defaultLanguage)).toBe(true);
    await loadCodeTheme(ShikiTokenizer.defaultTheme);
    await loadCodeTheme(LIGHT_THEME);
    await loadCodeTheme(DARK_THEME);
    expect(isCodeThemeLoaded(LIGHT_THEME)).toBe(true);
    expect(isCodeThemeLoaded(DARK_THEME)).toBe(true);
  });

  test('default config: single-theme inline rgb (no CSS work)', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: $populateCodeBlock,
      dependencies: [RichTextExtension, CodeShikiExtension],
      name: 'shiki-default-inline',
    });

    editor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isCodeNode(node));
      const codeStyle = node.getStyle();
      expect(codeStyle).toMatch(/^background-color:\s*#[0-9a-fA-F]+/);
      expect(codeStyle).not.toContain('--shiki-');
      const firstChild = node.getFirstChild();
      assert($isTextNode(firstChild));
      expect(firstChild.getStyle()).toMatch(/^color:\s*#[0-9a-fA-F]+$/);
    });
  });

  test('{light, dark} registry entry emits only CSS variables, no inline color', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: $populateCodeBlock,
      dependencies: [
        RichTextExtension,
        configExtension(CodeShikiExtension, {
          themes: {default: {dark: DARK_THEME, light: LIGHT_THEME}},
        }),
      ],
      name: 'shiki-vars-only',
    });

    editor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isCodeNode(node));
      const rootStyle = node.getStyle();
      // Both themes exposed only as variables; no inline color fallback.
      expect(rootStyle).toContain('--shiki-light-bg:');
      expect(rootStyle).toContain('--shiki-dark-bg:');
      expect(rootStyle).toContain('--shiki-light:');
      expect(rootStyle).toContain('--shiki-dark:');
      expect(rootStyle).not.toMatch(/^background-color:/);
    });
  });

  test('per-node setTheme picks the matching registry entry', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const codeNode = $createCodeNode();
        codeNode.append($createTextNode('const x = 1;'));
        codeNode.setTheme('mono');
        $getRoot().clear().append(codeNode);
      },
      dependencies: [
        RichTextExtension,
        configExtension(CodeShikiExtension, {
          // Two entries: a paired vars-only entry and a single-theme
          // inline entry. Per-node `mono` should select the inline one.
          defaultTheme: 'paired',
          themes: {
            mono: LIGHT_THEME,
            paired: {dark: DARK_THEME, light: LIGHT_THEME},
          },
        }),
      ],
      name: 'shiki-per-node-registry',
    });

    editor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isCodeNode(node));
      const rootStyle = node.getStyle();
      // `mono` is a single-theme entry, so the node renders inline rgb
      // and emits no `--shiki-*` variables.
      expect(rootStyle).toMatch(/^background-color:\s*#[0-9a-fA-F]+/);
      expect(rootStyle).not.toContain('--shiki-');
    });
  });

  test('function registry entry receives the code node', () => {
    let receivedKey: string | null = null;
    using editor = buildEditorFromExtensions({
      $initialEditorState: $populateCodeBlock,
      dependencies: [
        RichTextExtension,
        configExtension(CodeShikiExtension, {
          themes: {
            default: codeNode => {
              receivedKey = codeNode.getKey();
              return LIGHT_THEME;
            },
          },
        }),
      ],
      name: 'shiki-function-spec',
    });

    editor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isCodeNode(node));
      expect(receivedKey).toBe(node.getKey());
      // Function returned a string spec, so output is single-theme inline.
      expect(node.getStyle()).toMatch(/^background-color:\s*#[0-9a-fA-F]+/);
    });
  });

  test('legacy CodeHighlighterShikiExtension honors per-node setTheme', () => {
    // Regression for the BC route: ShikiTokenizer.$tokenize must read
    // codeNode.getTheme() before falling back to its own defaultTheme,
    // matching the historical $getHighlightNodes behavior.
    using lightEditor = buildEditorFromExtensions({
      $initialEditorState: $populateCodeBlock,
      dependencies: [RichTextExtension, CodeHighlighterShikiExtension],
      name: 'shiki-legacy-default-theme',
    });
    using darkEditor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const codeNode = $createCodeNode();
        codeNode.append($createTextNode('const x = 1;'));
        codeNode.setTheme(DARK_THEME);
        $getRoot().clear().append(codeNode);
      },
      dependencies: [RichTextExtension, CodeHighlighterShikiExtension],
      name: 'shiki-legacy-pernode-dark',
    });

    let lightStyle = '';
    let darkStyle = '';
    lightEditor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isCodeNode(node));
      lightStyle = node.getStyle();
    });
    darkEditor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isCodeNode(node));
      darkStyle = node.getStyle();
    });

    expect(lightStyle).toMatch(/^background-color:\s*#[0-9a-fA-F]+/);
    expect(darkStyle).toMatch(/^background-color:\s*#[0-9a-fA-F]+/);
    // Two different themes produce two different inline backgrounds.
    expect(lightStyle).not.toBe(darkStyle);
  });

  test('themes override preserves the default registry entry (deep merge)', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: $populateCodeBlock,
      dependencies: [
        RichTextExtension,
        configExtension(CodeShikiExtension, {
          themes: {extra: DARK_THEME},
        }),
      ],
      name: 'shiki-merge-preserve-default',
    });

    editor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isCodeNode(node));
      // No per-node theme set, so the resolver looks up `defaultTheme`
      // ('default') in the registry. mergeShikiConfig must deep-merge
      // the override's `themes: {extra: ...}` with the framework
      // default's `themes: {default: 'one-light'}` so both keys
      // co-exist. A shallow replace would drop the `default` entry,
      // sending the resolver to the raw-id fallback for `default` (not
      // a real Shiki theme), which loadCodeTheme would silently no-op
      // on, leaving the node with an empty style.
      expect(node.getStyle()).toMatch(/^background-color:\s*#[0-9a-fA-F]+/);
    });
  });

  test('unknown per-node theme key falls back to a raw Shiki id', () => {
    // Per-node `__theme` set to a Shiki theme id that isn't in the
    // registry. The resolver treats the key as a raw id (with a dev
    // warning) so legacy `setTheme('one-light')` flows keep working.
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const codeNode = $createCodeNode();
        codeNode.append($createTextNode('const x = 1;'));
        codeNode.setTheme(LIGHT_THEME);
        $getRoot().clear().append(codeNode);
      },
      dependencies: [
        RichTextExtension,
        configExtension(CodeShikiExtension, {
          themes: {default: DARK_THEME},
        }),
      ],
      name: 'shiki-unknown-key-fallback',
    });

    editor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isCodeNode(node));
      // Falls back to LIGHT_THEME inline despite default registry being DARK.
      expect(node.getStyle()).toMatch(/^background-color:\s*#[0-9a-fA-F]+/);
    });
  });
});
