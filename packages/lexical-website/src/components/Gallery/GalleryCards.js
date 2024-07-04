/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import BrowserOnly from '@docusaurus/BrowserOnly';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import clsx from 'clsx';
import {useEffect, useState} from 'react';

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
  return <BrowserOnly>{() => <GalleryCardsImpl />}</BrowserOnly>;
}

function GalleryCardsImpl() {
  const {
    siteConfig: {customFields},
  } = useDocusaurusContext();

  const [internGalleryCards, setInternGalleryCards] = useState(null);

  useEffect(() => {
    try {
      if (process.env.FB_INTERNAL) {
        import('../../../../InternGalleryCards').then(setInternGalleryCards);
      }
    } catch (e) {
      throw e;
    }
  }, []);

  return (
    <section className="margin-top--lg margin-bottom--xl">
      <CardList
        cards={plugins(customFields).concat(
          internGalleryCards != null
            ? internGalleryCards.InternGalleryCards()
            : [],
        )}
      />
    </section>
  );
}
