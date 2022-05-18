/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as React from 'react';

export default () => (
  <style>{`
  pre[data-highlight-language],
  code[data-highlight-language] {
    color: #d4d4d4;
    font-size: 13px;
    text-shadow: none;
    font-family: Menlo, Monaco, Consolas, 'Andale Mono', 'Ubuntu Mono', 'Courier New', monospace;
    direction: ltr;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    line-height: 1.5;
    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;
    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;
  }

  pre[data-highlight-language]::selection,
  code[data-highlight-language]::selection,
  pre[data-highlight-language] *::selection,
  code[data-highlight-language] *::selection {
    text-shadow: none;
    background: #264f78;
  }

  @media print {
    pre[data-highlight-language],
    code[data-highlight-language] {
      text-shadow: none;
    }
  }

  pre[data-highlight-language] {
    padding: 1em;
    margin: 0.5em 0;
    overflow: auto;
    background: #1e1e1e;
  }

  :not(pre) > code[data-highlight-language] {
    padding: 0.1em 0.3em;
    border-radius: 0.3em;
    color: #db4c69;
    background: #1e1e1e;
  }
  /*********************************************************
* Tokens
*/
  .namespace {
    opacity: 0.7;
  }

  .PlaygroundEditorTheme__token_doctype .PlaygroundEditorTheme__token_doctype-tag {
    color: #569cd6;
  }

  .PlaygroundEditorTheme__token_doctype .PlaygroundEditorTheme__token_name {
    color: #9cdcfe;
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_prolog {
    color: #6a9955;
  }

  .PlaygroundEditorTheme__token_punctuation,
  [data-highlight-language='html'] [data-highlight-language='css'] .PlaygroundEditorTheme__token_punctuation,
  [data-highlight-language='html'] [data-highlight-language='javascript'] .PlaygroundEditorTheme__token_punctuation {
    color: #d4d4d4;
  }

  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_tag,
  .PlaygroundEditorTheme__token_boolean,
  .PlaygroundEditorTheme__token_number,
  .PlaygroundEditorTheme__token_constant,
  .PlaygroundEditorTheme__token_symbol,
  .PlaygroundEditorTheme__token_inserted,
  .PlaygroundEditorTheme__token_unit {
    color: #b5cea8;
  }

  .PlaygroundEditorTheme__token_selector,
  .PlaygroundEditorTheme__token_attr-name,
  .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_char,
  .PlaygroundEditorTheme__token_builtin,
  .PlaygroundEditorTheme__token_deleted {
    color: #ce9178;
  }

  [data-highlight-language='css'] .PlaygroundEditorTheme__token_string.url {
    text-decoration: underline;
  }

  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_entity {
    color: #d4d4d4;
  }

  .PlaygroundEditorTheme__token_operator.arrow {
    color: #569cd6;
  }

  .PlaygroundEditorTheme__token_atrule {
    color: #ce9178;
  }

  .PlaygroundEditorTheme__token_atrule .PlaygroundEditorTheme__token_rule {
    color: #c586c0;
  }

  .PlaygroundEditorTheme__token_atrule .PlaygroundEditorTheme__token_url {
    color: #9cdcfe;
  }

  .PlaygroundEditorTheme__token_atrule .PlaygroundEditorTheme__token_url .PlaygroundEditorTheme__token_function {
    color: #dcdcaa;
  }

  .PlaygroundEditorTheme__token_atrule .PlaygroundEditorTheme__token_url .PlaygroundEditorTheme__token_punctuation {
    color: #d4d4d4;
  }

  .PlaygroundEditorTheme__token_keyword {
    color: #569cd6;
  }

  .PlaygroundEditorTheme__token_keyword.module,
  .PlaygroundEditorTheme__token_keyword.control-flow {
    color: #c586c0;
  }

  .PlaygroundEditorTheme__token_function,
  .PlaygroundEditorTheme__token_function .PlaygroundEditorTheme__token_maybe-class-name {
    color: #dcdcaa;
  }

  .PlaygroundEditorTheme__token_regex {
    color: #d16969;
  }

  .PlaygroundEditorTheme__token_important {
    color: #569cd6;
  }

  .PlaygroundEditorTheme__token_italic {
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_constant {
    color: #9cdcfe;
  }

  .PlaygroundEditorTheme__token_class-name,
  .PlaygroundEditorTheme__token_maybe-class-name {
    color: #4ec9b0;
  }

  .PlaygroundEditorTheme__token_console {
    color: #9cdcfe;
  }

  .PlaygroundEditorTheme__token_parameter {
    color: #9cdcfe;
  }

  .PlaygroundEditorTheme__token_interpolation {
    color: #9cdcfe;
  }

  .PlaygroundEditorTheme__token_punctuation.interpolation-punctuation {
    color: #569cd6;
  }

  .PlaygroundEditorTheme__token_boolean {
    color: #569cd6;
  }

  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_variable,
  .PlaygroundEditorTheme__token_imports .PlaygroundEditorTheme__token_maybe-class-name,
  .PlaygroundEditorTheme__token_exports .PlaygroundEditorTheme__token_maybe-class-name {
    color: #9cdcfe;
  }

  .PlaygroundEditorTheme__token_selector {
    color: #d7ba7d;
  }

  .PlaygroundEditorTheme__token_escape {
    color: #d7ba7d;
  }

  .PlaygroundEditorTheme__token_tag {
    color: #569cd6;
  }

  .PlaygroundEditorTheme__token_tag .PlaygroundEditorTheme__token_punctuation {
    color: #808080;
  }

  .PlaygroundEditorTheme__token_cdata {
    color: #808080;
  }

  .PlaygroundEditorTheme__token_attr-name {
    color: #9cdcfe;
  }

  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_attr-value .PlaygroundEditorTheme__token_punctuation {
    color: #ce9178;
  }

  .PlaygroundEditorTheme__token_attr-value .PlaygroundEditorTheme__token_punctuation.attr-equals {
    color: #d4d4d4;
  }

  .PlaygroundEditorTheme__token_entity {
    color: #569cd6;
  }

  .PlaygroundEditorTheme__token_namespace {
    color: #4ec9b0;
  }
  /*********************************************************
* Language Specific
*/

  pre[class*='language-javascript'],
  code[class*='language-javascript'],
  pre[class*='language-jsx'],
  code[class*='language-jsx'],
  pre[class*='language-typescript'],
  code[class*='language-typescript'],
  pre[class*='language-tsx'],
  code[class*='language-tsx'] {
    color: #9cdcfe;
  }

  pre[class*='language-css'],
  code[class*='language-css'] {
    color: #ce9178;
  }

  pre[class*='language-html'],
  code[class*='language-html'] {
    color: #d4d4d4;
  }

  [data-highlight-language='regex'] .PlaygroundEditorTheme__token_anchor {
    color: #dcdcaa;
  }

  [data-highlight-language='html'] .PlaygroundEditorTheme__token_punctuation {
    color: #808080;
  }
  /*********************************************************
* Line highlighting
*/
  pre[data-highlight-language] > code[data-highlight-language] {
    position: relative;
    z-index: 1;
  }

  .line-highlight.line-highlight {
    background: #f7ebc6;
    box-shadow: inset 5px 0 0 #f7d87c;
    z-index: 0;
  }
}
`}
  </style>
);
