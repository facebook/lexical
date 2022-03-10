/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorThemeClasses} from 'lexical';
import './PlaygroundEditorTheme.css';

const theme: EditorThemeClasses = {
  ltr: 'PlaygroundEditorTheme__ltr',
  rtl: 'PlaygroundEditorTheme__rtl',
  paragraph: 'PlaygroundEditorTheme__paragraph',
  quote: 'PlaygroundEditorTheme__quote',
  heading: {
    h1: 'PlaygroundEditorTheme__h1',
    h2: 'PlaygroundEditorTheme__h2',
  },
  list: {
    ul: 'PlaygroundEditorTheme__ul',
    olDepth: [
      'PlaygroundEditorTheme__ol1',
      'PlaygroundEditorTheme__ol2',
      'PlaygroundEditorTheme__ol3',
      'PlaygroundEditorTheme__ol4',
      'PlaygroundEditorTheme__ol5',
    ],
    listitem: 'PlaygroundEditorTheme__listItem',
    nested: {
      listitem: 'PlaygroundEditorTheme__nestedListItem',
    },
  },
  image: 'editor-image',
  text: {
    bold: 'PlaygroundEditorTheme__textBold',
    italic: 'PlaygroundEditorTheme__textItalic',
    underline: 'PlaygroundEditorTheme__textUnderline',
    strikethrough: 'PlaygroundEditorTheme__textStrikethrough',
    underlineStrikethrough: 'PlaygroundEditorTheme__textUnderlineStrikethrough',
    code: 'PlaygroundEditorTheme__textCode',
  },
  hashtag: 'PlaygroundEditorTheme__hashtag',
  code: 'PlaygroundEditorTheme__code',
  codeHighlight: {
    comment: 'PlaygroundEditorTheme__tokenComment',
    prolog: 'PlaygroundEditorTheme__tokenComment',
    doctype: 'PlaygroundEditorTheme__tokenComment',
    cdata: 'PlaygroundEditorTheme__tokenComment',
    punctuation: 'PlaygroundEditorTheme__tokenPunctuation',
    namespace: 'PlaygroundEditorTheme__tokenVariable',
    property: 'PlaygroundEditorTheme__tokenProperty',
    tag: 'PlaygroundEditorTheme__tokenProperty',
    boolean: 'PlaygroundEditorTheme__tokenProperty',
    number: 'PlaygroundEditorTheme__tokenProperty',
    constant: 'PlaygroundEditorTheme__tokenProperty',
    symbol: 'PlaygroundEditorTheme__tokenProperty',
    deleted: 'PlaygroundEditorTheme__tokenProperty',
    selector: 'PlaygroundEditorTheme__tokenSelector',
    string: 'PlaygroundEditorTheme__tokenSelector',
    char: 'PlaygroundEditorTheme__tokenSelector',
    builtin: 'PlaygroundEditorTheme__tokenSelector',
    inserted: 'PlaygroundEditorTheme__tokenSelector',
    operator: 'PlaygroundEditorTheme__tokenOperator',
    entity: 'PlaygroundEditorTheme__tokenOperator',
    url: 'PlaygroundEditorTheme__tokenOperator',
    attr: 'PlaygroundEditorTheme__tokenAttr',
    atrule: 'PlaygroundEditorTheme__tokenAttr',
    keyword: 'PlaygroundEditorTheme__tokenAttr',
    function: 'PlaygroundEditorTheme__tokenFunction',
    class: 'PlaygroundEditorTheme__tokenFunction',
    'class-name': 'PlaygroundEditorTheme__tokenFunction',
    regex: 'PlaygroundEditorTheme__tokenVariable',
    important: 'PlaygroundEditorTheme__tokenVariable',
    variable: 'PlaygroundEditorTheme__tokenVariable',
  },
  link: 'PlaygroundEditorTheme__link',
  characterLimit: 'PlaygroundEditorTheme__characterLimit',
  table: 'PlaygroundEditorTheme__table',
  tableCell: 'PlaygroundEditorTheme__tableCell',
  tableCellHeader: 'PlaygroundEditorTheme__tableCellHeader',
};

export default theme;
