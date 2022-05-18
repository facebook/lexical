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
    color: #90a4ae;
    background: #fafafa;
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
    background: #cceae7;
    color: #263238;
  }

  code[data-highlight-language]::selection,
  pre[data-highlight-language]::selection,
  code[data-highlight-language] ::selection,
  pre[data-highlight-language] ::selection {
    background: #cceae7;
    color: #263238;
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
    color: #f76d47;
  }

  [data-highlight-language] .namespace {
    opacity: 0.7;
  }

  .PlaygroundEditorTheme__token_atrule {
    color: #7c4dff;
  }

  .PlaygroundEditorTheme__token_attr-name {
    color: #39adb5;
  }

  .PlaygroundEditorTheme__token_attr-value {
    color: #f6a434;
  }

  .PlaygroundEditorTheme__token_attribute {
    color: #f6a434;
  }

  .PlaygroundEditorTheme__token_boolean {
    color: #7c4dff;
  }

  .PlaygroundEditorTheme__token_builtin {
    color: #39adb5;
  }

  .PlaygroundEditorTheme__token_cdata {
    color: #39adb5;
  }

  .PlaygroundEditorTheme__token_char {
    color: #39adb5;
  }

  .PlaygroundEditorTheme__token_class {
    color: #39adb5;
  }

  .PlaygroundEditorTheme__token_class-name {
    color: #6182b8;
  }

  .PlaygroundEditorTheme__token_comment {
    color: #aabfc9;
  }

  .PlaygroundEditorTheme__token_constant {
    color: #7c4dff;
  }

  .PlaygroundEditorTheme__token_deleted {
    color: #e53935;
  }

  .PlaygroundEditorTheme__token_doctype {
    color: #aabfc9;
  }

  .PlaygroundEditorTheme__token_entity {
    color: #e53935;
  }

  .PlaygroundEditorTheme__token_function {
    color: #7c4dff;
  }

  .PlaygroundEditorTheme__token_hexcode {
    color: #f76d47;
  }

  .PlaygroundEditorTheme__token_id {
    color: #7c4dff;
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_important {
    color: #7c4dff;
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_inserted {
    color: #39adb5;
  }

  .PlaygroundEditorTheme__token_keyword {
    color: #7c4dff;
  }

  .PlaygroundEditorTheme__token_number {
    color: #f76d47;
  }

  .PlaygroundEditorTheme__token_operator {
    color: #39adb5;
  }

  .PlaygroundEditorTheme__token_prolog {
    color: #aabfc9;
  }

  .PlaygroundEditorTheme__token_property {
    color: #39adb5;
  }

  .PlaygroundEditorTheme__token_pseudo-class {
    color: #f6a434;
  }

  .PlaygroundEditorTheme__token_pseudo-element {
    color: #f6a434;
  }

  .PlaygroundEditorTheme__token_punctuation {
    color: #39adb5;
  }

  .PlaygroundEditorTheme__token_regex {
    color: #6182b8;
  }

  .PlaygroundEditorTheme__token_selector {
    color: #e53935;
  }

  .PlaygroundEditorTheme__token_string {
    color: #f6a434;
  }

  .PlaygroundEditorTheme__token_symbol {
    color: #7c4dff;
  }

  .PlaygroundEditorTheme__token_tag {
    color: #e53935;
  }

  .PlaygroundEditorTheme__token_unit {
    color: #f76d47;
  }

  .PlaygroundEditorTheme__token_url {
    color: #e53935;
  }

  .PlaygroundEditorTheme__token_variable {
    color: #e53935;
  }
}
`}
  </style>
);
