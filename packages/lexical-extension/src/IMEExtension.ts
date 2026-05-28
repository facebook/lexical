/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  COMPOSITION_START_COMMAND,
  COMPOSITION_START_TAG,
  defineExtension,
  type LexicalEditor,
  type NodeKey,
  type TextNode,
} from 'lexical';

import {effect, type Signal, signal} from './signals';

/**
 * Centralizes IME composition state so extensions that react to
 * composition lifecycle don't each re-implement the
 * COMPOSITION_START_COMMAND + compositionend listener dance.
 *
 * Exposes two signals (both always-active for the editor's lifetime —
 * listeners are wired up by `register`, not lazily on subscription, so
 * consumers can read `.value` from anywhere without holding a
 * subscription themselves):
 *
 * - `compositionKey` is the raw mirror — the value Lexical's own
 *   `$handleCompositionStart` writes to its internal `_compositionKey`,
 *   i.e. the `selection.anchor.key` at the moment composition starts.
 *   This can be a non-TextNode key when composition begins on an
 *   element-anchor selection (e.g. empty paragraph). Cleared on
 *   `compositionend`.
 *
 * - `composingTextNode` is the resolved view — the actual TextNode
 *   being composed on, or `null` while there is no TextNode-level
 *   composition. For an element-anchor start it stays `null` until
 *   the `COMPOSITION_START_TAG`-tagged update fires with the
 *   post-ZWSP-heuristic selection, at which point it updates to the
 *   new TextNode.
 *
 */
export const IMEExtension = defineExtension({
  build(_editor: LexicalEditor): {
    compositionKey: Signal<null | NodeKey>;
    composingTextNode: Signal<null | TextNode>;
  } {
    return {
      composingTextNode: signal<null | TextNode>(null),
      compositionKey: signal<null | NodeKey>(null),
    };
  },
  name: '@lexical/extension/IME',
  register(editor, _config, state) {
    const {compositionKey, composingTextNode} = state.getOutput();

    const removeStartCommand = editor.registerCommand(
      COMPOSITION_START_COMMAND,
      () => {
        // The LOW-priority listener bucket here runs in its own
        // `updateEditorSync` invocation, sequenced immediately
        // before Lexical's own EDITOR-priority handler that calls
        // `$setCompositionKey(anchor.key)` (in a separate
        // `updateEditorSync`). Both ultimately write the same
        // `selection.anchor.key`.
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          compositionKey.value = selection.anchor.key;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    // Stage 1: react to compositionKey transitions. Resolve the key
    // to a TextNode when possible. Element-anchor starts resolve to
    // null here and stay null until stage 2.
    const stopKeyEffect = effect(() => {
      const key = compositionKey.value;
      if (key === null) {
        composingTextNode.value = null;
        return;
      }
      let resolved: null | TextNode = null;
      editor.getEditorState().read(() => {
        const node = $getNodeByKey(key);
        if ($isTextNode(node)) {
          resolved = node;
        }
      });
      composingTextNode.value = resolved;
    });

    // Stage 2: after Lexical's ZWSP heuristic inserts the actual
    // composing TextNode for an element-anchor start, the
    // corresponding update fires with COMPOSITION_START_TAG. The
    // selection now points at the new TextNode — re-read it and
    // upgrade the signal to the resolved node.
    const removeUpdateListener = editor.registerUpdateListener(
      ({tags, editorState}) => {
        if (!tags.has(COMPOSITION_START_TAG)) {
          return;
        }
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }
          const node = selection.anchor.getNode();
          if ($isTextNode(node)) {
            composingTextNode.value = node;
          }
        });
      },
    );

    let removeRootScopedListener: undefined | (() => void);
    const attach = (rootElem: HTMLElement | null) => {
      if (removeRootScopedListener) {
        removeRootScopedListener();
        removeRootScopedListener = undefined;
      }
      if (rootElem === null) {
        compositionKey.value = null;
        return;
      }
      const onCompositionEnd = () => {
        compositionKey.value = null;
      };
      rootElem.addEventListener('compositionend', onCompositionEnd);
      removeRootScopedListener = () => {
        rootElem.removeEventListener('compositionend', onCompositionEnd);
      };
    };
    attach(editor.getRootElement());
    const removeRootListener = editor.registerRootListener(attach);

    return mergeRegister(
      removeStartCommand,
      stopKeyEffect,
      removeUpdateListener,
      removeRootListener,
      () => {
        if (removeRootScopedListener) {
          removeRootScopedListener();
        }
      },
    );
  },
});
