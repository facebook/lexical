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
    background: hsl(220, 13%, 18%);
    color: hsl(220, 14%, 71%);
    text-shadow: 0 1px rgba(0, 0, 0, 0.3);
    font-family: 'Fira Code', 'Fira Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
    direction: ltr;
    text-align: left;
    white-space: pre;
    word-spacing: normal;
    word-break: normal;
    line-height: 1.5;
    -moz-tab-size: 2;
    -o-tab-size: 2;
    tab-size: 2;
    -webkit-hyphens: none;
    -moz-hyphens: none;
    -ms-hyphens: none;
    hyphens: none;
  }

  /* Selection */
  code[data-highlight-language]::-moz-selection,
  code[data-highlight-language] *::-moz-selection,
  pre[data-highlight-language] *::-moz-selection {
    background: hsl(220, 13%, 28%);
    color: inherit;
    text-shadow: none;
  }

  code[data-highlight-language]::selection,
  code[data-highlight-language] *::selection,
  pre[data-highlight-language] *::selection {
    background: hsl(220, 13%, 28%);
    color: inherit;
    text-shadow: none;
  }

  /* Code blocks */
  pre[data-highlight-language] {
    padding: 1em;
    margin: 0.5em 0;
    overflow: auto;
    border-radius: 0.3em;
  }

  /* Print */
  @media print {
    code[data-highlight-language],
    pre[data-highlight-language] {
      text-shadow: none;
    }
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_prolog,
  .PlaygroundEditorTheme__token_cdata {
    color: hsl(220, 10%, 40%);
  }

  .PlaygroundEditorTheme__token_doctype,
  .PlaygroundEditorTheme__token_punctuation,
  .PlaygroundEditorTheme__token_entity {
    color: hsl(220, 14%, 71%);
  }

  .PlaygroundEditorTheme__token_attr-name,
  .PlaygroundEditorTheme__token_class-name,
  .PlaygroundEditorTheme__token_boolean,
  .PlaygroundEditorTheme__token_constant,
  .PlaygroundEditorTheme__token_number,
  .PlaygroundEditorTheme__token_atrule {
    color: hsl(29, 54%, 61%);
  }

  .PlaygroundEditorTheme__token_keyword {
    color: hsl(286, 60%, 67%);
  }

  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_tag,
  .PlaygroundEditorTheme__token_symbol,
  .PlaygroundEditorTheme__token_deleted,
  .PlaygroundEditorTheme__token_important {
    color: hsl(355, 65%, 65%);
  }

  .PlaygroundEditorTheme__token_selector,
  .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_char,
  .PlaygroundEditorTheme__token_builtin,
  .PlaygroundEditorTheme__token_inserted,
  .PlaygroundEditorTheme__token_regex,
  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_attr-value > .PlaygroundEditorTheme__token_punctuation {
    color: hsl(95, 38%, 62%);
  }

  .PlaygroundEditorTheme__token_variable,
  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_function {
    color: hsl(207, 82%, 66%);
  }

  .PlaygroundEditorTheme__token_url {
    color: hsl(187, 47%, 55%);
  }

  /* HTML overrides */
  .PlaygroundEditorTheme__token_attr-value > .PlaygroundEditorTheme__token_punctuation.attr-equals,
  .PlaygroundEditorTheme__token_special-attr > .PlaygroundEditorTheme__token_attr-value > .PlaygroundEditorTheme__token_value.css {
    color: hsl(220, 14%, 71%);
  }

  /* CSS overrides */
  [data-highlight-language='css'] .PlaygroundEditorTheme__token_selector {
    color: hsl(355, 65%, 65%);
  }

  [data-highlight-language='css'] .PlaygroundEditorTheme__token_property {
    color: hsl(220, 14%, 71%);
  }

  [data-highlight-language='css'] .PlaygroundEditorTheme__token_function,
  [data-highlight-language='css'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_function {
    color: hsl(187, 47%, 55%);
  }

  [data-highlight-language='css'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_string.url {
    color: hsl(95, 38%, 62%);
  }

  [data-highlight-language='css'] .PlaygroundEditorTheme__token_important,
  [data-highlight-language='css'] .PlaygroundEditorTheme__token_atrule .PlaygroundEditorTheme__token_rule {
    color: hsl(286, 60%, 67%);
  }

  /* JS overrides */
  [data-highlight-language='javascript'] .PlaygroundEditorTheme__token_operator {
    color: hsl(286, 60%, 67%);
  }

  [data-highlight-language='javascript']
    .PlaygroundEditorTheme__token_template-string
    > .PlaygroundEditorTheme__token_interpolation
    > .PlaygroundEditorTheme__token_interpolation-punctuation.punctuation {
    color: hsl(5, 48%, 51%);
  }

  /* JSON overrides */
  [data-highlight-language='js']on .PlaygroundEditorTheme__token_operator {
    color: hsl(220, 14%, 71%);
  }

  [data-highlight-language='js']on .PlaygroundEditorTheme__token_null.keyword {
    color: hsl(29, 54%, 61%);
  }

  /* MD overrides */
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_operator,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url-reference.url > .PlaygroundEditorTheme__token_string {
    color: hsl(220, 14%, 71%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_content {
    color: hsl(207, 82%, 66%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_url,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url-reference.url {
    color: hsl(187, 47%, 55%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_blockquote.punctuation,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_hr.punctuation {
    color: hsl(220, 10%, 40%);
    font-style: italic;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_code-snippet {
    color: hsl(95, 38%, 62%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_bold .PlaygroundEditorTheme__token_content {
    color: hsl(29, 54%, 61%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_italic .PlaygroundEditorTheme__token_content {
    color: hsl(286, 60%, 67%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_strike .PlaygroundEditorTheme__token_content,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_strike .PlaygroundEditorTheme__token_punctuation,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_list.punctuation,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_title.important > .PlaygroundEditorTheme__token_punctuation {
    color: hsl(355, 65%, 65%);
  }

  /* General */
  .PlaygroundEditorTheme__token_bold {
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_italic {
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_entity {
    cursor: help;
  }

  .PlaygroundEditorTheme__token_namespace {
    opacity: 0.8;
  }
}
`}
  </style>
);
