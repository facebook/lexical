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
    color: #f92aad;
    text-shadow: 0 0 2px #100c0f, 0 0 5px #dc078e33, 0 0 10px #fff3;
    background: none;
    font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    font-size: 1em;
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
  }

  :not(pre) > code[data-highlight-language],
  pre[data-highlight-language] {
    background-color: transparent !important;
    background-image: linear-gradient(to bottom, #2a2139 75%, #34294f);
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_block-comment,
  .PlaygroundEditorTheme__token_prolog,
  .PlaygroundEditorTheme__token_doctype,
  .PlaygroundEditorTheme__token_cdata {
    color: #8e8e8e;
  }

  .PlaygroundEditorTheme__token_punctuation {
    color: #ccc;
  }

  .PlaygroundEditorTheme__token_tag,
  .PlaygroundEditorTheme__token_attr-name,
  .PlaygroundEditorTheme__token_namespace,
  .PlaygroundEditorTheme__token_number,
  .PlaygroundEditorTheme__token_unit,
  .PlaygroundEditorTheme__token_hexcode,
  .PlaygroundEditorTheme__token_deleted {
    color: #e2777a;
  }

  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_selector {
    color: #72f1b8;
    text-shadow: 0 0 2px #100c0f, 0 0 10px #257c5575, 0 0 35px #21272475;
  }

  .PlaygroundEditorTheme__token_function-name {
    color: #6196cc;
  }

  .PlaygroundEditorTheme__token_boolean,
  .PlaygroundEditorTheme__token_selector .PlaygroundEditorTheme__token_id,
  .PlaygroundEditorTheme__token_function {
    color: #fdfdfd;
    text-shadow: 0 0 2px #001716, 0 0 3px #03edf975, 0 0 5px #03edf975, 0 0 8px #03edf975;
  }

  .PlaygroundEditorTheme__token_class-name {
    color: #fff5f6;
    text-shadow: 0 0 2px #000, 0 0 10px #fc1f2c75, 0 0 5px #fc1f2c75, 0 0 25px #fc1f2c75;
  }

  .PlaygroundEditorTheme__token_constant,
  .PlaygroundEditorTheme__token_symbol {
    color: #f92aad;
    text-shadow: 0 0 2px #100c0f, 0 0 5px #dc078e33, 0 0 10px #fff3;
  }

  .PlaygroundEditorTheme__token_important,
  .PlaygroundEditorTheme__token_atrule,
  .PlaygroundEditorTheme__token_keyword,
  .PlaygroundEditorTheme__token_selector .PlaygroundEditorTheme__token_class,
  .PlaygroundEditorTheme__token_builtin {
    color: #f4eee4;
    text-shadow: 0 0 2px #393a33, 0 0 8px #f39f0575, 0 0 2px #f39f0575;
  }

  .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_char,
  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_regex,
  .PlaygroundEditorTheme__token_variable {
    color: #f87c32;
  }

  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_entity,
  .PlaygroundEditorTheme__token_url {
    color: #67cdcc;
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

  .PlaygroundEditorTheme__token_inserted {
    color: green;
  }
}
`}
  </style>
);
