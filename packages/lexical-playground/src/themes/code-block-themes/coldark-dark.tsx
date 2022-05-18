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
    color: #e3eaf2;
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
    background: #3c526d;
  }

  pre[data-highlight-language]::selection,
  pre[data-highlight-language] ::selection,
  code[data-highlight-language]::selection,
  code[data-highlight-language] ::selection {
    background: #3c526d;
  }

  /* Code blocks */
  pre[data-highlight-language] {
    padding: 1em;
    margin: 0.5em 0;
    overflow: auto;
  }

  :not(pre) > code[data-highlight-language],
  pre[data-highlight-language] {
    background: #111b27;
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_prolog,
  .PlaygroundEditorTheme__token_doctype,
  .PlaygroundEditorTheme__token_cdata {
    color: #8da1b9;
  }

  .PlaygroundEditorTheme__token_punctuation {
    color: #e3eaf2;
  }

  .PlaygroundEditorTheme__token_delimiter.important,
  .PlaygroundEditorTheme__token_selector .parent,
  .PlaygroundEditorTheme__token_tag,
  .PlaygroundEditorTheme__token_tag .PlaygroundEditorTheme__token_punctuation {
    color: #66cccc;
  }

  .PlaygroundEditorTheme__token_attr-name,
  .PlaygroundEditorTheme__token_boolean,
  .PlaygroundEditorTheme__token_boolean.important,
  .PlaygroundEditorTheme__token_number,
  .PlaygroundEditorTheme__token_constant,
  .PlaygroundEditorTheme__token_selector .PlaygroundEditorTheme__token_attribute {
    color: #e6d37a;
  }

  .PlaygroundEditorTheme__token_class-name,
  .PlaygroundEditorTheme__token_key,
  .PlaygroundEditorTheme__token_parameter,
  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_property-access,
  .PlaygroundEditorTheme__token_variable {
    color: #6cb8e6;
  }

  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_inserted,
  .PlaygroundEditorTheme__token_color,
  .PlaygroundEditorTheme__token_selector .PlaygroundEditorTheme__token_value,
  .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_string .PlaygroundEditorTheme__token_url-link {
    color: #91d076;
  }

  .PlaygroundEditorTheme__token_builtin,
  .PlaygroundEditorTheme__token_keyword-array,
  .PlaygroundEditorTheme__token_package,
  .PlaygroundEditorTheme__token_regex {
    color: #f4adf4;
  }

  .PlaygroundEditorTheme__token_function,
  .PlaygroundEditorTheme__token_selector .PlaygroundEditorTheme__token_class,
  .PlaygroundEditorTheme__token_selector .PlaygroundEditorTheme__token_id {
    color: #c699e3;
  }

  .PlaygroundEditorTheme__token_atrule .PlaygroundEditorTheme__token_rule,
  .PlaygroundEditorTheme__token_combinator,
  .PlaygroundEditorTheme__token_keyword,
  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_pseudo-class,
  .PlaygroundEditorTheme__token_pseudo-element,
  .PlaygroundEditorTheme__token_selector,
  .PlaygroundEditorTheme__token_unit {
    color: #e9ae7e;
  }

  .PlaygroundEditorTheme__token_deleted,
  .PlaygroundEditorTheme__token_important {
    color: #cd6660;
  }

  .PlaygroundEditorTheme__token_keyword-this,
  .PlaygroundEditorTheme__token_this {
    color: #6cb8e6;
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
    color: #6cb8e6;
    font-weight: bold;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_blockquote.punctuation {
    color: #f4adf4;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_code {
    color: #66cccc;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_hr.punctuation {
    color: #6cb8e6;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url .PlaygroundEditorTheme__token_content {
    color: #91d076;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url-link {
    color: #e6d37a;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_list.punctuation {
    color: #f4adf4;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_table-header {
    color: #e3eaf2;
  }

  [data-highlight-language='js']on .PlaygroundEditorTheme__token_operator {
    color: #e3eaf2;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_variable {
    color: #66cccc;
  }

  /* overrides color-values for the Show Invisibles plugin
* https://prismjs.com/plugins/show-invisibles/
*/
  .PlaygroundEditorTheme__token_token.tab:not(:empty):before,
  .PlaygroundEditorTheme__token_token.cr:before,
  .PlaygroundEditorTheme__token_token.lf:before,
  .PlaygroundEditorTheme__token_token.space:before {
    color: #8da1b9;
  }

  /* overrides color-values for the Toolbar plugin
* https://prismjs.com/plugins/toolbar/
*/
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > a,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > button {
    color: #111b27;
    background: #6cb8e6;
  }

  div.code-toolbar > .toolbar.toolbar > .toolbar-item > a:hover,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > a:focus,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > button:hover,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > button:focus {
    color: #111b27;
    background: #6cb8e6da;
    text-decoration: none;
  }

  div.code-toolbar > .toolbar.toolbar > .toolbar-item > span,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > span:hover,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > span:focus {
    color: #111b27;
    background: #8da1b9;
  }

  /* overrides color-values for the Line Highlight plugin
* http://prismjs.com/plugins/line-highlight/
*/
  .line-highlight.line-highlight {
    background: #3c526d5f;
    background: linear-gradient(to right, #3c526d5f 70%, #3c526d55);
  }

  .line-highlight.line-highlight:before,
  .line-highlight.line-highlight[data-end]:after {
    background-color: #8da1b9;
    color: #111b27;
    box-shadow: 0 1px #3c526d;
  }

  pre[id].linkable-line-numbers.linkable-line-numbers span.line-numbers-rows > span:hover:before {
    background-color: #8da1b918;
  }

  /* overrides color-values for the Line Numbers plugin
* http://prismjs.com/plugins/line-numbers/
*/
  .line-numbers.line-numbers .line-numbers-rows {
    border-right: 1px solid #0b121b;
    background: #0b121b7a;
  }

  .line-numbers .line-numbers-rows > span:before {
    color: #8da1b9da;
  }

  /* overrides color-values for the Match Braces plugin
* https://prismjs.com/plugins/match-braces/
*/
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-1,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-5,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-9 {
    color: #e6d37a;
  }

  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-2,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-6,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-10 {
    color: #f4adf4;
  }

  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-3,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-7,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-11 {
    color: #6cb8e6;
  }

  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-4,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-8,
  .rainbow-braces .PlaygroundEditorTheme__token_token.punctuation.brace-level-12 {
    color: #c699e3;
  }

  /* overrides color-values for the Diff Highlight plugin
* https://prismjs.com/plugins/diff-highlight/
*/
  pre.diff-highlight > code .PlaygroundEditorTheme__token_token.deleted:not(.prefix),
  pre > code.diff-highlight .PlaygroundEditorTheme__token_token.deleted:not(.prefix) {
    background-color: #cd66601f;
  }

  pre.diff-highlight > code .PlaygroundEditorTheme__token_token.inserted:not(.prefix),
  pre > code.diff-highlight .PlaygroundEditorTheme__token_token.inserted:not(.prefix) {
    background-color: #91d0761f;
  }

  /* overrides color-values for the Command Line plugin
* https://prismjs.com/plugins/command-line/
*/
  .command-line .command-line-prompt {
    border-right: 1px solid #0b121b;
  }

  .command-line .command-line-prompt > span:before {
    color: #8da1b9da;
  }
}
`}
  </style>
);
