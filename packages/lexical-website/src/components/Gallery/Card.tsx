/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import React from 'react';

import {Example} from './pluginList';
import styles from './styles.module.css';

function getCardImage(item: Example) {
  return (
    item.preview ??
    `https://slorber-api-screenshot.netlify.app/${encodeURIComponent(
      item.uri ?? '',
    )}/showcase`
  );
}

function Card({item}: {item: Example}) {
  const image = getCardImage(item);
  return (
    <li key={item.title} className="card shadow--md">
      <a href={item.uri} target="_blank">
        <div className={clsx('card__image', styles.showcaseCardImage)}>
          {item.renderPreview == null && <img src={image} alt={item.title} />}
          {item.renderPreview != null && item.renderPreview()}
        </div>
      </a>
      <div className="card__body">
        <div className={clsx(styles.showcaseCardHeader)}>
          <Heading as="h4" className={styles.showcaseCardTitle}>
            <Link href={item.uri} className={styles.showcaseCardLink}>
              {item.title}
            </Link>
          </Heading>
        </div>
        <p className={styles.showcaseCardBody}>{item.description}</p>
      </div>
    </li>
  );
}

export default React.memo(Card);
