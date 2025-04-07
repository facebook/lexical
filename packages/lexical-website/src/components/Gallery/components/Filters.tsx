/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CSSProperties, ReactNode} from 'react';

import Heading from '@theme/Heading';
import clsx from 'clsx';
import React from 'react';

import {Example} from '../pluginList';
import {Tag} from '../tagList';
import styles from './styles.module.css';
import TagSelect from './TagSelect';

function TagCircleIcon({color, style}: {color: string; style?: CSSProperties}) {
  return (
    <span
      style={{
        backgroundColor: color,
        borderRadius: '50%',
        height: 10,
        width: 10,
        ...style,
      }}
    />
  );
}

function TagListItem({tag, tagKey}: {tag: Tag; tagKey: string}) {
  const {title, description, color} = tag;
  return (
    <li className={styles.tagListItem}>
      <TagSelect
        tag={tagKey}
        label={title}
        description={description}
        icon={
          <TagCircleIcon
            color={color}
            style={{
              backgroundColor: color,
              marginLeft: 8,
            }}
          />
        }
      />
    </li>
  );
}

function TagList({allTags}: {allTags: {[type in string]: Tag}}) {
  return (
    <ul className={clsx('clean-list', styles.tagList)}>
      {Object.keys(allTags).map((tag) => {
        return <TagListItem key={tag} tag={allTags[tag]} tagKey={tag} />;
      })}
    </ul>
  );
}

function HeadingText({filteredPlugins}: {filteredPlugins: Array<Example>}) {
  return (
    <div className={styles.headingText}>
      <Heading as="h2">Filters</Heading>
      <span>
        {filteredPlugins.length === 1
          ? '1 example'
          : `${filteredPlugins.length} examples`}
      </span>
    </div>
  );
}

function HeadingRow({filteredPlugins}: {filteredPlugins: Array<Example>}) {
  return (
    <div className={clsx('margin-bottom--sm', styles.headingRow)}>
      <HeadingText filteredPlugins={filteredPlugins} />
    </div>
  );
}

export default function Filters({
  filteredPlugins,
  tagList,
}: {
  filteredPlugins: Array<Example>;
  tagList: {[type in string]: Tag};
}): ReactNode {
  return (
    <section className="margin-top--l margin-bottom--lg container">
      <HeadingRow filteredPlugins={filteredPlugins} />
      <TagList allTags={tagList} />
    </section>
  );
}
