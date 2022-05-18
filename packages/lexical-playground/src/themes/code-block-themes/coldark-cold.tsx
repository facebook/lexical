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
    color: #111b27;
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

  pre[data-highlight-language]::-moz-selection,
  pre[data-highlight-language] ::-moz-selection,
  code[data-highlight-language]::-moz-selection,
  code[data-highlight-language] ::-moz-selection {
    background: #8da1b9;
  }

  pre[data-highlight-language]::selection,
  pre[data-highlight-language] ::selection,
  code[data-highlight-language]::selection,
  code[data-highlight-language] ::selection {
    background: #8da1b9;
  }

  /* Code blocks */
  pre[data-highlight-language] {
    padding: 1em;
    margin: 0.5em 0;
    overflow: auto;
  }

  :not(pre) > code[data-highlight-language],
  pre[data-highlight-language] {
    background: #e3eaf2;
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_prolog,
  .PlaygroundEditorTheme__token_doctype,
  .PlaygroundEditorTheme__token_cdata {
    color: #3c526d;
  }

  .PlaygroundEditorTheme__token_punctuation {
    color: #111b27;
  }

  .PlaygroundEditorTheme__token_delimiter.important,
  .PlaygroundEditorTheme__token_selector .parent,
  .PlaygroundEditorTheme__token_tag,
  .PlaygroundEditorTheme__token_tag .PlaygroundEditorTheme__token_punctuation {
    color: #006d6d;
  }

  .PlaygroundEditorTheme__token_attr-name,
  .PlaygroundEditorTheme__token_boolean,
  .PlaygroundEditorTheme__token_boolean.important,
  .PlaygroundEditorTheme__token_number,
  .PlaygroundEditorTheme__token_constant,
  .PlaygroundEditorTheme__token_selector .PlaygroundEditorTheme__token_attribute {
    color: #755f00;
  }

  .PlaygroundEditorTheme__token_class-name,
  .PlaygroundEditorTheme__token_key,
  .PlaygroundEditorTheme__token_parameter,
  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_property-access,
  .PlaygroundEditorTheme__token_variable {
    color: #005a8e;
  }

  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_inserted,
  .PlaygroundEditorTheme__token_color,
  .PlaygroundEditorTheme__token_selector .PlaygroundEditorTheme__token_value,
  .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_string .PlaygroundEditorTheme__token_url-link {
    color: #116b00;
  }

  .PlaygroundEditorTheme__token_builtin,
  .PlaygroundEditorTheme__token_keyword-array,
  .PlaygroundEditorTheme__token_package,
  .PlaygroundEditorTheme__token_regex {
    color: #af00af;
  }

  .PlaygroundEditorTheme__token_function,
  .PlaygroundEditorTheme__token_selector .PlaygroundEditorTheme__token_class,
  .PlaygroundEditorTheme__token_selector .PlaygroundEditorTheme__token_id {
    color: #7c00aa;
  }

  .PlaygroundEditorTheme__token_atrule .PlaygroundEditorTheme__token_rule,
  .PlaygroundEditorTheme__token_combinator,
  .PlaygroundEditorTheme__token_keyword,
  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_pseudo-class,
  .PlaygroundEditorTheme__token_pseudo-element,
  .PlaygroundEditorTheme__token_selector,
  .PlaygroundEditorTheme__token_unit {
    color: #a04900;
  }

  .PlaygroundEditorTheme__token_deleted,
  .PlaygroundEditorTheme__token_important {
    color: #c22f2e;
  }

  .PlaygroundEditorTheme__token_keyword-this,
  .PlaygroundEditorTheme__token_this {
    color: #005a8e;
  }

  .PlaygroundEditorTheme__token_important,
  .PlaygroundEditorTheme__token_keyword-this,
  .PlaygroundEditorTheme__token_this,
  .PlaygroundEditorTheme__token_bold {
    font-weight: bold;
  }

  .PlaygroundEditorTheme__token_delimiter.important {
    font-weight: inherit;
  }

  .PlaygroundEditorTheme__token_italic {
    font-style: italic;
  }

  .PlaygroundEditorTheme__token_entity {
    cursor: help;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_title,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_title .PlaygroundEditorTheme__token_punctuation {
    color: #005a8e;
    font-weight: bold;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_blockquote.punctuation {
    color: #af00af;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_code {
    color: #006d6d;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_hr.punctuation {
    color: #005a8e;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_content {
    color: #116b00;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url-link {
    color: #755f00;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_list.punctuation {
    color: #af00af;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_table-header {
    color: #111b27;
  }

  [data-highlight-language='js']on .PlaygroundEditorTheme__token_operator {
    color: #111b27;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_variable {
    color: #006d6d;
  }

  /* overrides color-values for the Show Invisibles plugin
 * https://prismjs.com/plugins/show-invisibles/
 */
  .PlaygroundEditorTheme__token_token.tab:not(:empty):before,
  .PlaygroundEditorTheme__token_token.cr:before,
  .PlaygroundEditorTheme__token_token.lf:before,
  .PlaygroundEditorTheme__token_token.space:before {
    color: #3c526d;
  }

  /* overrides color-values for the Toolbar plugin
 * https://prismjs.com/plugins/toolbar/
 */
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > a,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > button {
    color: #e3eaf2;
    background: #005a8e;
  }

  div.code-toolbar > .toolbar.toolbar > .toolbar-item > a:hover,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > a:focus,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > button:hover,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > button:focus {
    color: #e3eaf2;
    background: #005a8eda;
    text-decoration: none;
  }

  div.code-toolbar > .toolbar.toolbar > .toolbar-item > span,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > span:hover,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > span:focus {
    color: #e3eaf2;
    background: #3c526d;
  }

  /* overrides color-values for the Line Highlight plugin
 * http://prismjs.com/plugins/line-highlight/
 */
  .line-highlight.line-highlight {
    background: #8da1b92f;
    background: linear-gradient(to right, #8da1b92f 70%, #8da1b925);
  }

  .line-highlight.line-highlight:before,
  .line-highlight.line-highlight[data-end]:after {
    background-color: #3c526d;
    color: #e3eaf2;
    box-shadow: 0 1px #8da1b9;
  }

  pre[id].linkable-line-numbers.linkable-line-numbers span.line-numbers-rows > span:hover:before {
    background-color: #3c526d1f;
  }

  /* overrides color-values for the Line Numbers plugin
 * http://prismjs.com/plugins/line-numbers/
 */
  .line-numbers.line-numbers .line-numbers-rows {
    border-right: 1px solid #8da1b97a;
    background: #d0dae77a;
  }

  .line-numbers .line-numbers-rows > span:before {
    color: #3c526dda;
  }

  /* overrides color-values for the Match Braces plugin
 * https://prismjs.com/plugins/match-braces/
 */
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-1,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-5,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-9 {
    color: #755f00;
  }

  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-2,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-6,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-10 {
    color: #af00af;
  }

  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-3,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-7,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-11 {
    color: #005a8e;
  }

  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-4,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-8,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-12 {
    color: #7c00aa;
  }

  /* overrides color-values for the Diff Highlight plugin
 * https://prismjs.com/plugins/diff-highlight/
 */
  pre.diff-highlight > code .PlaygroundEditorTheme__token_token.deleted:not(.prefix),
  pre > code.diff-highlight .PlaygroundEditorTheme__token_token.deleted:not(.prefix) {
    background-color: #c22f2e1f;
  }

  pre.diff-highlight > code .PlaygroundEditorTheme__token_token.inserted:not(.prefix),
  pre > code.diff-highlight .PlaygroundEditorTheme__token_token.inserted:not(.prefix) {
    background-color: #116b001f;
  }

  /* overrides color-values for the Command Line plugin
 * https://prismjs.com/plugins/command-line/
 */
  .command-line .command-line-prompt {
    border-right: 1px solid #8da1b97a;
  }

  .command-line .command-line-prompt > span:before {
    color: #3c526dda;
  }
}
`}
  </style>
);
