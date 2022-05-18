/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorThemeClasses} from 'lexical';

import './PlaygroundEditorTheme.css';

const theme: EditorThemeClasses = {
  characterLimit: 'PlaygroundEditorTheme__characterLimit',
  code: 'PlaygroundEditorTheme__code',
  codeHighlight: {
    atrule: 'PlaygroundEditorTheme__token_atrule',
    'attr-name': 'PlaygroundEditorTheme__token_attr-name',
    'attr-value': 'PlaygroundEditorTheme__token_attr-value',
    bold: 'PlaygroundEditorTheme__token_bold',
    boolean: 'PlaygroundEditorTheme__token_boolean',
    builtin: 'PlaygroundEditorTheme__token_builtin',
    cdata: 'PlaygroundEditorTheme__token_cdata',
    char: 'PlaygroundEditorTheme__token_char',
    'class-name': 'PlaygroundEditorTheme__token_class-name',
    comment: 'PlaygroundEditorTheme__token_comment',
    constant: 'PlaygroundEditorTheme__token_constant',
    delete: 'PlaygroundEditorTheme__token_deleted',
    doctype: 'PlaygroundEditorTheme__token_doctype',
    entity: 'PlaygroundEditorTheme__token_entity',
    function: 'PlaygroundEditorTheme__token_function',
    important: 'PlaygroundEditorTheme__token_important',
    inserted: 'PlaygroundEditorTheme__token_inserted',
    italic: 'PlaygroundEditorTheme__token_italic',
    keyword: 'PlaygroundEditorTheme__token_keyword',
    namespace: 'PlaygroundEditorTheme__token_namespace',
    number: 'PlaygroundEditorTheme__token_number',
    operator: 'PlaygroundEditorTheme__token_operator',
    prolog: 'PlaygroundEditorTheme__token_prolog',
    property: 'PlaygroundEditorTheme__token_property',
    punctuation: 'PlaygroundEditorTheme__token_punctuation',
    regex: 'PlaygroundEditorTheme__token_regex',
    selector: 'PlaygroundEditorTheme__token_selector',
    string: 'PlaygroundEditorTheme__token_string',
    symbol: 'PlaygroundEditorTheme__token_symbol',
    tag: 'PlaygroundEditorTheme__token_tag',
    url: 'PlaygroundEditorTheme__token_url',
    variable: 'PlaygroundEditorTheme__token_variable',
  },
  hashtag: 'PlaygroundEditorTheme__hashtag',
  heading: {
    h1: 'PlaygroundEditorTheme__h1',
    h2: 'PlaygroundEditorTheme__h2',
    h3: 'PlaygroundEditorTheme__h3',
    h4: 'PlaygroundEditorTheme__h4',
    h5: 'PlaygroundEditorTheme__h5',
  },
  image: 'editor-image',
  link: 'PlaygroundEditorTheme__link',
  list: {
    listitem: 'PlaygroundEditorTheme__listItem',
    listitemChecked: 'PlaygroundEditorTheme__listItemChecked',
    listitemUnchecked: 'PlaygroundEditorTheme__listItemUnchecked',
    nested: {
      listitem: 'PlaygroundEditorTheme__nestedListItem',
    },
    olDepth: [
      'PlaygroundEditorTheme__ol1',
      'PlaygroundEditorTheme__ol2',
      'PlaygroundEditorTheme__ol3',
      'PlaygroundEditorTheme__ol4',
      'PlaygroundEditorTheme__ol5',
    ],
    ul: 'PlaygroundEditorTheme__ul',
  },
  ltr: 'PlaygroundEditorTheme__ltr',
  mark: 'PlaygroundEditorTheme__mark',
  markOverlap: 'PlaygroundEditorTheme__markOverlap',
  paragraph: 'PlaygroundEditorTheme__paragraph',
  quote: 'PlaygroundEditorTheme__quote',
  rtl: 'PlaygroundEditorTheme__rtl',
  table: 'PlaygroundEditorTheme__table',
  tableCell: 'PlaygroundEditorTheme__tableCell',
  tableCellHeader: 'PlaygroundEditorTheme__tableCellHeader',
  text: {
    bold: 'PlaygroundEditorTheme__textBold',
    code: 'PlaygroundEditorTheme__textCode',
    italic: 'PlaygroundEditorTheme__textItalic',
    strikethrough: 'PlaygroundEditorTheme__textStrikethrough',
    subscript: 'PlaygroundEditorTheme__textSubscript',
    superscript: 'PlaygroundEditorTheme__textSuperscript',
    underline: 'PlaygroundEditorTheme__textUnderline',
    underlineStrikethrough: 'PlaygroundEditorTheme__textUnderlineStrikethrough',
  },
};

export default theme;
