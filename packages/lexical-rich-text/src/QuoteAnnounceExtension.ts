/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AriaLiveRegionExtension} from '@lexical/a11y';
import {effect, namedSignals} from '@lexical/extension';
import {$findMatchingParent, mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  defineExtension,
  type EditorState,
  type NodeKey,
  safeCast,
} from 'lexical';

import {$isQuoteNode, QuoteNode} from './index';

export interface QuoteAnnounceExtensionConfig {
  /** Announced when a block becomes a quote. */
  created: string;
  /** Announced when a quote stops being a quote. */
  destroyed: string;
  /** Announced when a quote goes away and the caret lands in another one. */
  destroyedInside: string;
  /** Announced when the caret moves into a quote that already existed. */
  entered: string;
  /** Announced when the caret leaves a quote that is still there. */
  exited: string;
  /**
   * When `true`, quotes are not announced. Toggle at runtime via the output
   * signal. Default `false`.
   */
  disabled: boolean;
}

/**
 * Announces quotes through the {@link AriaLiveRegionExtension} sink: a block
 * becoming a quote, and a quote ceasing to be one.
 *
 * The markdown shortcut consumes both keystrokes (`>` then space) and swaps the
 * block type, which is silent to a screen reader — so without this the user has
 * no way to know the transformation happened.
 *
 * Crossing the edge of a quote is announced only when the block on the far side
 * appears or disappears in the same update — pressing Enter at the end of a
 * quote, or backspacing into one. A screen reader works out the boundary by
 * comparing where the caret was against where it is, so a block that is still
 * being made or unmade when it looks is a block it can miss, and the user
 * carries on typing believing they are still quoting. Moving across the edge
 * with the arrow keys is left alone: both blocks are already there and the
 * screen reader reports the boundary itself.
 *
 * Only one thing is announced per commit, so removing the lower of two quotes
 * reports the removal and where the caret ended up together. Announcing only
 * the removal leaves the user inside the quote above with no way to know it.
 */
export const QuoteAnnounceExtension = defineExtension({
  build: (_editor, config) => namedSignals(config),
  config: safeCast<QuoteAnnounceExtensionConfig>({
    created: 'Block quote',
    destroyed: 'Block quote removed',
    destroyedInside: 'Block quote removed, in block quote',
    disabled: false,
    entered: 'Block quote',
    exited: 'Exiting block quote',
  }),
  dependencies: [AriaLiveRegionExtension],
  name: '@lexical/rich-text/QuoteAnnounce',
  register(editor, _config, state) {
    const {created, destroyed, destroyedInside, disabled, entered, exited} =
      state.getOutput();
    const {announce} = state.getDependency(AriaLiveRegionExtension).output;

    const $caretAt = (
      editorState: EditorState,
    ): {block: NodeKey; quote: NodeKey | null} | null =>
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return null;
        }
        const node = selection.anchor.getNode();
        const block = node.getTopLevelElement() ?? node;
        const quote = $findMatchingParent(node, $isQuoteNode);
        return {
          block: block.getKey(),
          quote: quote === null ? null : quote.getKey(),
        };
      });

    const isMissingFrom = (editorState: EditorState, key: NodeKey): boolean =>
      editorState.read(() => $getNodeByKey(key) === null);

    // Recorded by the mutation listener, read by the update listener that runs
    // after it.
    let quotesChanged: 'created' | 'destroyed' | null = null;

    // Gate on `disabled` from an effect so a disabled announcer registers no
    // listener at all. Peek the message signals at announce time so editing
    // them does not re-register.
    return effect(() =>
      disabled.value
        ? undefined
        : mergeRegister(
            editor.registerMutationListener(
              QuoteNode,
              nodes => {
                // Converting one block type to another destroys and creates in
                // the same update. Prefer the creation, so a paragraph becoming
                // a quote is not reported as a quote being removed.
                for (const [, mutation] of nodes) {
                  if (mutation === 'created') {
                    quotesChanged = 'created';
                    return;
                  } else if (mutation === 'destroyed') {
                    quotesChanged = 'destroyed';
                  }
                }
              },
              {skipInitialization: true},
            ),
            editor.registerUpdateListener(
              ({dirtyElements, dirtyLeaves, editorState, prevEditorState}) => {
                const changed = quotesChanged;
                quotesChanged = null;
                // Nothing was made or unmade, so nothing can have appeared or
                // disappeared beside the caret.
                if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
                  return;
                }
                if (changed === 'created') {
                  announce(created.peek());
                  return;
                }

                const before = $caretAt(prevEditorState);
                const after = $caretAt(editorState);

                if (changed === 'destroyed') {
                  // Removing the lower of two quotes leaves the caret inside
                  // the one above, which is worth saying as well.
                  announce(
                    after !== null && after.quote !== null
                      ? destroyedInside.peek()
                      : destroyed.peek(),
                  );
                  return;
                }

                if (
                  before === null ||
                  after === null ||
                  before.quote === after.quote
                ) {
                  return;
                }

                if (
                  after.quote !== null &&
                  !isMissingFrom(prevEditorState, after.quote) &&
                  isMissingFrom(editorState, before.block)
                ) {
                  announce(entered.peek());
                } else if (
                  after.quote === null &&
                  before.quote !== null &&
                  !isMissingFrom(editorState, before.quote) &&
                  isMissingFrom(prevEditorState, after.block)
                ) {
                  announce(exited.peek());
                }
              },
            ),
          ),
    );
  },
});
