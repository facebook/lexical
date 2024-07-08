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

import SearchBar from './_components/SerarchBar';
import Card from './Card';
import {plugins} from './pluginList';
import styles from './styles.module.css';
import {useFilteredExamples} from './utils';

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

  const pluginsCombined = plugins(customFields).concat(
    internGalleryCards != null ? internGalleryCards.InternGalleryCards() : [],
  );

  const filteredPlugins = useFilteredExamples(pluginsCombined);

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
      <div style={{display: 'flex', marginLeft: 'auto'}} className="container">
        <SearchBar />
      </div>
      <CardList cards={filteredPlugins} />
    </section>
  );
}
