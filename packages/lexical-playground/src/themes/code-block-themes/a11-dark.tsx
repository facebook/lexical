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
  font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
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
  background: #2b2b2b;
}

.PlaygroundEditorTheme__token_comment,
.PlaygroundEditorTheme__token_prolog,
.PlaygroundEditorTheme__token_doctype,
.PlaygroundEditorTheme__token_cdata {
  color: #d4d0ab;
}

.PlaygroundEditorTheme__token_punctuation {
  color: #fefefe;
}

.PlaygroundEditorTheme__token_property,
.PlaygroundEditorTheme__token_tag,
.PlaygroundEditorTheme__token_constant,
.PlaygroundEditorTheme__token_symbol,
.PlaygroundEditorTheme__token_deleted {
  color: #ffa07a;
}

.PlaygroundEditorTheme__token_boolean,
.PlaygroundEditorTheme__token_number {
  color: #00e0e0;
}

.PlaygroundEditorTheme__token_selector,
.PlaygroundEditorTheme__token_attr-name,
.PlaygroundEditorTheme__token_string,
.PlaygroundEditorTheme__token_char,
.PlaygroundEditorTheme__token_builtin,
.PlaygroundEditorTheme__token_inserted {
  color: #abe338;
}

.PlaygroundEditorTheme__token_operator,
.PlaygroundEditorTheme__token_entity,
.PlaygroundEditorTheme__token_url,
[data-highlight-language='css'] .PlaygroundEditorTheme__token_string,
.style .PlaygroundEditorTheme__token_string,
.PlaygroundEditorTheme__token_variable {
  color: #00e0e0;
}

.PlaygroundEditorTheme__token_atrule,
.PlaygroundEditorTheme__token_attr-value,
.PlaygroundEditorTheme__token_function {
  color: #ffd700;
}

.PlaygroundEditorTheme__token_keyword {
  color: #00e0e0;
}

.PlaygroundEditorTheme__token_regex,
.PlaygroundEditorTheme__token_important {
  color: #ffd700;
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

@media screen and (-ms-high-contrast: active) {
  code[data-highlight-language],
  pre[data-highlight-language] {
    color: windowText;
    background: window;
  }

  :not(pre) > code[data-highlight-language],
  pre[data-highlight-language] {
    background: window;
  }

  .PlaygroundEditorTheme__token_important {
    background: highlight;
    color: window;
    font-weight: normal;
  }

  .PlaygroundEditorTheme__token_atrule,
  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_function,
  .PlaygroundEditorTheme__token_keyword,
  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_selector {
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_doctype,
  .PlaygroundEditorTheme__token_function,
  .PlaygroundEditorTheme__token_keyword,
  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_string {
    color: highlight;
  }

  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_url {
    font-weight: normal;
  }
}
}
`}
  </style>
);
