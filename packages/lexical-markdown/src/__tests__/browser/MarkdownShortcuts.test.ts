/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {registerMarkdownShortcuts} from '@lexical/markdown';
import {
  $createParagraphNode,
  $getRoot,
  defineExtension,
  IS_APPLE,
} from 'lexical';
import {describe, expect, onTestFinished, test} from 'vitest';
import {userEvent} from 'vitest/browser';

import {MarkdownTestExtension} from '../utils';

const extension = defineExtension({
  dependencies: [MarkdownTestExtension, HistoryExtension],
  name: 'MarkdownShortcutsBrowserTest',
  register: editor => registerMarkdownShortcuts(editor),
});

function setup() {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.style.whiteSpace = 'pre-wrap';
  document.body.append(root);
  const editor = buildEditorFromExtensions(extension);
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    root.remove();
    window.getSelection()?.removeAllRanges();
  });
  editor.update(
    () => {
      $getRoot().clear().append($createParagraphNode());
      $getRoot().selectEnd();
    },
    {discrete: true},
  );
  window.focus();
  root.focus();
  return root;
}

const cases = [
  {
    html: `
        <h1 dir="auto"><br data-lexical-managed-linebreak="true" /></h1>
      `,
    text: '# ',
  },
  {
    html: `
        <h2 dir="auto"><br data-lexical-managed-linebreak="true" /></h2>
      `,
    text: '## ',
  },
  {
    html: `
        <ol dir="auto">
          <li value="1"><br data-lexical-managed-linebreak="true" /></li>
        </ol>
      `,
    text: '1. ',
  },
  {
    html: `
        <ol start="25" dir="auto">
          <li value="25"><br data-lexical-managed-linebreak="true" /></li>
        </ol>
      `,
    text: '25. ',
  },
  {
    html: `
        <ol dir="auto">
          <li value="1">
            <ol>
              <li value="1"><br data-lexical-managed-linebreak="true" /></li>
            </ol>
          </li>
        </ol>
      `,
    text: '    1. ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1"><br data-lexical-managed-linebreak="true" /></li>
        </ul>
      `,
    text: '- ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1">
            <ul>
              <li value="1"><br data-lexical-managed-linebreak="true" /></li>
            </ul>
          </li>
        </ul>
      `,
    text: '    - ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1"><br data-lexical-managed-linebreak="true" /></li>
        </ul>
      `,
    text: '* ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1">
            <ul>
              <li value="1"><br data-lexical-managed-linebreak="true" /></li>
            </ul>
          </li>
        </ul>
      `,
    text: '    * ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1">
            <ul>
              <li value="1"><br data-lexical-managed-linebreak="true" /></li>
            </ul>
          </li>
        </ul>
      `,
    text: '      * ',
  },
  {
    html: `
        <ul dir="auto">
          <li value="1">
            <ul>
              <li value="1">
                <ul>
                  <li value="1">
                    <br data-lexical-managed-linebreak="true" />
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `,
    text: '        * ',
  },
];

// Match the e2e HTML assertions' whitespace-insensitive formatting while
// retaining node types, nesting, list numbers and managed line breaks.
function normalizeHTML(html: string) {
  const template = document.createElement('template');
  template.innerHTML = html.replace(/>\s+</g, '><').trim();
  return template.innerHTML;
}

describe('native Markdown block shortcuts', () => {
  test.each(cases)('types, undoes and redoes $text', async ({text, html}) => {
    const root = setup();
    const expected = normalizeHTML(html);
    await userEvent.keyboard(text);
    await expect.poll(() => root.innerHTML).toBe(expected);
    await userEvent.keyboard('{ControlOrMeta>}z{/ControlOrMeta}');
    await expect
      .poll(() => root.innerHTML)
      .toBe(
        '<p dir="auto"><span data-lexical-text="true">' + text + '</span></p>',
      );
    await userEvent.keyboard(
      IS_APPLE ? '{Meta>}{Shift>}z{/Shift}{/Meta}' : '{Control>}y{/Control}',
    );
    await expect.poll(() => root.innerHTML).toBe(expected);
  });
});
