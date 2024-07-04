/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import clsx from 'clsx';

import Card from './Card';
import {plugins} from './pluginList';
import styles from './styles.module.css';

function CardList({cards}) {
  return (
    <div className="container">
      <ul className={clsx('clean-list', styles.cardList)}>
        {cards.map((item) => (
          <Card key={item.title} item={item} />
        ))}
      </ul>
    </div>
  );
}

export default function GalleryCards() {
  const {
    siteConfig: {customFields},
  } = useDocusaurusContext();

  return (
    <section className="margin-top--lg margin-bottom--xl">
      <CardList cards={plugins(customFields)} />
    </section>
  );
}
