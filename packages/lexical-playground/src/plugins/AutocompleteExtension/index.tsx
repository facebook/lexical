/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, namedSignals, watchedSignal} from '@lexical/extension';
import {$isAtNodeEnd} from '@lexical/selection';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  type BaseSelection,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  type EditorState,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  type NodeKey,
  safeCast,
  setDOMUnmanaged,
} from 'lexical';

import {addSwipeRightListener} from '../../utils/swipe';
import {detectLanguage as defaultDetectLanguage} from './detectLanguage';
import {ENGLISH_WORDS} from './dictionaries/english';
import {KOREAN_WORDS} from './dictionaries/korean';
import {type AutocompleteDictionary, WordlistDictionary} from './dictionary';

export {detectLanguage} from './detectLanguage';
export type {AutocompleteDictionary} from './dictionary';
export {WordlistDictionary} from './dictionary';

/**
 * Default dictionaries shipped with `AutocompleteExtension` — English
 * (top common words) and Korean (multi-syllable nouns sourced from
 * open-korean-text, Apache 2.0). Spread this and merge to extend
 * coverage:
 *
 * ```ts
 * configExtension(AutocompleteExtension, {
 *   dictionaries: {
 *     ...defaultDictionaries,
 *     ja: new WordlistDictionary(JAPANESE_WORDS),
 *   },
 * });
 * ```
 */
export const defaultDictionaries: Readonly<
  Record<string, AutocompleteDictionary>
> = {
  en: new WordlistDictionary(ENGLISH_WORDS, 4),
  ko: new WordlistDictionary(KOREAN_WORDS, 2),
};

/** Default debounce window (ms) for composition-idle suggestions. */
const DEFAULT_COMPOSITION_IDLE_DEBOUNCE_MS = 300;

declare global {
  interface Navigator {
    userAgentData?: {
      mobile: boolean;
    };
  }
}

type SearchPromise = {
  dismiss: () => void;
  promise: Promise<null | string>;
};

/**
 * Marker attribute on the per-suggestion ghost decoration element. The
 * element is appended directly into the TextNode's keyed DOM (the
 * `<span data-lexical-text="true">`) as a contentEditable=false sibling of
 * the actual text node, so it never enters the editor state — no history
 * pollution, no collab churn, no `exportDOM` carve-outs.
 *
 * `LexicalTextNode.setTextContent` routes through the node's
 * {@link DOMSlot}, modifying the text node child directly instead of
 * `dom.textContent = ...`, which preserves this sibling across updates.
 */
const AUTOCOMPLETE_GHOST_ATTR = 'data-autocomplete-ghost';

function $search(selection: null | BaseSelection): [boolean, string] {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return [false, ''];
  }
  const node = selection.getNodes()[0];
  const anchor = selection.anchor;
  // Check siblings?
  if (!$isTextNode(node) || !node.isSimpleText() || !$isAtNodeEnd(anchor)) {
    return [false, ''];
  }
  const word = [];
  const text = node.getTextContent();
  let i = node.getTextContentSize();
  let c;
  while (i-- && i >= 0 && (c = text[i]) !== ' ') {
    word.push(c);
  }
  if (word.length === 0) {
    return [false, ''];
  }
  return [true, word.reverse().join('')];
}

/**
 * Latency (ms) of the simulated autocomplete server. Modeled after a
 * remote completion service (think GMail Smart Compose) so the
 * extension exercises its async query / dismiss path even when the
 * dictionary lookup itself is synchronous.
 */
const QUERY_LATENCY_MS = 200;

function query(
  dictionary: AutocompleteDictionary | undefined,
  searchText: string,
): SearchPromise {
  let isDismissed = false;
  const dismiss = () => {
    isDismissed = true;
  };
  const promise: Promise<null | string> = new Promise((resolve, reject) => {
    setTimeout(() => {
      if (isDismissed) {
        return reject('Dismissed');
      }
      if (dictionary === undefined) {
        return resolve(null);
      }
      return resolve(dictionary.query(searchText));
    }, QUERY_LATENCY_MS);
  });
  return {dismiss, promise};
}

function formatSuggestionText(suggestion: string): string {
  // eslint-disable-next-line compat/compat
  const userAgentData = window.navigator.userAgentData;
  const isMobile =
    userAgentData !== undefined
      ? userAgentData.mobile
      : window.innerWidth <= 800 && window.innerHeight <= 600;

  return `${suggestion} ${isMobile ? '(SWIPE \u2B95)' : '(TAB)'}`;
}

/**
 * Render / update / remove the ghost decoration on a TextNode's keyed DOM.
 * Always reconciles to exactly zero or one ghost in the editor.
 */
function syncGhost(
  editor: LexicalEditor,
  textNodeKey: NodeKey | null,
  ghostText: string | null,
): void {
  // Always tear down every existing ghost first. This keeps the invariant
  // "at most one ghost in the editor at a time" trivially: even if a race
  // (e.g. async query resolving as the user starts typing again) attempts
  // to add a second one, the next call collapses back to one.
  const root = editor.getRootElement();
  if (root) {
    for (const el of root.querySelectorAll(`[${AUTOCOMPLETE_GHOST_ATTR}]`)) {
      el.remove();
    }
  }
  if (textNodeKey === null || ghostText === null) {
    return;
  }
  const dom = editor.getElementByKey(textNodeKey);
  if (!dom) {
    return;
  }
  const ghost = document.createElement('span');
  ghost.setAttribute(AUTOCOMPLETE_GHOST_ATTR, 'true');
  ghost.setAttribute('contenteditable', 'false');
  ghost.className = 'PlaygroundEditorTheme__autocomplete';
  ghost.textContent = ghostText;
  // Mark the ghost as outside Lexical's mutation tracking so the
  // reconciler doesn't reconcile it away when it sees an unknown DOM
  // child appear inside the TextNode's keyed span.
  setDOMUnmanaged(ghost);
  dom.appendChild(ghost);
}

export interface AutocompleteConfig {
  disabled: boolean;
  /**
   * Map of language tag to {@link AutocompleteDictionary}. The extension
   * picks the dictionary by passing the typed prefix through
   * `detectLanguage` and looking up the result. Default is
   * {@link defaultDictionaries} (English + Korean).
   */
  dictionaries: Readonly<Record<string, AutocompleteDictionary>>;
  /**
   * Override default language detection. Receives the typed prefix and
   * returns the language tag to look up in `dictionaries`. Default is
   * the export from `./detectLanguage` (last-codepoint script range).
   */
  detectLanguage: (text: string) => string;
  /**
   * Soft-commit window (ms) for IME composition. While a composition is
   * active, the extension schedules a debounced query that fires after
   * this many milliseconds without a new `compositionupdate` event.
   * The natural typing pause between words in Korean and Japanese —
   * where the IME never fires `compositionend` on its own — becomes
   * the trigger for the ghost.
   *
   * Default `300`. Set to `0` to disable the soft-commit path entirely
   * and only show ghosts on explicit composition end.
   */
  compositionIdleDebounceMs: number;
}

export const AutocompleteExtension = defineExtension({
  build: (editor, config) => namedSignals(config),
  config: safeCast<AutocompleteConfig>({
    compositionIdleDebounceMs: DEFAULT_COMPOSITION_IDLE_DEBOUNCE_MS,
    detectLanguage: defaultDetectLanguage,
    dictionaries: defaultDictionaries,
    disabled: false,
  }),
  name: '@lexical/playground/autocomplete',
  register: (editor: LexicalEditor, config, state) => {
    const editableSignal = watchedSignal(
      () => editor.isEditable(),
      signal =>
        editor.registerEditableListener(editable => {
          signal.value = editable;
        }),
    );
    const rootElemSignal = watchedSignal(
      () => editor.getRootElement(),
      signal =>
        editor.registerRootListener(rootElem => {
          signal.value = rootElem;
        }),
    );
    let activeTextNodeKey: NodeKey | null = null;
    let lastMatch: string | null = null;
    let lastSuggestion: string | null = null;
    let searchPromise: SearchPromise | null = null;

    function dismiss() {
      activeTextNodeKey = null;
      lastMatch = null;
      lastSuggestion = null;
      if (searchPromise !== null) {
        searchPromise.dismiss();
        searchPromise = null;
      }
      syncGhost(editor, null, null);
    }

    function applyAsyncSuggestion(
      refPromise: SearchPromise,
      newSuggestion: string | null,
    ) {
      if (searchPromise !== refPromise || newSuggestion === null) {
        return;
      }
      editor.getEditorState().read(
        () => {
          const selection = $getSelection();
          const [hasMatch, match] = $search(selection);
          if (
            !hasMatch ||
            match !== lastMatch ||
            !$isRangeSelection(selection)
          ) {
            return;
          }
          const node = selection.getNodes()[0];
          if (!$isTextNode(node)) {
            return;
          }
          activeTextNodeKey = node.getKey();
          lastSuggestion = newSuggestion;
          syncGhost(
            editor,
            activeTextNodeKey,
            formatSuggestionText(newSuggestion),
          );
        },
        {editor},
      );
    }

    function handleUpdate({editorState}: {editorState: EditorState}) {
      editorState.read(
        () => {
          const selection = $getSelection();
          const [hasMatch, match] = $search(selection);
          if (!hasMatch) {
            dismiss();
            return;
          }
          if (match === lastMatch) {
            // Same prefix, but the active TextNode key may have changed if
            // the user moved the cursor between nodes with the same prefix.
            if ($isRangeSelection(selection)) {
              const node = selection.getNodes()[0];
              if ($isTextNode(node)) {
                const key = node.getKey();
                if (key !== activeTextNodeKey) {
                  activeTextNodeKey = key;
                  syncGhost(
                    editor,
                    activeTextNodeKey,
                    lastSuggestion
                      ? formatSuggestionText(lastSuggestion)
                      : null,
                  );
                }
              }
            }
            return;
          }
          // New prefix — clear any stale ghost while waiting for the async
          // suggestion, then kick off a fresh query.
          if (searchPromise !== null) {
            searchPromise.dismiss();
          }
          syncGhost(editor, null, null);
          lastMatch = match;
          lastSuggestion = null;
          activeTextNodeKey = null;
          const language = output.detectLanguage.value(match);
          searchPromise = query(output.dictionaries.value[language], match);
          searchPromise.promise
            .then(newSuggestion => {
              if (searchPromise !== null) {
                applyAsyncSuggestion(searchPromise, newSuggestion);
              }
            })
            .catch(e => {
              if (e !== 'Dismissed') {
                console.error(e);
              }
            });
        },
        {editor},
      );
    }

    function $commitSuggestion(): boolean {
      if (activeTextNodeKey === null || lastSuggestion === null) {
        return false;
      }
      const node = $getNodeByKey(activeTextNodeKey);
      if (!$isTextNode(node)) {
        // Active TextNode has been replaced (e.g. user toggled format,
        // splitting the run). Drop the stale ghost so the next keystroke
        // cycles a fresh suggestion instead of leaving a no-op Tab press.
        dismiss();
        return false;
      }
      // Append the raw suggestion text (without the "(TAB)" hint) at the
      // end of the active text node.
      node.spliceText(node.getTextContentSize(), 0, lastSuggestion, true);
      dismiss();
      return true;
    }

    function $handleCommitCommand(event: Event): boolean {
      // `triggerCommandListeners` already wraps each listener bucket in
      // `updateEditorSync`, so `$commitSuggestion` runs in an active editor
      // context here. Wrapping in `editor.update({discrete: true})` from
      // inside that existing update would defer the splice to a microtask,
      // leaving `didCommit` stuck at `false` long enough for the next
      // handler (e.g. tab indentation) to insert a tab before the suggestion
      // lands.
      const didCommit = $commitSuggestion();
      if (didCommit) {
        event.preventDefault();
      }
      return didCommit;
    }

    function handleSwipeRight(_force: number, event: TouchEvent) {
      // Touch handler isn't called from a command-listener pipeline, so it
      // needs its own update context. `discrete: true` keeps the splice
      // synchronous relative to the touch event so `preventDefault` is
      // accurate.
      let didCommit = false;
      editor.update(
        () => {
          didCommit = $commitSuggestion();
        },
        {discrete: true},
      );
      if (didCommit) {
        event.preventDefault();
      }
    }

    const output = state.getOutput();
    return effect(() => {
      const rootElem = rootElemSignal.value;
      const editable = editableSignal.value;
      if (output.disabled.value || !rootElem || !editable) {
        return;
      }
      return mergeRegister(
        editor.registerUpdateListener(handleUpdate),
        editor.registerCommand(
          KEY_TAB_COMMAND,
          $handleCommitCommand,
          COMMAND_PRIORITY_LOW,
        ),
        editor.registerCommand(
          KEY_ARROW_RIGHT_COMMAND,
          $handleCommitCommand,
          COMMAND_PRIORITY_LOW,
        ),
        addSwipeRightListener(rootElem, handleSwipeRight),
        // Tear down on dispose: clear any ghost still attached so a fresh
        // build doesn't see leftover decoration.
        dismiss,
      );
    });
  },
});
