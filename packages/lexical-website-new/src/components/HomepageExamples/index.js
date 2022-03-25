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
        Feature 1. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
        do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
        ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
        aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit
        in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
        officia deserunt mollit anim id est laborum.
      </>
    ),
    id: 'example-feature-1',
    label: 'Easy Setup',
    src: 'https://codesandbox.io/embed/lexical-plain-text-example-g932e?fontsize=12&hidenavigation=1&module=%2Fsrc%2FEditor.js&theme=dark&view=editor',
  },
  {
    content: (
      <>
        Feature 2. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
        do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
        ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
        aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit
        in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
        officia deserunt mollit anim id est laborum.
      </>
    ),
    id: 'example-feature-2',
    label: 'Powerful Transforms',
    src: 'https://codesandbox.io/embed/lexical-plain-text-example-forked-qdxhy?fontsize=12&hidenavigation=1&module=%2Fsrc%2FEmoticonPlugin.js&theme=dark&view=editor',
  },
  {
    content: (
      <>
        Feature 3. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
        do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
        ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
        aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit
        in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
        officia deserunt mollit anim id est laborum.
      </>
    ),
    id: 'example-feature-3',
    label: 'Works Anywhere',
    src: 'https://codesandbox.io/embed/lexical-plain-text-example-g932e?fontsize=12&hidenavigation=1&module=%2Fsrc%2FEditor.js&theme=dark&view=editor',
  },
];

export default function HomepageExamples() {
  const [activeItemID, setActiveItemID] = useState(EXAMPLES[0].id);

  return (
    <Tabs.Root
      value={activeItemID}
      orientation="horizontal"
      onValueChange={setActiveItemID}
    >
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
                  role="tab"
                >
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
                    to="/docs/intro"
                  >
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
