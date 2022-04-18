/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Link from '@docusaurus/Link';
import * as Tabs from '@radix-ui/react-tabs';
import clsx from 'clsx';
import React, {useState} from 'react';

import styles from './styles.module.css';

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
    src: 'https://codesandbox.io/embed/lexical-plain-text-example-g932e?fontsize=12&hidenavigation=1&module=%2Fsrc%2FEditor.js&theme=dark',
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
    src: 'https://codesandbox.io/embed/lexical-rich-text-example-5tncvy?fontsize=12&hidenavigation=1&module=%2Fsrc%2FEditor.js&theme=dark',
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
    src: 'https://codesandbox.io/embed/lexical-plain-text-example-forked-qdxhy?fontsize=12&hidenavigation=1&module=%2Fsrc%2FEmoticonPlugin.js&theme=dark&view=editor',
  },
];

export default function HomepageExamples() {
  const [activeItemID, setActiveItemID] = useState(EXAMPLES[0].id);

  return (
    <Tabs.Root
      value={activeItemID}
      orientation="horizontal"
      onValueChange={setActiveItemID}>
      <div className="container">
        <Tabs.List asChild={true} className="pills" loop={true}>
          <ul>
            {EXAMPLES.map(({id, label}) => (
              <Tabs.Trigger asChild={true} value={id} key={id}>
                <li
                  className={clsx(
                    'pills__item',
                    activeItemID === id && 'pills__item--active',
                  )}
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
            <div className="row">
              <div className="col col--4">
                {content}
                <div>
                  <Link
                    className="button button--primary margin-top--md"
                    to="/docs/intro">
                    Get Started
                  </Link>
                </div>
              </div>
              <div className="col col--8">
                <iframe
                  className={styles.codesandbox}
                  src={src}
                  title="lexical-plain-text-example"
                  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                />
              </div>
            </div>
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}
