/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useQueryString, useQueryStringList} from '@docusaurus/theme-common';
import {useMemo} from 'react';

import {Example} from './pluginList';

export function useSearchName() {
  return useQueryString('title');
}

export function useTags() {
  return useQueryStringList('tags');
}

function filterExamples({
  examples,
  searchName,
  tags,
}: {
  examples: Array<Example>;
  searchName: string;
  tags: Array<string>;
}) {
  if (searchName) {
    examples = examples.filter((example) =>
      example.title.toLowerCase().includes(searchName.toLowerCase()),
    );
  }
  if (tags.length !== 0) {
    examples = examples.filter((example) =>
      example.tags.some((tag) => tags.includes(tag)),
    );
  }
  return examples;
}

export function useFilteredExamples(examples: Array<Example>) {
  const [searchName] = useSearchName();
  const [tags] = useTags();
  return useMemo(
    () =>
      filterExamples({
        examples,
        searchName,
        tags,
      }),
    [examples, searchName, tags],
  );
}
