/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as React from 'react';

export default () => (
  <style>
    {`
  code[data-highlight-language],
  pre[data-highlight-language] {
    color: #839496;
    text-shadow: 0 1px rgba(0, 0, 0, 0.3);
    font-family: Inconsolata, Monaco, Consolas, 'Courier New', Courier, monospace;
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

  /* Code blocks */
  pre[data-highlight-language] {
    padding: 1em;
    margin: 0.5em 0;
    overflow: auto;
    border-radius: 0.3em;
  }

  :not(pre) > code[data-highlight-language],
  pre[data-highlight-language] {
    background: #002b36;
  }

  /* Inline code */
  :not(pre) > code[data-highlight-language] {
    padding: 0.1em;
    border-radius: 0.3em;
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_prolog,
  .PlaygroundEditorTheme__token_doctype,
  .PlaygroundEditorTheme__token_cdata {
    color: #586e75;
  }

  .PlaygroundEditorTheme__token_punctuation {
    color: #93a1a1;
  }

  .namespace {
    opacity: 0.7;
  }

  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_keyword,
  .PlaygroundEditorTheme__token_tag {
    color: #268bd2;
  }

  .PlaygroundEditorTheme__token_class-name {
    color: #ffffb6;
    text-decoration: underline;
  }

  .PlaygroundEditorTheme__token_boolean,
  .PlaygroundEditorTheme__token_constant {
    color: #b58900;
  }

  .PlaygroundEditorTheme__token_symbol,
  .PlaygroundEditorTheme__token_deleted {
    color: #dc322f;
  }

  .PlaygroundEditorTheme__token_number {
    color: #859900;
  }

  .PlaygroundEditorTheme__token_selector,
  .PlaygroundEditorTheme__token_attr-name,
  .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_char,
  .PlaygroundEditorTheme__token_builtin,
  .PlaygroundEditorTheme__token_inserted {
    color: #859900;
  }

  .PlaygroundEditorTheme__token_variable {
    color: #268bd2;
  }

  .PlaygroundEditorTheme__token_operator {
    color: #ededed;
  }

  .PlaygroundEditorTheme__token_function {
    color: #268bd2;
  }

  .PlaygroundEditorTheme__token_regex {
    color: #e9c062;
  }

  .PlaygroundEditorTheme__token_important {
    color: #fd971f;
  }

  .PlaygroundEditorTheme__token_entity {
    color: #ffffb6;
    cursor: help;
  }

  .PlaygroundEditorTheme__token_url {
    color: #96cbfe;
  }

  [data-highlight-language='css'] .PlaygroundEditorTheme__token_string,
  .style .PlaygroundEditorTheme__token_string {
    color: #87c38a;
  }

  .PlaygroundEditorTheme__token_important,
  .PlaygroundEditorTheme__token_bold {
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_italic {
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_atrule,
  .PlaygroundEditorTheme__token_attr-value {
    color: #f9ee98;
  }
}
`}
  </style>
);
