/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  CodeShikiExtension,
  getCodeLanguageOptions,
  isCodeLanguageLoaded,
  loadCodeLanguage,
} from '@lexical/code-shiki';
import {
  $createLineBreakNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from 'lexical';

/**
 * Language we dynamically load to exercise the `@shikijs/langs/<lang>`
 * dynamic-import path through the Next.js bundler. The Playwright
 * assertion `Loaded: ${DEMO_LANGUAGE}` only passes if the import
 * resolves at runtime, which in turn requires `@shikijs/langs` to be
 * external in the published `@lexical/code-shiki` bundle.
 */
const DEMO_LANGUAGE = 'python';

function $seedDemo() {
  const registeredIds = getCodeLanguageOptions().map(([id]) => id);
  $getRoot()
    .clear()
    .selectEnd()
    .insertRawText(['Registered:', ...registeredIds].join('\n'));
}

/**
 * Demo wiring for the Next.js code-shiki example:
 *
 * - Seeds the editor (via `$initialEditorState`) with `Registered: ...`
 *   followed by every language id from `getCodeLanguageOptions()`, which
 *   pulls from shiki's `bundledLanguagesInfo`.
 * - Calls `loadCodeLanguage(DEMO_LANGUAGE)` to trigger the dynamic
 *   `@shikijs/langs/<lang>` import, then appends `Loaded: <lang>` once
 *   the promise resolves.
 *
 * Pulls `CodeShikiExtension` in as a dependency so the highlighter is
 * registered on the editor automatically.
 */
export const CodeShikiDemoExtension = defineExtension({
  $initialEditorState: $seedDemo,
  config: {ssr: typeof window === 'undefined'},
  dependencies: [CodeShikiExtension],
  name: '@lexical/nextjs-code-shiki-example/CodeShikiDemo',
  register(editor, config) {
    let cancelled = false;
    if (!config.ssr) {
      void Promise.resolve(loadCodeLanguage(DEMO_LANGUAGE))
        .then(() => {
          if (cancelled || !isCodeLanguageLoaded(DEMO_LANGUAGE)) {
            return;
          }
          editor.update(() => {
            $getRoot()
              .selectStart()
              .insertNodes([
                $createTextNode(`Loaded: ${DEMO_LANGUAGE}`).toggleFormat(
                  'bold',
                ),
                $createLineBreakNode(),
              ]);
          });
        })
        .catch(err => console.error(err));
    }
    return () => {
      cancelled = true;
    };
  },
});
