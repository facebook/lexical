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
    color: #f8f8f2;
    background: none;
    font-family: 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    word-wrap: normal;
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
    background: #2e3440;
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_prolog,
  .PlaygroundEditorTheme__token_doctype,
  .PlaygroundEditorTheme__token_cdata {
    color: #636f88;
  }

  .PlaygroundEditorTheme__token_punctuation {
    color: #81a1c1;
  }

  .namespace {
    opacity: 0.7;
  }

  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_tag,
  .PlaygroundEditorTheme__token_constant,
  .PlaygroundEditorTheme__token_symbol,
  .PlaygroundEditorTheme__token_deleted {
    color: #81a1c1;
  }

  .PlaygroundEditorTheme__token_number {
    color: #b48ead;
  }

  .PlaygroundEditorTheme__token_boolean {
    color: #81a1c1;
  }

  .PlaygroundEditorTheme__token_selector,
  .PlaygroundEditorTheme__token_attr-name,
  .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_char,
  .PlaygroundEditorTheme__token_builtin,
  .PlaygroundEditorTheme__token_inserted {
    color: #a3be8c;
  }

  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_entity,
  .PlaygroundEditorTheme__token_url,
  [data-highlight-language='css'] .PlaygroundEditorTheme__token_string,
  .style .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_variable {
    color: #81a1c1;
  }

  .PlaygroundEditorTheme__token_atrule,
  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_function,
  .PlaygroundEditorTheme__token_class-name {
    color: #88c0d0;
  }

  .PlaygroundEditorTheme__token_keyword {
    color: #81a1c1;
  }

  .PlaygroundEditorTheme__token_regex,
  .PlaygroundEditorTheme__token_important {
    color: #ebcb8b;
  }

  .PlaygroundEditorTheme__token_important,
  .PlaygroundEditorTheme__token_bold {
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_italic {
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_entity {
    cursor: help;
  }
}
`}
  </style>
);
