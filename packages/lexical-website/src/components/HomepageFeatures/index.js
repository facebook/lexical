/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Translate from '@docusaurus/Translate';
import clsx from 'clsx';
import React from 'react';

import styles from './styles.module.css';

const FeatureList = [
  {
    Svg: require('@site/static/img/feature-reliable.svg').default,
    description: (
      <Translate
        id="page.home.features.reliable"
        description="short description of why Lexical is reliable">
        Lexical is comprised of editor instances that each attach to a single
        content editable element. A set of editor states represent the current
        and pending states of the editor at any given time.
      </Translate>
    ),
    title: 'Reliable',
  },
  {
    Svg: require('@site/static/img/feature-accessible.svg').default,
    description: (
      <Translate
        id="page.home.features.accessible"
        description="short description of why Lexical is accessible">
        Lexical is designed for everyone. It follows best practices established
        in WCAG and is compatible with screen readers and other assistive
        technologies.
      </Translate>
    ),
    title: 'Accessible',
  },
  {
    Svg: require('@site/static/img/feature-fast.svg').default,
    description: (
      <Translate
        id="page.home.features.fast"
        description="short description of why Lexical is fast">
        Lexical is minimal. It doesn't directly concern itself with UI
        components, toolbars or rich-text features and markdown. The logic for
        these features can be included via a plugin interface.
      </Translate>
    ),
    title: 'Fast',
  },
];

function Feature({Svg, title, description}) {
  return (
    <div>
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <div className={clsx('col col--4')} key={idx}>
              <Feature {...props} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
