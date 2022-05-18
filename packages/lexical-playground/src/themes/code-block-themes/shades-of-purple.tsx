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
  code[data-highlight-language],
  pre[data-highlight-language] {
    color: #9efeff;
    direction: ltr;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;

    -moz-tab-size: 4;
    -o-tab-size: 4;
    tab-size: 4;

    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;

    font-family: 'Operator Mono', 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
    font-weight: 400;
    font-size: 17px;
    line-height: 25px;
    letter-spacing: 0.5px;
    text-shadow: 0 1px #222245;
  }

  pre[data-highlight-language]::-moz-selection,
  pre[data-highlight-language] ::-moz-selection,
  code[data-highlight-language]::-moz-selection,
  code[data-highlight-language] ::-moz-selection,
  pre[data-highlight-language]::selection,
  pre[data-highlight-language] ::selection,
  code[data-highlight-language]::selection,
  code[data-highlight-language] ::selection {
    color: inherit;
    background: #a599e9;
  }

  /* Code blocks. */
  pre[data-highlight-language] {
    padding: 2em;
    margin: 0.5em 0;
    overflow: auto;
  }

  :not(pre) > code[data-highlight-language],
  pre[data-highlight-language] {
    background: #1e1e3f;
  }

  /* Inline code */
  :not(pre) > code[data-highlight-language] {
    padding: 0.1em;
    border-radius: 0.3em;
  }

  .token {
    font-weight: 400;
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_prolog,
  .PlaygroundEditorTheme__token_cdata {
    color: #b362ff;
  }

  .PlaygroundEditorTheme__token_delimiter,
  .PlaygroundEditorTheme__token_keyword,
  .PlaygroundEditorTheme__token_selector,
  .PlaygroundEditorTheme__token_important,
  .PlaygroundEditorTheme__token_atrule {
    color: #ff9d00;
  }

  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_attr-name {
    color: rgb(255, 180, 84);
  }

  .PlaygroundEditorTheme__token_punctuation {
    color: #ffffff;
  }

  .PlaygroundEditorTheme__token_boolean {
    color: rgb(255, 98, 140);
  }

  .PlaygroundEditorTheme__token_tag,
  .PlaygroundEditorTheme__token_tag .punctuation,
  .PlaygroundEditorTheme__token_doctype,
  .PlaygroundEditorTheme__token_builtin {
    color: rgb(255, 157, 0);
  }

  .PlaygroundEditorTheme__token_entity,
  .PlaygroundEditorTheme__token_symbol {
    color: #6897bb;
  }

  .PlaygroundEditorTheme__token_number {
    color: #ff628c;
  }

  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_constant,
  .PlaygroundEditorTheme__token_variable {
    color: #ff628c;
  }

  .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_char {
    color: #a5ff90;
  }

  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_attr-value .punctuation {
    color: #a5c261;
  }

  .PlaygroundEditorTheme__token_attr-value .punctuation:first-of-type {
    color: #a9b7c6;
  }

  .PlaygroundEditorTheme__token_url {
    color: #287bde;
    text-decoration: underline;
  }

  .PlaygroundEditorTheme__token_function {
    color: rgb(250, 208, 0);
  }

  .PlaygroundEditorTheme__token_regex {
    background: #364135;
  }

  .PlaygroundEditorTheme__token_bold {
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_italic {
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_inserted {
    background: #00ff00;
  }

  .PlaygroundEditorTheme__token_deleted {
    background: #ff000d;
  }

  code[data-highlight-language='css'] .PlaygroundEditorTheme__token_property,
  code[data-highlight-language='css'] .PlaygroundEditorTheme__token_property + .PlaygroundEditorTheme__token_punctuation {
    color: #a9b7c6;
  }

  code[data-highlight-language='css'] .PlaygroundEditorTheme__token_id {
    color: #ffc66d;
  }

  code[data-highlight-language='css'] .PlaygroundEditorTheme__token_selector > .PlaygroundEditorTheme__token_class,
  code[data-highlight-language='css'] .PlaygroundEditorTheme__token_selector > .PlaygroundEditorTheme__token_attribute,
  code[data-highlight-language='css'] .PlaygroundEditorTheme__token_selector > .PlaygroundEditorTheme__token_pseudo-class,
  code[data-highlight-language='css'] .PlaygroundEditorTheme__token_selector > .PlaygroundEditorTheme__token_pseudo-element {
    color: #ffc66d;
  }

  .PlaygroundEditorTheme__token_class-name {
    color: #fb94ff;
  }

  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_entity,
  .PlaygroundEditorTheme__token_url,
  [data-highlight-language='css'] .PlaygroundEditorTheme__token_string,
  .style .PlaygroundEditorTheme__token_string {
    background: none;
  }

  .line-highlight.line-highlight {
    margin-top: 36px;
    background: linear-gradient(to right, rgba(179, 98, 255, 0.17), transparent);
  }

  .line-highlight.line-highlight:before,
  .line-highlight.line-highlight[data-end]:after {
    content: '';
  }
}
`}
  </style>
);
