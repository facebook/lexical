/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export type Tag = {
  color: string;
  description: string;
  title: string;
};

export const TagList: {[type in string]: Tag} = {
  favorite: {
    color: '#e9669e',
    description:
      'Our favorite Docusaurus sites that you must absolutely check out!',
    title: 'Favorite',
  },
  opensource: {
    color: '#39ca30',
    description: 'Open-Source Lexical plugins for inspiration',
    title: 'Open-Source',
  },
};
