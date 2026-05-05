/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect} from '@lexical/extension';
import {$convertFromMarkdownString} from '@lexical/markdown';
import {mergeRegister} from '@lexical/utils';
import {
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  defineExtension,
  HISTORY_MERGE_TAG,
  safeCast,
} from 'lexical';

import {MarkdownExtension} from './MarkdownExtension';

export interface MarkdownPersistenceConfig {
  /** localStorage key the markdown document is stored under. */
  storageKey: string;
  /** Markdown to seed the editor with when nothing is stored, and the
   * value the {@link RESET_MARKDOWN_COMMAND} restores. */
  defaultMarkdown: string;
}

/**
 * Resets the document back to the configured default markdown and
 * removes the persisted copy from localStorage.
 */
export const RESET_MARKDOWN_COMMAND = createCommand<void>(
  'RESET_MARKDOWN_COMMAND',
);

/**
 * Owns the localStorage <-> editor markdown sync:
 *
 * - On registration, seeds the editor from `localStorage[storageKey]`
 *   (falling back to `defaultMarkdown`).
 * - Persists the markdown output signal back to localStorage on every
 *   change.
 * - Registers {@link RESET_MARKDOWN_COMMAND} which clears the storage
 *   entry and re-imports the default markdown.
 */
export const MarkdownPersistenceExtension = defineExtension({
  config: safeCast<MarkdownPersistenceConfig>({
    defaultMarkdown: '',
    storageKey: '',
  }),
  dependencies: [MarkdownExtension],
  name: '@lexical/markdown-editor-example/MarkdownPersistence',
  register(editor, {storageKey, defaultMarkdown}, state) {
    const markdownDep = state.getDependency(MarkdownExtension);
    const {markdown} = markdownDep.output;
    const {transformers} = markdownDep.config;
    const hasStorage = typeof window !== 'undefined' && storageKey !== '';

    const stored = hasStorage ? window.localStorage.getItem(storageKey) : null;
    const initialMarkdown = stored ?? defaultMarkdown;
    editor.update(
      () => {
        $convertFromMarkdownString(initialMarkdown, transformers);
      },
      {tag: HISTORY_MERGE_TAG},
    );

    let initial = true;
    const disposeEffect = effect(() => {
      const value = markdown.value;
      if (initial) {
        initial = false;
        return;
      }
      if (hasStorage) {
        window.localStorage.setItem(storageKey, value);
      }
    });

    const disposeReset = editor.registerCommand(
      RESET_MARKDOWN_COMMAND,
      () => {
        if (hasStorage) {
          window.localStorage.removeItem(storageKey);
        }
        editor.update(() => {
          $convertFromMarkdownString(defaultMarkdown, transformers);
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );

    return mergeRegister(disposeEffect, disposeReset);
  },
});
