/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Link from '@docusaurus/Link';
import * as Tabs from '@radix-ui/react-tabs';
import React, {useState} from 'react';

const EXAMPLES = [
  {
    content: (
      <>
        It's super easy to get started with Lexical in any environment. Lexical
        is framework agnostic, but provides a set of bindings for React to help
        you get off the ground even quicker. After the initial setup,
        delightfully ergonomic APIs make building custom functionality
        straightforward and downright fun!
      </>
    ),
    id: 'example-feature-1',
    label: 'Simple Setup',
    src: 'https://stackblitz.com/github/facebook/lexical/tree/main/examples/vanilla-js?embed=1&file=src%2Fmain.ts&terminalHeight=0&ctl=1',
  },
  {
    content: (
      <>
        At its core, Lexical is a text-editing engine - a platform for building
        feature-rich editors for the web. At the same time, we believe users
        shouldn't have to rewrite the same rich text functionality over and over
        in every implementation. Lexical exposes a set of individual, modular
        packages that can be used to add common features like lists, links, and
        tables.
      </>
    ),
    id: 'example-feature-2',
    label: 'Powerful Features',
    src: 'https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-rich?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1',
  },
  {
    content: (
      <>
        Lexical emphasizes extensibility. Nodes can be extended to add or change
        behavior and simple, imperative APIs make it a breeze to build for
        custom use cases.
      </>
    ),
    id: 'example-feature-3',
    label: 'Built to Extend',
    src: 'https://stackblitz.com/github/facebook/lexical/tree/main/examples/vanilla-js-plugin?embed=1&file=src%2Femoji-plugin%2FEmojiPlugin.ts&terminalHeight=0&ctl=1',
  },
];

export default function HomepageExamples() {
  const [activeItemID, setActiveItemID] = useState(EXAMPLES[0].id);

  return (
    <Tabs.Root
      value={activeItemID}
      orientation="horizontal"
      onValueChange={setActiveItemID}>
      <Tabs.List asChild={true} className="flex gap-1 pl-0" loop={true}>
        <ul>
          {EXAMPLES.map(({id, label}) => (
            <Tabs.Trigger asChild={true} value={id} key={id}>
              <li
                className={`cursor-pointer list-none rounded-md px-4 py-1 font-bold transition-colors hover:bg-[#f2f2f2] ${
                  activeItemID === id && 'pills__item--active'
                }`}
                tabIndex={0}
                role="tab">
                {label}
              </li>
            </Tabs.Trigger>
          ))}
        </ul>
      </Tabs.List>

      {EXAMPLES.map(({id, content, src}) => (
        <Tabs.Content asChild={true} value={id} key={id}>
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-6">
              <div>{content}</div>

              <div>
                <Link
                  className="whitespace-nowrap rounded-md bg-blue-500 px-6 py-2 text-sm font-bold text-white transition-opacity hover:text-white hover:no-underline hover:opacity-90"
                  to="/docs/intro">
                  Get Started
                </Link>
              </div>
            </div>

            <div>
              <iframe
                className="h-[500px] w-full overflow-hidden"
                src={src}
                title="lexical-plain-text-example"
                sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
              />
            </div>
          </div>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
