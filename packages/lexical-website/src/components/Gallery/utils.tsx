/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useQueryString} from '@docusaurus/theme-common';
import {useMemo} from 'react';

import {Example} from './pluginList';

export function useSearchName() {
  return useQueryString('title');
}

function filterExamples({
  examples,
  searchName,
}: {
  examples: Array<Example>;
  searchName: string;
}) {
  if (searchName) {
    return examples.filter((example) =>
      example.title.toLowerCase().includes(searchName.toLowerCase()),
    );
  }
  return examples;
}

export function useFilteredExamples(examples: Array<Example>) {
  const [searchName] = useSearchName();
  return useMemo(
    () =>
      filterExamples({
        examples,
        searchName,
      }),
    [searchName],
  );
}
