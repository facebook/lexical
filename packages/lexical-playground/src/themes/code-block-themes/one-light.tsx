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
    background: hsl(230, 1%, 98%);
    color: hsl(230, 8%, 24%);
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
    background: hsl(230, 1%, 90%);
    color: inherit;
  }

  code[data-highlight-language]::selection,
  code[data-highlight-language] *::selection,
  pre[data-highlight-language] *::selection {
    background: hsl(230, 1%, 90%);
    color: inherit;
  }

  /* Code blocks */
  pre[data-highlight-language] {
    padding: 1em;
    margin: 0.5em 0;
    overflow: auto;
    border-radius: 0.3em;
  }

  .PlaygroundEditorTheme__token_comment,
  .PlaygroundEditorTheme__token_prolog,
  .PlaygroundEditorTheme__token_cdata {
    color: hsl(230, 4%, 64%);
  }

  .PlaygroundEditorTheme__token_doctype,
  .PlaygroundEditorTheme__token_punctuation,
  .PlaygroundEditorTheme__token_entity {
    color: hsl(230, 8%, 24%);
  }

  .PlaygroundEditorTheme__token_attr-name,
  .PlaygroundEditorTheme__token_class-name,
  .PlaygroundEditorTheme__token_boolean,
  .PlaygroundEditorTheme__token_constant,
  .PlaygroundEditorTheme__token_number,
  .PlaygroundEditorTheme__token_atrule {
    color: hsl(35, 99%, 36%);
  }

  .PlaygroundEditorTheme__token_keyword {
    color: hsl(301, 63%, 40%);
  }

  .PlaygroundEditorTheme__token_property,
  .PlaygroundEditorTheme__token_tag,
  .PlaygroundEditorTheme__token_symbol,
  .PlaygroundEditorTheme__token_deleted,
  .PlaygroundEditorTheme__token_important {
    color: hsl(5, 74%, 59%);
  }

  .PlaygroundEditorTheme__token_selector,
  .PlaygroundEditorTheme__token_string,
  .PlaygroundEditorTheme__token_char,
  .PlaygroundEditorTheme__token_builtin,
  .PlaygroundEditorTheme__token_inserted,
  .PlaygroundEditorTheme__token_regex,
  .PlaygroundEditorTheme__token_attr-value,
  .PlaygroundEditorTheme__token_attr-value > .PlaygroundEditorTheme__token_punctuation {
    color: hsl(119, 34%, 47%);
  }

  .PlaygroundEditorTheme__token_variable,
  .PlaygroundEditorTheme__token_operator,
  .PlaygroundEditorTheme__token_function {
    color: hsl(221, 87%, 60%);
  }

  .PlaygroundEditorTheme__token_url {
    color: hsl(198, 99%, 37%);
  }

  /* HTML overrides */
  .PlaygroundEditorTheme__token_attr-value > .PlaygroundEditorTheme__token_punctuation.attr-equals,
  .PlaygroundEditorTheme__token_special-attr > .PlaygroundEditorTheme__token_attr-value > .PlaygroundEditorTheme__token_value.css {
    color: hsl(230, 8%, 24%);
  }

  /* CSS overrides */
  [data-highlight-language='css'] .PlaygroundEditorTheme__token_selector {
    color: hsl(5, 74%, 59%);
  }

  [data-highlight-language='css'] .PlaygroundEditorTheme__token_property {
    color: hsl(230, 8%, 24%);
  }

  [data-highlight-language='css'] .PlaygroundEditorTheme__token_function,
  [data-highlight-language='css'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_function {
    color: hsl(198, 99%, 37%);
  }

  [data-highlight-language='css'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_string.url {
    color: hsl(119, 34%, 47%);
  }

  [data-highlight-language='css'] .PlaygroundEditorTheme__token_important,
  [data-highlight-language='css'] .PlaygroundEditorTheme__token_atrule .PlaygroundEditorTheme__token_rule {
    color: hsl(301, 63%, 40%);
  }

  /* JS overrides */
  [data-highlight-language='javascript'] .PlaygroundEditorTheme__token_operator {
    color: hsl(301, 63%, 40%);
  }

  [data-highlight-language='javascript']
    .PlaygroundEditorTheme__token_template-string
    > .PlaygroundEditorTheme__token_interpolation
    > .PlaygroundEditorTheme__token_interpolation-punctuation.punctuation {
    color: hsl(344, 84%, 43%);
  }

  /* JSON overrides */
  [data-highlight-language='js']on .PlaygroundEditorTheme__token_operator {
    color: hsl(230, 8%, 24%);
  }

  [data-highlight-language='js']on .PlaygroundEditorTheme__token_null.keyword {
    color: hsl(35, 99%, 36%);
  }

  /* MD overrides */
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_operator,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url-reference.url > .PlaygroundEditorTheme__token_string {
    color: hsl(230, 8%, 24%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_content {
    color: hsl(221, 87%, 60%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url > .PlaygroundEditorTheme__token_url,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_url-reference.url {
    color: hsl(198, 99%, 37%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_blockquote.punctuation,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_hr.punctuation {
    color: hsl(230, 4%, 64%);
    font-style: italic;
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_code-snippet {
    color: hsl(119, 34%, 47%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_bold .PlaygroundEditorTheme__token_content {
    color: hsl(35, 99%, 36%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_italic .PlaygroundEditorTheme__token_content {
    color: hsl(301, 63%, 40%);
  }

  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_strike .PlaygroundEditorTheme__token_content,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_strike .PlaygroundEditorTheme__token_punctuation,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_list.punctuation,
  [data-highlight-language='markdown'] .PlaygroundEditorTheme__token_title.important > .PlaygroundEditorTheme__token_punctuation {
    color: hsl(5, 74%, 59%);
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

  /* Plugin overrides */
  /* Selectors should have higher specificity than those in the plugins' default stylesheets */

  /* Show Invisibles plugin overrides */
  .PlaygroundEditorTheme__token_UltraEditor__token_.tab:not(:empty):before,
  .PlaygroundEditorTheme__token_UltraEditor__token_.cr:before,
  .PlaygroundEditorTheme__token_UltraEditor__token_.lf:before,
  .PlaygroundEditorTheme__token_UltraEditor__token_.space:before {
    color: hsla(230, 8%, 24%, 0.2);
  }

  /* Toolbar plugin overrides */
  /* Space out all buttons and move them away from the right edge of the code block */
  div.code-toolbar > .toolbar.toolbar > .toolbar-item {
    margin-right: 0.4em;
  }

  /* Styling the buttons */
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > button,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > a,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > span {
    background: hsl(230, 1%, 90%);
    color: hsl(230, 6%, 44%);
    padding: 0.1em 0.4em;
    border-radius: 0.3em;
  }

  div.code-toolbar > .toolbar.toolbar > .toolbar-item > button:hover,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > button:focus,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > a:hover,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > a:focus,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > span:hover,
  div.code-toolbar > .toolbar.toolbar > .toolbar-item > span:focus {
    background: hsl(230, 1%, 78%); /* custom: darken(--syntax-bg, 20%) */
    color: hsl(230, 8%, 24%);
  }

  /* Line Highlight plugin overrides */
  /* The highlighted line itself */
  .line-highlight.line-highlight {
    background: hsla(230, 8%, 24%, 0.05);
  }

  /* Default line numbers in Line Highlight plugin */
  .line-highlight.line-highlight:before,
  .line-highlight.line-highlight[data-end]:after {
    background: hsl(230, 1%, 90%);
    color: hsl(230, 8%, 24%);
    padding: 0.1em 0.6em;
    border-radius: 0.3em;
    box-shadow: 0 2px 0 0 rgba(0, 0, 0, 0.2); /* same as Toolbar plugin default */
  }

  /* Hovering over a linkable line number (in the gutter area) */
  /* Requires Line Numbers plugin as well */
  pre[id].linkable-line-numbers.linkable-line-numbers span.line-numbers-rows > span:hover:before {
    background-color: hsla(230, 8%, 24%, 0.05);
  }

  /* Line Numbers and Command Line plugins overrides */
  /* Line separating gutter from coding area */
  .line-numbers.line-numbers .line-numbers-rows,
  .command-line .command-line-prompt {
    border-right-color: hsla(230, 8%, 24%, 0.2);
  }

  /* Stuff in the gutter */
  .line-numbers .line-numbers-rows > span:before,
  .command-line .command-line-prompt > span:before {
    color: hsl(230, 1%, 62%);
  }

  /* Match Braces plugin overrides */
  /* Note: Outline colour is inherited from the braces */
  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-1,
  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-5,
  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-9 {
    color: hsl(5, 74%, 59%);
  }

  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-2,
  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-6,
  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-10 {
    color: hsl(119, 34%, 47%);
  }

  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-3,
  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-7,
  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-11 {
    color: hsl(221, 87%, 60%);
  }

  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-4,
  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-8,
  .rainbow-braces .PlaygroundEditorTheme__token_UltraEditor__token_.punctuation.brace-level-12 {
    color: hsl(301, 63%, 40%);
  }

  /* Diff Highlight plugin overrides */
  /* Taken from https://github.com/atom/github/blob/master/styles/variables.less */
  pre.diff-highlight > code .PlaygroundEditorTheme__token_UltraEditor__token_.deleted:not(.prefix),
  pre > code.diff-highlight .PlaygroundEditorTheme__token_UltraEditor__token_.deleted:not(.prefix) {
    background-color: hsla(353, 100%, 66%, 0.15);
  }

  pre.diff-highlight > code .PlaygroundEditorTheme__token_UltraEditor__token_.deleted:not(.prefix)::-moz-selection,
  pre.diff-highlight > code .PlaygroundEditorTheme__token_UltraEditor__token_.deleted:not(.prefix) *::-moz-selection,
  pre > code.diff-highlight .PlaygroundEditorTheme__token_UltraEditor__token_.deleted:not(.prefix)::-moz-selection,
  pre > code.diff-highlight .PlaygroundEditorTheme__token_UltraEditor__token_.deleted:not(.prefix) *::-moz-selection {
    background-color: hsla(353, 95%, 66%, 0.25);
  }

  pre.diff-highlight > code .PlaygroundEditorTheme__token_UltraEditor__token_.deleted:not(.prefix)::selection,
  pre.diff-highlight > code .PlaygroundEditorTheme__token_UltraEditor__token_.deleted:not(.prefix) *::selection,
  pre > code.diff-highlight .PlaygroundEditorTheme__token_UltraEditor__token_.deleted:not(.prefix)::selection,
  pre > code.diff-highlight .PlaygroundEditorTheme__token_UltraEditor__token_.deleted:not(.prefix) *::selection {
    background-color: hsla(353, 95%, 66%, 0.25);
  }

  pre.diff-highlight > code .PlaygroundEditorTheme__token_UltraEditor__token_.inserted:not(.prefix),
  pre > code.diff-highlight .PlaygroundEditorTheme__token_UltraEditor__token_.inserted:not(.prefix) {
    background-color: hsla(137, 100%, 55%, 0.15);
  }

  pre.diff-highlight > code .PlaygroundEditorTheme__token_UltraEditor__token_.inserted:not(.prefix)::-moz-selection,
  pre.diff-highlight > code .PlaygroundEditorTheme__token_UltraEditor__token_.inserted:not(.prefix) *::-moz-selection,
  pre > code.diff-highlight .PlaygroundEditorTheme__token_UltraEditor__token_.inserted:not(.prefix)::-moz-selection,
  pre > code.diff-highlight .PlaygroundEditorTheme__token_UltraEditor__token_.inserted:not(.prefix) *::-moz-selection {
    background-color: hsla(135, 73%, 55%, 0.25);
  }

  pre.diff-highlight > code .PlaygroundEditorTheme__token_UltraEditor__token_.inserted:not(.prefix)::selection,
  pre.diff-highlight > code .PlaygroundEditorTheme__token_UltraEditor__token_.inserted:not(.prefix) *::selection,
  pre > code.diff-highlight .PlaygroundEditorTheme__token_UltraEditor__token_.inserted:not(.prefix)::selection,
  pre > code.diff-highlight .PlaygroundEditorTheme__token_UltraEditor__token_.inserted:not(.prefix) *::selection {
    background-color: hsla(135, 73%, 55%, 0.25);
  }

  /* Previewers plugin overrides */
  /* Based on https://github.com/atom-community/atom-ide-datatip/blob/master/styles/atom-ide-datatips.less and https://github.com/atom/atom/blob/master/packages/one-light-ui */
  /* Border around popup */
  .prism-previewer.prism-previewer:before,
  .prism-previewer-gradient.prism-previewer-gradient div {
    border-color: hsl(0, 0, 95%);
  }

  /* Angle and time should remain as circles and are hence not included */
  .prism-previewer-color.prism-previewer-color:before,
  .prism-previewer-gradient.prism-previewer-gradient div,
  .prism-previewer-easing.prism-previewer-easing:before {
    border-radius: 0.3em;
  }

  /* Triangles pointing to the code */
  .prism-previewer.prism-previewer:after {
    border-top-color: hsl(0, 0, 95%);
  }

  .prism-previewer-flipped.prism-previewer-flipped.after {
    border-bottom-color: hsl(0, 0, 95%);
  }

  /* Background colour within the popup */
  .prism-previewer-angle.prism-previewer-angle:before,
  .prism-previewer-time.prism-previewer-time:before,
  .prism-previewer-easing.prism-previewer-easing {
    background: hsl(0, 0%, 100%);
  }

  /* For angle, this is the positive area (eg. 90deg will display one quadrant in this colour) */
  /* For time, this is the alternate colour */
  .prism-previewer-angle.prism-previewer-angle circle,
  .prism-previewer-time.prism-previewer-time circle {
    stroke: hsl(230, 8%, 24%);
    stroke-opacity: 1;
  }

  /* Stroke colours of the handle, direction point, and vector itself */
  .prism-previewer-easing.prism-previewer-easing circle,
  .prism-previewer-easing.prism-previewer-easing path,
  .prism-previewer-easing.prism-previewer-easing line {
    stroke: hsl(230, 8%, 24%);
  }

  /* Fill colour of the handle */
  .prism-previewer-easing.prism-previewer-easing circle {
    fill: transparent;
  }
}
`}
  </style>
);
