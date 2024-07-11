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
import React, {useEffect, useState} from 'react';

import Card from './Card';
import Filters from './components/Filters';
import SearchBar from './components/SearchBar';
import {Example, plugins} from './pluginList';
import styles from './styles.module.css';
import {Tag, TagList} from './tagList';
import {useFilteredExamples} from './utils';

function CardList({cards}: {cards: Array<Example>}) {
  return (
    <div className="container">
      <ul className={clsx('clean-list', styles.cardList)}>
        {cards.map((item: Example) => (
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

  const [internGalleryCards, setInternGalleryCards] = useState<{
    InternGalleryCards: () => Array<Example>;
  } | null>(null);
  const [internGalleryTags, setInternGalleryTags] = useState<{
    InternGalleryTags: () => {[type in string]: Tag};
  } | null>(null);

  const pluginsCombined = plugins(customFields ?? {}).concat(
    internGalleryCards != null ? internGalleryCards.InternGalleryCards() : [],
  );

  const tagList = {
    ...TagList,
    ...(internGalleryTags != null ? internGalleryTags.InternGalleryTags() : {}),
  };

  const filteredPlugins = useFilteredExamples(pluginsCombined);

  useEffect(() => {
    if (process.env.FB_INTERNAL) {
      // @ts-ignore runtime dependency for intern builds
      import('../../../../InternGalleryCards').then(setInternGalleryCards);
      // @ts-ignore runtime dependency for intern builds
      import('../../../../InternGalleryTags').then(setInternGalleryTags);
    }
  }, []);

  return (
    <section className="margin-top--lg margin-bottom--xl">
      <main className="margin-vert--lg">
        <Filters filteredPlugins={filteredPlugins} tagList={tagList} />
        <div
          style={{display: 'flex', marginLeft: 'auto'}}
          className="container">
          <SearchBar />
        </div>
        <CardList cards={filteredPlugins} />
      </main>
    </section>
  );
}
