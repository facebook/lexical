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
    color: #22da17;
    font-family: monospace;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    word-wrap: normal;
    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;
    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;
    line-height: 25px;
    font-size: 18px;
    margin: 5px 0;
  }

  pre[data-highlight-language] * {
    font-family: monospace;
  }

  :not(pre) > code[data-highlight-language],
  pre[data-highlight-language] {
    color: white;
    background: #0a143c;
    padding: 22px;
  }

  /* Code blocks */
  pre[data-highlight-language] {
    padding: 1em;
    margin: 0.5em 0;
    overflow: auto;
  }

  pre[data-highlight-language]::-moz-selection,
  pre[data-highlight-language] ::-moz-selection,
  code[data-highlight-language]::-moz-selection,
  code[data-highlight-language] ::-moz-selection {
    text-shadow: none;
    background: rgba(29, 59, 83, 0.99);
  }

  pre[data-highlight-language]::selection,
  pre[data-highlight-language] ::selection,
  code[data-highlight-language]::selection,
  code[data-highlight-language] ::selection {
    text-shadow: none;
    background: rgba(29, 59, 83, 0.99);
  }

  @media print {
    code[data-highlight-language],
    pre[data-highlight-language] {
      text-shadow: none;
    }
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_prolog,
  .PlaygroundEditorTheme__token_cdata {
    color: rgb(99, 119, 119);
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_punctuation {
    color: rgb(199, 146, 234);
  }

  .namespace {
    color: rgb(178, 204, 214);
  }

  .PlaygroundEditorTheme__token_deleted {
    color: rgba(239, 83, 80, 0.56);
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_symbol,
  .PlaygroundEditorTheme__token_property {
    color: rgb(128, 203, 196);
  }

  .PlaygroundEditorTheme__token_tag,
  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_keyword {
    color: rgb(127, 219, 202);
  }

  .PlaygroundEditorTheme__token_boolean {
    color: rgb(255, 88, 116);
  }

  .PlaygroundEditorTheme__token_number {
    color: rgb(247, 140, 108);
  }

  .PlaygroundEditorTheme__token_constant,
  .PlaygroundEditorTheme__token_function,
  .PlaygroundEditorTheme__token_builtin,
  .PlaygroundEditorTheme__token_char {
    color: rgb(34 183 199);
  }

  .PlaygroundEditorTheme__token_selector,
  .PlaygroundEditorTheme__token_doctype {
    color: rgb(199, 146, 234);
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_attr-name,
  .PlaygroundEditorTheme__token_inserted {
    color: rgb(173, 219, 103);
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_url,
  .PlaygroundEditorTheme__token_entity,
  [data-highlight-language='css'] .PlaygroundEditorTheme__token_string,
  .style .PlaygroundEditorTheme__token_string {
    color: rgb(173, 219, 103);
  }

  .PlaygroundEditorTheme__token_class-name,
  .PlaygroundEditorTheme__token_atrule,
  .PlaygroundEditorTheme__token_attr-value {
    color: rgb(255, 203, 139);
  }

  .PlaygroundEditorTheme__token_regex,
  .PlaygroundEditorTheme__token_important,
  .PlaygroundEditorTheme__token_variable {
    color: rgb(214, 222, 235);
  }

  .PlaygroundEditorTheme__token_important,
  .PlaygroundEditorTheme__token_bold {
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_italic {
    font-style: italic;
  }
}
`}
  </style>
);
