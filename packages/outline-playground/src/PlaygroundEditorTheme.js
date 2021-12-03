/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorThemeClasses} from 'outline';

const theme: EditorThemeClasses = {
  paragraph: 'editor-paragraph',
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'editor-heading-h4',
    h5: 'editor-heading-h5',
  },
  list: {
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
  },
  nestedList: {
    list: 'editor-nested-list-list',
    listitem: 'editor-nested-list-listitem',
  },
  listitem: 'editor-listitem',
  image: 'editor-image',
  text: {
    bold: 'editor-text-bold',
    link: 'editor-text-link',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
  },
  hashtag: 'editor-text-hashtag',
  code: 'editor-code',
  link: 'editor-text-link',
  characterLimit: 'editor-character-limit',

  table: 'editor-table',
  tableRow: 'editor-table-row',
  tableCell: 'editor-table-cell',
  tableCellHeader: 'editor-table-cell-header',
};

export default theme;
