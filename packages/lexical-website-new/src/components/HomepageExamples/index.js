/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import Link from '@docusaurus/Link';
import React, {useState} from 'react';

import styles from './styles.module.css';

function Pills({pills, activeIndex, onClick}) {
  return (
    <div role="tablist" className="pills">
      {pills.map((pill, index) => {
        const classNames = ['pills__item'];
        const isSelected = activeIndex === index;
        if (isSelected) {
          classNames.push('pills__item--active');
          classNames.push(styles.tabSelected);
        }
        return (
          <a
            key={pill.id}
            className={`${classNames.join(' ')} ${styles.tabAnchor}`}
            aria-selected={isSelected}
            tabIndex="0"
            role="tab"
            id={`${pill.id}-tab`}
            onClick={() => {
              onClick(index);
            }}
          >
            {pill.label}
          </a>
        );
      })}
    </div>
  );
}

export default function HomepageExamples() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pills = [
    {
      content: `Feature 1 content Feature 1 content Feature 1 content Feature 1 content Feature 1 content Feature 1 content
      Feature 1 content Feature 1 content Feature 1 content Feature 1 content Feature 1 content Feature 1 contentFeature 1 content Feature 1 content Feature 1 content Feature 1 content Feature 1 content Feature 1 content
      Feature 1 content Feature 1 content Feature 1 content Feature 1 content Feature 1 content Feature 1 contentFeature 1 content Feature 1 content Feature 1 content Feature 1 content Feature 1 content Feature 1 content`,
      id: 'example-feature-1',
      label: 'Easy Setup',
      src: 'https://codesandbox.io/embed/lexical-plain-text-example-g932e?fontsize=12&hidenavigation=1&module=%2Fsrc%2FEditor.js&theme=dark&view=editor',
    },
    {
      content: `Feature 2 content Feature 2 content Feature 2 content Feature 2 content Feature 2 content Feature 2 content
      Feature 2 content Feature 2 content Feature 2 content Feature 2 content Feature 2 content Feature 2 contentFeature 2 content Feature 2 content Feature 2 content Feature 2 content Feature 2 content Feature 2 content
      Feature 2 content Feature 2 content Feature 2 content Feature 2 content Feature 2 content Feature 2 contentFeature 2 content Feature 2 content Feature 2 content Feature 2 content Feature 2 content Feature 2 content`,
      id: 'example-feature-2',
      label: 'Powerful Transforms',
      src: 'https://codesandbox.io/embed/lexical-plain-text-example-forked-qdxhy?fontsize=12&hidenavigation=1&module=%2Fsrc%2FEmoticonPlugin.js&theme=dark&view=editor',
    },
    {
      content: `Feature 3 content Feature 3 content Feature 3 content Feature 3 content Feature 3 content Feature 3 content
      Feature 3 content Feature 3 content Feature 3 content Feature 3 content Feature 3 content Feature 3 contentFeature 3 content Feature 3 content Feature 3 content Feature 3 content Feature 3 content Feature 3 content
      Feature 3 content Feature 3 content Feature 3 content Feature 3 content Feature 3 content Feature 3 contentFeature 3 content Feature 3 content Feature 3 content Feature 3 content Feature 3 content Feature 3 content`,
      id: 'example-feature-3',
      label: 'Works Anywhere',
      src: 'https://codesandbox.io/embed/lexical-plain-text-example-g932e?fontsize=12&hidenavigation=1&module=%2Fsrc%2FEditor.js&theme=dark&view=editor',
    },
  ];
  const activePill = pills[activeIndex];
  return (
    <div className="container">
      <div className="row">
        <Pills
          pills={pills}
          activeIndex={activeIndex}
          onClick={setActiveIndex}
        />
      </div>
      <div
        className={`row margin-vert--lg ${styles.tabContent}`}
        id={activePill.id}
        role="tabpanel"
        aria-labelledby={`example-tab-${activeIndex}`}
      >
        <div className="col col--4">
          {activePill.content}
          <Link
            className="button button--primary margin-top--md"
            to="/docs/intro"
          >
            Get Started
          </Link>
        </div>
        <div className="col col--8">
          <iframe
            className={styles.codesandbox}
            src={activePill.src}
            title="lexical-plain-text-example"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}
