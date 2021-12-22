/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorThemeClasses} from 'lexical';

import stylex from 'stylex';

const styles = stylex.create({
  ltr: {
    textAlign: 'left',
  },
  rtl: {
    textAlign: 'right',
  },
  paragraph: {
    margin: 0,
    marginBottom: 8,
    position: 'relative',
  },
  quote: {
    margin: 0,
    marginLeft: 20,
    fontSize: 15,
    color: 'rgb(101, 103, 107)',
    borderLeftColor: 'rgb(206, 208, 212)',
    borderLeftWidth: 4,
    borderLeftStyle: 'solid',
    paddingLeft: 16,
  },
  h1: {
    fontSize: 24,
    color: 'rgb(5, 5, 5)',
    fontWeight: 400,
    margin: 0,
    marginBottom: 12,
    padding: 0,
  },
  h2: {
    fontSize: 15,
    color: 'rgb(101, 103, 107)',
    fontWeight: 700,
    margin: 0,
    marginTop: 10,
    padding: 0,
    textTransform: 'uppercase',
  },
  textBold: {
    fontWeight: 'bold',
  },
  textItalic: {
    fontStyle: 'italic',
  },
  textUnderline: {
    textDecoration: 'underline',
  },
  textStrikethrough: {
    textDecoration: 'line-through',
  },
  textUnderlineStrikethrough: {
    textDecoration: 'underline line-through',
  },
  textCode: {
    backgroundColor: 'rgb(240, 242, 245)',
    padding: '1px 0.25rem',
    fontFamily: 'Menlo, Consolas, Monaco, monospace',
    fontSize: '94%',
  },
  hashtag: {
    backgroundColor: 'rgba(88, 144, 255, .15)',
    borderBottom: '1px solid rgba(88, 144, 255, .3)',
  },
  link: {
    color: 'rgb(33, 111, 219)',
    textDecoration: 'none',
  },
  code: {
    backgroundColor: 'rgb(240, 242, 245)',
    fontFamily: 'Menlo, Consolas, Monaco, monospace',
    display: 'block',
    padding: 8,
    lineHeight: '1.53',
    fontSize: '13',
    margin: 0,
    marginTop: 8,
    marginBottom: 8,
    tabSsize: 2,
  },
  table: {
    borderCollapse: 'collapse',
    borderSpacing: 0,
    maxWidth: '100%',
    overflowY: 'scroll',
    tableLayout: 'fixed',
    width: '100%',
  },
  tableCell: {
    border: '1px solid black',
    height: 40,
    minWidth: 75,
    padding: 0,
    paddingStart: 10,
    paddingEnd: 10,
  },
  tableCellHeader: {
    backgroundColor: '#F2F3F5',
    textAlign: 'start',
  },
  characterLimit: {
    display: 'inline',
    backgroundColor: '#ffbbbb !important',
  },
  ol1: {
    padding: 0,
    margin: 0,
    marginLeft: 16,
  },
  ol2: {
    padding: 0,
    margin: 0,
    marginLeft: 16,
    listStyleType: 'upper-alpha',
  },
  ol3: {
    padding: 0,
    margin: 0,
    marginLeft: 16,
    listStyleType: 'lower-alpha',
  },
  ol4: {
    padding: 0,
    margin: 0,
    marginLeft: 16,
    listStyleType: 'upper-roman',
  },
  ol5: {
    padding: 0,
    margin: 0,
    marginLeft: 16,
    listStyleType: 'lower-roman',
  },
  ul: {
    padding: 0,
    margin: 0,
    marginLeft: 16,
  },
  listItem: {
    margin: '8px 32px 8px 32px',
  },
  nestedListItem: {
    listStyleType: 'none',
  },
});

const theme: EditorThemeClasses = {
  ltr: stylex(styles.ltr),
  rtl: stylex(styles.rtl),
  paragraph: stylex(styles.paragraph),
  quote: stylex(styles.quote),
  heading: {
    h1: stylex(styles.h1),
    h2: stylex(styles.h2),
  },
  list: {
    ul: stylex(styles.ul),
    ol1: stylex(styles.ol1),
    ol2: stylex(styles.ol2),
    ol3: stylex(styles.ol3),
    ol4: stylex(styles.ol4),
    ol5: stylex(styles.ol5),
    listitem: stylex(styles.listItem),
    nested: {
      listitem: stylex(styles.nestedListItem),
    },
  },
  image: 'editor-image', // TODO convert to stylex
  text: {
    bold: stylex(styles.textBold),
    italic: stylex(styles.textItalic),
    underline: stylex(styles.textUnderline),
    strikethrough: stylex(styles.textStrikethrough),
    underlineStrikethrough: stylex(styles.textUnderlineStrikethrough),
    code: stylex(styles.textCode),
  },
  hashtag: stylex(styles.hashtag),
  code: stylex(styles.code),
  link: stylex(styles.link),
  characterLimit: stylex(styles.characterLimit),
  table: stylex(styles.table),
  tableCell: stylex(styles.tableCell),
  tableCellHeader: stylex(styles.tableCellHeader),
};

export default theme;
