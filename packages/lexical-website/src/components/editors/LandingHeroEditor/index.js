/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {TabIndentationExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension} from 'lexical';

import {ToolbarPlugin} from './ToolbarPlugin';

const theme = {
  heading: {
    h1: 'mb-2 text-3xl font-bold',
    h2: 'mb-2 text-2xl font-bold',
    h3: 'mb-1 text-xl font-semibold',
  },
  paragraph: 'my-0',
  quote:
    'my-2 border-l-4 [border-left-style:solid] border-zinc-300 pl-4 italic text-zinc-500 dark:border-zinc-600 dark:text-zinc-400',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
};

const landingHeroExtension = defineExtension({
  dependencies: [RichTextExtension, HistoryExtension, TabIndentationExtension],
  name: '@lexical/website/landing-hero-editor',
  namespace: '@lexical/website/landing-hero-editor',
  theme,
});

export default function LandingHeroEditor() {
  return (
    <LexicalExtensionComposer extension={landingHeroExtension}>
      <div className="max-h-[400px] overflow-scroll rounded-2xl border border-solid border-black/10 dark:border-white/10 dark:bg-stone-800 md:w-[530px] lg:min-h-[300px] lg:min-w-[460px]">
        <ToolbarPlugin />
        <div className="relative">
          <ContentEditable
            className="min-h-[150px] text-wrap p-4 text-base leading-relaxed outline-none"
            aria-label="Rich text editor"
            aria-placeholder="Enter some text..."
            placeholder={
              <div className="pointer-events-none absolute left-4 top-4 select-none text-zinc-400">
                Enter some text...
              </div>
            }
          />
        </div>
      </div>
    </LexicalExtensionComposer>
  );
}
