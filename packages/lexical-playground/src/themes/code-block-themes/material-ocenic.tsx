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
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    word-wrap: normal;
    color: #c3cee3;
    background: #263238;
    font-family: Roboto Mono, monospace;
    font-size: 1em;
    line-height: 1.5em;

    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;

    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;
  }

  code[data-highlight-language]::-moz-selection,
  pre[data-highlight-language]::-moz-selection,
  code[data-highlight-language] ::-moz-selection,
  pre[data-highlight-language] ::-moz-selection {
    background: #363636;
  }

  code[data-highlight-language]::selection,
  pre[data-highlight-language]::selection,
  code[data-highlight-language] ::selection,
  pre[data-highlight-language] ::selection {
    background: #363636;
  }

  pre[data-highlight-language] {
    overflow: auto;
    position: relative;
    margin: 0.5em 0;
    padding: 1.25em 1em;
  }

  [data-highlight-language='css'] > code,
  [data-highlight-language='markdown'] > code,
  [data-highlight-language='markdown'] > code {
    color: #fd9170;
  }

  [data-highlight-language] .namespace {
    opacity: 0.7;
  }

  .PlaygroundEditorTheme__token_atrule {
    color: #c792ea;
  }

  .PlaygroundEditorTheme__token_attr-name {
    color: #ffcb6b;
  }

  .PlaygroundEditorTheme__token_attr-value {
    color: #c3e88d;
  }

  .PlaygroundEditorTheme__token_attribute {
    color: #c3e88d;
  }

  .PlaygroundEditorTheme__token_boolean {
    color: #c792ea;
  }

  .PlaygroundEditorTheme__token_builtin {
    color: #ffcb6b;
  }

  .PlaygroundEditorTheme__token_cdata {
    color: #80cbc4;
  }

  .PlaygroundEditorTheme__token_char {
    color: #80cbc4;
  }

  .PlaygroundEditorTheme__token_class {
    color: #ffcb6b;
  }

  .PlaygroundEditorTheme__token_class-name {
    color: #f2ff00;
  }

  .PlaygroundEditorTheme__token_color {
    color: #f2ff00;
  }

  .PlaygroundEditorTheme__token_comment {
    color: #546e7a;
  }

  .PlaygroundEditorTheme__token_constant {
    color: #c792ea;
  }

  .PlaygroundEditorTheme__token_deleted {
    color: #f07178;
  }

  .PlaygroundEditorTheme__token_doctype {
    color: #546e7a;
  }

  .PlaygroundEditorTheme__token_entity {
    color: #f07178;
  }

  .PlaygroundEditorTheme__token_function {
    color: #c792ea;
  }

  .PlaygroundEditorTheme__token_hexcode {
    color: #f2ff00;
  }

  .PlaygroundEditorTheme__token_id {
    color: #c792ea;
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_important {
    color: #c792ea;
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_inserted {
    color: #80cbc4;
  }

  .PlaygroundEditorTheme__token_keyword {
    color: #c792ea;
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_number {
    color: #fd9170;
  }

  .PlaygroundEditorTheme__token_operator {
    color: #89ddff;
  }

  .PlaygroundEditorTheme__token_prolog {
    color: #546e7a;
  }

  .PlaygroundEditorTheme__token_property {
    color: #80cbc4;
  }

  .PlaygroundEditorTheme__token_pseudo-class {
    color: #c3e88d;
  }

  .PlaygroundEditorTheme__token_pseudo-element {
    color: #c3e88d;
  }

  .PlaygroundEditorTheme__token_punctuation {
    color: #89ddff;
  }

  .PlaygroundEditorTheme__token_regex {
    color: #f2ff00;
  }

  .PlaygroundEditorTheme__token_selector {
    color: #f07178;
  }

  .PlaygroundEditorTheme__token_string {
    color: #c3e88d;
  }

  .PlaygroundEditorTheme__token_symbol {
    color: #c792ea;
  }

  .PlaygroundEditorTheme__token_tag {
    color: #f07178;
  }

  .PlaygroundEditorTheme__token_unit {
    color: #f07178;
  }

  .PlaygroundEditorTheme__token_url {
    color: #fd9170;
  }

  .PlaygroundEditorTheme__token_variable {
    color: #f07178;
  }
}
`}
  </style>
);
